// Luật Tiến lên miền Nam (docs/tien-len/01-luat-choi.md). Hàm thuần: ngẫu nhiên chỉ qua `rng` truyền vào.

import type { ForfeitReason, GameModule, GameResult, Rng, SeatId, SetupContext } from "../game-module.ts";
import { allCombos, beats, byValue, classify, groupByRank, HEO } from "./combos.ts";
import type { Card, Combo, GameEvent, Move, Options, State, ToiTrangKind, View } from "./types.ts";

export const DEFAULT_OPTIONS: Options = { soNguoi: 4, chatHeo: true, toiTrang: true };

const HAND_SIZE = 13;

// ---------- Chia bài ----------

/** Bộ bài đã xáo (Fisher–Yates với RNG truyền vào) */
export function shuffledDeck(rng: Rng): Card[] {
  const deck = Array.from({ length: 52 }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j] as Card, deck[i] as Card];
  }
  return deck;
}

/** Chia 13 lá cho mỗi người; trả về `n` tay bài đã sắp tăng dần */
export function deal(rng: Rng, n: number): Card[][] {
  const deck = shuffledDeck(rng);
  return Array.from({ length: n }, (_, i) => deck.slice(i * HAND_SIZE, (i + 1) * HAND_SIZE).sort(byValue));
}

// ---------- Tới trắng ----------

const TOI_TRANG_ORDER: ToiTrangKind[] = ["tuQuyHeo", "sanhRong", "sauDoi"];

/** Tổ hợp tới trắng ưu tiên cao nhất của một tay bài, hoặc null */
export function toiTrangOf(hand: readonly Card[]): ToiTrangKind | null {
  const groups = groupByRank(hand);
  const kinds: Record<ToiTrangKind, boolean> = {
    tuQuyHeo: (groups[HEO]?.length ?? 0) === 4,
    // Sảnh rồng: có đủ 12 số từ 3 đến A (mỗi số ít nhất một lá)
    sanhRong: groups.slice(0, HEO).every((g) => g.length > 0),
    sauDoi: groups.reduce((sum, g) => sum + Math.floor(g.length / 2), 0) >= 6,
  };
  return TOI_TRANG_ORDER.find((k) => kinds[k]) ?? null;
}

// ---------- Dựng ván ----------

function maxSeat(seats: readonly SeatId[]): number {
  return seats.reduce((m, s) => Math.max(m, s), 0);
}

/** Điểm theo hạng: n người thì nhất n-1 điểm, bét 0 */
export function pointsFor(rankIndex: number, n: number): number {
  return Math.max(n - 1 - rankIndex, 0);
}

function scoresOf(ranking: readonly SeatId[], seats: readonly SeatId[]): number[] {
  const scores = Array.from({ length: maxSeat(seats) + 1 }, () => 0);
  ranking.forEach((seat, i) => {
    scores[seat] = pointsFor(i, seats.length);
  });
  return scores;
}

export function setup(options: Options, seats: SeatId[], firstPlayer: SeatId, rng: Rng, ctx?: SetupContext): State {
  const ordered = [...seats].sort((a, b) => a - b);
  const dealt = deal(rng, ordered.length);
  const hands: Card[][] = Array.from({ length: maxSeat(ordered) + 1 }, () => []);
  ordered.forEach((seat, i) => {
    hands[seat] = dealt[i] ?? [];
  });

  // Ván đầu: người giữ lá nhỏ nhất đi trước và bộ đầu phải chứa lá đó (TL6); các ván sau do phòng quyết định
  let turn = ordered.includes(firstPlayer) ? firstPlayer : (ordered[0] as SeatId);
  let mustInclude: Card | null = null;
  if (ctx?.firstGame) {
    const lowest = Math.min(...ordered.flatMap((s) => hands[s] ?? []));
    mustInclude = lowest;
    turn = ordered.find((s) => hands[s]?.includes(lowest)) ?? turn;
  }

  const state: State = {
    options: { ...options },
    seats: ordered,
    hands,
    turn,
    table: null,
    passed: [],
    finished: [],
    left: [],
    mustInclude,
    round: 1,
    moveNo: 0,
    toiTrang: null,
    status: "playing",
    result: null,
  };
  if (options.toiTrang) applyToiTrang(state);
  return state;
}

/** Tìm người tới trắng ngay sau khi chia; nhiều người thì ưu tiên tổ hợp cao hơn, rồi ghế nhỏ hơn */
function applyToiTrang(s: State): void {
  let best: { seat: SeatId; kind: ToiTrangKind } | null = null;
  for (const seat of s.seats) {
    const kind = toiTrangOf(s.hands[seat] ?? []);
    if (!kind) continue;
    if (best === null || TOI_TRANG_ORDER.indexOf(kind) < TOI_TRANG_ORDER.indexOf(best.kind)) best = { seat, kind };
  }
  if (!best) return;
  s.toiTrang = best;
  const at = s.seats.indexOf(best.seat);
  const ranking = [...s.seats.slice(at), ...s.seats.slice(0, at)];
  s.status = "finished";
  s.result = { winner: best.seat, scores: scoresOf(ranking, s.seats), reason: "toi-trang", ranking };
}

// ---------- Nước đi hợp lệ ----------

/**
 * Các bộ `hand` có thể đánh lên bộ `table` (null = đi tự do). `mustInclude` là lá bắt buộc có trong bộ (bộ đầu ván đầu).
 * Client dùng hàm này với `View` để biết nút Đánh có bật không.
 */
export function playableCombos(
  hand: readonly Card[],
  table: Combo | null,
  options: Pick<Options, "chatHeo">,
  mustInclude: Card | null,
): Combo[] {
  return allCombos(hand).filter(
    (c) => beats(table, c, options) && (mustInclude === null || c.cards.includes(mustInclude)),
  );
}

/** Mọi nước đi hợp lệ của `seat`: các bộ đánh được và bỏ lượt (khi bàn có bộ) */
export function validMoves(state: State, seat: SeatId): Move[] {
  if (state.status !== "playing" || state.turn !== seat) return [];
  const table = state.table?.combo ?? null;
  const must = state.moveNo === 0 ? state.mustInclude : null;
  const moves: Move[] = playableCombos(state.hands[seat] ?? [], table, state.options, must).map((c) => ({
    type: "play",
    cards: c.cards,
  }));
  if (table !== null) moves.push({ type: "pass" });
  return moves;
}

// ---------- Áp dụng nước đi ----------

function clone(s: State): State {
  return {
    ...s,
    options: { ...s.options },
    seats: [...s.seats],
    hands: s.hands.map((h) => [...h]),
    table: s.table ? { combo: { ...s.table.combo, cards: [...s.table.combo.cards] }, by: s.table.by } : null,
    passed: [...s.passed],
    finished: [...s.finished],
    left: [...s.left],
    toiTrang: s.toiTrang ? { ...s.toiTrang } : null,
  };
}

/** Ghế còn bài và còn trong ván */
function activeSeats(s: State): SeatId[] {
  return s.seats.filter((x) => !s.finished.includes(x) && !s.left.includes(x));
}

/** Ghế đầu tiên sau `from` (theo vòng) thoả `ok` */
function seatAfter(s: State, from: SeatId, ok: (seat: SeatId) => boolean): SeatId {
  const n = s.seats.length;
  const at = Math.max(s.seats.indexOf(from), 0);
  for (let k = 1; k <= n; k++) {
    const seat = s.seats[(at + k) % n] as SeatId;
    if (ok(seat)) return seat;
  }
  return from;
}

/** Xếp hạng cuối ván: người hết bài theo thứ tự, người còn bài, rồi người rời (rời sau thì xếp trên) */
function finishGame(s: State): void {
  const ranking = [...s.finished, ...activeSeats(s), ...[...s.left].reverse()];
  const reason = s.finished.length === 0 ? "doi-thu-roi" : "het-bai";
  s.status = "finished";
  s.result = { winner: ranking[0] ?? null, scores: scoresOf(ranking, s.seats), reason, ranking };
}

/**
 * Sau một nước đi hoặc một người rời: kiểm tra hết ván, hết vòng, rồi chuyển lượt.
 * `from` là ghế vừa đi hoặc vừa rời; chỉ chuyển lượt khi `turnMoves`.
 */
function settle(s: State, from: SeatId, turnMoves: boolean, events: GameEvent[]): void {
  const active = activeSeats(s);
  if (active.length <= 1) {
    finishGame(s);
    return;
  }
  const by = s.table?.by ?? null;
  const contenders = active.filter((x) => x !== by && !s.passed.includes(x));
  if (s.table && contenders.length === 0) {
    // Hết vòng: người đánh cuối đi tự do; nếu người đó đã hết bài hoặc rời thì người kế tiếp còn bài
    const leader = by !== null && active.includes(by) ? by : seatAfter(s, by ?? from, (x) => active.includes(x));
    s.table = null;
    s.passed = [];
    s.turn = leader;
    s.round++;
    events.push({ type: "newRound", leader });
    return;
  }
  if (turnMoves) s.turn = seatAfter(s, from, (x) => active.includes(x) && !s.passed.includes(x));
}

export function applyMove(
  state: State,
  seat: SeatId,
  move: Move,
): { state: State; events: GameEvent[] } | { error: string } {
  if (state.status !== "playing") return { error: "INVALID_MOVE" };
  if (state.turn !== seat) return { error: "NOT_YOUR_TURN" };
  const s = clone(state);
  const events: GameEvent[] = [];
  const hand = s.hands[seat] ?? [];

  if (move.type === "pass") {
    if (s.table === null) return { error: "INVALID_MOVE" };
    s.passed.push(seat);
    s.moveNo++;
    events.push({ type: "pass", seat });
    settle(s, seat, true, events);
    return { state: s, events };
  }

  const combo = classify(move.cards);
  if (!combo?.cards.every((c) => hand.includes(c))) return { error: "INVALID_MOVE" };
  if (!beats(s.table?.combo ?? null, combo, s.options)) return { error: "INVALID_MOVE" };
  if (s.moveNo === 0 && s.mustInclude !== null && !combo.cards.includes(s.mustInclude)) {
    return { error: "INVALID_MOVE" };
  }

  s.hands[seat] = hand.filter((c) => !combo.cards.includes(c));
  const cut = s.table !== null && !(s.table.combo.kind === combo.kind && s.table.combo.len === combo.len);
  s.table = { combo, by: seat };
  s.moveNo++;
  events.push({ type: "play", seat, cards: combo.cards, kind: combo.kind, cut });
  if ((s.hands[seat] ?? []).length === 0) {
    s.finished.push(seat);
    events.push({ type: "out", seat, rank: s.finished.length });
  }
  settle(s, seat, true, events);
  return { state: s, events };
}

// ---------- Kết thúc ----------

export function result(state: State): GameResult | null {
  return state.result;
}

/** Người rời hoặc hết giờ: bài bị loại, ván tiếp tục không có họ (luật mục 8) */
export function forfeit(
  state: State,
  seat: SeatId,
  _reason: ForfeitReason,
): { state: State; events: GameEvent[] } | { error: string } {
  if (state.status !== "playing" || !state.seats.includes(seat)) return { error: "INVALID_MOVE" };
  // Người đã hết bài hoặc đã rời không còn ảnh hưởng ván
  if (state.finished.includes(seat) || state.left.includes(seat)) return { state: clone(state), events: [] };
  const s = clone(state);
  const events: GameEvent[] = [{ type: "left", seat }];
  s.left.push(seat);
  s.hands[seat] = [];
  settle(s, seat, s.turn === seat, events);
  return { state: s, events };
}

// ---------- Xem ----------

/** Người ngồi `seat` chỉ thấy bài của mình; hết ván thì lộ hết (luật mục 7) */
export function viewFor(state: State, seat: SeatId | null): View {
  return {
    options: state.options,
    seats: state.seats,
    handSizes: state.hands.map((h) => h.length),
    hand: seat !== null && state.seats.includes(seat) ? [...(state.hands[seat] ?? [])] : null,
    turn: state.turn,
    table: state.table,
    passed: state.passed,
    finished: state.finished,
    left: state.left,
    mustInclude: state.mustInclude,
    round: state.round,
    moveNo: state.moveNo,
    toiTrang: state.toiTrang,
    status: state.status,
    result: state.result,
    revealed: state.status === "finished" ? state.hands.map((h) => [...h]) : null,
  };
}

// ---------- Dữ liệu từ ngoài ----------

export function parseOptions(raw: unknown, base: Options): Options {
  const o = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const soNguoi = o.soNguoi === 2 || o.soNguoi === 3 || o.soNguoi === 4 ? o.soNguoi : base.soNguoi;
  return {
    soNguoi,
    chatHeo: typeof o.chatHeo === "boolean" ? o.chatHeo : base.chatHeo,
    toiTrang: typeof o.toiTrang === "boolean" ? o.toiTrang : base.toiTrang,
  };
}

export function parseMove(raw: unknown): Move | null {
  if (typeof raw !== "object" || raw === null) return null;
  const m = raw as { type?: unknown; cards?: unknown };
  if (m.type === "pass") return { type: "pass" };
  if (m.type !== "play" || !Array.isArray(m.cards)) return null;
  if (m.cards.length === 0 || m.cards.length > HAND_SIZE) return null;
  if (!m.cards.every((c) => Number.isInteger(c) && c >= 0 && c <= 51)) return null;
  if (new Set(m.cards).size !== m.cards.length) return null;
  return { type: "play", cards: m.cards as number[] };
}

export const tienLen: GameModule<State, Move, Options, GameEvent> = {
  id: "tien-len",
  minPlayers: 2,
  maxPlayers: 4,
  defaultOptions: DEFAULT_OPTIONS,
  seatCount: (options) => options.soNguoi,
  nextFirst: (res) => res.ranking?.[0] ?? res.winner,
  setup,
  validMoves,
  applyMove,
  viewFor,
  result,
  forfeit,
  parseOptions,
  parseMove,
};
