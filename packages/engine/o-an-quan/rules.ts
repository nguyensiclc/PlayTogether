// Luật Ô ăn quan, khớp 01-luat-choi.md và thuật toán ở mục 5 tài liệu kỹ thuật.
// Hàm thuần: không sửa state đầu vào, không I/O, không ngẫu nhiên.
import type { GameModule, GameResult, SeatId } from "../game-module.ts";
import type { Dir, GameEvent, Move, Options, ScoreDetail, Seat, State } from "./types.ts";

export const defaultOptions: Options = { giaTriQuan: 10, camAnQuanNon: false, thoiGianLuot: 30 };

/** Số dân rải lại khi hàng trống (mục 6 luật) */
const SPREAD = 5;
/** Giới hạn an toàn số viên rải trong một lượt, để phát hiện lỗi vòng lặp */
const MAX_DROPS_PER_TURN = 10_000;

const ROWS: Record<Seat, readonly number[]> = {
  0: [1, 2, 3, 4, 5],
  1: [7, 8, 9, 10, 11],
};

export const isQuanSquare = (i: number): boolean => i === 0 || i === 6;

export function owner(i: number): Seat | null {
  if (i >= 1 && i <= 5) return 0;
  if (i >= 7 && i <= 11) return 1;
  return null;
}

export const next = (i: number, dir: Dir): number => (i + dir + 12) % 12;

const quanIndex = (i: number): 0 | 1 => (i === 0 ? 0 : 1);

const quanAt = (s: State, i: number): boolean => isQuanSquare(i) && s.quan[quanIndex(i)];

const at = (s: State, i: number): number => s.dan[i] ?? 0;

/** Ô trống hẳn: không dân, và nếu là ô quan thì cũng không còn quan */
export const isEmpty = (s: State, i: number): boolean => at(s, i) === 0 && !quanAt(s, i);

const isSeat = (seat: SeatId): seat is Seat => seat === 0 || seat === 1;

const rowEmpty = (s: State, seat: Seat): boolean => ROWS[seat].every((i) => at(s, i) === 0);

function clone(s: State): State {
  return {
    ...s,
    dan: [...s.dan],
    quan: [s.quan[0], s.quan[1]],
    captured: [{ ...s.captured[0] }, { ...s.captured[1] }],
    debt: [s.debt[0], s.debt[1]],
    options: { ...s.options },
  };
}

export function setup(options: Options, _seats: SeatId[], firstPlayer: SeatId): State {
  if (!isSeat(firstPlayer)) throw new Error(`firstPlayer không hợp lệ: ${firstPlayer}`);
  return {
    dan: [0, 5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5],
    quan: [true, true],
    captured: [
      { dan: 0, quan: 0 },
      { dan: 0, quan: 0 },
    ],
    debt: [0, 0],
    turn: firstPlayer,
    moveNo: 0,
    options: { ...options },
    status: "playing",
    result: null,
  };
}

export function validMoves(state: State, seat: SeatId): Move[] {
  if (state.status !== "playing" || seat !== state.turn || !isSeat(seat)) return [];
  const moves: Move[] = [];
  for (const square of ROWS[seat]) {
    if (at(state, square) > 0) moves.push({ square, dir: 1 }, { square, dir: -1 });
  }
  return moves;
}

export function applyMove(
  state: State,
  seat: SeatId,
  move: Move,
): { state: State; events: GameEvent[] } | { error: string } {
  if (state.status !== "playing") return { error: "INVALID_MOVE" };
  if (!isSeat(seat) || seat !== state.turn) return { error: "NOT_YOUR_TURN" };
  const { square, dir } = move;
  if (dir !== 1 && dir !== -1) return { error: "INVALID_MOVE" };
  if (!Number.isInteger(square) || owner(square) !== seat) return { error: "INVALID_MOVE" };
  if (at(state, square) <= 0) return { error: "INVALID_MOVE" };

  const s = clone(state);
  const events: GameEvent[] = [];

  // Bốc ô đã chọn
  let hand = at(s, square);
  s.dan[square] = 0;
  events.push({ t: "pick", i: square, n: hand });
  let pos = square;
  let drops = 0;

  for (;;) {
    // Rải (có thể đi qua chính ô vừa bốc)
    while (hand > 0) {
      pos = next(pos, dir);
      s.dan[pos] = at(s, pos) + 1;
      hand--;
      events.push({ t: "drop", i: pos });
      if (++drops > MAX_DROPS_PER_TURN) throw new Error("Vượt giới hạn rải trong một lượt");
    }

    const n = next(pos, dir);
    // (a) ô dân có quân: bốc rải tiếp
    if (!isQuanSquare(n) && at(s, n) > 0) {
      hand = at(s, n);
      s.dan[n] = 0;
      pos = n;
      events.push({ t: "pick", i: n, n: hand });
      continue;
    }
    // (b) ô quan còn quân
    if (isQuanSquare(n) && !isEmpty(s, n)) {
      events.push({ t: "turnEnd", reason: "gap-o-quan" });
      break;
    }
    // n trống
    let t = next(n, dir);
    // (d)
    if (isEmpty(s, t)) {
      events.push({ t: "turnEnd", reason: "hai-o-trong" });
      break;
    }
    // (c) + ăn dây
    for (;;) {
      if (quanAt(s, t) && at(s, t) < 5 && s.options.camAnQuanNon) {
        events.push({ t: "turnEnd", reason: "quan-non" });
        break;
      }
      capture(s, t, seat, events);
      const e = next(t, dir);
      const t2 = next(e, dir);
      if (isEmpty(s, e) && !isEmpty(s, t2)) {
        t = t2;
        continue;
      }
      events.push({ t: "turnEnd", reason: "het-an" });
      break;
    }
    break;
  }

  // Hết quan, tàn dân
  if (isEmpty(s, 0) && isEmpty(s, 6)) {
    finish(s, "het-quan", events);
    return { state: s, events };
  }

  s.turn = (1 - s.turn) as Seat;
  s.moveNo++;
  if (rowEmpty(s, s.turn)) spread(s, events);
  return { state: s, events };
}

function capture(s: State, i: number, by: Seat, events: GameEvent[]): void {
  const dan = at(s, i);
  const quan = quanAt(s, i) ? 1 : 0;
  s.dan[i] = 0;
  if (quan) s.quan[quanIndex(i)] = false;
  s.captured[by].dan += dan;
  s.captured[by].quan += quan;
  events.push({ t: "capture", i, dan, quan, by });
}

/** Rải quân khi hàng của người đến lượt trống hết (mục 6 luật). */
function spread(s: State, events: GameEvent[]): void {
  const seat = s.turn;
  const opp = (1 - seat) as Seat;
  const own = s.captured[seat].dan;
  if (own + s.captured[opp].dan < SPREAD) {
    finish(s, "khong-du-dan", events);
    return;
  }
  const fromOwn = Math.min(SPREAD, own);
  const borrowed = SPREAD - fromOwn;
  s.captured[seat].dan -= fromOwn;
  s.captured[opp].dan -= borrowed;
  s.debt[seat] += borrowed;
  for (const i of ROWS[seat]) s.dan[i] = 1;
  events.push({ t: "spread", seat, fromOwn, borrowed });
}

/**
 * Kết thúc ván (mục 7 luật). Quân thu trên bàn được cộng vào phần đã ăn, bàn trống hẳn.
 * - "het-quan": mỗi người thu dân trên hàng mình.
 * - "khong-du-dan": người không phải rải (đối thủ của người đến lượt) thu toàn bộ quân trên bàn (Q7).
 */
function finish(s: State, reason: "het-quan" | "khong-du-dan", events: GameEvent[]): void {
  const danBefore = [s.captured[0].dan, s.captured[1].dan];
  const rowDan = [0, 0];

  if (reason === "het-quan") {
    for (const seat of [0, 1] as const) {
      rowDan[seat] = ROWS[seat].reduce((sum, i) => sum + at(s, i), 0);
    }
  } else {
    const collector = (1 - s.turn) as Seat;
    rowDan[collector] = s.dan.reduce((sum, d) => sum + d, 0);
    s.captured[collector].quan += Number(s.quan[0]) + Number(s.quan[1]);
  }

  s.dan.fill(0);
  s.quan = [false, false];
  const v = s.options.giaTriQuan;
  const detail: ScoreDetail[] = ([0, 1] as const).map((seat) => {
    const dan = danBefore[seat] ?? 0;
    const row = rowDan[seat] ?? 0;
    s.captured[seat].dan += row;
    const quan = s.captured[seat].quan;
    const borrowed = s.debt[seat];
    const lent = s.debt[1 - seat] ?? 0;
    return { dan, quan, rowDan: row, borrowed, lent, total: dan + quan * v + row - borrowed + lent };
  });

  const scores = detail.map((d) => d.total);
  const [a = 0, b = 0] = scores;
  const result: GameResult = { winner: a === b ? null : a > b ? 0 : 1, scores, reason, detail };
  s.status = "finished";
  s.result = result;
  events.push({ t: "gameOver", result });
}

export function result(state: State): GameResult | null {
  return state.result;
}

export const oAnQuan: GameModule<State, Move, Options, GameEvent> = {
  id: "o-an-quan",
  minPlayers: 2,
  maxPlayers: 2,
  defaultOptions,
  setup,
  validMoves,
  applyMove,
  // Ô ăn quan không có thông tin ẩn
  viewFor: (state) => state,
  result,
};
