// Nhật ký ván Cờ caro: mỗi nước một dòng "Bạn đặt ✕ vào cột 11, hàng 6" (cột và hàng đếm từ 1).
// Dùng chung `LogEntry` và `logListHtml` của game-ui.

import type { Mark } from "@playtogether/engine/caro";
import type { LogEntry } from "../game-ui/log-view.ts";
import { MARK_CHAR } from "./player-card.ts";

/** Người đi trước nhường lượt: chưa có quân nào nên đánh số 0 */
export function describeYield(who: string, to: string): LogEntry {
  return { n: 0, who, text: `nhường lượt cho ${to} đi trước` };
}

/** Cột và hàng đếm từ 1 như người chơi vẫn gọi; ô (x, y) trong engine đếm từ 0 */
export function describePlace(n: number, who: string, mark: Mark, x: number, y: number): LogEntry {
  return { n, who, text: `đặt ${MARK_CHAR[mark]} vào cột ${x + 1}, hàng ${y + 1}` };
}
