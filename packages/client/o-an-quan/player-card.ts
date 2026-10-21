// Thẻ người chơi trên/dưới bàn (docs/design/o-an-quan/ban-choi.html): avatar, tên, kho điểm, điểm.
// Chỉ hiển thị, không chứa logic ván.

import type { Pile } from "@playtogether/engine/o-an-quan";
import { PlayerCardBase } from "../game-ui/player-card-base.ts";
import type { PlayerIdentity } from "../game-ui/result-parts.ts";

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

export class PlayerCard extends PlayerCardBase {
  private readonly dan: HTMLElement;
  private readonly quan: HTMLElement;
  private readonly delta: HTMLElement;
  private readonly score: HTMLElement;
  private readonly matchPill: HTMLElement;

  constructor() {
    super(
      `<div class="kho" data-detail><span class="ddot"></span><span data-dan></span> · <span class="qdot"></span><span data-quan></span><span class="delta" hidden></span></div>`,
      `<div class="score">
        <b></b><span class="tiny muted">điểm</span>
        <span class="match-pill" hidden></span>
      </div>`,
    );
    this.dan = this.$("[data-dan]");
    this.quan = this.$("[data-quan]");
    this.delta = this.$(".delta");
    this.score = this.$(".score b");
    this.matchPill = this.$(".match-pill");
  }

  render(who: PlayerIdentity, state: CardState): void {
    this.renderBase(who, { you: state.you, active: state.active, offline: state.offline ?? false });
    this.dan.textContent = `${state.pile.dan} dân`;
    this.quan.textContent = `${state.pile.quan} quan`;
    this.score.textContent = String(state.points);
    if (state.matchProgress) {
      this.matchPill.hidden = false;
      this.matchPill.textContent = `Tổng ${state.matchProgress.total}/${state.matchProgress.target}`;
    } else {
      this.matchPill.hidden = true;
    }
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
