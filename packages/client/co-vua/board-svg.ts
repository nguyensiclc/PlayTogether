// Dựng bàn cờ và quân cờ vector SVG cho Cờ vua (docs/co-vua/02-thiet-ke-ux.md).

import type { Piece, Square } from "@playtogether/engine/co-vua";
import { toSquare } from "@playtogether/engine/co-vua";
import { PIECE_DEFS, pieceSvg } from "./piece-art.ts";

export const BOARD_SIZE = 8;
export const SQUARE_SIZE = 48; // px mỗi ô trên toạ độ SVG
/** Hệ số phóng quân cờ trong ô */
const PIECE_SCALE = 1.12;
export const BOARD_PIXELS = BOARD_SIZE * SQUARE_SIZE; // 384 × 384 px

// Màu ô cờ (gradient chéo nhẹ cho có khối, vân gỗ phủ lên toàn bàn)
export const LIGHT_SQUARE = "#f0d9b5";
export const DARK_SQUARE = "#b58863";

/** Gradient ô, vân gỗ và vầng đỏ khi bị chiếu; chèn một lần trong SVG bàn cờ (id dùng chung với `PIECE_DEFS`) */
const BOARD_DEFS = `<defs>
  <linearGradient id="cv-sq-l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8e8c8"/><stop offset="1" stop-color="#e8cd9c"/></linearGradient>
  <linearGradient id="cv-sq-d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c5956a"/><stop offset="1" stop-color="#a47044"/></linearGradient>
  <radialGradient id="cv-check"><stop offset="0" stop-color="#ff3b30" stop-opacity="0.95"/><stop offset="0.55" stop-color="#ff3b30" stop-opacity="0.55"/><stop offset="1" stop-color="#ff3b30" stop-opacity="0"/></radialGradient>
  <filter id="cv-grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.4" numOctaves="3" seed="7"/>
    <feColorMatrix values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1"/>
  </filter>
</defs>`;

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
  const baseFill = isDark ? "url(#cv-sq-d)" : "url(#cv-sq-l)";
  const x = col * SQUARE_SIZE;
  const y = row * SQUARE_SIZE;

  let extra = "";
  if (opts.selectedSq === sq) {
    extra = `<rect x="${x}" y="${y}" width="${SQUARE_SIZE}" height="${SQUARE_SIZE}" fill="rgba(242, 179, 61, 0.55)"/>`;
  } else if (opts.lastMove && (opts.lastMove.from === sq || opts.lastMove.to === sq)) {
    extra = `<rect x="${x}" y="${y}" width="${SQUARE_SIZE}" height="${SQUARE_SIZE}" fill="rgba(255, 255, 0, 0.3)"/>`;
  } else if (opts.checkSq === sq) {
    extra = `<rect x="${x}" y="${y}" width="${SQUARE_SIZE}" height="${SQUARE_SIZE}" fill="url(#cv-check)" class="check-flash"/>`;
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

/** Nhãn toạ độ nhỏ ở góc ô mép bàn: số hàng ở cột trái, chữ cột ở hàng dưới (cùng góc trái để không đè lên đế quân) (theo hướng đang nhìn) */
function renderCoordinates(flipped: boolean): string {
  const out: string[] = [];
  for (let i = 0; i < 8; i++) {
    const rank = flipped ? i + 1 : 8 - i;
    const file = "abcdefgh"[flipped ? 7 - i : i] ?? "";
    const leftDark = (0 + i) % 2 === 1;
    const bottomDark = (i + 7) % 2 === 1;
    out.push(
      `<text x="3" y="${i * SQUARE_SIZE + 11}" class="coord" fill="${leftDark ? "#f3dfbd" : "#a47044"}">${rank}</text>`,
      `<text x="${i * SQUARE_SIZE + 3}" y="${BOARD_PIXELS - 4}" class="coord" fill="${bottomDark ? "#f3dfbd" : "#a47044"}">${file}</text>`,
    );
  }
  return out.join("");
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
  ${BOARD_DEFS}${PIECE_DEFS}
  <g class="board-squares">${squares.join("")}</g>
  <rect width="${BOARD_PIXELS}" height="${BOARD_PIXELS}" filter="url(#cv-grain)" opacity="0.16" style="mix-blend-mode:multiply" pointer-events="none"/>
  <g class="board-coords" pointer-events="none">${renderCoordinates(opts.flipped)}</g>
  <g class="board-contents">${contents.join("")}</g>
</svg>
`;
}
