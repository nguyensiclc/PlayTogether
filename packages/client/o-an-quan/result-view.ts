// Nội dung màn kết quả ván (docs/design/o-an-quan/ket-qua*.html; UX mục 2.5).
// Điện thoại hiển thị dạng thẻ phủ lên bàn, desktop dạng modal hai cột; khác biệt nằm ở CSS.

import type { GameResult, SeatId } from "@playtogether/engine";
import type { EndReason, ScoreDetail } from "@playtogether/engine/o-an-quan";
import type { MatchScore } from "@playtogether/protocol";
import { escapeHtml } from "../dom.ts";
import type { PlayerIdentity } from "./player-card.ts";

export interface ResultViewData {
  result: GameResult;
  giaTriQuan: number;
  identityOf: (seat: SeatId) => PlayerIdentity;
  /** Ghế của người xem màn hình; null = người xem */
  mySeat: SeatId | null;
  /** Người đi trước ván sau (người thua, hoặc đổi lượt nếu hoà — luật mục 2) */
  nextFirst: SeatId | null;
  /** Ghế những người đã bấm Ván nữa */
  rematchSeats: readonly SeatId[];
  /** Điểm tích luỹ đấu trận (nếu có) */
  match?: MatchScore | null;
  /** Mốc điểm thắng của trận (nếu có) */
  targetScore?: number | null;
}

const REASON_CHIP: Record<EndReason, string> = {
  "het-quan": "Hết quan · thu dân về",
  "khong-du-bu-dan": "Không đủ điểm bù dân",
  "lap-nuoc": "Lặp nước 3 lần",
  "het-gio": "Hết giờ",
  "bo-cuoc": "Bỏ cuộc",
};

/**
 * HTML của màn kết quả. Có các nút `[data-again]` (Ván nữa), `[data-lobby]` (Về phòng chờ), `[data-leave]` (Rời phòng).
 * Ván có đúng hai người chơi, ghế 0 và 1.
 */
export function resultHtml(d: ResultViewData): string {
  const { result, giaTriQuan, match, targetScore } = d;
  const reason = result.reason as EndReason;
  const [d0, d1] = result.detail as [ScoreDetail, ScoreDetail];
  // Người xem màn hình đứng bên trái (UX: "Bạn" trước)
  const [left, right] = d.mySeat === 1 ? ([1, 0] as const) : ([0, 1] as const);
  const detailOf = (seat: SeatId) => (seat === 0 ? d0 : d1);
  const label = (seat: SeatId) => (seat === d.mySeat ? "Bạn" : escapeHtml(d.identityOf(seat).name));
  const isMatchWon = match?.winner !== undefined && match.winner !== null;
  const matchWinner = match?.winner ?? null;
  const win = (seat: SeatId) => {
    if (isMatchWon) return matchWinner === seat ? ' class="win"' : "";
    return result.winner === seat ? ' class="win"' : "";
  };
  const row = (title: string, f: (x: ScoreDetail) => string, cls = "") =>
    `<tr${cls ? ` class="${cls}"` : ""}><th>${title}</th><td>${f(detailOf(left))}</td><td>${f(detailOf(right))}</td></tr>`;
  const vsPlayer = (seat: SeatId) => {
    const who = d.identityOf(seat);
    const isWinner = isMatchWon ? matchWinner === seat : result.winner === seat;
    return `<div class="p${isWinner ? " win" : ""}"><span class="avatar ${who.avatarClass}">${escapeHtml(who.initials)}</span><span class="small">${label(seat)}</span><b>${detailOf(seat).total}</b></div>`;
  };
  const why = explainReason(reason, result.winner, (seat) => label(seat));

  const reasonChip = isMatchWon ? `Đạt mốc ${targetScore} điểm · Ván ${match?.round ?? 1}` : REASON_CHIP[reason];

  const matchRow =
    match && targetScore
      ? `<tr class="match-row"><th>Điểm tích luỹ (${targetScore}đ)</th><td><b>${match.scores[left] ?? 0}</b></td><td><b>${match.scores[right] ?? 0}</b></td></tr>`
      : "";

  return `
    <div class="side-hero">
      <div class="trophy">${trophy(result.winner, d.mySeat, matchWinner)}</div>
      <h1 id="result-title">${title(result.winner, d.mySeat, d.identityOf, matchWinner)}</h1>
      <span class="chip reason">${reasonChip}</span>
      ${match && !isMatchWon ? `<span class="chip reason" style="margin-top: 6px;">Trận ${targetScore}đ · Ván ${match.round}</span>` : ""}
      ${why ? `<p class="why">${why}</p>` : ""}
      <div class="score"><b${win(left)}>${detailOf(left).total}</b><span>–</span><b${win(right)}>${detailOf(right).total}</b></div>
      <span class="small muted desk-only">${label(left)} · ${label(right)}</span>
    </div>
    <div class="detail">
      <div class="vs">${vsPlayer(left)}<span class="sep">–</span>${vsPlayer(right)}</div>
      <table>
        <thead><tr><th></th><td>${label(left)}</td><td>${label(right)}</td></tr></thead>
        <tbody>
          ${row("Dân đã ăn", (x) => String(x.dan))}
          ${row(`Quan đã ăn (×${giaTriQuan})`, (x) => `${x.quan} · ${x.quan * giaTriQuan}`)}
          ${row("Bù dân", (x) => (x.buDan ? `${x.buDan} lần` : "0"))}
          ${row("Dân thu cuối ván", (x) => String(x.rowDan))}
          ${row("Tổng ván này", (x) => String(x.total), "total")}
          ${matchRow}
        </tbody>
      </table>
      ${rematchHtml(d)}
      <div class="acts">
        <button class="btn sm" type="button" data-lobby>Về phòng chờ</button>
        <button class="btn sm" type="button" data-leave>Rời phòng</button>
      </div>
    </div>`;
}

/** Dòng "… muốn chơi ván nữa" và nút Ván nữa theo trạng thái bỏ phiếu */
function rematchHtml(d: ResultViewData): string {
  const others = d.rematchSeats.filter((s) => s !== d.mySeat);
  const isMatchWon = d.match?.winner !== undefined && d.match?.winner !== null;
  const wantText = isMatchWon ? "chơi trận mới" : "chơi ván tiếp theo";
  const ready = others
    .map((s) => {
      const who = d.identityOf(s);
      return `<div class="ready"><span class="avatar sm ${who.avatarClass}">${escapeHtml(who.initials)}</span>${escapeHtml(who.name)} muốn ${wantText}</div>`;
    })
    .join("");
  if (d.mySeat === null) return ready;
  const btnLabel = isMatchWon ? "Trận mới" : d.match ? `Ván tiếp theo (Ván ${(d.match?.round ?? 1) + 1})` : "Ván nữa";
  const first =
    d.nextFirst === null
      ? ""
      : ` · ${d.nextFirst === d.mySeat ? "Bạn" : escapeHtml(d.identityOf(d.nextFirst).name)} đi trước`;
  const voted = d.rematchSeats.includes(d.mySeat);
  return voted
    ? `${ready}<button class="btn primary block" type="button" disabled data-again>Đang chờ đối thủ bấm…</button>`
    : `${ready}<button class="btn primary block" type="button" data-again>${btnLabel}${first} <kbd class="desk-only">Enter</kbd></button>`;
}

function title(
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

function trophy(winner: SeatId | null, mySeat: SeatId | null, matchWinner: SeatId | null = null): string {
  const w = matchWinner ?? winner;
  if (w === null) return "🤝";
  return mySeat !== null && w !== mySeat ? "🙂" : "🏆";
}

/** Câu giải thích thêm cho những lý do kết thúc dễ gây thắc mắc */
function explainReason(reason: EndReason, winner: SeatId | null, label: (seat: SeatId) => string): string {
  if (reason === "lap-nuoc") return "Quân còn trong ô quan không được tính.";
  if (winner === null) return "";
  const loser = label(winner === 0 ? 1 : 0);
  // Người thua "không đủ bù dân" có thể nhiều điểm hơn, nên cần nói rõ (luật mục 7)
  if (reason === "khong-du-bu-dan") return `${loser} hết dân nhưng kho dưới 5 điểm nên thua.`;
  if (reason === "bo-cuoc") return `${loser} đã rời phòng giữa ván.`;
  return "";
}
