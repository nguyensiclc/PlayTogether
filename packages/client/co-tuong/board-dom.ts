// Bàn Cờ tướng tương tác (UX mục 3): chạm quân của mình để chọn, chạm ô đích để đi.
// Chỉ nhận chạm và vẽ lại; luật (nước nào đi được) do màn chơi đưa vào qua `setLegalMoves`, lấy từ engine.

import type { Move, Piece, Side } from "@playtogether/engine/co-tuong";
import { create } from "../dom.ts";
import { type BoardPaint, boardSvg, cellAtPoint, VIEW_BOX } from "./board-svg.ts";

export interface BoardHandlers {
  /** Ô đang chọn thay đổi (để màn chơi cập nhật dòng trạng thái) */
  onSelect(): void;
  /** Người chơi chạm ô đích hợp lệ */
  onMove(move: Move): void;
  /** Chạm quân của mình nhưng quân đó không có nước đi nào (bị ghim hoặc bị chặn) */
  onStuck(): void;
}

export type BoardPosition = Pick<BoardPaint, "cells" | "last" | "checkCell">;

export class CoTuongBoard {
  readonly el: HTMLElement;
  private position: BoardPosition = { cells: [], last: null, checkCell: null };
  private legal: readonly Move[] = [];
  private flipped = false;
  private mySide: Side | null = null;
  private interactive = false;
  private fresh = false;
  private selected: number | null = null;
  private readonly handlers: BoardHandlers;

  constructor(handlers: BoardHandlers) {
    this.handlers = handlers;
    this.el = create("div", "ct-board");
    this.el.addEventListener("click", (e) => this.onClick(e));
  }

  get selection(): number | null {
    return this.selected;
  }

  /** `side` = bên của người chơi (null khi đang xem); người cầm Đen thấy bàn xoay */
  setInteractive(interactive: boolean, side: Side | null): void {
    this.interactive = interactive;
    this.mySide = side;
    this.flipped = side === 1;
  }

  /** Các nước hợp lệ của người đang đến lượt; rỗng khi không phải lượt mình */
  setLegalMoves(moves: readonly Move[]): void {
    this.legal = moves;
    if (this.selected !== null && !moves.some((m) => m.from === this.selected)) this.selected = null;
  }

  setPosition(position: BoardPosition, fresh = false): void {
    this.position = position;
    this.fresh = fresh;
    this.selected = null;
    this.render();
  }

  clearSelection(): void {
    if (this.selected === null) return;
    this.selected = null;
    this.render();
    this.handlers.onSelect();
  }

  shake(): void {
    this.el.classList.remove("fx-shake");
    // Đọc offsetWidth để animation chạy lại khi bấm liên tiếp
    void this.el.offsetWidth;
    this.el.classList.add("fx-shake");
  }

  private targets(): number[] {
    return this.selected === null ? [] : this.legal.filter((m) => m.from === this.selected).map((m) => m.to);
  }

  render(): void {
    this.el.innerHTML = boardSvg({
      ...this.position,
      selected: this.selected,
      targets: this.targets(),
      flipped: this.flipped,
      fresh: this.fresh,
    });
  }

  private onClick(e: MouseEvent): void {
    const svg = this.el.querySelector("svg");
    if (!svg || !this.interactive) return;
    const rect = svg.getBoundingClientRect();
    const vx = VIEW_BOX.x + ((e.clientX - rect.left) / rect.width) * VIEW_BOX.width;
    const vy = VIEW_BOX.y + ((e.clientY - rect.top) / rect.height) * VIEW_BOX.height;
    const cell = cellAtPoint(vx, vy, this.flipped);
    if (cell === null) this.clearSelection();
    else this.choose(cell);
  }

  private choose(cell: number): void {
    const from = this.selected;
    if (from !== null && this.targets().includes(cell)) {
      this.selected = null;
      this.fresh = false;
      this.render();
      this.handlers.onMove({ from, to: cell });
      return;
    }
    const piece: Piece | null = this.position.cells[cell] ?? null;
    if (piece === null || piece.side !== this.mySide) {
      this.clearSelection();
    } else if (this.legal.some((m) => m.from === cell)) {
      this.selected = cell;
      this.fresh = false;
      this.render();
      this.handlers.onSelect();
    } else {
      this.handlers.onStuck();
      this.clearSelection();
    }
  }
}
