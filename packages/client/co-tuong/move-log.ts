// Nhật ký ván Cờ tướng (T8): mỗi nước một dòng "Xe (1,1) → (1,4) ăn Tốt".
// Toạ độ (cột, hàng) đếm từ 1; hàng 1 là hàng sau của Đỏ, như người chơi vẫn gọi.
// Dùng chung `LogEntry` và `logListHtml` của game-ui.

import type { Piece } from "@playtogether/engine/co-tuong";
import { ROWS, xOf, yOf } from "@playtogether/engine/co-tuong";
import type { LogEntry } from "../game-ui/log-view.ts";
import { KIND_LABEL } from "./board-svg.ts";

const coord = (i: number): string => `(${xOf(i) + 1},${ROWS - yOf(i)})`;

export function describeMove(
  n: number,
  who: string,
  piece: Piece,
  from: number,
  to: number,
  captured: Piece | null,
): LogEntry {
  const eat = captured ? ` ăn ${KIND_LABEL[captured.kind]}` : "";
  return { n, who, text: `${KIND_LABEL[piece.kind]} ${coord(from)} → ${coord(to)}${eat}` };
}
