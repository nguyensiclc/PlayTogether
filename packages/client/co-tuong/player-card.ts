// Thẻ người chơi của Cờ tướng (docs/design/co-tuong/mockup-1.jpg): avatar, tên, bên đang cầm, quân đã bắt.
// Dùng lại class `.player`; chỉ hiển thị, không chứa logic ván.

import type { Piece, Side } from "@playtogether/engine/co-tuong";
import { PlayerCardBase } from "../game-ui/player-card-base.ts";
import type { PlayerIdentity } from "../game-ui/result-parts.ts";
import { KIND_LABEL, PIECE_GLYPH } from "./board-svg.ts";

export const SIDE_NAME: Record<Side, string> = { 0: "Đỏ", 1: "Đen" };

export interface CoTuongCardState {
  side: Side;
  /** Quân của đối phương mà người này đã bắt, theo thứ tự */
  captured: readonly Piece[];
  /** Số ván đã thắng trong phòng (tỉ số giữa hai người) */
  wins: number;
  /** Chưa ai đi: Đỏ hiện "đi trước" */
  fresh: boolean;
  /** Thẻ của "bạn" (người ngồi dưới) */
  you: boolean;
  /** Đang đến lượt: viền vàng */
  active: boolean;
  /** Mất kết nối: avatar mờ, hiện "Mất kết nối" thay cho dòng quân */
  offline: boolean;
}

/** Quân đã bắt, mỗi quân một chip nhỏ cùng màu bên bị bắt */
const capturedHtml = (captured: readonly Piece[]): string =>
  captured
    .map(
      (p) =>
        `<span class="cap ${p.side === 0 ? "red" : "black"}" title="${KIND_LABEL[p.kind]}">${PIECE_GLYPH[p.side][p.kind]}</span>`,
    )
    .join("");

export class CoTuongPlayerCard extends PlayerCardBase {
  private readonly sub: HTMLElement;
  private readonly caps: HTMLElement;
  private readonly wins: HTMLElement;
  private readonly badge: HTMLElement;

  constructor() {
    super(
      `<div data-detail><div class="small muted" data-sub></div><div class="caps" data-caps></div></div>`,
      `<div class="score" title="Số ván thắng"><b data-wins></b><span class="tiny muted">thắng</span></div>
      <span class="side-badge" data-badge></span>`,
    );
    this.sub = this.$("[data-sub]");
    this.caps = this.$("[data-caps]");
    this.wins = this.$("[data-wins]");
    this.badge = this.$("[data-badge]");
  }

  render(who: PlayerIdentity, s: CoTuongCardState): void {
    this.renderBase(who, { you: s.you, active: s.active, offline: s.offline });
    this.wins.textContent = String(s.wins);
    const tail = s.fresh && s.side === 0 ? "đi trước" : `đã bắt ${s.captured.length} quân`;
    this.sub.textContent = `Quân ${SIDE_NAME[s.side].toLowerCase()} · ${tail}`;
    this.caps.innerHTML = capturedHtml(s.captured);
    this.badge.textContent = SIDE_NAME[s.side];
    this.badge.className = `side-badge ${s.side === 0 ? "red" : "black"}`;
  }
}
