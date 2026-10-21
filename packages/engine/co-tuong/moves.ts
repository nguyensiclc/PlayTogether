// Cách đi từng quân (luật mục 4) và phát hiện chiếu (luật mục 5). Hàm thuần trên mảng 90 ô.

import type { Kind, Piece, Side } from "./types.ts";

export const COLS = 9;
export const ROWS = 10;
export const CELL_COUNT = COLS * ROWS;

type Cells = readonly (Piece | null)[];
type Step = readonly [dx: number, dy: number];

const ORTHOGONAL: readonly Step[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const DIAGONAL: readonly Step[] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export const indexOf = (x: number, y: number): number => y * COLS + x;
export const xOf = (i: number): number => i % COLS;
export const yOf = (i: number): number => Math.floor(i / COLS);

const inBoard = (x: number, y: number): boolean => x >= 0 && x < COLS && y >= 0 && y < ROWS;

const at = (cells: Cells, x: number, y: number): Piece | null => cells[indexOf(x, y)] ?? null;

/** Hướng tiến: Đỏ đi lên (y giảm), Đen đi xuống */
const forward = (side: Side): number => (side === 0 ? -1 : 1);

/** Cung 3 × 3 của mỗi bên: cột 3–5, hàng 7–9 (Đỏ) hoặc 0–2 (Đen) */
const inPalace = (side: Side, x: number, y: number): boolean => x >= 3 && x <= 5 && (side === 0 ? y >= 7 : y <= 2);

/** Sông nằm giữa hàng 4 và hàng 5 */
const isOwnHalf = (side: Side, y: number): boolean => (side === 0 ? y >= 5 : y <= 4);

interface Context {
  cells: Cells;
  side: Side;
  x: number;
  y: number;
  out: number[];
  /** Thêm ô đến nếu trong bàn và không đè quân mình; trả về true nếu thêm được */
  add(x: number, y: number): boolean;
}

/** Đi thẳng từng hướng đến khi gặp quân: ô trống thì đi được, quân địch đầu tiên thì ăn được (Xe) */
function slide({ cells, side, x, y, out }: Context, [dx, dy]: Step): void {
  for (let nx = x + dx, ny = y + dy; inBoard(nx, ny); nx += dx, ny += dy) {
    const target = at(cells, nx, ny);
    if (target === null) out.push(indexOf(nx, ny));
    else {
      if (target.side !== side) out.push(indexOf(nx, ny));
      return;
    }
  }
}

/** Pháo: đi như Xe khi không ăn; ăn phải nhảy qua đúng một ngòi (luật mục 4) */
function slideCannon({ cells, side, x, y, out }: Context, [dx, dy]: Step): void {
  let nx = x + dx;
  let ny = y + dy;
  while (inBoard(nx, ny) && at(cells, nx, ny) === null) {
    out.push(indexOf(nx, ny));
    nx += dx;
    ny += dy;
  }
  for (nx += dx, ny += dy; inBoard(nx, ny); nx += dx, ny += dy) {
    const target = at(cells, nx, ny);
    if (target === null) continue;
    if (target.side !== side) out.push(indexOf(nx, ny));
    return;
  }
}

/** Mã: một ô thẳng (chân mã phải trống) rồi một ô chéo */
function jumpHorse(ctx: Context, [dx, dy]: Step): void {
  if (at(ctx.cells, ctx.x + dx, ctx.y + dy) !== null) return;
  const sideways: readonly Step[] = dx === 0 ? ORTHOGONAL.slice(0, 2) : ORTHOGONAL.slice(2);
  for (const [px, py] of sideways) ctx.add(ctx.x + 2 * dx + px, ctx.y + 2 * dy + py);
}

/** Tượng: chéo 2 ô, mắt tượng phải trống, không qua sông */
function jumpElephant(ctx: Context, [dx, dy]: Step): void {
  if (at(ctx.cells, ctx.x + dx, ctx.y + dy) !== null) return;
  const ny = ctx.y + 2 * dy;
  if (isOwnHalf(ctx.side, ny)) ctx.add(ctx.x + 2 * dx, ny);
}

const GENERATORS: Record<Kind, (ctx: Context) => void> = {
  tuong: (ctx) => {
    for (const [dx, dy] of ORTHOGONAL) if (inPalace(ctx.side, ctx.x + dx, ctx.y + dy)) ctx.add(ctx.x + dx, ctx.y + dy);
  },
  si: (ctx) => {
    for (const [dx, dy] of DIAGONAL) if (inPalace(ctx.side, ctx.x + dx, ctx.y + dy)) ctx.add(ctx.x + dx, ctx.y + dy);
  },
  voi: (ctx) => {
    for (const step of DIAGONAL) jumpElephant(ctx, step);
  },
  ma: (ctx) => {
    for (const step of ORTHOGONAL) jumpHorse(ctx, step);
  },
  xe: (ctx) => {
    for (const step of ORTHOGONAL) slide(ctx, step);
  },
  phao: (ctx) => {
    for (const step of ORTHOGONAL) slideCannon(ctx, step);
  },
  tot: (ctx) => {
    ctx.add(ctx.x, ctx.y + forward(ctx.side));
    if (!isOwnHalf(ctx.side, ctx.y)) {
      ctx.add(ctx.x - 1, ctx.y);
      ctx.add(ctx.x + 1, ctx.y);
    }
  },
};

/** Các ô đến đúng cách đi của quân tại `from`, chưa xét chiếu. Rỗng nếu ô trống. */
export function pseudoMoves(cells: Cells, from: number): number[] {
  const piece = cells[from];
  if (!piece) return [];
  const out: number[] = [];
  const ctx: Context = {
    cells,
    side: piece.side,
    x: xOf(from),
    y: yOf(from),
    out,
    add(x, y) {
      if (!inBoard(x, y) || at(cells, x, y)?.side === piece.side) return false;
      out.push(indexOf(x, y));
      return true;
    },
  };
  GENERATORS[piece.kind](ctx);
  return out;
}

const isEnemy = (piece: Piece | null, side: Side): piece is Piece => piece !== null && piece.side !== side;

/** Xe, tướng đối mặt (theo cột) hoặc Pháo qua ngòi nhìn thấy ô (gx, gy) theo hướng `step` */
function seenAlongLine(cells: Cells, side: Side, gx: number, gy: number, [dx, dy]: Step): boolean {
  let screened = false;
  for (let x = gx + dx, y = gy + dy; inBoard(x, y); x += dx, y += dy) {
    const piece = at(cells, x, y);
    if (piece === null) continue;
    if (!screened) {
      if (isEnemy(piece, side) && (piece.kind === "xe" || (piece.kind === "tuong" && dx === 0))) return true;
      screened = true;
    } else {
      return isEnemy(piece, side) && piece.kind === "phao";
    }
  }
  return false;
}

/** Mã địch ở ô (hx, hy) ăn được ô (gx, gy): chân mã nằm kề Mã, trên cạnh dài của bước đi */
function horseSees(cells: Cells, side: Side, gx: number, gy: number, hx: number, hy: number): boolean {
  if (!inBoard(hx, hy)) return false;
  const horse = at(cells, hx, hy);
  if (!isEnemy(horse, side) || horse.kind !== "ma") return false;
  const legX = Math.abs(gx - hx) === 2 ? hx + Math.sign(gx - hx) : hx;
  const legY = Math.abs(gy - hy) === 2 ? hy + Math.sign(gy - hy) : hy;
  return at(cells, legX, legY) === null;
}

const HORSE_OFFSETS: readonly Step[] = [
  [1, 2],
  [-1, 2],
  [1, -2],
  [-1, -2],
  [2, 1],
  [-2, 1],
  [2, -1],
  [-2, -1],
];

/** Tốt địch ăn được ô (gx, gy): ngay phía sau ô theo hướng tiến, hoặc kề ngang nếu đã qua sông */
function pawnSees(cells: Cells, side: Side, gx: number, gy: number): boolean {
  const enemy: Side = side === 0 ? 1 : 0;
  const isPawn = (x: number, y: number): boolean => {
    const piece = inBoard(x, y) ? at(cells, x, y) : null;
    return piece !== null && piece.side === enemy && piece.kind === "tot";
  };
  if (isPawn(gx, gy - forward(enemy))) return true;
  return !isOwnHalf(enemy, gy) && (isPawn(gx - 1, gy) || isPawn(gx + 1, gy));
}

function isAttacked(cells: Cells, side: Side, gx: number, gy: number): boolean {
  if (ORTHOGONAL.some((step) => seenAlongLine(cells, side, gx, gy, step))) return true;
  if (HORSE_OFFSETS.some(([dx, dy]) => horseSees(cells, side, gx, gy, gx + dx, gy + dy))) return true;
  return pawnSees(cells, side, gx, gy);
}

/** Ô của Tướng bên `side`; -1 nếu không có */
export function findGeneral(cells: Cells, side: Side): number {
  return cells.findIndex((piece) => piece?.kind === "tuong" && piece.side === side);
}

/** Tướng của `side` bị chiếu, kể cả khi hai tướng đối mặt (luật mục 5) */
export function isInCheck(cells: Cells, side: Side): boolean {
  const general = findGeneral(cells, side);
  return general >= 0 && isAttacked(cells, side, xOf(general), yOf(general));
}

/** Bàn sau khi đi quân từ `from` đến `to` (ăn quân nếu có) */
export function simulate(cells: Cells, from: number, to: number): (Piece | null)[] {
  const next = [...cells];
  next[to] = next[from] ?? null;
  next[from] = null;
  return next;
}

/** Các ô đến hợp lệ của quân tại `from`: đúng cách đi và không để tướng mình bị chiếu (luật mục 5) */
export function legalTargets(cells: Cells, from: number, side: Side): number[] {
  return pseudoMoves(cells, from).filter((to) => !isInCheck(simulate(cells, from, to), side));
}
