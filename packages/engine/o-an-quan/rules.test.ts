// Test T1–T16 (mục 4 tài liệu kế hoạch). Các thế cờ được tính tay theo 01-luat-choi.md.
import { describe, expect, it } from "vitest";
import { createRng, pickRandom } from "../game-module.ts";
import { applyMove, defaultOptions, result, setup, validMoves } from "./rules.ts";
import type { GameEvent, Move, Options, ScoreDetail, State } from "./types.ts";

type Overrides = Partial<Omit<State, "options">> & { options?: Partial<Options> };

/** Dựng state tuỳ ý cho test. Mặc định: lượt A, cả hai ô quan còn quan, chưa ai ăn gì. */
function makeState(over: Overrides): State {
  const { options, ...rest } = over;
  return {
    dan: [0, 5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5],
    quan: [true, true],
    captured: [
      { dan: 0, quan: 0 },
      { dan: 0, quan: 0 },
    ],
    debt: [0, 0],
    turn: 0,
    moveNo: 0,
    status: "playing",
    result: null,
    ...rest,
    options: { ...defaultOptions, ...options },
  };
}

function play(state: State, seat: number, move: Move): { state: State; events: GameEvent[] } {
  const r = applyMove(state, seat, move);
  if ("error" in r) throw new Error(`nước đi bị từ chối: ${r.error}`);
  return r;
}

function captures(events: GameEvent[]) {
  return events.filter((e) => e.t === "capture");
}

function turnEnd(events: GameEvent[]) {
  return events.find((e) => e.t === "turnEnd");
}

function totalDan(s: State): number {
  return s.dan.reduce((a, b) => a + b, 0) + s.captured[0].dan + s.captured[1].dan;
}

function totalQuan(s: State): number {
  return Number(s.quan[0]) + Number(s.quan[1]) + s.captured[0].quan + s.captured[1].quan;
}

function clone(s: State): State {
  return JSON.parse(JSON.stringify(s)) as State;
}

function details(s: State): ScoreDetail[] {
  return s.result?.detail as ScoreDetail[];
}

describe("setup", () => {
  it("bàn khởi đầu: 5 dân mỗi ô dân, 1 quan mỗi ô quan, người đi trước theo tham số", () => {
    const s = setup(defaultOptions, [0, 1], 1);
    expect(s.dan).toEqual([0, 5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5]);
    expect(s.quan).toEqual([true, true]);
    expect(s.captured).toEqual([
      { dan: 0, quan: 0 },
      { dan: 0, quan: 0 },
    ]);
    expect(s.debt).toEqual([0, 0]);
    expect(s.turn).toBe(1);
    expect(s.moveNo).toBe(0);
    expect(s.status).toBe("playing");
    expect(s.result).toBeNull();
    expect(totalDan(s)).toBe(50);
    expect(totalQuan(s)).toBe(2);
  });

  it("validMoves: mỗi ô dân có quân trên hàng mình, hai chiều; không có nước cho người không đến lượt", () => {
    const s = makeState({ dan: [0, 0, 3, 0, 1, 0, 0, 5, 5, 5, 5, 5] });
    expect(validMoves(s, 0)).toEqual([
      { square: 2, dir: 1 },
      { square: 2, dir: -1 },
      { square: 4, dir: 1 },
      { square: 4, dir: -1 },
    ]);
    expect(validMoves(s, 1)).toEqual([]);
  });
});

describe("T1 — ví dụ chuẩn", () => {
  it("bàn khởi đầu, A chọn ô 3 chiều +1: ăn 6 dân ở ô 4, lượt sang B", () => {
    const s = setup(defaultOptions, [0, 1], 0);
    const { state, events } = play(s, 0, { square: 3, dir: 1 });

    expect(events).toEqual([
      { t: "pick", i: 3, n: 5 },
      { t: "drop", i: 4 },
      { t: "drop", i: 5 },
      { t: "drop", i: 6 },
      { t: "drop", i: 7 },
      { t: "drop", i: 8 },
      { t: "pick", i: 9, n: 5 },
      { t: "drop", i: 10 },
      { t: "drop", i: 11 },
      { t: "drop", i: 0 },
      { t: "drop", i: 1 },
      { t: "drop", i: 2 },
      { t: "capture", i: 4, dan: 6, quan: 0, by: 0 },
      { t: "turnEnd", reason: "het-an" },
    ]);
    expect(state.dan).toEqual([1, 6, 6, 0, 0, 6, 1, 6, 6, 0, 6, 6]);
    expect(state.quan).toEqual([true, true]);
    expect(state.captured[0]).toEqual({ dan: 6, quan: 0 });
    expect(state.turn).toBe(1);
    expect(state.moveNo).toBe(1);
  });
});

describe("T2 — viên cuối rơi ngay trước ô quan", () => {
  it("ô quan còn quan: kết thúc lượt, không ăn gì", () => {
    const s = makeState({ dan: [0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1] });
    const { state, events } = play(s, 0, { square: 4, dir: 1 });
    expect(state.dan).toEqual([0, 1, 1, 1, 0, 2, 0, 1, 1, 1, 1, 1]);
    expect(captures(events)).toEqual([]);
    expect(turnEnd(events)).toEqual({ t: "turnEnd", reason: "gap-o-quan" });
    expect(state.captured[0]).toEqual({ dan: 0, quan: 0 });
    expect(state.turn).toBe(1);
  });

  it("ô quan đã mất quan nhưng còn dân: vẫn kết thúc lượt, không bốc ô quan", () => {
    const s = makeState({ dan: [0, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1], quan: [true, false] });
    const { state, events } = play(s, 0, { square: 4, dir: 1 });
    expect(state.dan[6]).toBe(2);
    expect(captures(events)).toEqual([]);
    expect(turnEnd(events)).toEqual({ t: "turnEnd", reason: "gap-o-quan" });
  });
});

describe("T3/T4 — quan non", () => {
  // A đi ô 3 chiều +1 (1 dân) → rơi vào ô 4. Ô 5 trống, ô 6 có quan + 3 dân.
  const board = [0, 1, 1, 1, 0, 0, 3, 1, 1, 1, 1, 1];

  it("T3: camAnQuanNon tắt → ăn 1 quan + 3 dân", () => {
    const s = makeState({ dan: board });
    const { state, events } = play(s, 0, { square: 3, dir: 1 });
    expect(captures(events)).toEqual([{ t: "capture", i: 6, dan: 3, quan: 1, by: 0 }]);
    expect(turnEnd(events)).toEqual({ t: "turnEnd", reason: "het-an" });
    expect(state.captured[0]).toEqual({ dan: 3, quan: 1 });
    expect(state.quan).toEqual([true, false]);
    expect(state.dan[6]).toBe(0);
  });

  it("T4: camAnQuanNon bật → không ăn, kết thúc lượt", () => {
    const s = makeState({ dan: board, options: { camAnQuanNon: true } });
    const { state, events } = play(s, 0, { square: 3, dir: 1 });
    expect(captures(events)).toEqual([]);
    expect(turnEnd(events)).toEqual({ t: "turnEnd", reason: "quan-non" });
    expect(state.captured[0]).toEqual({ dan: 0, quan: 0 });
    expect(state.quan).toEqual([true, true]);
    expect(state.dan[6]).toBe(3);
  });

  it("camAnQuanNon bật nhưng ô quan có ≥ 5 dân → vẫn ăn được", () => {
    const s = makeState({ dan: [0, 1, 1, 1, 0, 0, 5, 1, 1, 1, 1, 1], options: { camAnQuanNon: true } });
    const { state } = play(s, 0, { square: 3, dir: 1 });
    expect(state.captured[0]).toEqual({ dan: 5, quan: 1 });
  });

  it("camAnQuanNon bật: các ô đã ăn trước quan non trong cùng lượt vẫn được giữ", () => {
    // B đi ô 7 chiều -1 (1 dân) → rơi vào ô quan 6. Ô 5 trống, ăn ô 4 (2 dân), ô 3 trống, ăn ô 2 (3 dân),
    // ô 1 trống, ô 0 là quan non (quan + 2 dân) → dừng. A có sẵn 5 dân để rải lại hàng mình.
    const s = makeState({
      dan: [2, 0, 3, 0, 2, 0, 0, 1, 1, 1, 1, 1],
      turn: 1,
      captured: [
        { dan: 5, quan: 0 },
        { dan: 0, quan: 0 },
      ],
      options: { camAnQuanNon: true },
    });
    const { state, events } = play(s, 1, { square: 7, dir: -1 });
    expect(captures(events).map((e) => e.i)).toEqual([4, 2]);
    expect(turnEnd(events)).toEqual({ t: "turnEnd", reason: "quan-non" });
    expect(state.captured[1]).toEqual({ dan: 5, quan: 0 });
    expect(state.quan[0]).toBe(true);
  });
});

describe("T5 — ăn dây", () => {
  it("trống–có–trống–có–trống–có: ăn cả 3 ô", () => {
    // A đi ô 5 chiều +1 (1 dân) → rơi vào ô quan 6. Sau đó: 7 trống, 8 có 2, 9 trống, 10 có 3, 11 trống,
    // ô quan 0 có quan + 4 dân; tiếp theo ô 1 có dân → dừng.
    const s = makeState({
      dan: [4, 1, 1, 1, 1, 1, 0, 0, 2, 0, 3, 0],
      captured: [
        { dan: 0, quan: 0 },
        { dan: 10, quan: 0 },
      ],
    });
    const { state, events } = play(s, 0, { square: 5, dir: 1 });
    expect(captures(events)).toEqual([
      { t: "capture", i: 8, dan: 2, quan: 0, by: 0 },
      { t: "capture", i: 10, dan: 3, quan: 0, by: 0 },
      { t: "capture", i: 0, dan: 4, quan: 1, by: 0 },
    ]);
    expect(turnEnd(events)).toEqual({ t: "turnEnd", reason: "het-an" });
    expect(state.captured[0]).toEqual({ dan: 9, quan: 1 });
    expect(state.quan).toEqual([false, true]);
  });
});

describe("T6 — hai ô trống", () => {
  it("sau viên cuối là hai ô trống: kết thúc lượt, không ăn", () => {
    const s = makeState({ dan: [0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1] });
    const { state, events } = play(s, 0, { square: 1, dir: 1 });
    expect(state.dan).toEqual([0, 0, 2, 0, 0, 1, 0, 1, 1, 1, 1, 1]);
    expect(captures(events)).toEqual([]);
    expect(turnEnd(events)).toEqual({ t: "turnEnd", reason: "hai-o-trong" });
    expect(state.turn).toBe(1);
  });
});

describe("T7 — ăn dây qua ô quan đã trống hẳn", () => {
  it("ô quan trống hẳn được xem là ô trống, ăn tiếp ô phía sau", () => {
    // A đi ô 2 chiều +1 (1 dân) → rơi vào ô 3. Ô 4 trống, ăn ô 5 (2 dân),
    // ô quan 6 trống hẳn, ăn ô 7 (3 dân), ô 8 có dân → dừng.
    const s = makeState({ dan: [0, 1, 1, 0, 0, 2, 0, 3, 1, 1, 1, 1], quan: [true, false] });
    const { state, events } = play(s, 0, { square: 2, dir: 1 });
    expect(captures(events)).toEqual([
      { t: "capture", i: 5, dan: 2, quan: 0, by: 0 },
      { t: "capture", i: 7, dan: 3, quan: 0, by: 0 },
    ]);
    expect(state.captured[0]).toEqual({ dan: 5, quan: 0 });
  });

  it("ô n là ô quan trống hẳn: được ăn ô sau nó (trường hợp c)", () => {
    // A đi ô 4 chiều +1 (1 dân) → rơi vào ô 5. Ô quan 6 trống hẳn, ăn ô 7 (2 dân), ô 8 có dân → dừng.
    const s = makeState({ dan: [0, 1, 1, 1, 1, 0, 0, 2, 1, 1, 1, 1], quan: [true, false] });
    const { state, events } = play(s, 0, { square: 4, dir: 1 });
    expect(captures(events)).toEqual([{ t: "capture", i: 7, dan: 2, quan: 0, by: 0 }]);
    expect(state.captured[0]).toEqual({ dan: 2, quan: 0 });
  });
});

describe("T8 — rải đủ một vòng", () => {
  it("ô có 12 dân: ô vừa bốc nhận lại 1 dân khi rải vòng tới", () => {
    const s = makeState({ dan: [0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    const { state, events } = play(s, 0, { square: 1, dir: 1 });
    const drops = events.filter((e) => e.t === "drop").map((e) => e.i);
    expect(drops.slice(0, 12)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1]);
    // Viên cuối rơi vào ô 1 → ô 2 có 1 dân → bốc rải tiếp vào 3 → ô 4 có 1 → bốc rải vào 5 → gặp ô quan 6.
    expect(state.dan).toEqual([1, 1, 0, 2, 0, 2, 1, 1, 1, 1, 1, 1]);
    expect(turnEnd(events)).toEqual({ t: "turnEnd", reason: "gap-o-quan" });
  });
});

describe("T9–T11 — hết dân trên hàng, rải quân", () => {
  // A đi ô 1 chiều -1 (1 dân) → rơi vào ô quan 0. Ô 11 và 10 trống → hết lượt. Hàng B trống hết.
  const board = [0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0];
  const move: Move = { square: 1, dir: -1 };

  it("T9: B đã ăn ≥ 5 dân → trừ 5 dân của B, mỗi ô 1 dân", () => {
    const s = makeState({
      dan: board,
      captured: [
        { dan: 3, quan: 0 },
        { dan: 7, quan: 0 },
      ],
    });
    const { state, events } = play(s, 0, move);
    expect(events.at(-1)).toEqual({ t: "spread", seat: 1, fromOwn: 5, borrowed: 0 });
    expect(state.dan.slice(7, 12)).toEqual([1, 1, 1, 1, 1]);
    expect(state.captured[1].dan).toBe(2);
    expect(state.captured[0].dan).toBe(3);
    expect(state.debt).toEqual([0, 0]);
    expect(state.turn).toBe(1);
    expect(state.status).toBe("playing");
    expect(validMoves(state, 1)).toHaveLength(10);
  });

  it("T10: B chỉ có 2 dân → dùng 2 dân, vay 3 dân của A, debt = 3", () => {
    const s = makeState({
      dan: board,
      captured: [
        { dan: 10, quan: 1 },
        { dan: 2, quan: 0 },
      ],
    });
    const { state, events } = play(s, 0, move);
    expect(events.at(-1)).toEqual({ t: "spread", seat: 1, fromOwn: 2, borrowed: 3 });
    expect(state.dan.slice(7, 12)).toEqual([1, 1, 1, 1, 1]);
    expect(state.captured[1]).toEqual({ dan: 0, quan: 0 });
    expect(state.captured[0]).toEqual({ dan: 7, quan: 1 });
    expect(state.debt).toEqual([0, 3]);
  });

  it("T11: hai bên cộng lại không đủ 5 dân, ô quan còn quân → ván kết thúc, người còn lại thu cả bàn", () => {
    // A đi ô 5 chiều +1 (1 dân) → rơi vào ô quan 6. Ô 7 và 8 trống → hết lượt. Hàng B trống, A 1 + B 2 = 3 < 5.
    const s = makeState({
      dan: [10, 6, 6, 6, 6, 1, 12, 0, 0, 0, 0, 0],
      captured: [
        { dan: 1, quan: 0 },
        { dan: 2, quan: 0 },
      ],
    });
    expect(totalDan(s)).toBe(50);
    const { state, events } = play(s, 0, { square: 5, dir: 1 });

    expect(events.some((e) => e.t === "spread")).toBe(false);
    expect(events.at(-1)?.t).toBe("gameOver");
    expect(state.status).toBe("finished");
    expect(state.result).toEqual({
      winner: 0,
      scores: [68, 2],
      reason: "khong-du-dan",
      detail: [
        { dan: 1, quan: 2, rowDan: 47, borrowed: 0, lent: 0, total: 68 },
        { dan: 2, quan: 0, rowDan: 0, borrowed: 0, lent: 0, total: 2 },
      ],
    });
    expect(result(state)).toEqual(state.result);
    // Quân thu cuối ván được cộng vào phần đã ăn, bàn trống hẳn.
    expect(state.dan.every((d) => d === 0)).toBe(true);
    expect(state.quan).toEqual([false, false]);
    expect(state.captured[0]).toEqual({ dan: 48, quan: 2 });
    expect(totalDan(state)).toBe(50);
    expect(totalQuan(state)).toBe(2);
    expect(validMoves(state, 0)).toEqual([]);
    expect(validMoves(state, 1)).toEqual([]);
  });
});

describe("T12/T13/T15 — hết quan, tính điểm", () => {
  // A đi ô 3 chiều +1 (1 dân) → rơi vào ô 4. Ô 5 trống, ăn ô quan 6 (quan + 2 dân). Ô 7 có dân → dừng.
  // Ô quan 0 đã trống hẳn → hai ô quan đều trống → hết ván.
  // Tổng: bàn 15 dân + đã ăn 20 + 15 = 50 dân; quan: A đã ăn 1 + ô 6 còn 1 = 2.
  const base = (over: Overrides = {}) =>
    makeState({
      dan: [0, 5, 0, 1, 0, 0, 2, 4, 2, 1, 0, 0],
      quan: [false, true],
      captured: [
        { dan: 20, quan: 1 },
        { dan: 15, quan: 0 },
      ],
      ...over,
    });

  it("T12: ăn ô quan cuối → ván kết thúc, mỗi bên thu dân trên hàng mình", () => {
    const s = base();
    expect(totalDan(s)).toBe(50);
    const { state, events } = play(s, 0, { square: 3, dir: 1 });
    expect(captures(events)).toEqual([{ t: "capture", i: 6, dan: 2, quan: 1, by: 0 }]);
    expect(events.at(-1)?.t).toBe("gameOver");
    expect(state.status).toBe("finished");
    // A: 22 dân + 2 quan × 10 + hàng mình (ô 1: 5, ô 4: 1) = 48. B: 15 + hàng mình (4 + 2 + 1) = 22.
    expect(state.result).toEqual({
      winner: 0,
      scores: [48, 22],
      reason: "het-quan",
      detail: [
        { dan: 22, quan: 2, rowDan: 6, borrowed: 0, lent: 0, total: 48 },
        { dan: 15, quan: 0, rowDan: 7, borrowed: 0, lent: 0, total: 22 },
      ],
    });
    expect(state.captured).toEqual([
      { dan: 28, quan: 2 },
      { dan: 22, quan: 0 },
    ]);
    expect(state.dan.every((d) => d === 0)).toBe(true);
    expect(state.result!.scores.reduce((a, b) => a + b, 0)).toBe(70);
  });

  it("T13: tính điểm có nợ — A đã vay 3 dân của B", () => {
    const { state } = play(base({ debt: [3, 0] }), 0, { square: 3, dir: 1 });
    expect(state.result?.scores).toEqual([45, 25]);
    expect(details(state)[0]).toMatchObject({ borrowed: 3, lent: 0, total: 45 });
    expect(details(state)[1]).toMatchObject({ borrowed: 0, lent: 3, total: 25 });
  });

  it("T13: nợ hai chiều được bù trừ", () => {
    const { state } = play(base({ debt: [3, 5] }), 0, { square: 3, dir: 1 });
    // A: 48 − 3 + 5 = 50. B: 22 − 5 + 3 = 20.
    expect(state.result?.scores).toEqual([50, 20]);
  });

  it("hoà khi bằng điểm", () => {
    // Như T12 nhưng chia lại phần đã ăn (tổng vẫn 50 dân).
    const s = base({
      captured: [
        { dan: 7, quan: 1 },
        { dan: 28, quan: 0 },
      ],
    });
    const { state } = play(s, 0, { square: 3, dir: 1 });
    // A: 9 + 20 + 6 = 35. B: 28 + 7 = 35.
    expect(state.result?.scores).toEqual([35, 35]);
    expect(state.result?.winner).toBeNull();
  });

  it("T15: giaTriQuan = 5 → tổng điểm hai bên = 60", () => {
    const { state } = play(base({ options: { giaTriQuan: 5 } }), 0, { square: 3, dir: 1 });
    expect(state.result?.scores).toEqual([38, 22]);
    expect(state.result!.scores.reduce((a, b) => a + b, 0)).toBe(60);
  });
});

describe("T14 — nước đi không hợp lệ", () => {
  const cases: [string, number, Move][] = [
    ["sai lượt", 1, { square: 8, dir: 1 }],
    ["ô của đối thủ", 0, { square: 8, dir: 1 }],
    ["ô quan 0", 0, { square: 0, dir: 1 }],
    ["ô quan 6", 0, { square: 6, dir: -1 }],
    ["ô ngoài bàn", 0, { square: 12, dir: 1 }],
    ["ô âm", 0, { square: -1, dir: 1 }],
    ["ô không phải số nguyên", 0, { square: 1.5, dir: 1 }],
    ["chiều 0", 0, { square: 1, dir: 0 as never }],
    ["chiều 2", 0, { square: 1, dir: 2 as never }],
    ["ghế không tồn tại", 2, { square: 1, dir: 1 }],
  ];

  it.each(cases)("%s → trả về lỗi, state không đổi", (_name, seat, move) => {
    const s = setup(defaultOptions, [0, 1], 0);
    const snapshot = clone(s);
    const r = applyMove(s, seat, move);
    expect(r).toHaveProperty("error");
    expect(s).toEqual(snapshot);
  });

  it("ô trống → lỗi", () => {
    const t = makeState({ dan: [0, 0, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5] });
    const before = clone(t);
    expect(applyMove(t, 0, { square: 1, dir: 1 })).toHaveProperty("error");
    expect(t).toEqual(before);
  });

  it("ván đã kết thúc → lỗi", () => {
    const t = makeState({ status: "finished" });
    expect(applyMove(t, 0, { square: 1, dir: 1 })).toHaveProperty("error");
  });

  it("nước hợp lệ không sửa state đầu vào", () => {
    const s = setup(defaultOptions, [0, 1], 0);
    const snapshot = clone(s);
    applyMove(s, 0, { square: 3, dir: 1 });
    expect(s).toEqual(snapshot);
  });
});

describe("T16 — fuzz", () => {
  it("10.000 ván ngẫu nhiên: không lỗi, bất biến luôn đúng, mọi ván kết thúc, tổng điểm = 70 / 60", () => {
    const rng = createRng(20261020);
    const MAX_MOVES = 5000;
    let longest = 0;
    const reasons: Record<string, number> = {};

    for (let game = 0; game < 10_000; game++) {
      const options: Options = {
        ...defaultOptions,
        giaTriQuan: game % 2 === 0 ? 10 : 5,
        camAnQuanNon: rng() < 0.5,
      };
      let state = setup(options, [0, 1], rng() < 0.5 ? 0 : 1);
      let moves = 0;

      while (state.status === "playing") {
        const seat = state.turn;
        const legal = validMoves(state, seat);
        expect(legal.length, `ván ${game}: đến lượt mà không có nước đi`).toBeGreaterThan(0);
        expect(validMoves(state, 1 - seat)).toEqual([]);

        const move = pickRandom(legal, rng)!;
        const r = applyMove(state, seat, move);
        if ("error" in r) throw new Error(`ván ${game}: nước hợp lệ bị từ chối: ${r.error}`);
        state = r.state;
        moves++;

        if (totalDan(state) !== 50 || totalQuan(state) !== 2 || state.dan.some((d) => d < 0)) {
          throw new Error(`ván ${game}, nước ${moves}: sai bất biến ${JSON.stringify(state)}`);
        }
        if (moves > MAX_MOVES) throw new Error(`ván ${game}: quá ${MAX_MOVES} nước, nghi bị treo`);
      }

      longest = Math.max(longest, moves);
      const res = state.result!;
      reasons[res.reason] = (reasons[res.reason] ?? 0) + 1;
      const sum = res.scores[0]! + res.scores[1]!;
      if (sum !== 50 + 2 * options.giaTriQuan) {
        throw new Error(`ván ${game}: tổng điểm ${sum} ${JSON.stringify(res)}`);
      }
      const expectedWinner = res.scores[0] === res.scores[1] ? null : res.scores[0]! > res.scores[1]! ? 0 : 1;
      expect(res.winner).toBe(expectedWinner);
    }

    expect(longest).toBeLessThanOrEqual(MAX_MOVES);
    // Cả hai cách kết thúc ván đều phải xuất hiện, để fuzz thực sự kiểm tra được cả hai nhánh tính điểm.
    expect(Object.keys(reasons).sort(), JSON.stringify(reasons)).toEqual(["het-quan", "khong-du-dan"]);
  }, 120_000);
});
