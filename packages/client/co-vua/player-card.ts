// Thẻ người chơi Cờ vua: avatar, tên, quân cờ (Trắng/Đen), tỉ số ván thắng.

import type { Color, PieceType } from "@playtogether/engine/co-vua";
import { PlayerCardBase } from "../game-ui/player-card-base.ts";
import type { PlayerIdentity } from "../game-ui/result-parts.ts";

export interface CoVuaCardState {
  color: Color;
  wins: number;
  captured: PieceType[];
  diff: number; // Điểm chênh lệch (dương là ưu thế)
  you: boolean;
  active: boolean;
  offline: boolean;
}

const PIECE_SYMBOLS: Record<PieceType, string> = {
  p: "♙",
  n: "♘",
  b: "♗",
  r: "♖",
  q: "♕",
  k: "♔",
};

export class CoVuaPlayerCard extends PlayerCardBase {
  private readonly sub: HTMLElement;
  private readonly wins: HTMLElement;
  private readonly badge: HTMLElement;

  constructor() {
    super(
      `<div class="small muted" data-detail data-sub></div>`,
      `<div class="score" title="Số ván thắng"><b data-wins></b><span class="tiny muted">thắng</span></div>
       <span class="chess-badge" data-badge></span>`,
    );
    this.sub = this.$("[data-sub]");
    this.wins = this.$("[data-wins]");
    this.badge = this.$("[data-badge]");
  }

  render(who: PlayerIdentity, s: CoVuaCardState): void {
    this.renderBase(who, { you: s.you, active: s.active, offline: s.offline });
    this.wins.textContent = String(s.wins);

    const colorName = s.color === "w" ? "Trắng (đi trước)" : "Đen";
    let capturedText = "";
    if (s.captured.length > 0) {
      capturedText = ` · Ăn: ${s.captured.map((t) => PIECE_SYMBOLS[t]).join("")}`;
      if (s.diff > 0) capturedText += ` +${s.diff}`;
    }

    this.sub.textContent = `Bên ${colorName}${capturedText}`;
    this.badge.className = `chess-badge ${s.color}`;
    this.badge.textContent = s.color === "w" ? "♔" : "♚";
  }
}

