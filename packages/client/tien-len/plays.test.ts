import { type Card, classify, type View } from "@playtogether/engine/tien-len";
import { describe, expect, it } from "vitest";
import { judge, playable, smallestPlayWith, sortHand, usableCards } from "./plays.ts";

const RANKS = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];
const SUITS = ["♠", "♣", "♦", "♥"];
const k = (name: string): Card => RANKS.indexOf(name.slice(0, -1)) * 4 + SUITS.indexOf(name.slice(-1));
const ks = (names: string): Card[] => names.split(" ").map(k);

function view(hand: string, table: string | null, over: Partial<View> = {}): View {
  const combo = table ? classify(ks(table)) : null;
  return {
    options: { soNguoi: 4, chatHeo: true, toiTrang: true },
    seats: [0, 1, 2, 3],
    handSizes: [13, 13, 13, 13],
    hand: ks(hand).sort((a, b) => a - b),
    turn: 0,
    table: combo ? { combo, by: 1 } : null,
    passed: [],
    finished: [],
    left: [],
    mustInclude: null,
    round: 1,
    moveNo: 5,
    toiTrang: null,
    status: "playing",
    result: null,
    revealed: null,
    ...over,
  };
}

describe("judge: các lá đang chọn có đánh được không", () => {
  it("chưa chọn lá nào, hoặc chọn các lá chưa thành bộ, thì không đánh được và có lý do", () => {
    const v = view("3♠ 5♦ 9♥", null);
    expect(judge(v, [])).toMatchObject({ ok: false });
    const r = judge(v, ks("3♠ 5♦"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/chưa tạo thành/);
  });

  it("đi tự do: mọi bộ hợp lệ đều đánh được", () => {
    expect(judge(view("3♠ 3♦ 9♥", null), ks("3♠ 3♦")).ok).toBe(true);
  });

  it("phải lớn hơn bộ trên bàn, cùng loại cùng số lá", () => {
    const v = view("7♠ 8♦ 9♥ 9♦", "7♦");
    expect(judge(v, ks("7♠")).ok).toBe(false);
    expect(judge(v, ks("8♦")).ok).toBe(true);
    expect(judge(v, ks("9♥ 9♦")).ok).toBe(false);
  });

  it("bộ đầu ván đầu phải chứa lá nhỏ nhất", () => {
    const v = view("3♠ 5♦ 9♥", null, { moveNo: 0, mustInclude: k("3♠") });
    expect(judge(v, ks("5♦")).ok).toBe(false);
    expect(judge(v, ks("3♠")).ok).toBe(true);
  });
});

describe("chọn nhanh và làm tối lá", () => {
  it("smallestPlayWith: chọn bộ nhỏ nhất đè được mà chứa lá chạm vào", () => {
    const v = view("7♠ 7♦ 7♥ 9♣ 9♦ J♠", "6♦ 6♥");
    const combo = smallestPlayWith(v, k("7♦"));
    expect(combo?.cards).toEqual(ks("7♠ 7♦"));
    expect(smallestPlayWith(v, k("J♠"))).toBeNull();
  });

  it("usableCards: chỉ các lá thuộc ít nhất một bộ đánh được", () => {
    const v = view("3♠ 9♦ J♠", "8♦");
    expect([...usableCards(v)].sort((a, b) => a - b)).toEqual(ks("9♦ J♠"));
  });

  it("người xem (không có bài) không có nước nào", () => {
    expect(playable(view("3♠", null, { hand: null }))).toEqual([]);
  });
});

describe("sortHand", () => {
  it("theo giá trị tăng dần; gom bộ đưa các lá cùng số lên trước", () => {
    const hand = ks("9♦ 3♠ 9♥ 5♣ 3♦ 9♠");
    expect(sortHand(hand, "value")).toEqual(ks("3♠ 3♦ 5♣ 9♠ 9♦ 9♥"));
    expect(sortHand(hand, "group")).toEqual(ks("9♠ 9♦ 9♥ 3♠ 3♦ 5♣"));
  });
});
