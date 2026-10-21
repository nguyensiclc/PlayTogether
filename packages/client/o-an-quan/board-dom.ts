// Vẽ bàn Ô ăn quan bằng DOM/CSS theo docs/design/o-an-quan/ban-choi*.html và chạy các hiệu ứng nhỏ (UX mục 3, 4).

import type { Seat } from "@playtogether/engine/o-an-quan";
import { isQuanSquare, owner } from "@playtogether/engine/o-an-quan";
import { create, restartAnimation } from "../dom.ts";
import { type BoardRow, layoutFor } from "./layout.ts";
import type { BoardView } from "./view-model.ts";

export interface BoardCallbacks {
  onSquare(i: number): void;
  onArrow(arrow: "left" | "right"): void;
}

export interface Interaction {
  /** Bàn đang nhận thao tác của người đến lượt */
  active: boolean;
  /** Bên đang đến lượt: hàng của bên này sáng, hàng còn lại tối đi */
  turnSide: Seat;
  /** Các ô đi được */
  valid: ReadonlySet<number>;
  selected: number | null;
}

export type FlashKind = "pick" | "pick2" | "drop" | "collect" | "budan";

/** Số viên sỏi vẽ tối đa: ô dân 14, ô quan 10 (như mockup). Nhiều hơn thì chỉ con số thay đổi. */
const MAX_STONES = { dan: 14, quan: 10 };
/** Khoảng cách giữa thanh ◀ ▶ và ô đang chọn (px) */
const ARROWS_GAP = 10;
/** Nhãn "+N" trên ô bị ăn hiện ít nhất chừng này (ms), kể cả khi tua nhanh */
const CAPTURE_MIN_MS = 400;

const ARROW_ICON = {
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  right:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
};

export class BoardDom {
  readonly el: HTMLElement;
  private readonly cells: HTMLButtonElement[] = [];
  private readonly hand: HTMLElement;
  private readonly arrows: HTMLElement;
  private readonly toastEl: HTMLElement;
  /** Nội dung đang vẽ của từng ô, để chỉ vẽ lại ô thay đổi */
  private readonly shown: string[] = [];
  private readonly reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  bottomSeat: Seat = 0;

  constructor(cb: BoardCallbacks) {
    this.el = create("div", "board");
    for (let i = 0; i < 12; i++) {
      const cell = create("button", isQuanSquare(i) ? "cell quan" : "cell");
      cell.type = "button";
      cell.dataset.square = String(i);
      cell.addEventListener("click", () => cb.onSquare(i));
      this.cells.push(cell);
      this.el.append(cell);
    }
    this.hand = create("div", "hand");
    this.hand.hidden = true;
    this.arrows = create("div", "dir-pick");
    this.arrows.hidden = true;
    for (const arrow of ["left", "right"] as const) {
      const b = create("button", `arrow-${arrow}`);
      b.type = "button";
      b.innerHTML = ARROW_ICON[arrow];
      b.setAttribute("aria-label", arrow === "left" ? "Rải sang trái" : "Rải sang phải");
      b.addEventListener("click", () => cb.onArrow(arrow));
      this.arrows.append(b);
    }
    this.toastEl = create("div", "toast");
    this.toastEl.setAttribute("role", "status");
    this.el.append(this.hand, this.arrows, this.toastEl);
    // Xếp ô ngay từ đầu: nếu chờ tới khi hướng nhìn đổi thì người ngồi bên A (hướng mặc định)
    // sẽ không bao giờ được xếp, và trình duyệt tự dồn ô 7–11 xuống hàng 2 từ cột 1
    this.setPerspective(this.bottomSeat);
  }

  /** Ô bàn theo chỉ số 0..11 */
  cell(i: number): HTMLButtonElement {
    const c = this.cells[i];
    if (!c) throw new Error(`Ô không hợp lệ: ${i}`);
    return c;
  }

  /** Xếp lại ô theo bên ngồi dưới. */
  setPerspective(seat: Seat): void {
    this.bottomSeat = seat;
    const l = layoutFor(seat);
    this.place(l.left, 1, "1 / span 2", "left");
    this.place(l.right, 7, "1 / span 2", "right");
    for (const [k, i] of l.top.entries()) this.place(i, k + 2, "1", "row-top");
    for (const [k, i] of l.bottom.entries()) this.place(i, k + 2, "2", "row-bottom");
  }

  private place(i: number, col: number, row: string, position: string): void {
    const c = this.cell(i);
    c.style.gridColumn = String(col);
    c.style.gridRow = row;
    c.classList.remove("left", "right", "row-top", "row-bottom");
    c.classList.add(position);
  }

  /** Vẽ số quân và "bàn tay". */
  render(view: BoardView, handMs = 0): void {
    for (let i = 0; i < 12; i++) this.renderCell(i, view);
    this.renderHand(view, handMs);
  }

  private renderCell(i: number, view: BoardView): void {
    const dan = view.dan[i] ?? 0;
    const hasQuan = isQuanSquare(i) && view.quan[i === 0 ? 0 : 1];
    const key = `${dan}:${hasQuan}`;
    if (this.shown[i] === key) return;
    this.shown[i] = key;
    const c = this.cell(i);
    for (const old of c.querySelectorAll(".stone, .count")) old.remove();
    c.prepend(...stones(i, dan, hasQuan));
    if (dan > 0) {
      const count = create("span", "count");
      count.textContent = String(dan);
      c.append(count);
    }
    c.setAttribute("aria-label", cellLabel(i, dan, hasQuan));
  }

  private renderHand(view: BoardView, handMs: number): void {
    if (!view.hand || view.hand.n <= 0) {
      this.hand.hidden = true;
      return;
    }
    const c = this.cell(view.hand.at);
    this.hand.style.transitionDuration = this.reducedMotion ? "0ms" : `${Math.round(handMs * 0.8)}ms`;
    this.hand.style.left = `${c.offsetLeft + c.offsetWidth / 2}px`;
    this.hand.style.top = `${c.offsetTop}px`;
    this.hand.textContent = String(view.hand.n);
    this.hand.hidden = false;
  }

  setInteraction(it: Interaction): void {
    for (let i = 0; i < 12; i++) {
      const c = this.cell(i);
      const side = owner(i);
      const mine = it.active && side === it.turnSide;
      c.classList.toggle("valid", mine && it.valid.has(i) && it.selected !== i);
      c.classList.toggle("off", mine && !it.valid.has(i));
      // Hàng của đối thủ tối hơn hàng của người đến lượt
      c.classList.toggle("dim", it.active && side !== null && side !== it.turnSide);
      c.classList.toggle("selected", it.selected === i);
    }
    this.placeArrows(it.selected);
  }

  /** Ô dân thuộc hàng trên hay hàng dưới của bàn đang hiển thị */
  rowOf(i: number): BoardRow {
    return owner(i) === this.bottomSeat ? "bottom" : "top";
  }

  /**
   * Thanh ◀ ▶ nổi cạnh ô đang chọn, không tràn ra ngoài bàn: phía trên với hàng dưới,
   * phía dưới với hàng trên để không che hàng trên và thẻ người chơi phía trên (Q21).
   */
  private placeArrows(selected: number | null): void {
    if (selected === null) {
      this.arrows.hidden = true;
      return;
    }
    const c = this.cell(selected);
    this.arrows.hidden = false;
    const w = this.arrows.offsetWidth;
    const center = c.offsetLeft + c.offsetWidth / 2;
    const left = Math.min(Math.max(center - w / 2, 0), this.el.clientWidth - w);
    const below = this.rowOf(selected) === "top";
    this.arrows.classList.toggle("below", below);
    this.arrows.style.left = `${left}px`;
    this.arrows.style.top = below
      ? `${c.offsetTop + c.offsetHeight + ARROWS_GAP}px`
      : `${c.offsetTop - this.arrows.offsetHeight - ARROWS_GAP}px`;
    this.arrows.style.setProperty("--caret", `${center - left}px`);
  }

  flash(i: number, kind: FlashKind, ms: number): void {
    restartAnimation(this.cell(i), `fx-${kind}`, ms);
  }

  /** Ô bị ăn: nền xanh và nhãn "+N" phía trên ô. */
  capture(i: number, gain: number, ms: number): void {
    const c = this.cell(i);
    const label = create("b", "gain");
    label.textContent = `+${gain}`;
    c.append(label);
    c.classList.add("capture");
    window.setTimeout(
      () => {
        c.classList.remove("capture");
        label.remove();
      },
      Math.max(ms, CAPTURE_MIN_MS),
    );
  }

  shake(i: number): void {
    restartAnimation(this.cell(i), "fx-shake", 300);
  }

  toast(text: string, ms: number): void {
    this.toastEl.textContent = text;
    restartAnimation(this.toastEl, "show", Math.max(ms, 700));
  }
}

/** Sỏi rải ngẫu nhiên nhưng cố định theo ô và số quân (giống mockup). */
function stones(i: number, dan: number, hasQuan: boolean): HTMLElement[] {
  const quanCell = isQuanSquare(i);
  const out: HTMLElement[] = [];
  if (hasQuan) out.push(create("i", "stone big"));
  const r = seeded(i * 31 + dan * 7 + 3);
  const n = Math.min(dan, quanCell ? MAX_STONES.quan : MAX_STONES.dan);
  for (let k = 0; k < n; k++) {
    const s = create("i", "stone");
    // Ô quan: sỏi nằm nửa dưới, chừa chỗ cho viên quan
    const x = quanCell ? 22 + r() * 46 : 12 + r() * 66;
    const y = quanCell ? 50 + r() * 28 : 10 + r() * 58;
    s.style.left = `${x}%`;
    s.style.top = `${y}%`;
    out.push(s);
  }
  return out;
}

/** Bộ sinh số giả ngẫu nhiên đơn giản, chỉ để vị trí sỏi ổn định giữa các lần vẽ. */
function seeded(seed: number): () => number {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function cellLabel(i: number, dan: number, hasQuan: boolean): string {
  const name = isQuanSquare(i) ? `Ô quan ${i}` : `Ô ${i}`;
  return `${name}: ${dan} dân${hasQuan ? ", có quan" : ""}`;
}
