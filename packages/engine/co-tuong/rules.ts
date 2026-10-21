// Luật Cờ tướng, khớp docs/co-tuong/01-luat-choi.md và thuật toán ở docs/co-tuong/03-thiet-ke-ky-thuat.md mục 3.
// Hàm thuần: không sửa state đầu vào, không I/O, không ngẫu nhiên.

import type { ForfeitReason, GameModule, GameResult, SeatId } from "../game-module.ts";
import { CELL_COUNT, indexOf, isInCheck, pseudoMoves } from "./moves.ts";
import type { EndReason, GameEvent, Kind, Move, Options, Piece, ScoreDetail, Side, State } from "./types.ts";

export { isInCheck } from "./moves.ts";

export const defaultOptions: Options = { thoiGianLuot: 30 };

/** Điểm mỗi người khi hoà (luật mục 6) */
const DRAW_SCORE = 0.5;
/** Số lần một thế cờ xuất hiện thì hoà (T5) */
const REPETITIONS_TO_DRAW = 3;

/** Hàng sau của mỗi bên, từ cột 0 đến 8 (luật mục 3) */
const BACK_RANK: readonly Kind[] = ["xe", "ma", "voi", "si", "tuong", "si", "voi", "ma", "xe"];
const CANNON_COLUMNS = [1, 7] as const;
const PAWN_COLUMNS = [0, 2, 4, 6, 8] as const;
/** Hàng xuất phát [Hàng sau, Pháo, Tốt] của từng bên */
const START_ROWS: Record<Side, readonly [back: number, cannon: number, pawn: number]> = {
  0: [9, 7, 6],
  1: [0, 2, 3],
};

/** Ký tự khoá thế cờ: chữ hoa cho Đỏ, chữ thường cho Đen */
const KIND_KEY: Record<Kind, string> = { tuong: "k", si: "a", voi: "b", xe: "r", phao: "c", ma: "n", tot: "p" };

const other = (side: Side): Side => (side === 0 ? 1 : 0);

function clone(s: State): State {
  return {
    ...s,
    cells: [...s.cells],
    players: [s.players[0], s.players[1]],
    last: s.last ? { ...s.last } : null,
    captured: [...s.captured],
    history: [...s.history],
    options: { ...s.options },
  };
}

/** Bên mà ghế `seat` cầm; null nếu không có trong ván */
function sideOf(s: State, seat: SeatId): Side | null {
  if (s.players[0] === seat) return 0;
  return s.players[1] === seat ? 1 : null;
}

const positionKey = (cells: readonly (Piece | null)[], turn: Side): string =>
  cells.map((c) => (c === null ? "." : c.side === 0 ? KIND_KEY[c.kind].toUpperCase() : KIND_KEY[c.kind])).join("") +
  turn;

function startingCells(): (Piece | null)[] {
  const cells: (Piece | null)[] = new Array(CELL_COUNT).fill(null);
  for (const side of [0, 1] as const) {
    const [back, cannon, pawn] = START_ROWS[side];
    BACK_RANK.forEach((kind, x) => {
      cells[indexOf(x, back)] = { kind, side };
    });
    for (const x of CANNON_COLUMNS) cells[indexOf(x, cannon)] = { kind: "phao", side };
    for (const x of PAWN_COLUMNS) cells[indexOf(x, pawn)] = { kind: "tot", side };
  }
  return cells;
}

/** Ghế `firstPlayer` cầm Đỏ và đi trước (luật mục 1); người còn lại cầm Đen */
export function setup(options: Options, seats: SeatId[], firstPlayer: SeatId): State {
  const [second, ...extra] = seats.filter((seat) => seat !== firstPlayer);
  if (seats.length !== 2 || second === undefined || extra.length > 0) {
    throw new Error(`Ghế không hợp lệ: ${seats} / ${firstPlayer}`);
  }
  const cells = startingCells();
  return {
    cells,
    players: [firstPlayer, second],
    turn: 0,
    moveNo: 0,
    last: null,
    captured: [],
    inCheck: false,
    history: [positionKey(cells, 0)],
    options: { ...options },
    status: "playing",
    result: null,
  };
}

/** Bàn sau khi đi quân từ `from` đến `to` (ăn quân nếu có) */
function simulate(cells: readonly (Piece | null)[], from: number, to: number): (Piece | null)[] {
  const next = [...cells];
  next[to] = next[from] ?? null;
  next[from] = null;
  return next;
}

/** Các ô đến hợp lệ của quân tại `from`: đúng cách đi và không để tướng mình bị chiếu (luật mục 5) */
function legalTargets(cells: readonly (Piece | null)[], from: number, side: Side): number[] {
  return pseudoMoves(cells, from).filter((to) => !isInCheck(simulate(cells, from, to), side));
}

function hasLegalMove(cells: readonly (Piece | null)[], side: Side): boolean {
  return cells.some((piece, from) => piece?.side === side && legalTargets(cells, from, side).length > 0);
}

export function validMoves(state: State, seat: SeatId): Move[] {
  if (state.status !== "playing" || state.players[state.turn] !== seat) return [];
  const moves: Move[] = [];
  state.cells.forEach((piece, from) => {
    if (piece?.side !== state.turn) return;
    for (const to of legalTargets(state.cells, from, state.turn)) moves.push({ from, to });
  });
  return moves;
}

export function applyMove(
  state: State,
  seat: SeatId,
  move: Move,
): { state: State; events: GameEvent[] } | { error: string } {
  if (state.status !== "playing") return { error: "INVALID_MOVE" };
  if (state.players[state.turn] !== seat) return { error: "NOT_YOUR_TURN" };
  const { from, to } = move;
  const piece = Number.isInteger(from) && from >= 0 && from < CELL_COUNT ? state.cells[from] : null;
  if (!piece || piece.side !== state.turn || !Number.isInteger(to) || to < 0 || to >= CELL_COUNT) {
    return { error: "INVALID_MOVE" };
  }
  if (!legalTargets(state.cells, from, state.turn).includes(to)) return { error: "INVALID_MOVE" };

  const s = clone(state);
  const captured = s.cells[to] ?? null;
  s.cells = simulate(s.cells, from, to);
  if (captured) s.captured.push(captured);
  s.last = { from, to };
  s.moveNo++;
  const mover = s.turn;
  s.turn = other(mover);
  s.inCheck = isInCheck(s.cells, s.turn);
  s.history.push(positionKey(s.cells, s.turn));

  const events: GameEvent[] = [{ t: "move", from, to, piece, captured }];
  if (s.inCheck) events.push({ t: "check", side: s.turn });
  concludeAfterMove(s, mover, events);
  return { state: s, events };
}

/** Sau một nước: bên kế tiếp hết nước (luật mục 6) hoặc thế cờ lặp lần thứ 3 (T5) thì kết thúc ván */
function concludeAfterMove(s: State, mover: Side, events: GameEvent[]): void {
  if (!hasLegalMove(s.cells, s.turn)) {
    finish(s, s.inCheck ? "chieu-bi" : "het-nuoc", mover, events);
    return;
  }
  const key = s.history[s.history.length - 1];
  if (s.history.filter((k) => k === key).length >= REPETITIONS_TO_DRAW) {
    events.push({ t: "draw" });
    finish(s, "lap-the", null, events);
  }
}

/** Kết thúc ván: `winner` là bên thắng, null là hoà (luật mục 6) */
function finish(s: State, reason: EndReason, winner: Side | null, events: GameEvent[]): void {
  const scores: number[] = [];
  for (const side of [0, 1] as const) {
    scores[s.players[side]] = winner === null ? DRAW_SCORE : winner === side ? 1 : 0;
  }
  const detail: ScoreDetail = { moves: s.moveNo, marks: [s.players[0], s.players[1]] };
  const result: GameResult = {
    winner: winner === null ? null : s.players[winner],
    scores,
    reason,
    detail,
  };
  s.status = "finished";
  s.result = result;
  events.push({ t: "gameOver", result });
}

/** Xử thua do hết giờ hoặc bỏ cuộc: đối thủ của `seat` thắng, bàn giữ nguyên. Lớp phòng tự đếm và gọi hàm này. */
export function forfeit(
  state: State,
  seat: SeatId,
  reason: ForfeitReason,
): { state: State; events: GameEvent[] } | { error: string } {
  if (state.status !== "playing") return { error: "INVALID_MOVE" };
  const loser = sideOf(state, seat);
  if (loser === null) return { error: "INVALID_MOVE" };
  const s = clone(state);
  const events: GameEvent[] = [];
  finish(s, reason, other(loser), events);
  return { state: s, events };
}

export function result(state: State): GameResult | null {
  return state.result;
}

/** Giá trị hợp lệ của từng tuỳ chọn */
const OPTION_VALUES: { [K in keyof Options]: readonly Options[K][] } = {
  thoiGianLuot: [15, 30, 60, null],
};

/** Đọc tuỳ chọn từ dữ liệu ngoài: chỉ nhận khoá đã biết với giá trị hợp lệ; còn lại giữ theo `base`. */
export function parseOptions(raw: unknown, base: Options): Options {
  const out: Options = { ...base };
  if (typeof raw !== "object" || raw === null) return out;
  const input = raw as Record<string, unknown>;
  if ((OPTION_VALUES.thoiGianLuot as readonly unknown[]).includes(input.thoiGianLuot)) {
    out.thoiGianLuot = input.thoiGianLuot as Options["thoiGianLuot"];
  }
  return out;
}

/** Đọc nước đi từ dữ liệu ngoài: chỉ kiểm tra hình dạng; đúng luật hay không do `applyMove` quyết định */
export function parseMove(raw: unknown): Move | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { from, to } = raw as Record<string, unknown>;
  const isCell = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
  return isCell(from) && isCell(to) ? { from, to } : null;
}

export const coTuong: GameModule<State, Move, Options, GameEvent> = {
  id: "co-tuong",
  minPlayers: 2,
  maxPlayers: 2,
  defaultOptions,
  setup,
  validMoves,
  applyMove,
  // Cờ tướng không có thông tin ẩn
  viewFor: (state) => state,
  result,
  forfeit,
  parseOptions,
  parseMove,
};
