// Test engine Tiến lên miền Nam (docs/tien-len/04-ke-hoach-prototype.md mục 4, E01–E24).

import { describe, expect, it } from "vitest";
import { createRng, pickRandom } from "../game-module.ts";
import { allCombos, beats, cardName, classify, rankOf } from "./combos.ts";
import {
  applyMove,
  DEFAULT_OPTIONS,
  deal,
  forfeit,
  parseMove,
  parseOptions,
  setup,
  toiTrangOf,
  validMoves,
  viewFor,
} from "./rules.ts";
import type { Card, Move, Options, State } from "./types.ts";

const RANKS = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];
const SUITS = ["♠", "♣", "♦", "♥"];

/** "7♦" → lá bài */
const k = (name: string): Card => {
  const suit = SUITS.indexOf(name.slice(-1));
  const rank = RANKS.indexOf(name.slice(0, -1));
  if (suit < 0 || rank < 0) throw new Error(`lá không hợp lệ: ${name}`);
  return rank * 4 + suit;
};
const ks = (names: string): Card[] => names.split(" ").map(k);

const OPTS: Options = { soNguoi: 4, chatHeo: true, toiTrang: true };

/** Dựng ván cho test: `hands` theo ghế 0..n-1 */
function mk(hands: string[], over: Partial<State> = {}): State {
  const seats = hands.map((_, i) => i);
  return {
    options: { ...OPTS, soNguoi: hands.length as 2 | 3 | 4 },
    seats,
    hands: hands.map((h) => (h ? ks(h).sort((a, b) => a - b) : [])),
    turn: 0,
    table: null,
    passed: [],
    finished: [],
    left: [],
    mustInclude: null,
    round: 1,
    moveNo: 1,
    toiTrang: null,
    status: "playing",
    result: null,
    ...over,
  };
}

const play = (s: State, seat: number, cards: string): State => {
  const r = applyMove(s, seat, { type: "play", cards: ks(cards) });
  if ("error" in r) throw new Error(`nước đi bị từ chối: ${r.error}`);
  return r.state;
};
const pass = (s: State, seat: number): State => {
  const r = applyMove(s, seat, { type: "pass" });
  if ("error" in r) throw new Error(`bỏ lượt bị từ chối: ${r.error}`);
  return r.state;
};
const err = (s: State, seat: number, move: Move): string => {
  const r = applyMove(s, seat, move);
  if (!("error" in r)) throw new Error("không có lỗi");
  return r.error;
};
const table = (names: string) => {
  const c = classify(ks(names));
  if (!c) throw new Error("không phải bộ hợp lệ");
  return c;
};

describe("chia bài", () => {
  it("E01: chia 2, 3, 4 người: mỗi người 13 lá, không trùng, tăng dần", () => {
    for (const n of [2, 3, 4]) {
      const hands = deal(createRng(n), n);
      expect(hands).toHaveLength(n);
      const all = hands.flat();
      expect(all).toHaveLength(13 * n);
      expect(new Set(all).size).toBe(13 * n);
      for (const h of hands) expect(h).toEqual([...h].sort((a, b) => a - b));
    }
  });

  it("E02: thứ tự lá: 3♠ nhỏ nhất, 2♥ lớn nhất, 2♠ lớn hơn A♥", () => {
    expect(k("3♠")).toBe(0);
    expect(k("2♥")).toBe(51);
    expect(k("2♠")).toBeGreaterThan(k("A♥"));
    expect(k("7♥")).toBeGreaterThan(k("7♦"));
    expect(cardName(k("10♦"))).toBe("10♦");
  });
});

describe("nhận diện và so sánh bộ", () => {
  it("E03: lẻ, đôi, ba, tứ quý; hai lá khác số hoặc lá trùng không hợp lệ", () => {
    expect(classify(ks("7♦"))?.kind).toBe("le");
    expect(classify(ks("7♦ 7♥"))?.kind).toBe("doi");
    expect(classify(ks("7♠ 7♦ 7♥"))?.kind).toBe("ba");
    expect(classify(ks("7♠ 7♣ 7♦ 7♥"))?.kind).toBe("tuQuy");
    expect(classify(ks("7♦ 8♦"))).toBeNull();
    expect(classify([5, 5])).toBeNull();
    expect(classify([])).toBeNull();
    expect(classify([52])).toBeNull();
  });

  it("E04: sảnh: 5-6-7 và Q-K-A hợp lệ; K-A-2, có 2 hoặc đứt quãng không hợp lệ", () => {
    expect(classify(ks("5♠ 6♦ 7♥"))?.kind).toBe("sanh");
    expect(classify(ks("Q♠ K♦ A♥"))?.kind).toBe("sanh");
    expect(classify(ks("K♠ A♦ 2♥"))).toBeNull();
    expect(classify(ks("5♠ 6♦ 8♥"))).toBeNull();
    expect(classify(ks("5♠ 6♦ 7♥ 8♣"))?.len).toBe(4);
  });

  it("E05: đôi thông: 4-4-5-5-6-6 hợp lệ; có đôi 2 hoặc không liên tiếp không hợp lệ", () => {
    expect(classify(ks("4♠ 4♦ 5♠ 5♦ 6♠ 6♦"))?.kind).toBe("doiThong");
    expect(classify(ks("K♠ K♦ A♠ A♦ 2♠ 2♦"))).toBeNull();
    expect(classify(ks("4♠ 4♦ 5♠ 5♦ 7♠ 7♦"))).toBeNull();
    expect(classify(ks("4♠ 4♦ 5♠ 5♦ 6♠ 6♦ 7♠ 7♦"))?.len).toBe(4);
  });

  it("E06: cùng loại cùng độ dài so lá cao nhất (số rồi chất); khác độ dài bị từ chối", () => {
    const o = { chatHeo: true };
    expect(beats(table("7♦ 7♥"), table("8♠ 8♣"), o)).toBe(true);
    expect(beats(table("7♦ 7♥"), table("7♠ 7♣"), o)).toBe(false);
    expect(beats(table("5♠ 6♠ 7♦"), table("5♦ 6♦ 7♥"), o)).toBe(true);
    expect(beats(table("5♠ 6♠ 7♦"), table("5♠ 6♠ 7♠ 8♠"), o)).toBe(false);
    expect(beats(null, table("3♠"), o)).toBe(true);
  });
});

describe("diễn biến ván", () => {
  it("E07: ván đầu người giữ lá nhỏ nhất đi trước, bộ đầu phải chứa lá đó", () => {
    const s = setup(DEFAULT_OPTIONS, [0, 1, 2, 3], 2, createRng(5), { firstGame: true });
    const lowest = Math.min(...s.hands.flat());
    expect(s.mustInclude).toBe(lowest);
    expect(s.hands[s.turn]).toContain(lowest);
    for (const m of validMoves(s, s.turn)) {
      if (m.type === "play") expect(m.cards).toContain(lowest);
    }
    const other = setup(DEFAULT_OPTIONS, [0, 1, 2, 3], 2, createRng(5), { firstGame: false });
    expect(other.turn).toBe(2);
    expect(other.mustInclude).toBeNull();
  });

  it("E08: người đã bỏ lượt không đánh lại trong vòng", () => {
    let s = mk(["3♠ 9♠", "5♠ 6♠ 9♦", "4♠ 7♠ 10♦", "8♠ J♦"]);
    s = play(s, 0, "3♠");
    s = pass(s, 1);
    s = play(s, 2, "4♠");
    // ghế 3 đánh đè, rồi tới ghế 0 (còn quyền), ghế 1 đã bỏ lượt nên bị bỏ qua
    s = play(s, 3, "8♠");
    expect(s.turn).toBe(0);
    s = pass(s, 0);
    expect(s.turn).toBe(2);
    expect(s.passed).toEqual([1, 0]);
  });

  it("E09: mọi người khác bỏ thì vòng kết thúc, người đánh cuối đi tự do", () => {
    let s = mk(["3♠ 9♠", "5♠ 6♠", "4♠ 7♠", "8♠ J♦"]);
    s = play(s, 0, "9♠");
    s = pass(s, 1);
    s = pass(s, 2);
    s = pass(s, 3);
    expect(s.table).toBeNull();
    expect(s.passed).toEqual([]);
    expect(s.turn).toBe(0);
    expect(s.round).toBe(2);
    expect(err(s, 0, { type: "pass" })).toBe("INVALID_MOVE");
  });

  it("E10: người đánh cuối đã hết bài thì quyền đi tự do thuộc người kế còn bài", () => {
    let s = mk(["9♠", "5♠ 6♠", "4♠ 7♠", "8♠ J♦"]);
    s = play(s, 0, "9♠");
    expect(s.finished).toEqual([0]);
    s = pass(s, 1);
    s = pass(s, 2);
    s = pass(s, 3);
    expect(s.table).toBeNull();
    expect(s.turn).toBe(1);
  });
});

describe("chặt heo", () => {
  it("E11: 3 đôi thông chặt heo lẻ, không chặt đôi heo", () => {
    const o = { chatHeo: true };
    expect(beats(table("2♠"), table("4♠ 4♦ 5♠ 5♦ 6♠ 6♦"), o)).toBe(true);
    expect(beats(table("2♠ 2♦"), table("4♠ 4♦ 5♠ 5♦ 6♠ 6♦"), o)).toBe(false);
    expect(beats(table("5♠"), table("4♠ 4♦ 5♠ 5♦ 6♠ 6♦"), o)).toBe(false);
  });

  it("E12: tứ quý chặt heo lẻ, đôi heo, 3 đôi thông", () => {
    const quad = table("9♠ 9♣ 9♦ 9♥");
    const o = { chatHeo: true };
    expect(beats(table("2♥"), quad, o)).toBe(true);
    expect(beats(table("2♠ 2♦"), quad, o)).toBe(true);
    expect(beats(table("4♠ 4♦ 5♠ 5♦ 6♠ 6♦"), quad, o)).toBe(true);
    expect(beats(table("8♠ 8♣ 8♦"), quad, o)).toBe(false);
  });

  it("E13: 4 đôi thông chặt heo lẻ, đôi heo, 3 đôi thông, tứ quý", () => {
    const four = table("4♠ 4♦ 5♠ 5♦ 6♠ 6♦ 7♠ 7♦");
    const o = { chatHeo: true };
    expect(beats(table("2♥"), four, o)).toBe(true);
    expect(beats(table("2♠ 2♦"), four, o)).toBe(true);
    expect(beats(table("8♠ 8♦ 9♠ 9♦ 10♠ 10♦ J♠ J♦"), four, o)).toBe(false);
    expect(beats(table("9♠ 9♣ 9♦ 9♥"), four, o)).toBe(true);
    expect(beats(table("5♠ 5♦ 6♠ 6♦ 7♠ 7♦"), four, o)).toBe(true);
  });

  it("E14: tắt chatHeo thì mọi bộ chặt bị từ chối nhưng vẫn đánh được như bộ thường", () => {
    const off = { chatHeo: false };
    expect(beats(table("2♠"), table("9♠ 9♣ 9♦ 9♥"), off)).toBe(false);
    expect(beats(table("2♠"), table("4♠ 4♦ 5♠ 5♦ 6♠ 6♦"), off)).toBe(false);
    expect(beats(table("8♠ 8♣ 8♦ 8♥"), table("9♠ 9♣ 9♦ 9♥"), off)).toBe(true);
    const s = mk(["4♠ 4♦ 5♠ 5♦ 6♠ 6♦ 9♠", "2♠ 3♦"], { options: { ...OPTS, soNguoi: 2, chatHeo: false } });
    const afterHeo = play({ ...s, turn: 1 }, 1, "2♠");
    expect(err(afterHeo, 0, { type: "play", cards: ks("4♠ 4♦ 5♠ 5♦ 6♠ 6♦") })).toBe("INVALID_MOVE");
  });

  it("áp dụng chặt trong ván: ghế 1 đánh heo, ghế 2 chặt bằng 3 đôi thông", () => {
    let s = mk(["3♠ 9♠", "2♠ 5♠", "4♠ 4♦ 5♣ 5♦ 6♠ 6♦ 7♠", "8♠ J♦"]);
    s = play(s, 0, "3♠");
    s = play(s, 1, "2♠");
    const r = applyMove(s, 2, { type: "play", cards: ks("4♠ 4♦ 5♣ 5♦ 6♠ 6♦") });
    expect("error" in r).toBe(false);
    if (!("error" in r)) expect(r.events).toContainEqual(expect.objectContaining({ type: "play", cut: true }));
  });
});

describe("tới trắng", () => {
  it("E15: tứ quý heo, sảnh rồng, sáu đôi; tắt tuỳ chọn thì không tính", () => {
    expect(toiTrangOf(ks("2♠ 2♣ 2♦ 2♥ 3♠ 4♠ 5♠ 6♠ 7♠ 8♠ 9♠ 10♠ J♠"))).toBe("tuQuyHeo");
    expect(toiTrangOf(ks("3♠ 4♠ 5♠ 6♠ 7♠ 8♠ 9♠ 10♠ J♠ Q♠ K♠ A♠ 2♠"))).toBe("sanhRong");
    expect(toiTrangOf(ks("3♠ 3♦ 5♠ 5♦ 7♠ 7♦ 9♠ 9♦ J♠ J♦ K♠ K♦ 2♠"))).toBe("sauDoi");
    expect(toiTrangOf(ks("3♠ 4♠ 5♠ 6♠ 8♠ 9♠ 10♠ J♠ Q♠ K♠ A♠ 2♠ 2♦"))).toBeNull();
    // thử qua setup với RNG cho tới khi có người tới trắng
    let found = false;
    for (let seed = 0; seed < 3000 && !found; seed++) {
      const on = setup(OPTS, [0, 1, 2, 3], 0, createRng(seed), { firstGame: false });
      if (on.toiTrang === null) continue;
      found = true;
      expect(on.status).toBe("finished");
      expect(on.result?.reason).toBe("toi-trang");
      expect(on.result?.winner).toBe(on.toiTrang.seat);
      const off = setup({ ...OPTS, toiTrang: false }, [0, 1, 2, 3], 0, createRng(seed), { firstGame: false });
      expect(off.status).toBe("playing");
    }
    expect(found).toBe(true);
  });

  it("E16: tới trắng: người thắng nhất, những người còn lại theo thứ tự ghế sau người đó", () => {
    let kind = 0;
    for (let seed = 0; seed < 3000 && kind < 1; seed++) {
      const s = setup(OPTS, [0, 1, 2, 3], 0, createRng(seed), { firstGame: false });
      if (s.toiTrang === null) continue;
      kind++;
      const w = s.toiTrang.seat;
      expect(s.result?.ranking).toEqual([w, (w + 1) % 4, (w + 2) % 4, (w + 3) % 4]);
      expect(s.result?.scores[w]).toBe(3);
    }
    expect(kind).toBe(1);
  });
});

describe("kết thúc ván", () => {
  it("E17: hết bài trước thì về nhất, ván tiếp tục cho những người còn lại", () => {
    let s = mk(["9♠", "5♠ 6♠", "4♠ 7♠", "8♠ J♦"]);
    s = play(s, 0, "9♠");
    expect(s.finished).toEqual([0]);
    expect(s.status).toBe("playing");
  });

  it("E18: còn một người còn bài thì ván xong với ranking và điểm", () => {
    let s = mk(["9♠", "A♠", "4♠ 7♠", "8♠ J♦"]);
    s = play(s, 0, "9♠");
    s = play(s, 1, "A♠");
    expect(s.finished).toEqual([0, 1]);
    s = pass(s, 2);
    s = pass(s, 3);
    // hết vòng: người đánh cuối (ghế 1) đã hết bài nên ghế 2 đi tự do
    expect(s.turn).toBe(2);
    s = play(s, 2, "4♠");
    s = play(s, 3, "8♠");
    s = pass(s, 2);
    expect(s.turn).toBe(3);
    s = play(s, 3, "J♦");
    expect(s.status).toBe("finished");
    expect(s.result?.ranking).toEqual([0, 1, 3, 2]);
    expect(s.result?.winner).toBe(0);
    expect(s.result?.scores).toEqual([3, 2, 0, 1]);
    expect(s.result?.reason).toBe("het-bai");
  });

  it("E19: rời ván: bài bị loại, lượt chuyển; còn một người thì ván xong và người rời xếp sau cùng", () => {
    const s = mk(["3♠ 9♠", "5♠ 6♠", "4♠ 7♠"], { turn: 1 });
    const left1 = forfeit(s, 1, "bo-cuoc");
    if ("error" in left1) throw new Error(left1.error);
    expect(left1.state.status).toBe("playing");
    expect(left1.state.hands[1]).toEqual([]);
    expect(left1.state.turn).toBe(2);
    const left2 = forfeit(left1.state, 2, "bo-cuoc");
    if ("error" in left2) throw new Error(left2.error);
    expect(left2.state.status).toBe("finished");
    expect(left2.state.result?.winner).toBe(0);
    expect(left2.state.result?.ranking).toEqual([0, 2, 1]);
    expect(left2.state.result?.reason).toBe("doi-thu-roi");
  });

  it("E19b: hai người, một người rời: người kia thắng ngay", () => {
    const s = mk(["3♠ 9♠", "5♠ 6♠"]);
    const r = forfeit(s, 1, "bo-cuoc");
    if ("error" in r) throw new Error(r.error);
    expect(r.state.status).toBe("finished");
    expect(r.state.result?.winner).toBe(0);
  });

  it("E19c: người đánh cuối rời thì khi mọi người bỏ lượt, người kế tiếp đi tự do", () => {
    let s = mk(["3♠ 9♠", "5♠ 6♠", "4♠ 7♠"]);
    s = play(s, 0, "9♠");
    s = pass(s, 1);
    const r = forfeit(s, 0, "bo-cuoc");
    if ("error" in r) throw new Error(r.error);
    expect(r.state.turn).toBe(2);
    // ghế 2 bỏ lượt: hết vòng, người kế tiếp còn bài sau người đánh cuối (ghế 1) đi tự do
    const next = pass(r.state, 2);
    expect(next.status).toBe("playing");
    expect(next.table).toBeNull();
    expect(next.turn).toBe(1);
  });
});

describe("kiểm tra đầu vào", () => {
  it("E20: sai lượt, lá không có trong tay, bộ không hợp lệ, bỏ lượt khi đi tự do", () => {
    const s = mk(["3♠ 9♠", "5♠ 6♠", "4♠ 7♠"]);
    expect(err(s, 1, { type: "pass" })).toBe("NOT_YOUR_TURN");
    expect(err(s, 0, { type: "play", cards: ks("5♠") })).toBe("INVALID_MOVE");
    expect(err(s, 0, { type: "play", cards: ks("3♠ 9♠") })).toBe("INVALID_MOVE");
    expect(err(s, 0, { type: "pass" })).toBe("INVALID_MOVE");
    expect(err({ ...s, status: "finished" }, 0, { type: "pass" })).toBe("INVALID_MOVE");
    const afterNine = play(s, 0, "9♠");
    expect(err(afterNine, 1, { type: "play", cards: ks("5♠") })).toBe("INVALID_MOVE");
    expect(afterNine.hands[0]).toEqual(ks("3♠"));
  });

  it("E21: parseMove và parseOptions từ chối dữ liệu lạ", () => {
    expect(parseMove(null)).toBeNull();
    expect(parseMove({ type: "play", cards: [] })).toBeNull();
    expect(parseMove({ type: "play", cards: [1, 1] })).toBeNull();
    expect(parseMove({ type: "play", cards: [1.5] })).toBeNull();
    expect(parseMove({ type: "play", cards: [99] })).toBeNull();
    expect(parseMove({ type: "play", cards: Array.from({ length: 14 }, (_, i) => i) })).toBeNull();
    expect(parseMove({ type: "play", cards: [3, 4] })).toEqual({ type: "play", cards: [3, 4] });
    expect(parseMove({ type: "pass" })).toEqual({ type: "pass" });
    expect(parseOptions({ soNguoi: 5, chatHeo: "x" }, DEFAULT_OPTIONS)).toEqual(DEFAULT_OPTIONS);
    expect(parseOptions({ soNguoi: 3, chatHeo: false }, DEFAULT_OPTIONS)).toEqual({
      soNguoi: 3,
      chatHeo: false,
      toiTrang: true,
    });
  });

  it("E22: viewFor không lộ bài người khác; người xem chỉ thấy số lá; hết ván thì lộ hết", () => {
    const s = setup({ ...OPTS, toiTrang: false }, [0, 1, 2], 0, createRng(9), { firstGame: false });
    const v1 = viewFor(s, 1);
    expect(v1.hand).toEqual(s.hands[1]);
    expect(JSON.stringify(v1)).not.toContain(JSON.stringify(s.hands[0]));
    expect(v1.handSizes.slice(0, 3)).toEqual([13, 13, 13]);
    expect(v1.revealed).toBeNull();
    expect(viewFor(s, null).hand).toBeNull();
    const done = { ...s, status: "finished" as const };
    expect(viewFor(done, 1).revealed).toEqual(s.hands);
  });
});

/** Mọi tập con của tay bài tạo thành bộ hợp lệ (kiểm tra chậm) */
function bruteCombos(hand: readonly Card[]): string[] {
  const out: string[] = [];
  for (let mask = 1; mask < 1 << hand.length; mask++) {
    const cards = hand.filter((_, i) => mask & (1 << i));
    if (classify(cards)) out.push([...cards].sort((a, b) => a - b).join(","));
  }
  return out.sort();
}

/** Chơi một ván ngẫu nhiên tới hết, kiểm bất biến sau mỗi nước (tổng lá, không trùng, không vòng lặp vô hạn) */
function playRandomGame(n: 2 | 3 | 4, seed: number): State {
  const rng = createRng(seed * 7 + n);
  const opts = { soNguoi: n, chatHeo: seed % 3 !== 0, toiTrang: seed % 2 === 0 };
  const seats = Array.from({ length: n }, (_, i) => i);
  let s = setup(opts, seats, seed % n, rng, { firstGame: seed % 4 === 0 });
  const played: Card[] = [];
  for (let steps = 0; s.status === "playing"; steps++) {
    expect(steps).toBeLessThan(600);
    const move = pickRandom(validMoves(s, s.turn), rng);
    if (move === null) throw new Error("đến lượt mà không có nước hợp lệ");
    const r = applyMove(s, s.turn, move);
    if ("error" in r) throw new Error(`nước hợp lệ bị từ chối: ${r.error}`);
    for (const e of r.events) if (e.type === "play") played.push(...e.cards);
    s = r.state;
    const all = [...s.hands.flat(), ...played];
    expect(all).toHaveLength(13 * n);
    expect(new Set(all).size).toBe(13 * n);
  }
  return s;
}

describe("kiểm tra chéo và fuzz", () => {
  it("E23: allCombos và validMoves khớp bộ kiểm tra chậm trên nhiều tay bài ngẫu nhiên", () => {
    for (let seed = 0; seed < 120; seed++) {
      const hand = deal(createRng(seed), 4)[0] as Card[];
      const fast = allCombos(hand)
        .map((c) => c.cards.join(","))
        .sort();
      expect(fast).toEqual(bruteCombos(hand));
    }
    // với bộ trên bàn
    for (let seed = 0; seed < 60; seed++) {
      const hands = deal(createRng(1000 + seed), 4);
      const tableCards = hands[1]?.slice(0, 1 + (seed % 3)) ?? [];
      const combo = classify(tableCards);
      if (!combo) continue;
      const s = mk(["", "", "", ""], { hands: [hands[0] as Card[], [], [], []], table: { combo, by: 1 }, turn: 0 });
      const expected = bruteCombos(hands[0] as Card[]).filter((key) => {
        const c = classify(key.split(",").map(Number));
        return c !== null && beats(combo, c, s.options);
      });
      const got = validMoves(s, 0)
        .flatMap((m) => (m.type === "play" ? [m.cards.join(",")] : []))
        .sort();
      expect(got).toEqual(expected);
      expect(validMoves(s, 0).some((m) => m.type === "pass")).toBe(true);
    }
  });

  for (const n of [2, 3, 4] as const) {
    it(`E24: fuzz 200 ván ngẫu nhiên ${n} người: bất biến đúng, mọi ván kết thúc`, () => {
      for (let seed = 0; seed < 200; seed++) {
        const s = playRandomGame(n, seed);
        expect(s.result).not.toBeNull();
        expect([...(s.result?.ranking ?? [])].sort()).toEqual(Array.from({ length: n }, (_, i) => i));
        const total = (s.result?.scores ?? []).reduce((a, b) => a + b, 0);
        expect(total).toBe((n * (n - 1)) / 2);
      }
    });
  }

  it("mọi nước ngoài validMoves bị từ chối", () => {
    const rng = createRng(77);
    const s = setup({ ...OPTS, toiTrang: false }, [0, 1, 2, 3], 0, rng, { firstGame: false });
    const legal = new Set(validMoves(s, s.turn).map((m) => JSON.stringify(m)));
    for (const combo of allCombos(s.hands[(s.turn + 1) % 4] ?? [])) {
      const mv: Move = { type: "play", cards: combo.cards };
      expect("error" in applyMove(s, s.turn, mv) || legal.has(JSON.stringify(mv))).toBe(true);
    }
    expect(rankOf(0)).toBe(0);
  });
});
