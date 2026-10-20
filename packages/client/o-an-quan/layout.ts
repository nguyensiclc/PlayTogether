// Sắp xếp 12 ô lên bàn 7 cột theo góc nhìn của người ngồi dưới (luật mục 1, UX mục 2.4).
// Người ngồi dưới luôn thấy hàng mình ở dưới, chiều +1 là "sang phải" trên hàng mình.
import type { Dir, Seat } from "@playtogether/engine/o-an-quan";

export interface BoardLayout {
  /** Ô quan bên trái */
  left: number;
  /** Ô quan bên phải */
  right: number;
  /** Hàng trên, từ trái sang phải */
  top: number[];
  /** Hàng dưới (hàng của người ngồi dưới), từ trái sang phải */
  bottom: number[];
}

export function layoutFor(bottomSeat: Seat): BoardLayout {
  return bottomSeat === 0
    ? { left: 0, right: 6, top: [11, 10, 9, 8, 7], bottom: [1, 2, 3, 4, 5] }
    : { left: 6, right: 0, top: [5, 4, 3, 2, 1], bottom: [7, 8, 9, 10, 11] };
}

/** Mũi tên trên hàng của mình: ◀ = chiều -1, ▶ = chiều +1, với cả A và B. */
export function dirForArrow(arrow: "left" | "right"): Dir {
  return arrow === "left" ? -1 : 1;
}
