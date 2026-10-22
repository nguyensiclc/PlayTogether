// Dựng bàn cờ và quân cờ vector SVG cho Cờ vua (docs/co-vua/02-thiet-ke-ux.md).

import type { Piece, Square } from "@playtogether/engine/co-vua";
import { toSquare } from "@playtogether/engine/co-vua";
import { PIECE_DEFS, pieceSvg } from "./piece-art.ts";

export const BOARD_SIZE = 8;
export const SQUARE_SIZE = 48; // px mỗi ô trên toạ độ SVG
/** Hệ số phóng quân cờ trong ô */
const PIECE_SCALE = 1.12;
export const BOARD_PIXELS = BOARD_SIZE * SQUARE_SIZE; // 384 × 384 px

// Màu ô cờ tiêu chuẩn quốc tế
export const LIGHT_SQUARE = "#f0d9b5";
export const DARK_SQUARE = "#b58863";

export interface BoardRenderOptions {
  board: readonly (Piece | null)[];
  flipped: boolean; // true nếu người chơi cầm Đen (nhìn từ hàng 8)
  selectedSq: Square | null;
  validDestinations: Set<Square>;
  lastMove: { from: Square; to: Square } | null;
  checkSq: Square | null;
}

/** Chuyển đổi toạ độ logic (file, rank) sang toạ độ hiển thị (displayCol, displayRow) */
export function toDisplayCoord(file: number, rank: number, flipped: boolean): { col: number; row: number } {
  if (flipped) {
    return { col: 7 - file, row: rank };
  }
  return { col: file, row: 7 - rank };
}

/** Chuyển đổi toạ độ hiển thị sang Square (0..63) */
export function displayCoordToSquare(col: number, row: number, flipped: boolean): Square {
  if (flipped) {
    return toSquare(7 - col, row);
  }
  return toSquare(col, 7 - row);
}

function renderSquareBackground(col: number, row: number, sq: Square, opts: BoardRenderOptions): string {
  const isDark = (col + row) % 2 === 1;
  const baseFill = isDark ? DARK_SQUARE : LIGHT_SQUARE;
  const x = col * SQUARE_SIZE;
  const y = row * SQUARE_SIZE;

  let extra = "";
  if (opts.selectedSq === sq) {
    extra = `<rect x="${x}" y="${y}" width="${SQUARE_SIZE}" height="${SQUARE_SIZE}" fill="rgba(242, 179, 61, 0.55)"/>`;
  } else if (opts.lastMove && (opts.lastMove.from === sq || opts.lastMove.to === sq)) {
    extra = `<rect x="${x}" y="${y}" width="${SQUARE_SIZE}" height="${SQUARE_SIZE}" fill="rgba(255, 255, 0, 0.3)"/>`;
  } else if (opts.checkSq === sq) {
    extra = `<rect x="${x}" y="${y}" width="${SQUARE_SIZE}" height="${SQUARE_SIZE}" fill="rgba(239, 68, 68, 0.65)" class="check-flash"/>`;
  }

  return `<rect x="${x}" y="${y}" width="${SQUARE_SIZE}" height="${SQUARE_SIZE}" fill="${baseFill}"/>${extra}`;
}

function renderDestIndicator(col: number, row: number, hasPiece: boolean): string {
  const cx = col * SQUARE_SIZE + SQUARE_SIZE / 2;
  const cy = row * SQUARE_SIZE + SQUARE_SIZE / 2;

  if (hasPiece) {
    // Vòng tròn bao quanh quân có thể ăn
    return `<circle cx="${cx}" cy="${cy}" r="${SQUARE_SIZE * 0.42}" fill="none" stroke="rgba(0, 0, 0, 0.28)" stroke-width="4.5"/>`;
  }
  // Chấm tròn ở ô trống
  return `<circle cx="${cx}" cy="${cy}" r="${SQUARE_SIZE * 0.16}" fill="rgba(0, 0, 0, 0.25)"/>`;
}

function renderSquareContent(col: number, row: number, sq: Square, opts: BoardRenderOptions): string {
  const x = col * SQUARE_SIZE;
  const y = row * SQUARE_SIZE;
  const piece = opts.board[sq];
  let res = "";

  if (piece) {
    // Quân vẽ trong hộp 48 × 48 nhưng đế chỉ rộng ~30px; phóng 1.12× quanh đáy để quân đầy ô hơn
    const k = PIECE_SCALE;
    res += `<g transform="translate(${x + 24 * (1 - k)}, ${y + 41 * (1 - k)}) scale(${k})">${pieceSvg(piece)}</g>`;
  }

  if (opts.validDestinations.has(sq)) {
    res += renderDestIndicator(col, row, piece !== null);
  }

  return res;
}

/** Render toàn bộ bàn cờ SVG 384 × 384 */
export function renderBoardSvg(opts: BoardRenderOptions): string {
  const squares: string[] = [];
  const contents: string[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = displayCoordToSquare(c, r, opts.flipped);
      squares.push(renderSquareBackground(c, r, sq, opts));
      contents.push(renderSquareContent(c, r, sq, opts));
    }
  }

  return `
<svg viewBox="0 0 ${BOARD_PIXELS} ${BOARD_PIXELS}" class="chess-svg" aria-label="Bàn cờ vua">
  ${PIECE_DEFS}
  <g class="board-squares">${squares.join("")}</g>
  <g class="board-contents">${contents.join("")}</g>
</svg>
`;
}
