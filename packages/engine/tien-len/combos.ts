// Nhận diện và so sánh các bộ bài Tiến lên miền Nam (docs/tien-len/01-luat-choi.md mục 2, 3, 5).

import type { Card, Combo, ComboKind, Options } from "./types.ts";

/** Số 2 (heo) là số lớn nhất */
export const HEO = 12;
export const A = 11;

export const rankOf = (c: Card): number => Math.floor(c / 4);
export const suitOf = (c: Card): number => c % 4;

/** Nhỏ đến lớn theo giá trị lá */
export const byValue = (a: Card, b: Card): number => a - b;

const SO_TEN = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];
const CHAT_TEN = ["♠", "♣", "♦", "♥"];

/** "3♠", "10♦", "2♥" */
export function cardName(c: Card): string {
  return `${SO_TEN[rankOf(c)] ?? "?"}${CHAT_TEN[suitOf(c)] ?? "?"}`;
}

const SAME_RANK_KIND: readonly (ComboKind | undefined)[] = [undefined, "le", "doi", "ba", "tuQuy"];

/** Các lá hợp lệ: số nguyên 0..51, không trùng (đã sắp tăng dần) */
function distinctCards(sorted: readonly Card[]): boolean {
  return sorted.every((c, i) => Number.isInteger(c) && c >= 0 && c <= 51 && (i === 0 || c !== sorted[i - 1]));
}

/** Nhận diện bộ bài từ các lá; null nếu không hợp lệ (lá trùng, ngoài 0..51 cũng không hợp lệ) */
export function classify(input: readonly Card[]): Combo | null {
  const cards = [...input].sort(byValue);
  const n = cards.length;
  if (n === 0 || !distinctCards(cards)) return null;
  const combo = (kind: ComboKind, len: number): Combo => ({ kind, cards, top: cards[n - 1] as Card, len });
  const ranks = cards.map(rankOf);
  if (ranks.every((r) => r === ranks[0])) {
    const kind = SAME_RANK_KIND[n];
    return kind ? combo(kind, n) : null;
  }
  if (n >= 3 && isRun(ranks, 1)) return combo("sanh", n);
  if (n >= 6 && n % 2 === 0 && isRun(ranks, 2)) return combo("doiThong", n / 2);
  return null;
}

/** Các số liên tiếp, mỗi số đúng `per` lần, không có số 2 */
function isRun(ranks: readonly number[], per: number): boolean {
  if (ranks.length % per !== 0 || ranks.includes(HEO)) return false;
  const first = ranks[0] ?? 0;
  return ranks.every((r, i) => r === first + Math.floor(i / per));
}

/** `next` có đánh đè được `table` không. `table` null = đi tự do, mọi bộ đều được. */
export function beats(table: Combo | null, next: Combo, opts: Pick<Options, "chatHeo">): boolean {
  if (table === null) return true;
  if (next.kind === table.kind && next.len === table.len) return next.top > table.top;
  return opts.chatHeo && cuts(table, next);
}

/** Bảng chặt (luật mục 5): chỉ chặt heo và các bộ chặt nhỏ hơn */
function cuts(table: Combo, next: Combo): boolean {
  const heoLe = table.kind === "le" && rankOf(table.top) === HEO;
  const doiHeo = table.kind === "doi" && rankOf(table.top) === HEO;
  const baDoiThong = table.kind === "doiThong" && table.len === 3;
  const bonDoiThongTroLen = next.kind === "doiThong" && next.len >= 4;
  const baDoiThongNext = next.kind === "doiThong" && next.len === 3;
  if (heoLe) return baDoiThongNext || next.kind === "tuQuy" || bonDoiThongTroLen;
  if (doiHeo || baDoiThong) return next.kind === "tuQuy" || bonDoiThongTroLen;
  if (table.kind === "tuQuy") return bonDoiThongTroLen;
  return false;
}

/** Lá của `hand` gom theo số: cards[số] = các lá của số đó, tăng dần theo chất */
export function groupByRank(hand: readonly Card[]): Card[][] {
  const groups: Card[][] = Array.from({ length: 13 }, () => []);
  for (const c of [...hand].sort(byValue)) groups[rankOf(c)]?.push(c);
  return groups;
}

/** Mọi tập con cỡ `k` của `items` (theo thứ tự xuất hiện) */
function choose<T>(items: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i <= items.length - k; i++) {
    for (const rest of choose(items.slice(i + 1), k - 1)) out.push([items[i] as T, ...rest]);
  }
  return out;
}

/** Tích Descartes của các lựa chọn: mỗi phần tử là một cách chọn một lựa chọn cho mỗi vị trí */
function product(options: readonly (readonly Card[][])[]): Card[][] {
  let acc: Card[][] = [[]];
  for (const opt of options) {
    const next: Card[][] = [];
    for (const prefix of acc) for (const pick of opt) next.push([...prefix, ...pick]);
    acc = next;
  }
  return acc;
}

/** Các bộ cùng số (lẻ, đôi, ba, tứ quý) */
function sameRankCombos(groups: readonly Card[][]): Card[][] {
  return groups.flatMap((g) => [1, 2, 3, 4].flatMap((k) => choose(g, k)));
}

/** Sảnh (mỗi số một lá) và đôi thông (mỗi số hai lá) bắt đầu ở mọi số, mọi độ dài ≥ 3 */
function runCombos(groups: readonly Card[][]): Card[][] {
  const out: Card[][] = [];
  for (let start = 0; start < HEO; start++) {
    const singles: Card[][][] = [];
    const pairs: Card[][][] = [];
    for (let r = start; r < HEO && (groups[r]?.length ?? 0) > 0; r++) {
      const g = groups[r] as Card[];
      singles.push(g.map((c) => [c]));
      pairs.push(choose(g, 2));
      if (singles.length >= 3) out.push(...product(singles));
      if (pairs.length >= 3 && pairs.every((p) => p.length > 0)) out.push(...product(pairs));
    }
  }
  return out;
}

/** Mọi bộ hợp lệ có thể tạo từ `hand` (chưa xét có đánh đè được bộ trên bàn không) */
export function allCombos(hand: readonly Card[]): Combo[] {
  const groups = groupByRank(hand);
  return [...sameRankCombos(groups), ...runCombos(groups)].flatMap((cards) => classify(cards) ?? []);
}
