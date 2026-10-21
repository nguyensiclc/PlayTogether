// Vẽ bàn Cờ tướng thành SVG (docs/design/co-tuong/mockup-*.jpg): 1 đơn vị = 1 ô, quân đặt trên giao điểm.
// Dựng chuỗi SVG, không sửa DOM (chỉ `glyph-offset.ts` đọc số đo phông): dùng cho bàn chính và bàn thu nhỏ ở màn kết quả.
// Lưới đối xứng khi xoay 180°, nên người cầm Đen chỉ cần đổi vị trí quân (chữ trên quân luôn thẳng).

import type { Kind, Piece, Side } from "@playtogether/engine/co-tuong";
import { COLS, indexOf, ROWS, xOf, yOf } from "@playtogether/engine/co-tuong";
import { glyphOffset } from "./glyph-offset.ts";

/** Tên quân bằng tiếng Việt, dùng cho nhật ký, chú thích và đọc màn hình */
export const KIND_LABEL: Record<Kind, string> = {
  tuong: "Tướng",
  si: "Sĩ",
  voi: "Tượng",
  xe: "Xe",
  phao: "Pháo",
  ma: "Mã",
  tot: "Tốt",
};

/** Chữ Hán trên quân (T9): Đỏ và Đen viết khác nhau ở Tướng, Sĩ, Tượng, Xe, Pháo, Mã, Tốt */
export const PIECE_GLYPH: Record<Side, Record<Kind, string>> = {
  0: { tuong: "帥", si: "仕", voi: "相", xe: "俥", phao: "炮", ma: "傌", tot: "兵" },
  1: { tuong: "將", si: "士", voi: "象", xe: "車", phao: "砲", ma: "馬", tot: "卒" },
};

/** Cỡ chữ Hán trong quân (đơn vị: ô) */
const GLYPH_SIZE = 0.52;

/** Lề quanh bàn, đủ chỗ cho quân ở mép */
const MARGIN = 0.7;
export const VIEW_BOX = { x: -MARGIN, y: -MARGIN, width: COLS - 1 + 2 * MARGIN, height: ROWS - 1 + 2 * MARGIN };
const PIECE_RADIUS = 0.43;

export interface BoardPaint {
  cells: readonly (Piece | null)[];
  /** Nước vừa đi */
  last: { from: number; to: number } | null;
  /** Ô quân đang chọn */
  selected?: number | null;
  /** Ô đến hợp lệ của quân đang chọn */
  targets?: readonly number[];
  /** Ô Tướng đang bị chiếu */
  checkCell?: number | null;
  /** Người cầm Đen thấy bàn xoay 180° */
  flipped: boolean;
  /** Quân vừa đi chạy hiệu ứng (chỉ lần vẽ ngay sau nước đi) */
  fresh?: boolean;
}

/** Vị trí hiển thị của ô `i` (đã xoay nếu cần) */
function place(i: number, flipped: boolean): [number, number] {
  const x = xOf(i);
  const y = yOf(i);
  return flipped ? [COLS - 1 - x, ROWS - 1 - y] : [x, y];
}

/** Ô gần nhất với điểm (vx, vy) theo toạ độ viewBox; null nếu ngoài bàn */
export function cellAtPoint(vx: number, vy: number, flipped: boolean): number | null {
  const dx = Math.round(vx);
  const dy = Math.round(vy);
  if (dx < 0 || dx >= COLS || dy < 0 || dy >= ROWS) return null;
  return flipped ? indexOf(COLS - 1 - dx, ROWS - 1 - dy) : indexOf(dx, dy);
}

/** Đường kẻ: 10 hàng ngang, hai cột biên đủ dài, các cột trong đứt ở sông, hai cung có đường chéo */
function gridPath(): string {
  let d = "";
  for (let y = 0; y < ROWS; y++) d += `M0 ${y}H${COLS - 1}`;
  d += `M0 0V${ROWS - 1}M${COLS - 1} 0V${ROWS - 1}`;
  for (let x = 1; x < COLS - 1; x++) d += `M${x} 0V4M${x} 5V${ROWS - 1}`;
  d += "M3 0L5 2M5 0L3 2M3 7L5 9M5 7L3 9";
  return d;
}

/** Điểm đánh dấu quanh vị trí Pháo và Tốt: bốn góc nhỏ, bỏ phía ngoài bàn */
const MARK_POINTS: readonly (readonly [number, number])[] = [
  [1, 2],
  [7, 2],
  [1, 7],
  [7, 7],
  ...[0, 2, 4, 6, 8].flatMap((x): [number, number][] => [
    [x, 3],
    [x, 6],
  ]),
];

function markersPath(): string {
  const gap = 0.09;
  const len = 0.2;
  let d = "";
  for (const [x, y] of MARK_POINTS) {
    for (const sx of [-1, 1]) {
      if ((x === 0 && sx === -1) || (x === COLS - 1 && sx === 1)) continue;
      for (const sy of [-1, 1]) {
        d += `M${x + sx * gap} ${y + sy * (gap + len)}V${y + sy * gap}H${x + sx * (gap + len)}`;
      }
    }
  }
  return d;
}

const GRID = gridPath();
const MARKERS = markersPath();
const RIVER = `<g class="river"><text x="2" y="4.5" dy="0.36em">楚 河</text><text x="6" y="4.5" dy="0.36em">漢 界</text></g>`;

function pieceSvg(piece: Piece, i: number, p: BoardPaint): string {
  const [x, y] = place(i, p.flipped);
  const side = piece.side === 0 ? "red" : "black";
  const classes = ["pc", side, i === p.selected ? "sel" : "", p.fresh && i === p.last?.to ? "fresh" : ""];
  const glyph = PIECE_GLYPH[piece.side][piece.kind];
  const { dx, dy } = glyphOffset(glyph);
  return `<g class="${classes.filter(Boolean).join(" ")}" data-cell="${i}">
    <circle class="disc" cx="${x}" cy="${y}" r="${PIECE_RADIUS}"/>
    <circle class="ring" cx="${x}" cy="${y}" r="${PIECE_RADIUS - 0.07}"/>
    <text x="${x}" y="${y}" dx="${dx.toFixed(3)}em" dy="${dy.toFixed(3)}em" font-size="${GLYPH_SIZE}">${glyph}</text>
  </g>`;
}

/** Vòng đánh dấu ô xuất phát (nét đứt) và ô đến của nước vừa đi */
function lastSvg(last: BoardPaint["last"], flipped: boolean): string {
  if (!last) return "";
  const [fx, fy] = place(last.from, flipped);
  const [tx, ty] = place(last.to, flipped);
  return `<circle class="last-from" cx="${fx}" cy="${fy}" r="0.3"/><circle class="last-to" cx="${tx}" cy="${ty}" r="0.5"/>`;
}

function targetsSvg(p: BoardPaint): string {
  return (p.targets ?? [])
    .map((i) => {
      const [x, y] = place(i, p.flipped);
      return p.cells[i]
        ? `<circle class="tgt-cap" cx="${x}" cy="${y}" r="0.5"/>`
        : `<circle class="tgt" cx="${x}" cy="${y}" r="0.15"/>`;
    })
    .join("");
}

function checkSvg(checkCell: number | null | undefined, flipped: boolean): string {
  if (checkCell === null || checkCell === undefined) return "";
  const [x, y] = place(checkCell, flipped);
  return `<circle class="chk" cx="${x}" cy="${y}" r="0.52"/>`;
}

/** SVG của cả bàn: nền lưới, nước vừa đi, quân, rồi ô đến và vòng chiếu phủ lên trên */
export function boardSvg(p: BoardPaint): string {
  const { x, y, width, height } = VIEW_BOX;
  const pieces = p.cells.map((piece, i) => (piece ? pieceSvg(piece, i, p) : "")).join("");
  return `<svg class="ct-svg" viewBox="${x} ${y} ${width} ${height}" role="img" aria-label="Bàn cờ tướng">
    <path class="grid" d="${GRID}"/><path class="markers" d="${MARKERS}"/>${RIVER}
    ${lastSvg(p.last, p.flipped)}${pieces}${targetsSvg(p)}${checkSvg(p.checkCell, p.flipped)}
  </svg>`;
}
