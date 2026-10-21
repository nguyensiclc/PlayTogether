// Vẽ bàn Ô ăn quan bằng DOM/CSS theo docs/design/o-an-quan/ban-choi*.html và chạy các hiệu ứng nhỏ (UX mục 3, 4).

import type { Seat } from "@playtogether/engine/o-an-quan";
import { isQuanSquare, owner } from "@playtogether/engine/o-an-quan";
import { $, create, restartAnimation } from "../dom.ts";
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

interface StoneCoord {
  x: number;
  y: number;
}

/**
 * Tọa độ cố định của từng viên sỏi cho mỗi ô 0..11.
 * Vị trí của viên thứ k trong ô i chỉ phụ thuộc vào (i, k), không đổi khi thêm sỏi mới.
 */
const STONE_SLOTS: readonly (readonly StoneCoord[])[] = Array.from({ length: 12 }, (_, i) => {
  const quanCell = isQuanSquare(i);
  const max = quanCell ? MAX_STONES.quan : MAX_STONES.dan;
  const r = seeded(i * 37 + 73);
  const slots: StoneCoord[] = [];
  for (let k = 0; k < max; k++) {
    // Ô quan: sỏi nằm nửa dưới, chừa chỗ cho viên quan
    const x = quanCell ? 20 + r() * 50 : 12 + r() * 66;
    const y = quanCell ? 52 + r() * 26 : 10 + r() * 58;
    slots.push({ x: Math.round(x), y: Math.round(y) });
  }
  return slots;
});

const ARROW_ICON = {
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  right:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
};

export class BoardDom {
  readonly el: HTMLElement;
  private readonly cells: HTMLButtonElement[] = [];
  private readonly hand: HTMLElement;
  private readonly handBadge: HTMLElement;
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
    this.hand.innerHTML = `
      <div class="hand-inner">
        <svg class="hand-icon" viewBox="0 0 38 42" width="38" height="42" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="handGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#fde5cd"/>
              <stop offset="45%" stop-color="#f3c299"/>
              <stop offset="100%" stop-color="#d49261"/>
            </linearGradient>
            <filter id="handShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#2a1405" flood-opacity="0.38"/>
            </filter>
          </defs>
          <g filter="url(#handShadow)">
            <path d="M12 0 L26 0 L25 10 C25 10 20 11 13 10 Z" fill="url(#handGrad)" stroke="#6b3a19" stroke-width="1.3" stroke-linejoin="round"/>
            <path d="M12 9 C8 13 7 18 8 23 C9 28 13 32 19 33 C26 33 29 28 30 23 C31 18 30 13 26 9 Z" fill="url(#handGrad)" stroke="#6b3a19" stroke-width="1.3" stroke-linejoin="round"/>
            <path d="M9 16 C6 19 7 23 11 23 C14 23 15 20 14 17 C13 15 11 14 9 16 Z" fill="#fde5cd" stroke="#6b3a19" stroke-width="1.2"/>
            <path d="M10 24 C8 27 11 31 15 31 C17 31 17 28 16 25" fill="#e8ad80" stroke="#6b3a19" stroke-width="1.2"/>
            <path d="M15 26 C14 30 18 33 21 32 C23 31 23 27 21 25" fill="#e8ad80" stroke="#6b3a19" stroke-width="1.2"/>
            <path d="M21 26 C21 30 25 32 28 30 C29 28 28 25 26 24" fill="#e8ad80" stroke="#6b3a19" stroke-width="1.2"/>
            <ellipse cx="19" cy="20" rx="3.2" ry="2.6" fill="#fefcf8" stroke="#5a3820" stroke-width="0.9"/>
            <ellipse cx="23" cy="22" rx="2.5" ry="2" fill="#d9c9b5" stroke="#5a3820" stroke-width="0.8"/>
          </g>
        </svg>
        <span class="hand-badge"></span>
      </div>`;
    this.handBadge = $(this.hand, ".hand-badge");
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
    const isPlay = view.hand !== null;
    for (let i = 0; i < 12; i++) this.renderCell(i, view, isPlay);
    this.renderHand(view, handMs);
  }

  private renderCell(i: number, view: BoardView, isPlay: boolean): void {
    const dan = view.dan[i] ?? 0;
    const hasQuan = isQuanSquare(i) && view.quan[i === 0 ? 0 : 1];
    const key = `${dan}:${hasQuan}`;
    if (this.shown[i] === key) return;
    this.shown[i] = key;
    const c = this.cell(i);
    renderQuanStone(c, hasQuan);
    renderDanStones(c, i, dan, isPlay);
    renderCount(c, dan);
    c.setAttribute("aria-label", cellLabel(i, dan, hasQuan));
  }

  private renderHand(view: BoardView, handMs: number): void {
    if (!view.hand) {
      this.hand.hidden = true;
      this.clearNewStones();
      return;
    }
    const c = this.cell(view.hand.at);
    this.hand.style.transitionDuration = this.reducedMotion ? "0ms" : `${Math.round(handMs * 0.8)}ms`;
    this.hand.style.left = `${c.offsetLeft + c.offsetWidth / 2}px`;
    this.hand.style.top = `${c.offsetTop + c.offsetHeight / 2}px`;
    this.handBadge.textContent = String(view.hand.n);
    this.handBadge.hidden = view.hand.n <= 0;
    this.hand.hidden = false;

    // Khi số sỏi trên tay vừa hết (n = 0): sau nhịp rơi viên cuối thì chuyển toàn bộ sỏi đỏ về trắng
    if (view.hand.n === 0) {
      window.setTimeout(() => this.clearNewStones(), Math.max(300, Math.round(handMs * 0.5)));
    }
  }

  /** Chuyển toàn bộ các viên sỏi mới màu đỏ về màu trắng bình thường */
  clearNewStones(): void {
    for (const s of this.el.querySelectorAll(".stone.new-stone")) {
      s.classList.remove("new-stone");
    }
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
    if (kind === "pick" || kind === "pick2") {
      restartAnimation(this.hand, "fx-pick", ms);
    } else if (kind === "drop") {
      restartAnimation(this.hand, "fx-drop", Math.min(ms, 400));
    }
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

function renderQuanStone(c: HTMLElement, hasQuan: boolean): void {
  const quanEl = c.querySelector(".stone.big");
  if (hasQuan && !quanEl) {
    c.prepend(create("i", "stone big"));
  } else if (!hasQuan && quanEl) {
    quanEl.remove();
  }
}

function renderDanStones(c: HTMLElement, i: number, dan: number, isPlay: boolean): void {
  const quanCell = isQuanSquare(i);
  const target = Math.min(dan, quanCell ? MAX_STONES.quan : MAX_STONES.dan);
  const existing = c.querySelectorAll<HTMLElement>(".stone:not(.big)");
  const current = existing.length;

  if (dan === 0) {
    for (const s of existing) s.remove();
    return;
  }
  if (target > current) {
    appendNewStones(c, i, current, target, isPlay);
  } else if (target < current) {
    for (let k = current - 1; k >= target; k--) existing[k]?.remove();
  }
}

function appendNewStones(c: HTMLElement, i: number, current: number, target: number, isPlay: boolean): void {
  const slots = STONE_SLOTS[i] ?? [];
  const frag = document.createDocumentFragment();
  for (let k = current; k < target; k++) {
    const slot = slots[k] ?? { x: 50, y: 50 };
    const cls = isPlay ? "stone drop-in new-stone" : "stone";
    const s = create("i", cls);
    s.style.left = `${slot.x}%`;
    s.style.top = `${slot.y}%`;
    frag.append(s);
  }
  c.append(frag);
}

function renderCount(c: HTMLElement, dan: number): void {
  let countEl = c.querySelector<HTMLElement>(".count");
  if (dan > 0) {
    if (!countEl) {
      countEl = create("span", "count");
      c.append(countEl);
    }
    countEl.textContent = String(dan);
  } else if (countEl) {
    countEl.remove();
  }
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
