// Nội dung màn kết quả ván (docs/design/o-an-quan/ket-qua*.html; UX mục 2.5).
// Điện thoại hiển thị dạng thẻ phủ lên bàn, desktop dạng modal hai cột; khác biệt nằm ở CSS.

import type { GameResult, SeatId } from "@playtogether/engine";
import type { EndReason, ScoreDetail } from "@playtogether/engine/o-an-quan";
import { escapeHtml } from "../dom.ts";
import type { PlayerIdentity } from "./player-card.ts";

export interface ResultViewData {
  result: GameResult;
  giaTriQuan: number;
  identityOf: (seat: SeatId) => PlayerIdentity;
  /** Người đi trước ván sau (người thua, hoặc đổi lượt nếu hoà — luật mục 2) */
  nextFirst: SeatId;
}

const REASON_CHIP: Record<EndReason, string> = {
  "het-quan": "Hết quan · thu dân về",
  "khong-du-bu-dan": "Không đủ điểm bù dân",
  "lap-nuoc": "Lặp nước 3 lần",
  "het-gio": "Hết giờ",
  "bo-cuoc": "Bỏ cuộc",
};

/**
 * HTML của màn kết quả. Có các nút `[data-again]` (Ván nữa), `[data-setup]` (Đổi tuỳ chọn)
 * và link về trang chủ. Ván có đúng hai người chơi, ghế 0 và 1.
 */
export function resultHtml({ result, giaTriQuan, identityOf, nextFirst }: ResultViewData): string {
  const reason = result.reason as EndReason;
  const [d0, d1] = result.detail as [ScoreDetail, ScoreDetail];
  const [p0, p1] = [identityOf(0), identityOf(1)];
  const name = (seat: SeatId) => escapeHtml(identityOf(seat).name);
  const draw = result.winner === null;
  const title = result.winner === null ? "Hoà!" : `${name(result.winner)} thắng!`;
  const why = explainReason(reason, result.winner, name);
  const win = (seat: SeatId) => (result.winner === seat ? ' class="win"' : "");
  const row = (label: string, f: (d: ScoreDetail) => string, cls = "") =>
    `<tr${cls ? ` class="${cls}"` : ""}><th>${label}</th><td>${f(d0)}</td><td>${f(d1)}</td></tr>`;
  const vsPlayer = (seat: SeatId, who: PlayerIdentity, d: ScoreDetail) =>
    `<div class="p${result.winner === seat ? " win" : ""}"><span class="avatar ${who.avatarClass}">${escapeHtml(who.initials)}</span><span class="small">${escapeHtml(who.name)}</span><b>${d.total}</b></div>`;

  return `
    <div class="side-hero">
      <div class="trophy">${draw ? "🤝" : "🏆"}</div>
      <h1 id="result-title">${title}</h1>
      <span class="chip reason">${REASON_CHIP[reason]}</span>
      ${why ? `<p class="why">${why}</p>` : ""}
      <div class="score"><b${win(0)}>${d0.total}</b><span>–</span><b${win(1)}>${d1.total}</b></div>
      <span class="small muted desk-only">${name(0)} · ${name(1)}</span>
    </div>
    <div class="detail">
      <div class="vs">${vsPlayer(0, p0, d0)}<span class="sep">–</span>${vsPlayer(1, p1, d1)}</div>
      <table>
        <thead><tr><th></th><td>${name(0)}</td><td>${name(1)}</td></tr></thead>
        <tbody>
          ${row("Dân đã ăn", (d) => String(d.dan))}
          ${row(`Quan đã ăn (×${giaTriQuan})`, (d) => `${d.quan} · ${d.quan * giaTriQuan}`)}
          ${row("Bù dân", (d) => (d.buDan ? `${d.buDan} lần` : "0"))}
          ${row("Dân thu cuối ván", (d) => String(d.rowDan))}
          ${row("Tổng", (d) => String(d.total), "total")}
        </tbody>
      </table>
      <button class="btn primary block" type="button" data-again>Ván nữa · ${name(nextFirst)} đi trước <kbd class="desk-only">Enter</kbd></button>
      <div class="acts">
        <button class="btn sm" type="button" data-setup>Đổi tuỳ chọn</button>
        <a class="btn sm" href="/">Về trang chủ</a>
      </div>
    </div>`;
}

/** Câu giải thích thêm cho những lý do kết thúc dễ gây thắc mắc */
function explainReason(reason: EndReason, winner: SeatId | null, name: (seat: SeatId) => string): string {
  if (reason === "lap-nuoc") return "Quân còn trong ô quan không được tính.";
  if (reason !== "khong-du-bu-dan" || winner === null) return "";
  // Người thua "không đủ bù dân" có thể nhiều điểm hơn, nên cần nói rõ (luật mục 7)
  return `${name(winner === 0 ? 1 : 0)} hết dân nhưng kho dưới 5 điểm nên thua.`;
}
