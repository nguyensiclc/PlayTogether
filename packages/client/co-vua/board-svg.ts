// Dựng bàn cờ và quân cờ vector SVG cho Cờ vua (docs/co-vua/02-thiet-ke-ux.md).

import type { Color, Piece, PieceType, Square } from "@playtogether/engine/co-vua";
import { toSquare } from "@playtogether/engine/co-vua";

export const BOARD_SIZE = 8;
export const SQUARE_SIZE = 48; // px mỗi ô trên toạ độ SVG
export const BOARD_PIXELS = BOARD_SIZE * SQUARE_SIZE; // 384 × 384 px

// Màu ô cờ tiêu chuẩn quốc tế
export const LIGHT_SQUARE = "#f0d9b5";
export const DARK_SQUARE = "#b58863";

// SVG Vectors cho 12 quân cờ (tỷ lệ chuẩn hộp 45 × 45 thu gọn vào SQUARE_SIZE 48 × 48)
const PIECE_SVGS: Record<Color, Record<PieceType, string>> = {
  w: {
    p: `<path d="M24 10a4.5 4.5 0 1 0 0 9 4.5 4.5 0 1 0 0-9zM20 20c-2 3-3 6-3 10h14c0-4-1-7-3-10zM15 32h18v4H15z" fill="#fffaf0" stroke="#2b2118" stroke-width="1.8" stroke-linejoin="round"/>`,
    n: `<path d="M26 10c-3 0-6 2-7 5-2 3-1 6-2 9-1.5 2-3 2.5-3 5h19c0-3-1.5-4-1.5-7 2-1.5 3-4 3-6.5 0-3.5-3.5-5.5-8.5-5.5z" fill="#fffaf0" stroke="#2b2118" stroke-width="1.8" stroke-linejoin="round"/><circle cx="21" cy="16" r="1.5" fill="#2b2118"/><rect x="14" y="32" width="20" height="4" rx="1" fill="#fffaf0" stroke="#2b2118" stroke-width="1.8"/>`,
    b: `<path d="M24 8a3 3 0 1 0 0 6 3 3 0 1 0 0-6zM17 18c0-3 3-5 7-5s7 2 7 5c0 5-2 8-3 12h-8c-1-4-3-7-3-12zM15 32h18v4H15z" fill="#fffaf0" stroke="#2b2118" stroke-width="1.8" stroke-linejoin="round"/><path d="M21 21l6 6M27 21l-6 6" stroke="#2b2118" stroke-width="1.5"/>`,
    r: `<path d="M16 12h3v4h3v-4h4v4h3v-4h3v7h-16zM17 19h14c0 4-1 8-2 11h-10c-1-3-2-7-2-11zM14 32h20v4H14z" fill="#fffaf0" stroke="#2b2118" stroke-width="1.8" stroke-linejoin="round"/>`,
    q: `<path d="M13 14l3 12h16l3-12-6 5-5-8-5 8z" fill="#fffaf0" stroke="#2b2118" stroke-width="1.8" stroke-linejoin="round"/><circle cx="13" cy="13" r="2" fill="#fffaf0" stroke="#2b2118" stroke-width="1.5"/><circle cx="24" cy="9" r="2" fill="#fffaf0" stroke="#2b2118" stroke-width="1.5"/><circle cx="35" cy="13" r="2" fill="#fffaf0" stroke="#2b2118" stroke-width="1.5"/><path d="M15 28c0 2 2 3 9 3s9-1 9-3zM14 33h20v3H14z" fill="#fffaf0" stroke="#2b2118" stroke-width="1.8"/>`,
    k: `<path d="M22 8h4v3h3v4h-3v3h-4v-3h-3v-4h3z" fill="#b5462f" stroke="#2b2118" stroke-width="1.2"/><path d="M16 19c-1 3-1 6 1 9h14c2-3 2-6 1-9-2-2-4-3-8-3s-6 1-8 3zM14 32h20v4H14z" fill="#fffaf0" stroke="#2b2118" stroke-width="1.8" stroke-linejoin="round"/><circle cx="24" cy="23" r="2" fill="#b5462f"/>`,
  },
  b: {
    p: `<path d="M24 10a4.5 4.5 0 1 0 0 9 4.5 4.5 0 1 0 0-9zM20 20c-2 3-3 6-3 10h14c0-4-1-7-3-10zM15 32h18v4H15z" fill="#2b2118" stroke="#fffaf0" stroke-width="1.5" stroke-linejoin="round"/>`,
    n: `<path d="M26 10c-3 0-6 2-7 5-2 3-1 6-2 9-1.5 2-3 2.5-3 5h19c0-3-1.5-4-1.5-7 2-1.5 3-4 3-6.5 0-3.5-3.5-5.5-8.5-5.5z" fill="#2b2118" stroke="#fffaf0" stroke-width="1.5" stroke-linejoin="round"/><circle cx="21" cy="16" r="1.5" fill="#fffaf0"/><rect x="14" y="32" width="20" height="4" rx="1" fill="#2b2118" stroke="#fffaf0" stroke-width="1.5"/>`,
    b: `<path d="M24 8a3 3 0 1 0 0 6 3 3 0 1 0 0-6zM17 18c0-3 3-5 7-5s7 2 7 5c0 5-2 8-3 12h-8c-1-4-3-7-3-12zM15 32h18v4H15z" fill="#2b2118" stroke="#fffaf0" stroke-width="1.5" stroke-linejoin="round"/><path d="M21 21l6 6M27 21l-6 6" stroke="#fffaf0" stroke-width="1.5"/>`,
    r: `<path d="M16 12h3v4h3v-4h4v4h3v-4h3v7h-16zM17 19h14c0 4-1 8-2 11h-10c-1-3-2-7-2-11zM14 32h20v4H14z" fill="#2b2118" stroke="#fffaf0" stroke-width="1.5" stroke-linejoin="round"/>`,
    q: `<path d="M13 14l3 12h16l3-12-6 5-5-8-5 8z" fill="#2b2118" stroke="#fffaf0" stroke-width="1.5" stroke-linejoin="round"/><circle cx="13" cy="13" r="2" fill="#2b2118" stroke="#fffaf0" stroke-width="1.5"/><circle cx="24" cy="9" r="2" fill="#2b2118" stroke="#fffaf0" stroke-width="1.5"/><circle cx="35" cy="13" r="2" fill="#2b2118" stroke="#fffaf0" stroke-width="1.5"/><path d="M15 28c0 2 2 3 9 3s9-1 9-3zM14 33h20v3H14z" fill="#2b2118" stroke="#fffaf0" stroke-width="1.5"/>`,
    k: `<path d="M22 8h4v3h3v4h-3v3h-4v-3h-3v-4h3z" fill="#f2b33d" stroke="#2b2118" stroke-width="1.2"/><path d="M16 19c-1 3-1 6 1 9h14c2-3 2-6 1-9-2-2-4-3-8-3s-6 1-8 3zM14 32h20v4H14z" fill="#2b2118" stroke="#fffaf0" stroke-width="1.5" stroke-linejoin="round"/><circle cx="24" cy="23" r="2" fill="#f2b33d"/>`,
  },
};

export function pieceSvg(piece: Piece): string {
  return PIECE_SVGS[piece.color][piece.type];
}

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
    res += `<g transform="translate(${x}, ${y})">${pieceSvg(piece)}</g>`;
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
  <g class="board-squares">${squares.join("")}</g>
  <g class="board-contents">${contents.join("")}</g>
</svg>
`;
}
