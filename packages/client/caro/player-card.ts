// Thẻ người chơi của Cờ caro (docs/design/caro/ban-choi.html): avatar, tên, quân đang cầm, biểu tượng quân.
// Dùng lại class `.player` của bàn Ô ăn quan; chỉ hiển thị, không chứa logic ván.

import type { Mark } from "@playtogether/engine/caro";
import { $, create } from "../dom.ts";
import type { PlayerIdentity } from "../o-an-quan/player-card.ts";

export const MARK_CHAR: Record<Mark, string> = { 0: "✕", 1: "◯" };

const MARK_ICON: Record<Mark, string> = {
  0: '<path d="M5 5l14 14M19 5L5 19" stroke="var(--primary)" stroke-width="3" stroke-linecap="round"/>',
  1: '<circle cx="12" cy="12" r="7" fill="none" stroke="var(--cat-bai)" stroke-width="3"/>',
};

export interface CaroCardState {
  mark: Mark;
  /** Số quân đã đặt */
  placed: number;
  /** Số ván đã thắng trong phòng (tỉ số giữa hai người) */
  wins: number;
  /** Chưa ai đi: người cầm X hiện "đi trước" */
  fresh: boolean;
  /** Thẻ của "bạn" (người ngồi dưới) */
  you: boolean;
  /** Đang đến lượt: viền vàng */
  active: boolean;
  /** Mất kết nối: avatar mờ, hiện "Mất kết nối" thay cho dòng quân */
  offline: boolean;
}

export class CaroPlayerCard {
  readonly el: HTMLElement;
  private readonly avatar: HTMLElement;
  private readonly name: HTMLElement;
  private readonly you: HTMLElement;
  private readonly sub: HTMLElement;
  private readonly reconn: HTMLElement;
  private readonly wins: HTMLElement;
  private readonly icon: SVGElement;

  constructor() {
    this.el = create("div", "player");
    this.el.innerHTML = `
      <span class="avatar"></span>
      <div class="info">
        <div class="name"><span data-name></span><span class="small muted" data-you> (bạn)</span></div>
        <div class="small muted" data-sub></div>
        <div class="reconn" hidden>Mất kết nối</div>
      </div>
      <div class="score" title="Số ván thắng"><b data-wins></b><span class="tiny muted">thắng</span></div>
      <svg class="mark" viewBox="0 0 24 24" aria-hidden="true"></svg>`;
    this.avatar = $(this.el, ".avatar");
    this.name = $(this.el, "[data-name]");
    this.you = $(this.el, "[data-you]");
    this.sub = $(this.el, "[data-sub]");
    this.reconn = $(this.el, ".reconn");
    this.wins = $(this.el, "[data-wins]");
    this.icon = this.el.querySelector("svg") as SVGElement;
  }

  render(who: PlayerIdentity, s: CaroCardState): void {
    this.avatar.className = `avatar ${who.avatarClass}`;
    this.avatar.textContent = who.initials;
    this.name.textContent = who.name;
    this.you.hidden = !s.you;
    this.wins.textContent = String(s.wins);
    const tail = s.fresh && s.mark === 0 ? "đi trước" : `đã đặt ${s.placed}`;
    this.sub.textContent = `Quân ${MARK_CHAR[s.mark]} · ${tail}`;
    this.icon.innerHTML = MARK_ICON[s.mark];
    this.el.classList.toggle("active", s.active);
    this.el.classList.toggle("offline", s.offline);
    this.sub.hidden = s.offline;
    this.reconn.hidden = !s.offline;
  }
}
