// Bot Cờ vua 3 cấp độ: Dễ, Trung bình, Khó (docs/co-vua/03-thiet-ke-ky-thuat.md mục 5).
// Hàm thuần 100%: không I/O, không Date.now, không Math.random, nhận RNG qua tham số.

import type { BotLevelId, BotOption, BotSupport, Rng, SeatId } from "../game-module.ts";
import { pickRandom } from "../game-module.ts";
import { applyMove, colorOfSeat, validStandardMoves } from "./rules.ts";
import type { Color, Move, Piece, PieceType, Square, StandardMove, State } from "./types.ts";

export const BOT_LEVELS: readonly BotOption[] = [
  { id: "easy", name: "Dễ" },
  { id: "medium", name: "Trung bình" },
  { id: "hard", name: "Khó" },
] as const;

export function pieceValue(type: PieceType): number {
  switch (type) {
    case "p":
      return 100;
    case "n":
      return 320;
    case "b":
      return 330;
    case "r":
      return 500;
    case "q":
      return 900;
    case "k":
      return 20000;
  }
}

// Bảng điểm vị trí ô cờ theo chuẩn 64 ô (nhìn từ góc trắng, rank 1 ở dưới)
const PAWN_PST: readonly number[] = [
  0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, -20, -20, 10, 10, 5, 5, -5, -10, 0, 0, -10, -5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, 5,
  10, 25, 25, 10, 5, 5, 10, 10, 20, 30, 30, 20, 10, 10, 50, 50, 50, 50, 50, 50, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0,
];

const KNIGHT_PST: readonly number[] = [
  -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 5, 5, 0, -20, -40, -30, 5, 10, 15, 15, 10, 5, -30, -30, 0, 15,
  20, 20, 15, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 10, 15, 15, 10, 0, -30, -40, -20, 0, 0, 0, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];

const BISHOP_PST: readonly number[] = [
  -20, -10, -10, -10, -10, -10, -10, -20, -10, 5, 0, 0, 0, 0, 5, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 0, 10, 10,
  10, 10, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10,
  -10, -10, -10, -10, -20,
];

const ROOK_PST: readonly number[] = [
  0, 0, 0, 5, 5, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0,
  0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 5, 10, 10, 10, 10, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0,
];

const QUEEN_PST: readonly number[] = [
  -20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 5, 0, 0, 0, 0, -10, -10, 5, 5, 5, 5, 5, 0, -10, 0, 0, 5, 5, 5, 5, 0, -5,
  -5, 0, 5, 5, 5, 5, 0, -5, -10, 0, 5, 5, 5, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10,
  -20,
];

const KING_PST: readonly number[] = [
  20, 30, 10, 0, 0, 10, 30, 20, 20, 20, 0, 0, 0, 0, 20, 20, -10, -20, -20, -20, -20, -20, -20, -10, -20, -30, -30, -40,
  -40, -30, -30, -20, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40,
  -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
];

function pstOf(type: PieceType, sq: Square): number {
  switch (type) {
    case "p":
      return PAWN_PST[sq] ?? 0;
    case "n":
      return KNIGHT_PST[sq] ?? 0;
    case "b":
      return BISHOP_PST[sq] ?? 0;
    case "r":
      return ROOK_PST[sq] ?? 0;
    case "q":
      return QUEEN_PST[sq] ?? 0;
    case "k":
      return KING_PST[sq] ?? 0;
  }
}

function squareValue(piece: Piece, sq: Square): number {
  // Lật hàng đối với Đen bằng bitwise XOR 56
  const normSq = piece.color === "w" ? sq : sq ^ 56;
  return pieceValue(piece.type) + pstOf(piece.type, normSq);
}

export function evaluateBoard(board: readonly (Piece | null)[]): number {
  let score = 0;
  for (let sq = 0; sq < 64; sq++) {
    const piece = board[sq];
    if (!piece) continue;
    const val = squareValue(piece, sq);
    score += piece.color === "w" ? val : -val;
  }
  return score;
}

function evaluateTerminal(state: State, rootColor: Color, depth: number): number {
  if (!state.result || state.result.winner === null) return 0;
  const winnerColor = state.result.winner === state.players[0] ? "w" : "b";
  return winnerColor === rootColor ? 100000 + depth : -100000 - depth;
}

function moveScore(m: StandardMove, board: readonly (Piece | null)[]): number {
  const target = board[m.to];
  const attacker = board[m.from];
  let score = 0;
  if (target && attacker) {
    // MVV-LVA: ăn quân giá trị cao bằng quân giá trị thấp
    score += 10 * pieceValue(target.type) - pieceValue(attacker.type);
  }
  if (m.promotion) {
    score += pieceValue(m.promotion);
  }
  return score;
}

function orderMoves(moves: readonly StandardMove[], board: readonly (Piece | null)[]): StandardMove[] {
  return [...moves].sort((a, b) => moveScore(b, board) - moveScore(a, board));
}

function searchMax(
  state: State,
  moves: readonly StandardMove[],
  depth: number,
  alpha: number,
  beta: number,
  rootColor: Color,
): number {
  let best = -Infinity;
  let a = alpha;
  const seat = state.turn === "w" ? state.players[0] : state.players[1];
  for (const m of moves) {
    const res = applyMove(state, seat, m);
    if ("error" in res) continue;
    const score = alphabeta(res.state, depth - 1, a, beta, rootColor);
    if (score > best) best = score;
    if (score > a) a = score;
    if (a >= beta) break;
  }
  return best;
}

function searchMin(
  state: State,
  moves: readonly StandardMove[],
  depth: number,
  alpha: number,
  beta: number,
  rootColor: Color,
): number {
  let best = Infinity;
  let b = beta;
  const seat = state.turn === "w" ? state.players[0] : state.players[1];
  for (const m of moves) {
    const res = applyMove(state, seat, m);
    if ("error" in res) continue;
    const score = alphabeta(res.state, depth - 1, alpha, b, rootColor);
    if (score < best) best = score;
    if (score < b) b = score;
    if (alpha >= b) break;
  }
  return best;
}

function alphabeta(state: State, depth: number, alpha: number, beta: number, rootColor: Color): number {
  if (state.status === "finished") {
    return evaluateTerminal(state, rootColor, depth);
  }
  if (depth === 0) {
    const total = evaluateBoard(state.board);
    return rootColor === "w" ? total : -total;
  }
  const legals = validStandardMoves(state);
  if (legals.length === 0) {
    return evaluateTerminal(state, rootColor, depth);
  }
  const ordered = orderMoves(legals, state.board);
  return state.turn === rootColor
    ? searchMax(state, ordered, depth, alpha, beta, rootColor)
    : searchMin(state, ordered, depth, alpha, beta, rootColor);
}

function chooseEasyMove(state: State, moves: readonly StandardMove[], rng: Rng): StandardMove | null {
  if (moves.length === 0) return null;
  // 65% chọn ngẫu nhiên
  if (rng() < 0.65) {
    return pickRandom(moves, rng);
  }
  // 35% ưu tiên nước ăn quân hoặc phong cấp
  const captures = moves.filter((m) => state.board[m.to] !== null || m.promotion);
  if (captures.length > 0) {
    const ordered = orderMoves(captures, state.board);
    return ordered[0] ?? pickRandom(moves, rng);
  }
  return pickRandom(moves, rng);
}

function chooseMediumMove(state: State, moves: readonly StandardMove[], rng: Rng): StandardMove | null {
  if (moves.length === 0) return null;
  const rootColor = state.turn;
  const ordered = orderMoves(moves, state.board);
  let bestMove: StandardMove = ordered[0] as StandardMove;
  let bestRaw = -Infinity;
  const seat = rootColor === "w" ? state.players[0] : state.players[1];

  for (const m of ordered) {
    const res = applyMove(state, seat, m);
    if ("error" in res) continue;
    const raw = alphabeta(res.state, 1, -Infinity, Infinity, rootColor);
    if (raw > bestRaw) {
      bestRaw = raw;
      bestMove = m;
    } else if (raw === bestRaw && rng() < 0.3) {
      bestMove = m;
    }
  }
  return bestMove;
}

function chooseHardMove(state: State, moves: readonly StandardMove[], rng: Rng): StandardMove | null {
  if (moves.length === 0) return null;
  const rootColor = state.turn;
  const ordered = orderMoves(moves, state.board);
  let bestMove: StandardMove = ordered[0] as StandardMove;
  let bestRaw = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;
  const seat = rootColor === "w" ? state.players[0] : state.players[1];

  for (const m of ordered) {
    const res = applyMove(state, seat, m);
    if ("error" in res) continue;
    // Độ sâu 3 kết hợp cắt tỉa Alpha-Beta
    const raw = alphabeta(res.state, 2, alpha, beta, rootColor);
    if (raw > bestRaw) {
      bestRaw = raw;
      bestMove = m;
    } else if (raw === bestRaw && rng() < 0.1) {
      bestMove = m;
    }
    if (raw > alpha) alpha = raw;
  }
  return bestMove;
}

export function chooseBotMove(state: State, level: BotLevelId, rng: Rng): StandardMove | null {
  if (state.status !== "playing") return null;
  const legals = validStandardMoves(state);
  if (legals.length === 0) return null;

  switch (level) {
    case "easy":
      return chooseEasyMove(state, legals, rng);
    case "medium":
      return chooseMediumMove(state, legals, rng);
    case "hard":
      return chooseHardMove(state, legals, rng);
  }
}

export const coVuaBot: BotSupport<State, Move> = {
  levels: BOT_LEVELS,
  chooseMove(state: State, seat: SeatId, level: BotLevelId, rng: Rng): Move | null {
    const color = colorOfSeat(state, seat);
    if (color === null || color !== state.turn) return null;
    return chooseBotMove(state, level, rng);
  },
};
