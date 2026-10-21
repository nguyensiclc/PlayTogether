// Luật Cờ caro, khớp docs/caro/01-luat-choi.md và thuật toán ở docs/caro/03-thiet-ke-ky-thuat.md mục 3.
// Hàm thuần: không sửa state đầu vào, không I/O, không ngẫu nhiên.

import type { ForfeitReason, GameModule, GameResult, SeatId } from "../game-module.ts";
import type { EndReason, GameEvent, Mark, Move, Options, ScoreDetail, State, YieldMove } from "./types.ts";

/** Nước nhường lượt (luật mục 3.1) hay nước đặt quân */
export const isYield = (move: Move): move is YieldMove => "nhuong" in move;

export const defaultOptions: Options = { kichThuoc: 15, chanHaiDau: false, thoiGianLuot: 30 };

/** Số quân liền tối thiểu để thắng (luật mục 4) */
const WIN_LENGTH = 5;
/** Điểm mỗi người khi hoà (luật mục 6) */
const DRAW_SCORE = 0.5;

type Direction = readonly [dx: number, dy: number];
/** Bốn hướng xét thắng: ngang, dọc, chéo \ và chéo / */
const DIRECTIONS: readonly Direction[] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

const other = (mark: Mark): Mark => (mark === 0 ? 1 : 0);

const inBoard = (size: number, x: number, y: number): boolean => x >= 0 && y >= 0 && x < size && y < size;

/** Đầu chuỗi bị chặn: ngoài bàn (C3) hoặc có quân đối thủ. Ô ngay sau một chuỗi tối đa không thể là quân cùng loại. */
const isBlocked = (cells: readonly (Mark | null)[], size: number, x: number, y: number): boolean =>
  !inBoard(size, x, y) || cells[y * size + x] !== null;

function clone(s: State): State {
  return {
    ...s,
    cells: [...s.cells],
    players: [s.players[0], s.players[1]],
    winLine: s.winLine ? [...s.winLine] : null,
    options: { ...s.options },
  };
}

/** Ghế `seat` cầm quân nào; null nếu không có trong ván */
function markOf(s: State, seat: SeatId): Mark | null {
  if (s.players[0] === seat) return 0;
  return s.players[1] === seat ? 1 : null;
}

/** Người đi trước (ghế `firstPlayer`) cầm X (Q: C6) */
export function setup(options: Options, seats: SeatId[], firstPlayer: SeatId): State {
  const [second, ...extra] = seats.filter((seat) => seat !== firstPlayer);
  if (seats.length !== 2 || second === undefined || extra.length > 0) {
    throw new Error(`Ghế không hợp lệ: ${seats} / ${firstPlayer}`);
  }
  return {
    size: options.kichThuoc,
    cells: new Array<Mark | null>(options.kichThuoc * options.kichThuoc).fill(null),
    players: [firstPlayer, second],
    turn: 0,
    moveNo: 0,
    nhuong: false,
    last: null,
    winLine: null,
    options: { ...options },
    status: "playing",
    result: null,
  };
}

export function validMoves(state: State, seat: SeatId): Move[] {
  if (state.status !== "playing" || state.players[state.turn] !== seat) return [];
  const moves: Move[] = [];
  if (canYield(state)) moves.push({ nhuong: true });
  state.cells.forEach((cell, i) => {
    if (cell === null) moves.push({ x: i % state.size, y: Math.floor(i / state.size) });
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
  if (isYield(move)) return yieldFirst(state, seat);
  const { x, y } = move;
  if (!Number.isInteger(x) || !Number.isInteger(y) || !inBoard(state.size, x, y)) return { error: "INVALID_MOVE" };
  const i = y * state.size + x;
  if (state.cells[i] !== null) return { error: "INVALID_MOVE" };

  const mark = state.turn;
  const s = clone(state);
  s.cells[i] = mark;
  s.last = i;
  s.moveNo++;
  const events: GameEvent[] = [{ t: "place", x, y, by: mark }];

  const line = winningCells(s, x, y);
  if (line.length > 0) {
    s.winLine = line;
    events.push({ t: "win", line });
    finish(s, "nam-quan", mark, events);
  } else if (s.moveNo === s.size * s.size) {
    events.push({ t: "draw" });
    finish(s, "het-ban", null, events);
  } else {
    s.turn = other(mark);
  }
  return { state: s, events };
}

/** Được nhường lượt khi chưa có quân nào trên bàn và chưa ai nhường (luật mục 3.1) */
const canYield = (s: State): boolean => s.status === "playing" && s.moveNo === 0 && !s.nhuong;

/** Người đi trước nhường: hai người đổi quân, đối thủ cầm X và đến lượt họ; không có quân nào được đặt */
function yieldFirst(state: State, seat: SeatId): { state: State; events: GameEvent[] } | { error: string } {
  if (!canYield(state)) return { error: "INVALID_MOVE" };
  const s = clone(state);
  s.players = [state.players[1], state.players[0]];
  s.nhuong = true;
  return { state: s, events: [{ t: "nhuong", from: seat, to: s.players[0] }] };
}

/**
 * Các ô của mọi chuỗi thắng đi qua quân vừa đặt tại (x, y), theo chỉ số tăng dần; rỗng nếu chưa thắng (luật mục 4).
 * Chỉ xét chuỗi qua quân vừa đặt, nên mỗi nước tốn O(4 × size).
 */
function winningCells(s: State, x: number, y: number): number[] {
  const found = new Set<number>();
  for (const dir of DIRECTIONS) {
    const run = runThrough(s, x, y, dir);
    const blockedBothEnds = run.blockedBefore && run.blockedAfter;
    if (run.cells.length < WIN_LENGTH || (s.options.chanHaiDau && blockedBothEnds)) continue;
    for (const cell of run.cells) found.add(cell);
  }
  return [...found].sort((a, b) => a - b);
}

/**
 * Quân tại (x, y) có tạo chuỗi từ 5 quân bị chặn cả hai đầu không (chỉ có nghĩa khi bật Chặn 2 đầu).
 * Giao diện dùng để giải thích vì sao ván vẫn tiếp tục (UX mục 6).
 */
export function hasBlockedLine(s: State, x: number, y: number): boolean {
  if (!s.options.chanHaiDau) return false;
  return DIRECTIONS.some((dir) => {
    const run = runThrough(s, x, y, dir);
    return run.cells.length >= WIN_LENGTH && run.blockedBefore && run.blockedAfter;
  });
}

interface Run {
  /** Các ô của chuỗi, theo chiều hướng `dir` */
  cells: number[];
  /** Ô ngay trước đầu chuỗi bị chặn */
  blockedBefore: boolean;
  /** Ô ngay sau cuối chuỗi bị chặn */
  blockedAfter: boolean;
}

/** Chuỗi quân cùng loại liền nhau, dài tối đa, đi qua (x, y) theo hướng `dir` */
function runThrough(s: State, x: number, y: number, [dx, dy]: Direction): Run {
  const { cells, size } = s;
  const mark = cells[y * size + x];
  const same = (cx: number, cy: number) => inBoard(size, cx, cy) && cells[cy * size + cx] === mark;
  let startX = x;
  let startY = y;
  while (same(startX - dx, startY - dy)) {
    startX -= dx;
    startY -= dy;
  }
  const run: number[] = [];
  let endX = startX;
  let endY = startY;
  while (same(endX, endY)) {
    run.push(endY * size + endX);
    endX += dx;
    endY += dy;
  }
  return {
    cells: run,
    blockedBefore: isBlocked(cells, size, startX - dx, startY - dy),
    blockedAfter: isBlocked(cells, size, endX, endY),
  };
}

/** Kết thúc ván: `winner` là quân thắng, null là hoà (luật mục 6) */
function finish(s: State, reason: EndReason, winner: Mark | null, events: GameEvent[]): void {
  const scores: number[] = [];
  for (const mark of [0, 1] as const) {
    scores[s.players[mark]] = winner === null ? DRAW_SCORE : winner === mark ? 1 : 0;
  }
  const detail: ScoreDetail = { moves: s.moveNo, line: s.winLine, marks: [s.players[0], s.players[1]] };
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
  const loser = markOf(state, seat);
  if (loser === null) return { error: "INVALID_MOVE" };
  const s = clone(state);
  const events: GameEvent[] = [];
  finish(s, reason, other(loser), events);
  return { state: s, events };
}

export function result(state: State): GameResult | null {
  return state.result;
}

/** Giá trị hợp lệ của từng tuỳ chọn (luật mục 9) */
const OPTION_VALUES: { [K in keyof Options]: readonly Options[K][] } = {
  kichThuoc: [15, 19],
  chanHaiDau: [true, false],
  thoiGianLuot: [15, 30, 60, null],
};

/** Đọc tuỳ chọn từ dữ liệu ngoài: chỉ nhận khoá đã biết với giá trị hợp lệ; còn lại giữ theo `base`. */
export function parseOptions(raw: unknown, base: Options): Options {
  const out: Options = { ...base };
  if (typeof raw !== "object" || raw === null) return out;
  const input = raw as Record<string, unknown>;
  for (const key of Object.keys(OPTION_VALUES) as (keyof Options)[]) setOption(out, key, input[key]);
  return out;
}

function setOption<K extends keyof Options>(out: Options, key: K, value: unknown): void {
  if ((OPTION_VALUES[key] as readonly unknown[]).includes(value)) out[key] = value as Options[K];
}

/** Đọc nước đi từ dữ liệu ngoài: chỉ kiểm tra hình dạng; có nằm trong bàn và còn trống hay không do `applyMove` quyết định */
export function parseMove(raw: unknown): Move | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { x, y, nhuong } = raw as Record<string, unknown>;
  if (nhuong === true) return { nhuong: true };
  return typeof x === "number" && typeof y === "number" && Number.isInteger(x) && Number.isInteger(y) ? { x, y } : null;
}

export const caro: GameModule<State, Move, Options, GameEvent> = {
  id: "caro",
  minPlayers: 2,
  maxPlayers: 2,
  defaultOptions,
  setup,
  validMoves,
  applyMove,
  // Cờ caro không có thông tin ẩn
  viewFor: (state) => state,
  result,
  forfeit,
  parseOptions,
  parseMove,
};
