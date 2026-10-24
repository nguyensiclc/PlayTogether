// Nhật ký ván Tiến lên: biến sự kiện của server thành dòng chữ.

import type { SeatId } from "@playtogether/engine";
import type { Card, ComboKind, GameEvent } from "@playtogether/engine/tien-len";
import { cardName } from "@playtogether/engine/tien-len";
import type { LogEntry } from "../game-ui/log-view.ts";

const KIND_LABEL: Record<ComboKind, string> = {
  le: "lẻ",
  doi: "đôi",
  ba: "ba",
  tuQuy: "tứ quý",
  sanh: "sảnh",
  doiThong: "đôi thông",
};

export const kindLabel = (kind: ComboKind): string => KIND_LABEL[kind];

/** "7♦ 7♥" */
export const cardsText = (cards: readonly Card[]): string => cards.map(cardName).join(" ");

const RANK_NAME = ["nhất", "nhì", "ba", "bét"];
const MEDAL = ["🥇", "🥈", "🥉"];

/** Các dòng nhật ký của một nước đi; `n` là số thứ tự nước, `nameOf` đổi ghế thành tên người chơi */
export function logEntries(events: readonly GameEvent[], n: number, nameOf: (seat: SeatId) => string): LogEntry[] {
  const out: LogEntry[] = [];
  for (const e of events) {
    switch (e.type) {
      case "play":
        out.push({
          n,
          who: nameOf(e.seat),
          text: `${e.cut ? "chặt bằng" : "đánh"} ${kindLabel(e.kind)} ${cardsText(e.cards)}`,
          ...(e.cut ? { ev: "Chặt!" } : {}),
        });
        break;
      case "pass":
        out.push({ n, who: nameOf(e.seat), text: "bỏ lượt" });
        break;
      case "out":
        out.push({
          n,
          who: nameOf(e.seat),
          text: `hết bài, về ${RANK_NAME[e.rank - 1] ?? e.rank}`,
          ev: MEDAL[e.rank - 1] ?? "",
        });
        break;
      case "left":
        out.push({ n, who: nameOf(e.seat), text: "đã rời ván" });
        break;
      case "newRound":
        out.push({ n, who: nameOf(e.leader), text: "đi tự do (vòng mới)" });
        break;
      case "toiTrang":
        out.push({ n, who: nameOf(e.seat), text: "tới trắng" });
        break;
    }
  }
  return out;
}
