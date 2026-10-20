// Vẽ bàn Ô ăn quan bằng DOM/CSS theo docs/design/o-an-quan/ban-choi*.html và chạy các hiệu ứng nhỏ (UX mục 3, 4).
import { isQuanSquare, owner } from "@playtogether/engine/o-an-quan";
import type { Seat } from "@playtogether/engine/o-an-quan";
import { layoutFor } from "./layout.ts";
import type { BoardView } from "./view-model.ts";

export interface BoardCallbacks {
  onSquare(i: number): void;
  onArrow(arrow: "left" | "right"): void;
}

export interface Interaction {
  /** Bàn đang nhận thao tác của người ngồi dưới */
  active: boolean;
  /** Các ô đi được */
  valid: ReadonlySet<number>;
  selected: number | null;
}

/** Số viên sỏi vẽ tối đa: ô dân 14, ô quan 10 (như mockup). Nhiều hơn thì chỉ con số thay đổi. */
const MAX_STONES = { dan: 14, quan: 10 };

const ARROW_L =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
const ARROW_R =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';

export class BoardDom {
  readonly el: HTMLElement;
  private readonly cells: HTMLButtonElement[] = [];
  private readonly hand: HTMLElement;
  private readonly arrows: HTMLElement;
  private readonly toastEl: HTMLElement;
  private readonly shown: string[] = [];
  private readonly reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  bottomSeat: Seat = 0;

  constructor(cb: BoardCallbacks) {
    this.el = h("div", "board");
    for (let i = 0; i < 12; i++) {
      const cell = h("button", isQuanSquare(i) ? "cell quan" : "cell") as HTMLButtonElement;
      cell.type = "button";
      cell.dataset.square = String(i);
      cell.addEventListener("click", () => cb.onSquare(i));
      this.cells.push(cell);
      this.el.append(cell);
    }
    this.hand = h("div", "hand");
    this.hand.hidden = true;
    this.arrows = h("div", "dir-pick");
    this.arrows.hidden = true;
    for (const arrow of ["left", "right"] as const) {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML = arrow === "left" ? ARROW_L : ARROW_R;
      b.className = `arrow-${arrow}`;
      b.setAttribute("aria-label", arrow === "left" ? "Rải sang trái" : "Rải sang phải");
      b.addEventListener("click", () => cb.onArrow(arrow));
      this.arrows.append(b);
    }
    this.toastEl = h("div", "toast");
    this.toastEl.setAttribute("role", "status");
    this.el.append(this.hand, this.arrows, this.toastEl);
  }

  /** Xếp lại ô theo bên ngồi dưới. */
  setPerspective(seat: Seat): void {
    this.bottomSeat = seat;
    const l = layoutFor(seat);
    const place = (i: number, col: number, row: string, side = "") => {
      const c = this.cells[i]!;
      c.style.gridColumn = String(col);
      c.style.gridRow = row;
      c.classList.remove("left", "right", "row-top", "row-bottom");
      if (side) c.classList.add(side);
    };
    place(l.left, 1, "1 / span 2", "left");
    place(l.right, 7, "1 / span 2", "right");
    l.top.forEach((i, k) => place(i, k + 2, "1", "row-top"));
    l.bottom.forEach((i, k) => place(i, k + 2, "2", "row-bottom"));
  }

  /** Vẽ số quân và "bàn tay". */
  render(view: BoardView, handMs = 0): void {
    for (let i = 0; i < 12; i++) {
      const dan = view.dan[i] ?? 0;
      const hasQuan = isQuanSquare(i) && view.quan[i === 0 ? 0 : 1];
      const key = `${dan}:${hasQuan}`;
      if (this.shown[i] === key) continue;
      this.shown[i] = key;
      const cell = this.cells[i]!;
      cell.querySelectorAll(".stone, .count").forEach((n) => n.remove());
      cell.prepend(...stones(i, dan, hasQuan));
      if (dan > 0) {
        const count = h("span", "count");
        count.textContent = String(dan);
        cell.append(count);
      }
      cell.setAttribute("aria-label", cellLabel(i, dan, hasQuan));
    }

    if (view.hand && view.hand.n > 0) {
      const c = this.cells[view.hand.at]!;
      this.hand.style.transitionDuration = this.reducedMotion ? "0ms" : `${Math.round(handMs * 0.8)}ms`;
      this.hand.style.left = `${c.offsetLeft + c.offsetWidth / 2}px`;
      this.hand.style.top = `${c.offsetTop}px`;
      this.hand.textContent = String(view.hand.n);
      this.hand.hidden = false;
    } else {
      this.hand.hidden = true;
    }
  }

  setInteraction(it: Interaction): void {
    for (let i = 0; i < 12; i++) {
      const c = this.cells[i]!;
      const side = owner(i);
      const mine = it.active && side === this.bottomSeat;
      c.classList.toggle("valid", mine && it.valid.has(i) && it.selected !== i);
      c.classList.toggle("off", mine && !it.valid.has(i));
      // Hàng đối thủ tối hơn hàng mình khi đến lượt mình
      c.classList.toggle("dim", it.active && side !== null && side !== this.bottomSeat);
      c.classList.toggle("selected", it.selected === i);
    }
    if (it.selected === null) {
      this.arrows.hidden = true;
      return;
    }
    // Thanh ◀ ▶ nổi phía trên ô đang chọn, không tràn ra ngoài bàn
    const c = this.cells[it.selected]!;
    this.arrows.hidden = false;
    const w = this.arrows.offsetWidth;
    const center = c.offsetLeft + c.offsetWidth / 2;
    const left = Math.min(Math.max(center - w / 2, 0), this.el.clientWidth - w);
    this.arrows.style.left = `${left}px`;
    this.arrows.style.top = `${c.offsetTop - this.arrows.offsetHeight - 10}px`;
    this.arrows.style.setProperty("--caret", `${center - left}px`);
  }

  /** Nháy ô: "pick" (bốc), "pick2" (bốc rải tiếp), "drop", "collect" (thu cuối ván), "budan" */
  flash(i: number, kind: "pick" | "pick2" | "drop" | "collect" | "budan", ms: number): void {
    restartAnimation(this.cells[i]!, `fx-${kind}`, ms);
  }

  /** Ô bị ăn: nền xanh và nhãn "+N" phía trên ô. */
  capture(i: number, gain: number, ms: number): void {
    const c = this.cells[i]!;
    const keep = Math.max(ms, 400);
    const label = h("b", "gain");
    label.textContent = `+${gain}`;
    c.append(label);
    c.classList.add("capture");
    window.setTimeout(() => {
      c.classList.remove("capture");
      label.remove();
    }, keep);
  }

  shake(i: number): void {
    restartAnimation(this.cells[i]!, "fx-shake", 300);
  }

  toast(text: string, ms: number): void {
    this.toastEl.textContent = text;
    restartAnimation(this.toastEl, "show", Math.max(ms, 700));
  }

  /** Xoay `el` (phần bàn chơi) 180° rồi xếp lại theo bên ngồi dưới mới. */
  async rotateTo(seat: Seat, el: HTMLElement): Promise<void> {
    if (seat === this.bottomSeat) return;
    if (this.reducedMotion) {
      this.setPerspective(seat);
      return;
    }
    // Giữ góc 180° cho tới khi xếp lại xong, rồi bỏ xoay: vị trí các ô trùng khớp nên không bị nháy
    const anim = el.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(180deg)" }], {
      duration: 450,
      easing: "ease-in-out",
      fill: "forwards",
    });
    await anim.finished;
    this.setPerspective(seat);
    anim.cancel();
  }
}

function h(tag: string, className: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  return el;
}

/** Sỏi rải ngẫu nhiên nhưng cố định theo ô và số quân (giống mockup). */
function stones(i: number, dan: number, hasQuan: boolean): HTMLElement[] {
  const quanCell = isQuanSquare(i);
  const out: HTMLElement[] = [];
  if (hasQuan) out.push(h("i", "stone big"));
  const r = seeded(i * 31 + dan * 7 + 3);
  const n = Math.min(dan, quanCell ? MAX_STONES.quan : MAX_STONES.dan);
  for (let k = 0; k < n; k++) {
    const s = h("i", "stone");
    const x = quanCell ? 22 + r() * 46 : 12 + r() * 66;
    const y = quanCell ? 50 + r() * 28 : 10 + r() * 58;
    s.style.left = `${x}%`;
    s.style.top = `${y}%`;
    out.push(s);
  }
  return out;
}

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

const fxTimers = new WeakMap<HTMLElement, Map<string, number>>();

/** Gắn lại class hiệu ứng để animation CSS chạy lại từ đầu, tự gỡ sau ms. */
function restartAnimation(el: HTMLElement, cls: string, ms: number): void {
  const timers = fxTimers.get(el) ?? new Map<string, number>();
  fxTimers.set(el, timers);
  clearTimeout(timers.get(cls));
  el.classList.remove(cls);
  void el.offsetWidth;
  el.style.setProperty("--fx-ms", `${Math.round(ms)}ms`);
  el.classList.add(cls);
  timers.set(cls, window.setTimeout(() => el.classList.remove(cls), ms));
}
