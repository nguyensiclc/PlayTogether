// Nội dung màn kết quả ván Cờ caro (docs/design/caro/ket-qua*.html; UX mục 5).
// Điện thoại hiển thị dạng thẻ phủ lên bàn, desktop dạng modal hai cột; khác biệt nằm ở CSS.

import type { GameResult, SeatId } from "@playtogether/engine";
import type { EndReason, Mark, ScoreDetail } from "@playtogether/engine/caro";
import { escapeHtml } from "../dom.ts";
import type { PlayerIdentity } from "../o-an-quan/player-card.ts";
import { boardSvg } from "./board-svg.ts";

export interface ResultViewData {
  result: GameResult;
  /** Thế cờ cuối ván, vẽ thu nhỏ */
  size: number;
  cells: readonly (Mark | null)[];
  identityOf: (seat: SeatId) => PlayerIdentity;
  /** Ghế của người xem màn hình; null = người xem */
  mySeat: SeatId | null;
  /** Người đi trước ván sau (người thua, hoặc đổi lượt nếu hoà — luật mục 6) */
  nextFirst: SeatId | null;
  /** Ghế những người đã bấm Ván nữa */
  rematchSeats: readonly SeatId[];
}

const REASON_CHIP: Record<EndReason, string> = {
  "nam-quan": "5 quân liên tiếp",
  "het-ban": "Hết bàn, hoà",
  "bo-cuoc": "Đối thủ rời phòng",
  "het-gio": "Hết giờ",
};

/** Số nước mỗi bên đã đi: X đi trước nên luôn nhiều hơn hoặc bằng O */
export function movesByMark(total: number): [x: number, o: number] {
  return [Math.ceil(total / 2), Math.floor(total / 2)];
}

/**
 * HTML của màn kết quả. Có các nút `[data-again]` (Ván nữa), `[data-lobby]` (Về phòng chờ), `[data-leave]` (Rời phòng).
 */
export function resultHtml(d: ResultViewData): string {
  const detail = d.result.detail as ScoreDetail;
  const reason = d.result.reason as EndReason;
  const label = (seat: SeatId) => (seat === d.mySeat ? "Bạn" : escapeHtml(d.identityOf(seat).name));
  const [xMoves, oMoves] = movesByMark(detail.moves);
  const [xSeat, oSeat] = detail.marks;
  // Người xem màn hình đứng bên trái ("Bạn" trước)
  const order = d.mySeat === oSeat ? ([oSeat, xSeat] as const) : ([xSeat, oSeat] as const);
  const movesOf = (seat: SeatId) => (seat === xSeat ? xMoves : oMoves);
  const why = explainReason(reason, d.result.winner, label);
  const names = order.map((s) => escapeHtml(d.identityOf(s).name)).join(" · ");
  const mini = boardSvg({ size: d.size, cells: d.cells, last: null, winLine: detail.line ?? [], preview: null });

  return `
    <div class="side-hero">
      <div class="trophy">${trophy(d.result.winner, d.mySeat)}</div>
      <h1 id="result-title">${title(d.result.winner, d.mySeat, d.identityOf)}</h1>
      <span class="chip reason">${REASON_CHIP[reason]}</span>
      ${why ? `<p class="why">${why}</p>` : ""}
      <span class="small muted desk-only">${names}</span>
    </div>
    <div class="detail">
      <div class="mini"><div class="caro-board">${mini}</div></div>
      <div class="facts">
        <span>Số nước <b>${detail.moves}</b></span>
        <span>${order.map((s) => `${label(s)} đi <b>${movesOf(s)}</b>`).join(" · ")}</span>
      </div>
      ${rematchHtml(d)}
      <div class="acts">
        <button class="btn sm" type="button" data-lobby>Về phòng chờ</button>
        <button class="btn sm" type="button" data-leave>Rời phòng</button>
      </div>
    </div>`;
}

/** Dòng "… muốn chơi ván nữa" và nút Ván nữa theo trạng thái bỏ phiếu */
function rematchHtml(d: ResultViewData): string {
  const ready = d.rematchSeats
    .filter((s) => s !== d.mySeat)
    .map((s) => {
      const who = d.identityOf(s);
      return `<div class="ready"><span class="avatar sm ${who.avatarClass}">${escapeHtml(who.initials)}</span>${escapeHtml(who.name)} muốn chơi ván nữa</div>`;
    })
    .join("");
  if (d.mySeat === null) return ready;
  if (d.rematchSeats.includes(d.mySeat)) {
    return `${ready}<button class="btn primary block" type="button" disabled data-again>Đang chờ đối thủ bấm Ván nữa…</button>`;
  }
  const first =
    d.nextFirst === null
      ? ""
      : ` · ${d.nextFirst === d.mySeat ? "Bạn" : escapeHtml(d.identityOf(d.nextFirst).name)} đi trước`;
  return `${ready}<button class="btn primary block" type="button" data-again>Ván nữa${first} <kbd class="desk-only">Enter</kbd></button>`;
}

function title(winner: SeatId | null, mySeat: SeatId | null, identityOf: (s: SeatId) => PlayerIdentity): string {
  if (winner === null) return "Hoà!";
  if (mySeat === null) return `${escapeHtml(identityOf(winner).name)} thắng!`;
  return winner === mySeat ? "Bạn thắng!" : "Bạn thua";
}

function trophy(winner: SeatId | null, mySeat: SeatId | null): string {
  if (winner === null) return "🤝";
  return mySeat !== null && winner !== mySeat ? "🙂" : "🏆";
}

/** Câu giải thích thêm cho những lý do kết thúc dễ gây thắc mắc */
function explainReason(reason: EndReason, winner: SeatId | null, label: (seat: SeatId) => string): string {
  if (winner === null) return "";
  const loser = label(winner === 0 ? 1 : 0);
  if (reason === "bo-cuoc") return `${loser} đã rời phòng giữa ván.`;
  if (reason === "het-gio") return `${loser} hết giờ đi.`;
  return "";
}
