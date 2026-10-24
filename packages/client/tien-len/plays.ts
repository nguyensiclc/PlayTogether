// Tính toán thuần cho màn chơi: các lá đang chọn có tạo thành nước đi hợp lệ không, và chọn nhanh một bộ.
// Chỉ dùng `View` (bài của chính mình và bộ trên bàn), không cần state đầy đủ của server.

import type { Card, Combo, View } from "@playtogether/engine/tien-len";
import { beats, classify, playableCombos } from "@playtogether/engine/tien-len";

/** Lá bắt buộc có trong bộ: chỉ bộ đầu tiên của ván đầu */
function mustInclude(view: View): Card | null {
  return view.moveNo === 0 ? view.mustInclude : null;
}

/** Mọi bộ đánh được từ bài của mình lên bộ trên bàn; rỗng khi không có bài (người xem) */
export function playable(view: View): Combo[] {
  if (!view.hand) return [];
  return playableCombos(view.hand, view.table?.combo ?? null, view.options, mustInclude(view));
}

export type Selection = { ok: true; combo: Combo } | { ok: false; reason: string };

/** Các lá đang chọn có đánh được không; nếu không thì ghi lý do ngắn gọn cho người chơi */
export function judge(view: View, selected: readonly Card[]): Selection {
  if (selected.length === 0) return { ok: false, reason: "Chạm các lá để chọn bài" };
  const combo = classify(selected);
  if (!combo) return { ok: false, reason: "Các lá này chưa tạo thành một bộ" };
  const need = mustInclude(view);
  if (need !== null && !combo.cards.includes(need)) return { ok: false, reason: "Bộ đầu tiên phải có lá nhỏ nhất" };
  if (!beats(view.table?.combo ?? null, combo, view.options)) {
    return { ok: false, reason: "Chưa đủ lớn để đè bộ trên bàn" };
  }
  return { ok: true, combo };
}

/** Bộ nhỏ nhất đánh được mà có chứa `card` (chọn nhanh khi chạm hai lần); null nếu không có */
export function smallestPlayWith(view: View, card: Card): Combo | null {
  const candidates = playable(view).filter((c) => c.cards.includes(card));
  candidates.sort((a, b) => a.cards.length - b.cards.length || a.top - b.top);
  return candidates[0] ?? null;
}

/** Lá thuộc ít nhất một bộ đánh được (để làm tối các lá còn lại khi bàn đang có bộ) */
export function usableCards(view: View): Set<Card> {
  const out = new Set<Card>();
  for (const combo of playable(view)) for (const c of combo.cards) out.add(c);
  return out;
}

/** Xếp bài: theo giá trị tăng dần, hoặc gom bộ (tứ quý, ba, đôi trước rồi lẻ) giữ nguyên thứ tự giá trị trong từng nhóm */
export function sortHand(hand: readonly Card[], mode: "value" | "group"): Card[] {
  const byValue = [...hand].sort((a, b) => a - b);
  if (mode === "value") return byValue;
  const count = new Map<number, number>();
  for (const c of byValue) count.set(Math.floor(c / 4), (count.get(Math.floor(c / 4)) ?? 0) + 1);
  const size = (c: Card) => count.get(Math.floor(c / 4)) ?? 1;
  return [...byValue].sort((a, b) => size(b) - size(a) || a - b);
}
