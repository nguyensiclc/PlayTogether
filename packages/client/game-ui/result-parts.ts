// Các phần của màn kết quả dùng chung cho mọi game: tiêu đề thắng/thua, cúp, dòng "… muốn chơi ván nữa" và nút Ván nữa.
// Mỗi game tự dựng phần chi tiết riêng (bảng điểm, bàn thu nhỏ…) trong result-view.ts của mình.

import type { SeatId } from "@playtogether/engine";
import { escapeHtml } from "../dom.ts";

/** Tên, chữ trong avatar và class màu avatar của một người chơi */
export interface PlayerIdentity {
  name: string;
  /** Chữ trong avatar */
  initials: string;
  /** Class màu avatar trong style.css (av1, av3…) */
  avatarClass: string;
}

/** Trận nhiều ván (Đấu trận), nếu game có */
export interface MatchInfo {
  winner: SeatId | null;
  /** Số ván đã chơi xong */
  round: number;
}

export interface RematchData {
  identityOf: (seat: SeatId) => PlayerIdentity;
  /** Ghế của người xem màn hình; null = người xem */
  mySeat: SeatId | null;
  /** Người đi trước ván sau (luật của game quyết định) */
  nextFirst: SeatId | null;
  /** Ghế những người đã bấm Ván nữa */
  rematchSeats: readonly SeatId[];
  match?: MatchInfo | null;
}

/** Dòng "… muốn chơi ván nữa" và nút Ván nữa theo trạng thái bỏ phiếu; người xem không có nút */
export function rematchHtml(d: RematchData): string {
  const matchWon = d.match?.winner !== undefined && d.match?.winner !== null;
  const wantText = matchWon ? "chơi trận mới" : "chơi ván tiếp theo";
  const ready = d.rematchSeats
    .filter((s) => s !== d.mySeat)
    .map((s) => {
      const who = d.identityOf(s);
      return `<div class="ready"><span class="avatar sm ${who.avatarClass}">${escapeHtml(who.initials)}</span>${escapeHtml(who.name)} muốn ${wantText}</div>`;
    })
    .join("");
  if (d.mySeat === null) return ready;
  if (d.rematchSeats.includes(d.mySeat)) {
    return `${ready}<button class="btn primary block" type="button" disabled data-again>Đang chờ đối thủ bấm…</button>`;
  }
  const label = matchWon ? "Trận mới" : d.match ? `Ván tiếp theo (Ván ${d.match.round + 1})` : "Ván nữa";
  const first =
    d.nextFirst === null
      ? ""
      : ` · ${d.nextFirst === d.mySeat ? "Bạn" : escapeHtml(d.identityOf(d.nextFirst).name)} đi trước`;
  return `${ready}<button class="btn primary block" type="button" data-again>${label}${first} <kbd class="desk-only">Enter</kbd></button>`;
}

/** Tiêu đề kết quả: "Bạn thắng!", "Bạn thua", "Hoà!", hoặc "<tên> thắng!" khi đang xem. `matchWinner` = thắng chung cuộc. */
export function resultTitle(
  winner: SeatId | null,
  mySeat: SeatId | null,
  identityOf: (s: SeatId) => PlayerIdentity,
  matchWinner: SeatId | null = null,
): string {
  if (matchWinner !== null) {
    if (mySeat === null) return `${escapeHtml(identityOf(matchWinner).name)} thắng chung cuộc!`;
    return matchWinner === mySeat ? "Bạn thắng chung cuộc trận đấu!" : "Bạn thua trận đấu";
  }
  if (winner === null) return "Hoà!";
  if (mySeat === null) return `${escapeHtml(identityOf(winner).name)} thắng!`;
  return winner === mySeat ? "Bạn thắng!" : "Bạn thua";
}

export function resultTrophy(winner: SeatId | null, mySeat: SeatId | null, matchWinner: SeatId | null = null): string {
  const w = matchWinner ?? winner;
  if (w === null) return "🤝";
  return mySeat !== null && w !== mySeat ? "🙂" : "🏆";
}
