// Nội dung màn kết quả ván Tiến lên: bảng xếp hạng nhất đến bét (docs/tien-len/02-thiet-ke-ux.md mục 5).

import type { GameResult, SeatId } from "@playtogether/engine";
import type { Card, ToiTrangKind } from "@playtogether/engine/tien-len";
import { escapeHtml } from "../dom.ts";
import { avatarHtml, type PlayerIdentity, rematchHtml } from "../game-ui/result-parts.ts";
import { cardHtml } from "./card-view.ts";

export interface TienLenResultData {
  result: GameResult;
  /** Bài còn lại của từng ghế (lộ khi hết ván) */
  revealed: readonly Card[][];
  toiTrang: { seat: SeatId; kind: ToiTrangKind } | null;
  identityOf: (seat: SeatId) => PlayerIdentity;
  mySeat: SeatId | null;
  nextFirst: SeatId | null;
  rematchSeats: readonly SeatId[];
}

const MEDAL = ["🥇", "🥈", "🥉", "4"];
const RANK_TITLE = ["nhất", "nhì", "ba", "bét"];
const TOI_TRANG_LABEL: Record<ToiTrangKind, string> = {
  tuQuyHeo: "tứ quý heo",
  sanhRong: "sảnh rồng",
  sauDoi: "sáu đôi",
};

const REASON_CHIP: Record<string, string> = {
  "het-bai": "Hết bài",
  "toi-trang": "Tới trắng",
  "doi-thu-roi": "Mọi người khác đã rời ván",
};

/** Tiêu đề theo hạng của người xem; người xem không ngồi ghế thì nêu tên người nhất */
function title(d: TienLenResultData, ranking: readonly SeatId[]): string {
  const first = ranking[0];
  if (d.mySeat === null) return first === undefined ? "Hết ván" : `${escapeHtml(d.identityOf(first).name)} về nhất!`;
  const idx = ranking.indexOf(d.mySeat);
  if (idx === 0) return "Bạn về nhất!";
  const last = idx === ranking.length - 1;
  return `Bạn về ${last ? "bét" : (RANK_TITLE[idx] ?? String(idx + 1))}`;
}

function trophy(d: TienLenResultData, ranking: readonly SeatId[]): string {
  const idx = d.mySeat === null ? 0 : ranking.indexOf(d.mySeat);
  return idx === 0 ? "🏆" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "🙂";
}

function rowHtml(d: TienLenResultData, seat: SeatId, i: number): string {
  const who = d.identityOf(seat);
  const left = d.revealed[seat] ?? [];
  const points = d.result.scores[seat] ?? 0;
  const cards =
    left.length > 0 ? `<div class="tl-left">${left.map((c) => cardHtml(c, { extra: "sm" })).join("")}</div>` : "";
  const you = seat === d.mySeat ? ' <span class="small muted">(bạn)</span>' : "";
  return `<li class="tl-rank-row${seat === d.mySeat ? " me" : ""}">
    <span class="medal">${MEDAL[i] ?? i + 1}</span>${avatarHtml(who)}
    <div class="info"><b>${escapeHtml(who.name)}</b>${you}${cards}</div>
    <span class="pts">+${points}</span>
  </li>`;
}

export function resultHtml(d: TienLenResultData): string {
  const ranking = d.result.ranking ?? [];
  const toi = d.toiTrang
    ? `<p class="why">${escapeHtml(d.identityOf(d.toiTrang.seat).name)} tới trắng: ${TOI_TRANG_LABEL[d.toiTrang.kind]}.</p>`
    : "";
  return `
    <div class="side-hero">
      <div class="trophy">${trophy(d, ranking)}</div>
      <h1 id="result-title">${title(d, ranking)}</h1>
      <span class="chip reason">${REASON_CHIP[d.result.reason] ?? "Kết thúc ván"}</span>
      ${toi}
    </div>
    <ol class="tl-ranking">${ranking.map((seat, i) => rowHtml(d, seat, i)).join("")}</ol>
    ${rematchHtml({ identityOf: d.identityOf, mySeat: d.mySeat, nextFirst: d.nextFirst, rematchSeats: d.rematchSeats })}
    <div class="acts">
      <button class="btn secondary" data-lobby>Về phòng chờ</button>
      <button class="btn ghost danger" data-leave>Rời phòng</button>
    </div>
  `;
}
