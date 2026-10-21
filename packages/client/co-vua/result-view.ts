// Nội dung màn kết quả ván Cờ vua (docs/co-vua/02-thiet-ke-ux.md).

import type { GameResult, SeatId } from "@playtogether/engine";
import type { EndReason, Piece, ScoreDetail } from "@playtogether/engine/co-vua";
import { escapeHtml } from "../dom.ts";
import { type PlayerIdentity, rematchHtml, resultTitle, resultTrophy } from "../game-ui/result-parts.ts";
import { renderBoardSvg } from "./board-svg.ts";

export interface CoVuaResultData {
  result: GameResult;
  board: readonly (Piece | null)[];
  flipped: boolean;
  identityOf: (seat: SeatId) => PlayerIdentity;
  mySeat: SeatId | null;
  nextFirst: SeatId | null;
  wins: readonly number[];
  rematchSeats: readonly SeatId[];
}

const REASON_LABELS: Record<EndReason, string> = {
  "chieu-bi": "Chiếu bí (Checkmate)",
  "the-bi": "Thế bí / Hết nước đi (Stalemate)",
  "lap-3-lan": "Lặp thế cờ 3 lần",
  "50-nuoc": "Quy tắc 50 nước",
  "thieu-luc-luong": "Không đủ lực lượng chiếu bí",
  "hoa-thuan": "Hai bên thoả thuận hoà",
  "bo-cuoc": "Đối thủ đầu hàng / rời ván",
  "het-gio": "Hết giờ",
};

export function resultHtml(d: CoVuaResultData): string {
  const reason = d.result.reason as EndReason;
  const detail = d.result.detail as ScoreDetail | undefined;
  const reasonLabel = REASON_LABELS[reason] ?? "Kết thúc ván";

  const mini = renderBoardSvg({
    board: d.board,
    flipped: d.flipped,
    selectedSq: null,
    validDestinations: new Set(),
    lastMove: null,
    checkSq: null,
  });

  return `
    <div class="side-hero">
      <div class="trophy">${resultTrophy(d.result.winner, d.mySeat)}</div>
      <h1 id="result-title">${resultTitle(d.result.winner, d.mySeat, d.identityOf)}</h1>
      <span class="chip reason">${escapeHtml(reasonLabel)}</span>
      <div class="score-line">
        <span>Ván ${detail?.moves ?? 1}</span>
      </div>
    </div>
    <div class="mini-board-wrap">${mini}</div>
    ${rematchHtml({
      identityOf: d.identityOf,
      mySeat: d.mySeat,
      nextFirst: d.nextFirst,
      rematchSeats: d.rematchSeats,
    })}
    <div class="actions">
      <button class="btn primary" data-again>Ván nữa</button>
      <button class="btn secondary" data-lobby>Về phòng chờ</button>
      <button class="btn ghost danger" data-leave>Rời phòng</button>
    </div>
  `;
}
