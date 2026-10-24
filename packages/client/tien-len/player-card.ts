// Thẻ người chơi của bạn ở dưới bàn: avatar, tên, số lá còn lại, hạng khi đã hết bài.

import { PlayerCardBase } from "../game-ui/player-card-base.ts";
import type { PlayerIdentity } from "../game-ui/result-parts.ts";

export interface TienLenCardState {
  /** Số lá còn lại */
  left: number;
  /** Hạng khi đã hết bài (1 = nhất); null khi còn bài */
  rank: number | null;
  wins: number;
  you: boolean;
  active: boolean;
  offline: boolean;
}

const MEDAL = ["🥇", "🥈", "🥉", "4"];

export class TienLenPlayerCard extends PlayerCardBase {
  private readonly sub: HTMLElement;
  private readonly wins: HTMLElement;
  private readonly badge: HTMLElement;

  constructor() {
    super(
      `<div class="small muted" data-detail data-sub></div>`,
      `<div class="score" title="Số ván thắng"><b data-wins></b><span class="tiny muted">thắng</span></div>
       <span class="tl-badge" data-badge></span>`,
    );
    this.sub = this.$("[data-sub]");
    this.wins = this.$("[data-wins]");
    this.badge = this.$("[data-badge]");
  }

  render(who: PlayerIdentity, s: TienLenCardState): void {
    this.renderBase(who, { you: s.you, active: s.active, offline: s.offline });
    this.wins.textContent = String(s.wins);
    this.sub.textContent = s.rank !== null ? `Đã hết bài · hạng ${s.rank}` : `${s.left} lá còn lại`;
    this.badge.textContent = s.rank !== null ? (MEDAL[s.rank - 1] ?? String(s.rank)) : "";
    this.badge.hidden = s.rank === null;
  }
}
