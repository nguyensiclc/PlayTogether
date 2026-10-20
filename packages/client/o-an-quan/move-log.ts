// Nhật ký ván: mô tả ngắn từng nước đi từ `events` (thiết kế ban-choi-desktop, ban-choi-doi-thu).
import { isQuanSquare } from "@playtogether/engine/o-an-quan";
import type { EndReason, GameEvent, Move } from "@playtogether/engine/o-an-quan";

export interface LogEntry {
  /** Số lượt (nước rải thứ mấy của ván) */
  n: number;
  who: string;
  text: string;
  /** Điểm vừa ăn, hiện "+N" màu xanh */
  gain?: number;
  /** Sự kiện đặc biệt, hiện màu đỏ (vd "−5" khi bù dân) */
  ev?: string;
}

export const END_TITLE: Record<EndReason, string> = {
  "het-quan": "Hết quan",
  "khong-du-bu-dan": "Không đủ điểm bù dân",
  "lap-nuoc": "Lặp nước 3 lần",
  "het-gio": "Hết giờ",
  "bo-cuoc": "Bỏ cuộc",
};

const squareName = (i: number): string => (isQuanSquare(i) ? `ô quan ${i}` : `ô ${i}`);

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
  let outcome: string;
  if (caps.length === 1) {
    outcome = `ăn ${squareName(caps[0]!.i)}`;
  } else if (caps.length > 1) {
    outcome = `ăn liên hoàn ${caps.length} ô`;
  } else if (end?.reason === "gap-o-quan") {
    outcome = "gặp ô quan, hết lượt";
  } else if (end?.reason === "hai-o-trong") {
    outcome = "hai ô trống, hết lượt";
  } else if (end?.reason === "quan-non") {
    outcome = "gặp Quan Già, hết lượt";
  } else {
    outcome = "hết lượt";
  }
  if (caps.length && end?.reason === "quan-non") outcome += ", dừng trước Quan Già";

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

/** Dòng nhật ký khi người đi sau chọn giữ bên (không lật bàn). */
export function keepSideEntry(n: number, who: string): LogEntry {
  return { n, who, text: "chọn giữ bên, không lật bàn" };
}
