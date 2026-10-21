// Luật Ô ăn quan, khớp 01-luat-choi.md và thuật toán ở mục 5 tài liệu kỹ thuật.
// Hàm thuần: không sửa state đầu vào, không I/O, không ngẫu nhiên.
import type { ForfeitReason, GameModule, GameResult, SeatId } from "../game-module.ts";
import type { Dir, EndReason, GameEvent, Move, Options, ScoreDetail, Seat, SowMove, State } from "./types.ts";

export const defaultOptions: Options = { giaTriQuan: 10, camAnQuanNon: false, latBan: false, thoiGianLuot: 30 };

/** Số điểm trừ khi bù dân (luật mục 6) */
const BU_DAN = 5;
/** Số dân tối thiểu để ăn ô quan còn quan khi bật Quan Già (luật mục 5) */
const QUAN_GIA_MIN = 5;
/** Số nước rải gần nhất cần giữ để phát hiện lặp nước (luật mục 8) */
const REPEAT_WINDOW = 6;
/** Giới hạn an toàn số viên rải trong một lượt, để phát hiện lỗi vòng lặp */
const MAX_DROPS_PER_TURN = 10_000;

export const ROWS: Record<Seat, readonly number[]> = {
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

const rowEmpty = (s: State, seat: Seat): boolean => ROWS[seat].every((i) => at(s, i) === 0);

const other = (seat: Seat): Seat => (seat === 0 ? 1 : 0);

/** Người đang được đi (ghế điều khiển bên đến lượt) */
const toMove = (s: State): SeatId => s.controller[s.turn];

const sameSow = (a: SowMove | undefined, b: SowMove | undefined): boolean =>
  !!a && !!b && a.square === b.square && a.dir === b.dir;

const canLatBan = (s: State): boolean => s.options.latBan && !s.latBanUsed && s.moveNo === 1;

function clone(s: State): State {
  return {
    ...s,
    dan: [...s.dan],
    quan: [s.quan[0], s.quan[1]],
    captured: [{ ...s.captured[0] }, { ...s.captured[1] }],
    controller: [s.controller[0], s.controller[1]],
    recentSows: s.recentSows.map((m) => ({ ...m })),
    buDanCount: [s.buDanCount[0], s.buDanCount[1]],
    options: { ...s.options },
  };
}

/** Bên A luôn đi trước, do `firstPlayer` điều khiển (Q17). */
export function setup(options: Options, seats: SeatId[], firstPlayer: SeatId): State {
  const [second, ...extra] = seats.filter((s) => s !== firstPlayer);
  if (seats.length !== 2 || second === undefined || extra.length > 0) {
    throw new Error(`Ghế không hợp lệ: ${seats} / ${firstPlayer}`);
  }
  return {
    dan: [0, 5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5],
    quan: [true, true],
    captured: [
      { dan: 0, quan: 0 },
      { dan: 0, quan: 0 },
    ],
    controller: [firstPlayer, second],
    turn: 0,
    moveNo: 0,
    latBanUsed: false,
    recentSows: [],
    buDanCount: [0, 0],
    options: { ...options },
    status: "playing",
    result: null,
  };
}

/** Mọi nước hợp lệ của người chơi, gồm cả Lật bàn khi được phép (Q18). */
export function validMoves(state: State, seatId: SeatId): Move[] {
  if (state.status !== "playing" || toMove(state) !== seatId) return [];
  const moves: Move[] = [];
  for (const square of ROWS[state.turn]) {
    if (at(state, square) > 0) moves.push({ kind: "sow", square, dir: 1 }, { kind: "sow", square, dir: -1 });
  }
  if (canLatBan(state)) moves.push({ kind: "latBan" });
  return moves;
}

export function applyMove(
  state: State,
  seatId: SeatId,
  move: Move,
): { state: State; events: GameEvent[] } | { error: string } {
  if (state.status !== "playing") return { error: "INVALID_MOVE" };
  if (toMove(state) !== seatId) return { error: "NOT_YOUR_TURN" };
  if (move.kind === "latBan") return latBan(state);
  if (move.kind !== "sow") return { error: "INVALID_MOVE" };
  const { square, dir } = move;
  if (dir !== 1 && dir !== -1) return { error: "INVALID_MOVE" };
  if (!Number.isInteger(square) || owner(square) !== state.turn) return { error: "INVALID_MOVE" };
  if (at(state, square) <= 0) return { error: "INVALID_MOVE" };

  const s = clone(state);
  const events: GameEvent[] = [];
  sow(s, square, dir, events);

  s.moveNo++;
  const sown: SowMove = { kind: "sow", square, dir };
  s.recentSows = [...s.recentSows, sown].slice(-REPEAT_WINDOW);

  // Thứ tự kiểm tra kết thúc ván: hết quan → lặp nước → bù dân
  if (isEmpty(s, 0) && isEmpty(s, 6)) {
    finish(s, "het-quan", events);
  } else if (isRepetition(s.recentSows)) {
    finish(s, "lap-nuoc", events);
  } else {
    s.turn = other(s.turn);
    if (rowEmpty(s, s.turn)) buDan(s, events);
  }
  return { state: s, events };
}

/** Lật bàn (luật mục 9, kỹ thuật mục 5.1). Quyền đi đã được kiểm tra trước. */
function latBan(state: State): { state: State; events: GameEvent[] } | { error: string } {
  if (!canLatBan(state)) return { error: "INVALID_MOVE" };
  const s = clone(state);
  s.controller = [s.controller[1], s.controller[0]];
  s.latBanUsed = true;
  s.recentSows = [];
  return { state: s, events: [{ t: "latBan" }] };
}

/** Rải, bốc rải tiếp, rồi xét ô kế tiếp (luật mục 3). */
function sow(s: State, square: number, dir: Dir, events: GameEvent[]): void {
  let pos = square;
  let hand = pickUp(s, square, events);
  let drops = 0;
  for (;;) {
    drops += hand;
    if (drops > MAX_DROPS_PER_TURN) throw new Error("Vượt giới hạn rải trong một lượt");
    pos = scatter(s, pos, hand, dir, events);
    const n = next(pos, dir);
    // (a) ô dân có quân: bốc rải tiếp
    if (!isQuanSquare(n) && at(s, n) > 0) {
      pos = n;
      hand = pickUp(s, n, events);
      continue;
    }
    resolveAfterSowing(s, n, dir, events);
    return;
  }
}

/** Bốc hết dân trong ô, trả về số dân trên tay. */
function pickUp(s: State, i: number, events: GameEvent[]): number {
  const hand = at(s, i);
  s.dan[i] = 0;
  events.push({ t: "pick", i, n: hand });
  return hand;
}

/** Rải `hand` viên từ ô sau `from`, trả về ô nhận viên cuối. Có thể đi qua chính ô vừa bốc. */
function scatter(s: State, from: number, hand: number, dir: Dir, events: GameEvent[]): number {
  let pos = from;
  for (let k = 0; k < hand; k++) {
    pos = next(pos, dir);
    s.dan[pos] = at(s, pos) + 1;
    events.push({ t: "drop", i: pos });
  }
  return pos;
}

/** Ô `n` sau viên cuối không phải ô dân có quân: (b) gặp ô quan, (d) hai ô trống, hoặc (c) ăn. */
function resolveAfterSowing(s: State, n: number, dir: Dir, events: GameEvent[]): void {
  if (isQuanSquare(n) && !isEmpty(s, n)) {
    events.push({ t: "turnEnd", reason: "gap-o-quan" });
    return;
  }
  const target = next(n, dir);
  if (isEmpty(s, target)) {
    events.push({ t: "turnEnd", reason: "hai-o-trong" });
    return;
  }
  captureChain(s, target, dir, events);
}

/** Ăn ô `first`, rồi còn "ô trống – ô có quân" phía trước thì ăn tiếp (luật mục 4; Quan Già mục 5). */
function captureChain(s: State, first: number, dir: Dir, events: GameEvent[]): void {
  let t = first;
  for (;;) {
    if (s.options.camAnQuanNon && quanAt(s, t) && at(s, t) < QUAN_GIA_MIN) {
      events.push({ t: "turnEnd", reason: "quan-non" });
      return;
    }
    capture(s, t, s.turn, events);
    const gap = next(t, dir);
    const after = next(gap, dir);
    if (!isEmpty(s, gap) || isEmpty(s, after)) {
      events.push({ t: "turnEnd", reason: "het-an" });
      return;
    }
    t = after;
  }
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

/** 6 nước rải gần nhất có dạng X Y X Y X Y (luật mục 8). */
function isRepetition(m: readonly SowMove[]): boolean {
  if (m.length < REPEAT_WINDOW) return false;
  return sameSow(m[0], m[2]) && sameSow(m[2], m[4]) && sameSow(m[1], m[3]) && sameSow(m[3], m[5]);
}

/** Bù dân khi hàng của bên đến lượt trống hết (luật mục 6, Q13). */
function buDan(s: State, events: GameEvent[]): void {
  const seat = s.turn;
  const v = s.options.giaTriQuan;
  const p = s.captured[seat];
  if (p.dan + p.quan * v < BU_DAN) {
    finish(s, "khong-du-bu-dan", events);
    return;
  }
  const doiQuan = p.dan < BU_DAN;
  if (doiQuan) {
    p.quan--;
    p.dan += v;
  }
  p.dan -= BU_DAN;
  for (const i of ROWS[seat]) s.dan[i] = 1;
  s.buDanCount[seat]++;
  events.push({ t: "buDan", seat, doiQuan });
}

/**
 * Kết thúc ván (luật mục 7). Quân trên bàn giữ nguyên; dân thu cuối ván chỉ ghi vào `ScoreDetail.rowDan`.
 * - "het-quan", "lap-nuoc": mỗi bên thu dân trên hàng mình (quân trong ô quan không tính), so điểm.
 * - "khong-du-bu-dan": bên đến lượt thua. "het-gio", "bo-cuoc": `loser` thua. Không thu quân.
 */
function finish(s: State, reason: EndReason, events: GameEvent[], loser?: SeatId): void {
  const bySide = [scoreSide(s, 0, reason), scoreSide(s, 1, reason)] as const;
  // scores và detail đánh theo người chơi (SeatId), không theo bên bàn (T20)
  const detail: ScoreDetail[] = [];
  detail[s.controller[0]] = bySide[0];
  detail[s.controller[1]] = bySide[1];
  const scores = detail.map((d) => d.total);
  const winner = decideWinner(s, reason, bySide, loser);

  const result: GameResult = { winner, scores, reason, detail };
  s.status = "finished";
  s.result = result;
  events.push({ t: "gameOver", result });
}

/** Điểm một bên lúc hết ván. Chỉ "het-quan", "lap-nuoc" mới thu dân trên hàng mình. */
function scoreSide(s: State, side: Seat, reason: EndReason): ScoreDetail {
  const p = s.captured[side];
  const collects = reason === "het-quan" || reason === "lap-nuoc";
  const rowDan = collects ? ROWS[side].reduce((sum, i) => sum + at(s, i), 0) : 0;
  return {
    side,
    dan: p.dan,
    quan: p.quan,
    rowDan,
    buDan: s.buDanCount[side],
    total: p.dan + p.quan * s.options.giaTriQuan + rowDan,
  };
}

/** Người thắng: theo lý do kết thúc nếu là xử thua, còn lại so điểm (luật mục 7). */
function decideWinner(
  s: State,
  reason: EndReason,
  bySide: readonly [ScoreDetail, ScoreDetail],
  loser: SeatId | undefined,
): SeatId | null {
  const [a, b] = s.controller;
  if (reason === "khong-du-bu-dan") return s.controller[other(s.turn)];
  if (loser !== undefined) return a === loser ? b : a;
  const [sa, sb] = [bySide[0].total, bySide[1].total];
  if (sa === sb) return null;
  return sa > sb ? a : b;
}

/** Xử thua do hết giờ (bị đi thay 3 lượt) hoặc bỏ cuộc. Lớp phòng tự đếm và gọi hàm này. */
export function forfeit(
  state: State,
  seatId: SeatId,
  reason: ForfeitReason,
): { state: State; events: GameEvent[] } | { error: string } {
  if (state.status !== "playing") return { error: "INVALID_MOVE" };
  if (!state.controller.includes(seatId)) return { error: "INVALID_MOVE" };
  const s = clone(state);
  const events: GameEvent[] = [];
  finish(s, reason, events, seatId);
  return { state: s, events };
}

/** Giá trị hợp lệ của từng tuỳ chọn (luật mục 12) */
const OPTION_VALUES: { [K in keyof Options]: readonly Options[K][] } = {
  giaTriQuan: [10, 5],
  camAnQuanNon: [true, false],
  latBan: [true, false],
  thoiGianLuot: [15, 30, 60, null],
};

/**
 * Đọc tuỳ chọn từ dữ liệu ngoài (chủ phòng gửi lên). Chỉ nhận khoá đã biết với giá trị hợp lệ;
 * phần thiếu hoặc sai thì giữ theo `base`.
 */
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

/** Đọc nước đi từ dữ liệu ngoài: chỉ kiểm tra hình dạng; đúng luật hay không do `applyMove` quyết định */
export function parseMove(raw: unknown): Move | null {
  if (typeof raw !== "object" || raw === null) return null;
  const input = raw as Record<string, unknown>;
  if (input.kind === "latBan") return { kind: "latBan" };
  const { square, dir } = input;
  const isSow = input.kind === "sow" && typeof square === "number" && Number.isInteger(square);
  return isSow && (dir === 1 || dir === -1) ? { kind: "sow", square, dir } : null;
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
  forfeit,
  parseOptions,
  parseMove,
};
