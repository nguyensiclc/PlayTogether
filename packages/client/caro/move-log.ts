// Nhật ký ván Cờ caro: mỗi nước một dòng "Bạn đặt ✕ vào cột 11, hàng 6" (cột và hàng đếm từ 1).
// Cùng hình dạng với LogEntry của Ô ăn quan nên dùng chung `logListHtml` / `logLineHtml`.

import type { Mark } from "@playtogether/engine/caro";
import { MARK_CHAR } from "./player-card.ts";

export interface CaroLogEntry {
  /** Nước thứ mấy của ván */
  n: number;
  who: string;
  text: string;
}

/** Người đi trước nhường lượt: chưa có quân nào nên đánh số 0 */
export function describeYield(who: string, to: string): CaroLogEntry {
  return { n: 0, who, text: `nhường lượt cho ${to} đi trước` };
}

/** Cột và hàng đếm từ 1 như người chơi vẫn gọi; ô (x, y) trong engine đếm từ 0 */
export function describePlace(n: number, who: string, mark: Mark, x: number, y: number): CaroLogEntry {
  return { n, who, text: `đặt ${MARK_CHAR[mark]} vào cột ${x + 1}, hàng ${y + 1}` };
}
