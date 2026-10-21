// Thẻ người chơi trên/dưới bàn (docs/design/o-an-quan/ban-choi.html): avatar, tên, kho điểm, điểm.
// Chỉ hiển thị, không chứa logic ván.

import type { Pile } from "@playtogether/engine/o-an-quan";
import { $, create } from "../dom.ts";

export interface PlayerIdentity {
  name: string;
  /** Chữ trong avatar */
  initials: string;
  /** Class màu avatar trong style.css (av1, av3…) */
  avatarClass: string;
}

export interface CardState {
  pile: Pile;
  points: number;
  /** Thẻ của "bạn" (người ngồi dưới) */
  you: boolean;
  /** Đang đến lượt: viền vàng */
  active: boolean;
  /** Mất kết nối: avatar mờ, hiện "Mất kết nối" thay cho kho điểm (Q22e) */
  offline?: boolean;
  /** Tiến độ trận đấu nhiều ván (nếu có) */
  matchProgress?: { total: number; target: number } | null;
}

export class PlayerCard {
  readonly el: HTMLElement;
  private readonly avatar: HTMLElement;
  private readonly name: HTMLElement;
  private readonly you: HTMLElement;
  private readonly dan: HTMLElement;
  private readonly quan: HTMLElement;
  private readonly delta: HTMLElement;
  private readonly score: HTMLElement;
  private readonly matchPill: HTMLElement;
  private readonly kho: HTMLElement;
  private readonly reconn: HTMLElement;

  constructor() {
    this.el = create("div", "player");
    this.el.innerHTML = `
      <span class="avatar"></span>
      <div class="info">
        <div class="name"><span data-name></span><span class="small muted" data-you> (bạn)</span></div>
        <div class="kho"><span class="ddot"></span><span data-dan></span> · <span class="qdot"></span><span data-quan></span><span class="delta" hidden></span></div>
        <div class="reconn" hidden>Mất kết nối</div>
      </div>
      <div class="score">
        <b></b><span class="tiny muted">điểm</span>
        <span class="match-pill" hidden></span>
      </div>`;
    this.avatar = $(this.el, ".avatar");
    this.name = $(this.el, "[data-name]");
    this.you = $(this.el, "[data-you]");
    this.dan = $(this.el, "[data-dan]");
    this.quan = $(this.el, "[data-quan]");
    this.delta = $(this.el, ".delta");
    this.score = $(this.el, ".score b");
    this.matchPill = $(this.el, ".match-pill");
    this.kho = $(this.el, ".kho");
    this.reconn = $(this.el, ".reconn");
  }

  render(who: PlayerIdentity, state: CardState): void {
    this.avatar.className = `avatar ${who.avatarClass}`;
    this.avatar.textContent = who.initials;
    this.name.textContent = who.name;
    this.you.hidden = !state.you;
    this.dan.textContent = `${state.pile.dan} dân`;
    this.quan.textContent = `${state.pile.quan} quan`;
    this.score.textContent = String(state.points);
    if (state.matchProgress) {
      this.matchPill.hidden = false;
      this.matchPill.textContent = `Tổng ${state.matchProgress.total}/${state.matchProgress.target}`;
    } else {
      this.matchPill.hidden = true;
    }
    this.el.classList.toggle("active", state.active);
    const offline = state.offline ?? false;
    this.el.classList.toggle("offline", offline);
    this.kho.hidden = offline;
    this.reconn.hidden = !offline;
  }

  /** "+N" khi ăn, "−5" khi bù dân, hiện thoáng qua cạnh kho điểm */
  showDelta(text: string, minus = false): void {
    this.delta.hidden = false;
    this.delta.textContent = text;
    this.delta.classList.toggle("minus", minus);
    // Gỡ rồi gắn lại animation để chạy lại từ đầu khi có delta mới
    this.delta.style.animation = "none";
    void this.delta.offsetWidth;
    this.delta.style.animation = "";
  }

  /** Hiệu ứng đổi người khi Lật bàn */
  flashSwap(ms: number): void {
    this.el.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(6px)" }, { opacity: 1 }], { duration: ms });
  }
}
