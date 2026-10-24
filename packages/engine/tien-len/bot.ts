// Bot Tiến lên 3 cấp độ: Dễ, Trung bình, Khó (docs/tien-len/04-ke-hoach-prototype.md mốc TL-B).
// Hàm thuần: không I/O, không Date.now, không Math.random, nhận RNG qua tham số.

import type { BotLevelId, BotOption, BotSupport, Rng, SeatId } from "../game-module.ts";
import { pickRandom } from "../game-module.ts";
import { classify, groupByRank, HEO, rankOf } from "./combos.ts";
import { validMoves } from "./rules.ts";
import type { Card, Move, State } from "./types.ts";

export const BOT_LEVELS: readonly BotOption[] = [
  { id: "easy", name: "Dễ" },
  { id: "medium", name: "Trung bình" },
  { id: "hard", name: "Khó" },
] as const;

type Play = Extract<Move, { type: "play" }>;

/** Số lá của đối thủ còn bài ít nhất (mức độ sắp thắng của người khác) */
function threatOf(state: State, seat: SeatId): number {
  const others = state.seats.filter((s) => s !== seat && !state.finished.includes(s) && !state.left.includes(s));
  return Math.min(...others.map((s) => state.hands[s]?.length ?? 13), 13);
}

/** Phạt khi tách một bộ lớn hơn (đôi, ba, tứ quý) bằng cách chỉ đánh một phần của nó */
function breakPenalty(hand: readonly Card[], cards: readonly Card[]): number {
  const groups = groupByRank(hand);
  const used = new Map<number, number>();
  for (const c of cards) used.set(rankOf(c), (used.get(rankOf(c)) ?? 0) + 1);
  let penalty = 0;
  for (const [rank, n] of used) {
    const size = groups[rank]?.length ?? n;
    if (size > n && size >= 2) penalty += (size - n) * 5;
  }
  return penalty;
}

/** Điểm một nước đánh, càng thấp càng nên đánh */
function scorePlay(state: State, seat: SeatId, play: Play, level: BotLevelId): number {
  const hand = state.hands[seat] ?? [];
  const top = play.cards[play.cards.length - 1] ?? 0;
  const rank = rankOf(top);
  const usesHeo = play.cards.some((c) => rankOf(c) === HEO);
  const cut = isCut(state, play.cards);
  let score = rank + (usesHeo ? 10 : 0) + (cut ? 22 : 0) + breakPenalty(hand, play.cards);
  if (state.table === null) score -= play.cards.length * 3;
  if (level === "hard" && threatOf(state, seat) <= 2) {
    // Đối thủ sắp hết bài: đánh bộ nhiều lá hoặc lá thật lớn để chặn họ
    score -= state.table === null ? play.cards.length * 4 : rank;
  }
  return score;
}

/** Nước này là chặt: khác loại hoặc khác độ dài so với bộ trên bàn */
function isCut(state: State, cards: readonly Card[]): boolean {
  const table = state.table?.combo;
  const combo = classify(cards);
  return table !== undefined && combo !== null && !(combo.kind === table.kind && combo.len === table.len);
}

/** Có thể đi hết bài ngay bằng nước này không */
const goesOut = (state: State, seat: SeatId, play: Play): boolean =>
  play.cards.length === (state.hands[seat]?.length ?? -1);

function easyMove(moves: readonly Move[], rng: Rng): Move | null {
  const pass = moves.find((m) => m.type === "pass");
  const plays = moves.filter((m) => m.type === "play");
  // Dễ: thỉnh thoảng bỏ lượt dù đánh được
  if (pass && plays.length > 0 && rng() < 0.25) return pass;
  return pickRandom(plays.length > 0 ? plays : moves, rng);
}

/** Trung bình và Khó: đánh bộ nhỏ nhất đủ đè, giữ heo và bộ chặt; bỏ lượt khi phải phá bài mà chưa ai sắp thắng */
function smartMove(state: State, seat: SeatId, moves: readonly Move[], level: BotLevelId): Move | null {
  const plays = moves.filter((m): m is Play => m.type === "play");
  const pass = moves.find((m) => m.type === "pass");
  if (plays.length === 0) return pass ?? null;
  const out = plays.find((p) => goesOut(state, seat, p));
  if (out) return out;
  const ranked = plays
    .map((p) => ({ p, s: scorePlay(state, seat, p, level) }))
    .sort((a, b) => a.s - b.s || a.p.cards.length - b.p.cards.length);
  const best = ranked[0];
  if (!best) return pass ?? null;
  // Quá đắt (heo hoặc chặt) mà đối thủ còn nhiều bài: bỏ lượt cho đỡ phí
  const limit = level === "hard" ? 18 : 20;
  if (pass && state.table !== null && best.s >= limit && threatOf(state, seat) > 3) return pass;
  return best.p;
}

function chooseMove(state: State, seat: SeatId, level: BotLevelId, rng: Rng): Move | null {
  const moves = validMoves(state, seat);
  if (moves.length === 0) return null;
  return level === "easy" ? easyMove(moves, rng) : smartMove(state, seat, moves, level);
}

export const tienLenBot: BotSupport<State, Move> = { levels: BOT_LEVELS, chooseMove };
