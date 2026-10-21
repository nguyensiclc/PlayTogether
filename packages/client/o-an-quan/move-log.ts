// Nhật ký ván: mô tả ngắn từng nước đi từ `events` (thiết kế ban-choi-desktop, ban-choi-doi-thu).

import type { EndReason, GameEvent, Move, TurnEndReason } from "@playtogether/engine/o-an-quan";
import { isQuanSquare } from "@playtogether/engine/o-an-quan";
import type { LogEntry } from "../game-ui/log-view.ts";

export const END_TITLE: Record<EndReason, string> = {
  "het-quan": "Hết quan",
  "khong-du-bu-dan": "Không đủ điểm bù dân",
  "lap-nuoc": "Lặp nước 3 lần",
  "het-gio": "Hết giờ",
  "bo-cuoc": "Bỏ cuộc",
};

const squareName = (i: number): string => (isQuanSquare(i) ? `ô quan ${i}` : `ô ${i}`);

/** Lượt không ăn được gì thì tả theo lý do hết lượt (luật mục 3 trường hợp b, d; mục 5) */
const NO_CAPTURE_TEXT: Record<TurnEndReason, string> = {
  "gap-o-quan": "gặp ô quan, hết lượt",
  "hai-o-trong": "hai ô trống, hết lượt",
  "quan-non": "gặp Quan Già, hết lượt",
  "het-an": "hết lượt",
};

/**
 * Mô tả một nước đi.
 * @param n số lượt của nước này
 * @param who tên người đi
 * @param nameOfSide tên người đang điều khiển từng bên (sau nước đi), dùng cho dòng bù dân / lật bàn
 */
export function describeMove(
  n: number,
  who: string,
  move: Move,
  events: readonly GameEvent[],
  giaTriQuan: number,
  nameOfSide: (side: 0 | 1) => string,
): LogEntry[] {
  const out: LogEntry[] = [];

  if (move.kind === "latBan") {
    out.push({ n, who, text: "lật bàn, đổi bên với đối thủ" });
    return out;
  }

  const caps = events.filter((e) => e.t === "capture");
  const end = events.find((e) => e.t === "turnEnd");
  const outcome = outcomeText(
    caps.map((e) => e.i),
    end?.reason,
  );
  const gain = caps.reduce((sum, e) => sum + e.dan + e.quan * giaTriQuan, 0);
  out.push({ n, who, text: `rải ô ${move.square} → ${outcome}`, ...(gain > 0 ? { gain } : {}) });

  for (const e of events) {
    if (e.t === "buDan") {
      out.push({ n, who: nameOfSide(e.seat), text: `hết dân, bù dân${e.doiQuan ? " (đổi 1 quan)" : ""}`, ev: "−5" });
    } else if (e.t === "gameOver") {
      out.push({ n, who: "", text: `Hết ván · ${END_TITLE[e.result.reason as EndReason]}` });
    }
  }
  return out;
}

/** Câu tả lượt rải kết thúc thế nào, theo các ô bị ăn và lý do hết lượt. */
function outcomeText(captured: readonly number[], end: TurnEndReason | undefined): string {
  const [first] = captured;
  if (first === undefined) return end ? NO_CAPTURE_TEXT[end] : "hết lượt";
  const ate = captured.length === 1 ? `ăn ${squareName(first)}` : `ăn liên hoàn ${captured.length} ô`;
  return end === "quan-non" ? `${ate}, dừng trước Quan Già` : ate;
}

/** Dòng nhật ký khi người đi sau chọn giữ bên (không lật bàn). */
export function keepSideEntry(n: number, who: string): LogEntry {
  return { n, who, text: "chọn giữ bên, không lật bàn" };
}
