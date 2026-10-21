// Nội dung màn kết quả ván Cờ tướng (docs/design/co-tuong/mockup-4.jpg; UX mục 5).
// Điện thoại hiển thị dạng thẻ phủ lên bàn, desktop dạng modal hai cột; khác biệt nằm ở CSS.

import type { GameResult, SeatId } from "@playtogether/engine";
import type { EndReason, Piece, ScoreDetail } from "@playtogether/engine/co-tuong";
import { escapeHtml } from "../dom.ts";
import { type PlayerIdentity, rematchHtml, resultTitle, resultTrophy } from "../game-ui/result-parts.ts";
import { boardSvg } from "./board-svg.ts";
import { SIDE_NAME } from "./player-card.ts";

export interface ResultViewData {
  result: GameResult;
  /** Thế cờ cuối ván, vẽ thu nhỏ */
  cells: readonly (Piece | null)[];
  last: { from: number; to: number } | null;
  identityOf: (seat: SeatId) => PlayerIdentity;
  /** Ghế của người xem màn hình; null = người xem */
  mySeat: SeatId | null;
  /** Người cầm Đỏ ván sau (người thua, hoặc đổi lượt nếu hoà) */
  nextFirst: SeatId | null;
  /** Số ván thắng của từng ghế, đã tính cả ván vừa xong */
  wins: readonly number[];
  /** Ghế những người đã bấm Ván nữa */
  rematchSeats: readonly SeatId[];
}

const REASON_CHIP: Record<EndReason, string> = {
  "chieu-bi": "Chiếu bí",
  "het-nuoc": "Hết nước đi",
  "lap-the": "Lặp thế cờ, hoà",
  "bo-cuoc": "Bỏ cuộc",
  "het-gio": "Hết giờ",
};

/**
 * HTML của màn kết quả. Có các nút `[data-again]` (Ván nữa), `[data-lobby]` (Về phòng chờ), `[data-leave]` (Rời phòng).
 */
export function resultHtml(d: ResultViewData): string {
  const detail = d.result.detail as ScoreDetail;
  const reason = d.result.reason as EndReason;
  const label = (seat: SeatId) => (seat === d.mySeat ? "Bạn" : escapeHtml(d.identityOf(seat).name));
  const [redSeat, blackSeat] = detail.marks;
  // Người xem màn hình đứng bên trái ("Bạn" trước)
  const order = d.mySeat === blackSeat ? ([blackSeat, redSeat] as const) : ([redSeat, blackSeat] as const);
  const sideName = (seat: SeatId) => SIDE_NAME[seat === redSeat ? 0 : 1];
  const names = order.map((s) => escapeHtml(d.identityOf(s).name)).join(" · ");
  const mini = boardSvg({ cells: d.cells, last: d.last, flipped: d.mySeat === blackSeat });

  return `
    <div class="side-hero">
      <div class="trophy">${resultTrophy(d.result.winner, d.mySeat)}</div>
      <h1 id="result-title">${resultTitle(d.result.winner, d.mySeat, d.identityOf)}</h1>
      <span class="chip reason">${REASON_CHIP[reason]}</span>
      <p class="why">${explainReason(reason, d.result.winner, label)}</p>
      <span class="small muted desk-only">${names}</span>
    </div>
    <div class="detail">
      <div class="mini"><div class="ct-board">${mini}</div></div>
      <div class="facts score-line">
        <span>Tỉ số <b>${order.map((s) => `${label(s)} ${d.wins[s] ?? 0}`).join(" – ")}</b></span>
      </div>
      <div class="facts">
        <span>Số nước <b>${detail.moves}</b></span>
        <span>${order.map((s) => `${label(s)} cầm <b>${sideName(s)}</b>`).join(" · ")}</span>
      </div>
      ${rematchHtml(d)}
      <div class="acts">
        <button class="btn sm" type="button" data-lobby>Về phòng chờ</button>
        <button class="btn sm" type="button" data-leave>Rời phòng</button>
      </div>
    </div>`;
}

/** Câu giải thích thêm cho những lý do kết thúc dễ gây thắc mắc */
function explainReason(reason: EndReason, winner: SeatId | null, label: (seat: SeatId) => string): string {
  if (reason === "het-nuoc") return "Hết nước đi mà tướng chưa bị chiếu cũng tính là thua.";
  if (reason === "lap-the") return "Cùng một thế cờ lặp lại 3 lần.";
  if (winner === null) return "";
  const loser = label(winner === 0 ? 1 : 0);
  if (reason === "bo-cuoc") return `${loser} đã xin thua hoặc rời phòng giữa ván.`;
  if (reason === "het-gio") return `${loser} hết giờ đi.`;
  return "";
}
