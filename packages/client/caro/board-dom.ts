// Bàn Cờ caro trên trang: vẽ SVG và nhận thao tác (UX mục 3.2, 3.3).
//  - Chạm (điện thoại): chạm chọn ô và hiện kính lúp, kéo để đổi ô, chạm lại đúng ô đó để đặt.
//  - Chuột: rê để xem trước, click để đặt.
//  - Bàn phím do màn hình ván gọi qua `moveCursor` / `confirm` / `clearSelection`.
// Chỉ lo giao diện: không biết luật, màn hình ván quyết định ô nào đặt được.

import type { Mark } from "@playtogether/engine/caro";
import { create, restartAnimation } from "../dom.ts";
import { type BoardPaint, boardSvg, cellAt, loupeViewBox, stepCell } from "./board-svg.ts";

export interface BoardHandlers {
  /** Ô đang chọn đổi (null = bỏ chọn); màn hình ván cập nhật nút Đặt quân và dòng trạng thái */
  onSelect(index: number | null): void;
  /** Người chơi xác nhận đặt quân vào ô */
  onPlace(index: number): void;
  /** Chạm vào ô đã có quân */
  onOccupied(index: number): void;
}

const LOUPE_SIZE = 130;
/** Khoảng hở giữa đáy kính lúp và ô được chạm */
const LOUPE_GAP = 26;
const SHAKE_MS = 320;

export class CaroBoard {
  readonly el: HTMLElement;
  private readonly host: HTMLElement;
  private readonly loupe: HTMLElement;
  private paint: BoardPaint;
  private interactive = false;
  private myMark: Mark = 0;
  private selected: number | null = null;
  private hover: number | null = null;
  private touching = false;
  /** Ô đã chọn trước lúc ngón tay chạm xuống, và đã đổi ô trong lúc chạm chưa */
  private selectedBeforeTouch: number | null = null;
  private movedSelection = false;

  constructor(
    private readonly handlers: BoardHandlers,
    size: number,
  ) {
    this.paint = { size, cells: new Array(size * size).fill(null), last: null, winLine: [], preview: null };
    this.el = create("div", "caro-board");
    this.host = create("div");
    this.loupe = create("div", "caro-loupe");
    this.loupe.hidden = true;
    this.el.append(this.host, this.loupe);
    this.el.addEventListener("pointerdown", (e) => this.onDown(e));
    this.el.addEventListener("pointermove", (e) => this.onMove(e));
    this.el.addEventListener("pointerup", (e) => this.onUp(e));
    this.el.addEventListener("pointercancel", () => this.endTouch());
    this.el.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse") this.setHover(null);
    });
    this.draw();
  }

  get size(): number {
    return this.paint.size;
  }

  get selection(): number | null {
    return this.selected;
  }

  /** Cập nhật thế cờ. `fresh` = vừa có nước đi mới, cho quân đó chạy hiệu ứng xuất hiện. */
  setPosition(p: Pick<BoardPaint, "size" | "cells" | "last" | "winLine">, fresh = false): void {
    this.paint = { ...this.paint, ...p, fresh };
    if (this.selected !== null && this.paint.cells[this.selected] !== null) this.selected = null;
    this.draw();
  }

  /** Bật / tắt nhận thao tác; `mark` là quân của mình cho quân xem trước */
  setInteractive(on: boolean, mark: Mark): void {
    this.interactive = on;
    this.myMark = mark;
    if (!on) {
      this.selected = null;
      this.hover = null;
      this.endTouch();
    }
    this.draw();
  }

  clearSelection(): void {
    this.select(null);
  }

  /** Phím mũi tên: bắt đầu từ ô đang chọn, ô đang rê chuột, hoặc giữa bàn */
  moveCursor(dx: number, dy: number): void {
    if (!this.interactive) return;
    const n = this.paint.size;
    const from = this.selected ?? this.hover ?? Math.floor(n / 2) * n + Math.floor(n / 2);
    const start = this.selected === null && this.hover === null ? from : stepCell(n, from, dx, dy);
    this.hover = null;
    this.select(start);
  }

  /** Enter / Space / nút Đặt quân: đặt vào ô đang chọn */
  confirm(): void {
    if (this.interactive && this.selected !== null) this.handlers.onPlace(this.selected);
  }

  /** Bàn rung nhẹ: chạm ô đã có quân hoặc server từ chối nước đi */
  shake(): void {
    restartAnimation(this.el, "fx-shake", SHAKE_MS);
  }

  // ---------- Thao tác ----------

  private cellOf(e: PointerEvent): number | null {
    // Khung của riêng lưới (host), không tính viền gỗ quanh bàn, để ô chạm trúng đúng chỗ nhìn thấy
    return cellAt(this.paint.size, this.host.getBoundingClientRect(), e.clientX, e.clientY);
  }

  private onDown(e: PointerEvent): void {
    if (!this.interactive || e.pointerType === "mouse") return;
    const i = this.cellOf(e);
    if (i === null) return;
    this.touching = true;
    this.selectedBeforeTouch = this.selected;
    this.movedSelection = false;
    this.el.setPointerCapture?.(e.pointerId);
    this.touchCell(i);
  }

  private onMove(e: PointerEvent): void {
    if (!this.interactive) return;
    const i = this.cellOf(e);
    if (e.pointerType === "mouse") {
      this.setHover(i !== null && this.paint.cells[i] === null ? i : null);
    } else if (this.touching && i !== null) {
      this.touchCell(i);
    }
  }

  private onUp(e: PointerEvent): void {
    if (!this.interactive) return;
    const i = this.cellOf(e);
    if (e.pointerType === "mouse") {
      if (i === null) return;
      if (this.paint.cells[i] !== null) this.handlers.onOccupied(i);
      else this.handlers.onPlace(i);
      return;
    }
    const again = this.touching && !this.movedSelection && i !== null && i === this.selectedBeforeTouch;
    this.endTouch();
    if (again && i !== null) this.handlers.onPlace(i);
  }

  /** Ngón tay đang ở ô `i`: ô trống thì chọn và hiện kính lúp, ô có quân thì báo ô bận */
  private touchCell(i: number): void {
    if (this.paint.cells[i] !== null) {
      if (this.selected === null) this.handlers.onOccupied(i);
      this.hideLoupe();
      return;
    }
    if (this.selected !== i) {
      this.movedSelection = this.selected !== null || this.movedSelection;
      this.select(i);
    }
    this.showLoupe(i);
  }

  private endTouch(): void {
    this.touching = false;
    this.hideLoupe();
  }

  private select(i: number | null): void {
    if (this.selected === i) return;
    this.selected = i;
    this.draw();
    this.handlers.onSelect(i);
  }

  private setHover(i: number | null): void {
    if (this.hover === i) return;
    this.hover = i;
    this.draw();
  }

  // ---------- Vẽ ----------

  private draw(): void {
    const index = this.selected ?? (this.interactive ? this.hover : null);
    const preview = index === null ? null : { index, mark: this.myMark, band: this.selected !== null };
    this.paint = { ...this.paint, preview };
    this.host.innerHTML = boardSvg(this.paint);
    // Chỉ lần vẽ ngay sau nước đi mới chạy hiệu ứng xuất hiện
    this.paint = { ...this.paint, fresh: false };
  }

  private showLoupe(i: number): void {
    const n = this.paint.size;
    this.loupe.innerHTML = boardSvg({ ...this.paint, viewBox: loupeViewBox(n, i) });
    const w = this.el.clientWidth;
    const cell = w / n;
    const cx = ((i % n) + 0.5) * cell;
    const top = Math.floor(i / n) * cell - LOUPE_SIZE - LOUPE_GAP;
    // Kính lúp không tràn ra ngoài hai mép bàn
    const left = Math.min(Math.max(cx - LOUPE_SIZE / 2, 0), Math.max(w - LOUPE_SIZE, 0));
    this.loupe.style.left = `${left}px`;
    this.loupe.style.top = `${top}px`;
    this.loupe.hidden = false;
  }

  private hideLoupe(): void {
    this.loupe.hidden = true;
  }
}
