// Bot Cờ tướng (docs/co-tuong/03-thiet-ke-ky-thuat.md mục 8): ba mức khó bằng tìm kiếm theo độ sâu.
// Hàm thuần: không đọc đồng hồ, giới hạn công việc bằng số nút tìm kiếm; ngẫu nhiên chỉ qua RNG truyền vào.

import { type BotLevelId, type BotOption, type BotSupport, pickRandom, type Rng, type SeatId } from "../game-module.ts";
import { CELL_COUNT, legalTargets, simulate, xOf, yOf } from "./moves.ts";
import type { Kind, Move, Piece, Side, State } from "./types.ts";

/** Ba mức khó hiển thị trong phòng chờ */
export const BOT_LEVELS: readonly BotOption[] = [
  { id: "easy", name: "Dễ" },
  { id: "medium", name: "Vừa" },
  { id: "hard", name: "Khó" },
];

type Cells = readonly (Piece | null)[];

/** Giá trị quân (đơn vị: 1/10 Tốt) */
const VALUE: Record<Kind, number> = { tuong: 0, si: 20, voi: 20, xe: 90, phao: 45, ma: 40, tot: 10 };
/** Điểm thắng; trừ dần theo độ sâu còn lại để ưu tiên chiếu bí sớm và thua muộn */
const MATE = 100_000;
const INFINITY = 1_000_000;

/** Tốt đã qua sông giá trị hơn, và càng tiến sâu càng hơn */
const CROSSED_PAWN_BONUS = 10;
const PAWN_ADVANCE_BONUS = 3;
/** Xe, Mã, Pháo đứng gần giữa bàn linh hoạt hơn */
const CENTER_BONUS = 2;

/** Mức Dễ: xác suất chọn nước ăn quân nếu có */
const EASY_CAPTURE_CHANCE = 0.5;
/** Mức Vừa: tìm 2 nước, chọn ngẫu nhiên trong các nước kém nước tốt nhất không quá chừng này */
const MEDIUM_DEPTH = 2;
const MEDIUM_MARGIN = 8;
const MEDIUM_NODE_BUDGET = 60_000;
/** Mức Khó: tìm sâu dần đến 4 nước, dừng khi hết ngân sách nút */
const HARD_MAX_DEPTH = 4;
const HARD_NODE_BUDGET = 90_000;
/** Số nước ăn quân tối đa tìm thêm ở cuối nhánh (chỉ mức Khó) */
const QUIESCENCE_DEPTH = 4;

interface Search {
  nodes: number;
  budget: number;
  /** Hết ngân sách giữa chừng: kết quả vòng này không dùng được */
  aborted: boolean;
  quiescence: boolean;
}

interface Candidate extends Move {
  /** Thứ tự thử: ăn quân lớn bằng quân nhỏ trước, giúp cắt tỉa */
  order: number;
}

const other = (side: Side): Side => (side === 0 ? 1 : 0);

function pieceScore(piece: Piece, i: number): number {
  const x = xOf(i);
  const y = yOf(i);
  let score = VALUE[piece.kind];
  if (piece.kind === "tot") {
    const advanced = piece.side === 0 ? Math.max(0, 6 - y) : Math.max(0, y - 3);
    const crossed = piece.side === 0 ? y <= 4 : y >= 5;
    score += advanced * PAWN_ADVANCE_BONUS + (crossed ? CROSSED_PAWN_BONUS : 0);
  } else if (piece.kind === "xe" || piece.kind === "ma" || piece.kind === "phao") {
    score += (4 - Math.abs(x - 4)) * CENTER_BONUS;
  }
  return score;
}

/** Điểm thế cờ theo góc nhìn của `side` (dương là có lợi) */
function evaluate(cells: Cells, side: Side): number {
  let total = 0;
  for (let i = 0; i < CELL_COUNT; i++) {
    const piece = cells[i];
    if (piece) total += (piece.side === side ? 1 : -1) * pieceScore(piece, i);
  }
  return total;
}

/** Mọi nước hợp lệ của `side`, đã xếp ưu tiên ăn quân */
function generate(cells: Cells, side: Side, capturesOnly = false): Candidate[] {
  const out: Candidate[] = [];
  for (let from = 0; from < CELL_COUNT; from++) {
    const piece = cells[from];
    if (piece?.side !== side) continue;
    for (const to of legalTargets(cells, from, side)) {
      const victim = cells[to];
      if (capturesOnly && !victim) continue;
      out.push({ from, to, order: victim ? VALUE[victim.kind] * 10 - VALUE[piece.kind] : -1 });
    }
  }
  return out.sort((a, b) => b.order - a.order);
}

/** Chỉ xét các nước ăn quân để thế cờ ở cuối nhánh đã "yên", tránh đánh giá giữa chừng một cuộc đổi quân */
function quiesce(cells: Cells, side: Side, alphaIn: number, beta: number, depth: number, ctx: Search): number {
  const standPat = evaluate(cells, side);
  if (depth === 0 || standPat >= beta) return standPat;
  let alpha = Math.max(alphaIn, standPat);
  for (const m of generate(cells, side, true)) {
    if (!countNode(ctx)) return 0;
    const score = -quiesce(simulate(cells, m.from, m.to), other(side), -beta, -alpha, depth - 1, ctx);
    if (score >= beta) return score;
    alpha = Math.max(alpha, score);
  }
  return alpha;
}

/** Tính một nút; false nếu hết ngân sách */
function countNode(ctx: Search): boolean {
  if (ctx.nodes >= ctx.budget) ctx.aborted = true;
  else ctx.nodes++;
  return !ctx.aborted;
}

/** Negamax có cắt tỉa alpha-beta; điểm theo góc nhìn của `side` đang đến lượt */
function negamax(cells: Cells, side: Side, depth: number, alphaIn: number, beta: number, ctx: Search): number {
  if (!countNode(ctx)) return 0;
  if (depth === 0)
    return ctx.quiescence ? quiesce(cells, side, alphaIn, beta, QUIESCENCE_DEPTH, ctx) : evaluate(cells, side);
  const moves = generate(cells, side);
  // Hết nước đi là thua, dù có bị chiếu hay không (luật mục 6)
  if (moves.length === 0) return -MATE - depth;
  let alpha = alphaIn;
  for (const m of moves) {
    const score = -negamax(simulate(cells, m.from, m.to), other(side), depth - 1, -beta, -alpha, ctx);
    if (ctx.aborted) return 0;
    if (score >= beta) return score;
    alpha = Math.max(alpha, score);
  }
  return alpha;
}

interface Scored {
  move: Move;
  score: number;
}

/**
 * Điểm từng nước ở gốc. `exactTies` = chỉ tìm chính xác các nước ngang điểm nước tốt nhất (đủ để chọn ngẫu nhiên
 * giữa các nước tốt nhất mà vẫn cắt tỉa); ngược lại tìm điểm chính xác cho mọi nước.
 */
function scoreRoot(
  cells: Cells,
  side: Side,
  roots: Candidate[],
  depth: number,
  ctx: Search,
  exactTies: boolean,
): Scored[] | null {
  const out: Scored[] = [];
  let best = -INFINITY;
  for (const m of roots) {
    const floor = exactTies ? best - 1 : -INFINITY;
    const score = -negamax(simulate(cells, m.from, m.to), other(side), depth - 1, -INFINITY, -floor, ctx);
    if (ctx.aborted) return null;
    out.push({ move: { from: m.from, to: m.to }, score });
    best = Math.max(best, score);
  }
  return out.sort((a, b) => b.score - a.score);
}

function chooseEasy(cells: Cells, roots: Candidate[], rng: Rng): Move | null {
  const captures = roots.filter((m) => cells[m.to]);
  let pool: Candidate[] = roots;
  if (captures.length > 0 && rng() < EASY_CAPTURE_CHANCE) {
    const top = Math.max(...captures.map((m) => m.order));
    pool = captures.filter((m) => m.order === top);
  }
  const picked = pickRandom(pool, rng);
  return picked && { from: picked.from, to: picked.to };
}

function chooseMedium(cells: Cells, side: Side, roots: Candidate[], rng: Rng): Move | null {
  const ctx: Search = { nodes: 0, budget: MEDIUM_NODE_BUDGET, aborted: false, quiescence: true };
  const scored = scoreRoot(cells, side, roots, MEDIUM_DEPTH, ctx, false) ?? [];
  const best = scored[0]?.score ?? 0;
  const near = scored.filter((s) => s.score >= best - MEDIUM_MARGIN).map((s) => s.move);
  return pickRandom(near.length > 0 ? near : roots, rng);
}

function chooseHard(cells: Cells, side: Side, roots: Candidate[], rng: Rng): Move | null {
  const ctx: Search = { nodes: 0, budget: HARD_NODE_BUDGET, aborted: false, quiescence: true };
  let ordered: Candidate[] = roots;
  let bestMoves: Move[] = roots;
  for (let depth = 1; depth <= HARD_MAX_DEPTH; depth++) {
    const scored = scoreRoot(cells, side, ordered, depth, ctx, true);
    // Hết ngân sách giữa vòng: dùng kết quả của vòng sâu nhất đã xong
    if (scored === null) break;
    const best = scored[0]?.score ?? 0;
    bestMoves = scored.filter((s) => s.score === best).map((s) => s.move);
    ordered = scored.map((s) => ({ ...s.move, order: s.score }));
    if (Math.abs(best) >= MATE / 2) break;
  }
  return pickRandom(bestMoves, rng);
}

/** Chọn nước cho ghế `seat` ở mức `level`; null nếu chưa đến lượt, ván đã xong hoặc hết nước */
export function chooseBotMove(state: State, seat: SeatId, level: BotLevelId, rng: Rng): Move | null {
  if (state.status !== "playing" || state.players[state.turn] !== seat) return null;
  const side = state.turn;
  const roots = generate(state.cells, side);
  if (roots.length === 0) return null;
  const picked =
    level === "easy"
      ? chooseEasy(state.cells, roots, rng)
      : level === "medium"
        ? chooseMedium(state.cells, side, roots, rng)
        : chooseHard(state.cells, side, roots, rng);
  // Chỉ trả hai trường của nước đi, không kèm thứ tự thử nội bộ
  return picked && { from: picked.from, to: picked.to };
}

export const coTuongBot: BotSupport<State, Move> = { levels: BOT_LEVELS, chooseMove: chooseBotMove };
