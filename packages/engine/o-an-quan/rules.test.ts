// Test T1–T20 (mục 4 tài liệu kế hoạch). Các thế cờ được tính tay theo 01-luat-choi.md.
import { describe, expect, it } from "vitest";
import { createRng, pickRandom } from "../game-module.ts";
import { applyMove, defaultOptions, forfeit, parseOptions, result, setup, validMoves } from "./rules.ts";
import type { Dir, GameEvent, Move, Options, ScoreDetail, SowMove, State } from "./types.ts";

type Overrides = Partial<Omit<State, "options">> & { options?: Partial<Options> };

/** Dựng state tuỳ ý cho test. Mặc định: lượt bên A, ghế 0 điều khiển A, cả hai ô quan còn quan. */
function makeState(over: Overrides): State {
  const { options, ...rest } = over;
  return {
    dan: [0, 5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5],
    quan: [true, true],
    captured: [
      { dan: 0, quan: 0 },
      { dan: 0, quan: 0 },
    ],
    controller: [0, 1],
    turn: 0,
    moveNo: 0,
    latBanUsed: false,
    recentSows: [],
    buDanCount: [0, 0],
    status: "playing",
    result: null,
    ...rest,
    options: { ...defaultOptions, ...options },
  };
}

const sow = (square: number, dir: Dir): SowMove => ({ kind: "sow", square, dir });
const LAT_BAN: Move = { kind: "latBan" };

/** Đi một nước bằng ghế đang điều khiển bên đến lượt (hoặc ghế chỉ định). */
function play(state: State, move: Move, seatId = state.controller[state.turn]) {
  const r = applyMove(state, seatId, move);
  if ("error" in r) throw new Error(`nước đi bị từ chối: ${r.error}`);
  return r;
}

const captures = (events: GameEvent[]) => events.filter((e) => e.t === "capture");
const turnEnd = (events: GameEvent[]) => events.find((e) => e.t === "turnEnd");

function clone(s: State): State {
  return JSON.parse(JSON.stringify(s)) as State;
}

/** Tổng điểm bàn + kho (bất biến = 70 hoặc 60) */
function totalPoints(s: State): number {
  const v = s.options.giaTriQuan;
  const board = s.dan.reduce((a, b) => a + b, 0) + (Number(s.quan[0]) + Number(s.quan[1])) * v;
  return board + s.captured.reduce((a, p) => a + p.dan + p.quan * v, 0);
}

function details(s: State): ScoreDetail[] {
  return s.result?.detail as ScoreDetail[];
}

describe("setup và validMoves", () => {
  it("bàn khởi đầu: bên A luôn đi trước, controller[0] = người đi trước (Q17)", () => {
    const s = setup(defaultOptions, [0, 1], 1);
    expect(s.dan).toEqual([0, 5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5]);
    expect(s.quan).toEqual([true, true]);
    expect(s.captured).toEqual([
      { dan: 0, quan: 0 },
      { dan: 0, quan: 0 },
    ]);
    expect(s.controller).toEqual([1, 0]);
    expect(s.turn).toBe(0);
    expect(s.moveNo).toBe(0);
    expect(s.latBanUsed).toBe(false);
    expect(s.recentSows).toEqual([]);
    expect(s.buDanCount).toEqual([0, 0]);
    expect(s.status).toBe("playing");
    expect(s.result).toBeNull();
    expect(totalPoints(s)).toBe(70);
    expect(setup(defaultOptions, [0, 1], 0).controller).toEqual([0, 1]);
  });

  it("tuỳ chọn mặc định: quan 10, Quan Già tắt, Lật bàn tắt (Q16)", () => {
    expect(defaultOptions).toMatchObject({ giaTriQuan: 10, camAnQuanNon: false, latBan: false });
  });

  it("validMoves: ô có quân trên hàng của bên đến lượt, hai chiều; người không đến lượt không có nước", () => {
    const s = makeState({ dan: [0, 0, 3, 0, 1, 0, 0, 5, 5, 5, 5, 5] });
    expect(validMoves(s, 0)).toEqual([sow(2, 1), sow(2, -1), sow(4, 1), sow(4, -1)]);
    expect(validMoves(s, 1)).toEqual([]);
  });
});

describe("T1 — ví dụ chuẩn", () => {
  it("bàn khởi đầu, A chọn ô 3 chiều +1: ăn 6 dân ở ô 4, lượt sang B", () => {
    const s = setup(defaultOptions, [0, 1], 0);
    const { state, events } = play(s, sow(3, 1));

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
    expect(state.captured[0]).toEqual({ dan: 6, quan: 0 });
    expect(state.turn).toBe(1);
    expect(state.moveNo).toBe(1);
    expect(state.recentSows).toEqual([sow(3, 1)]);
  });
});

describe("T2 — viên cuối rơi ngay trước ô quan", () => {
  it("ô quan còn quan: kết thúc lượt, không ăn gì", () => {
    const s = makeState({ dan: [0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1] });
    const { state, events } = play(s, sow(4, 1));
    expect(state.dan).toEqual([0, 1, 1, 1, 0, 2, 0, 1, 1, 1, 1, 1]);
    expect(captures(events)).toEqual([]);
    expect(turnEnd(events)).toEqual({ t: "turnEnd", reason: "gap-o-quan" });
    expect(state.turn).toBe(1);
  });

  it("ô quan đã mất quan nhưng còn dân: vẫn kết thúc lượt, không bốc ô quan", () => {
    const s = makeState({ dan: [0, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1], quan: [true, false] });
    const { state, events } = play(s, sow(4, 1));
    expect(state.dan[6]).toBe(2);
    expect(captures(events)).toEqual([]);
    expect(turnEnd(events)).toEqual({ t: "turnEnd", reason: "gap-o-quan" });
  });
});

describe("T3/T4 — Cơ bản và Quan Già", () => {
  it("T3: Quan Già tắt → ăn 1 quan + 3 dân (13 điểm)", () => {
    // A đi ô 3 chiều +1 (1 dân) → rơi vào ô 4. Ô 5 trống, ô 6 có quan + 3 dân.
    const s = makeState({ dan: [0, 1, 1, 1, 0, 0, 3, 1, 1, 1, 1, 1] });
    const { state, events } = play(s, sow(3, 1));
    expect(captures(events)).toEqual([{ t: "capture", i: 6, dan: 3, quan: 1, by: 0 }]);
    expect(turnEnd(events)).toEqual({ t: "turnEnd", reason: "het-an" });
    expect(state.captured[0]).toEqual({ dan: 3, quan: 1 });
    expect(state.quan).toEqual([true, false]);
  });

  it("T4: Quan Già, ô quan có quan + 4 dân → không ăn, dừng ngay, không bỏ qua để ăn ô phía sau", () => {
    // Nếu được bỏ qua ô quan thì ô 7 trống, ô 8 có 2 dân sẽ bị ăn. Quan Già không cho phép.
    const s = makeState({ dan: [0, 1, 1, 1, 0, 0, 4, 0, 2, 1, 1, 1], options: { camAnQuanNon: true } });
    const { state, events } = play(s, sow(3, 1));
    expect(captures(events)).toEqual([]);
    expect(turnEnd(events)).toEqual({ t: "turnEnd", reason: "quan-non" });
    expect(state.captured[0]).toEqual({ dan: 0, quan: 0 });
    expect(state.quan).toEqual([true, true]);
    expect(state.dan[6]).toBe(4);
    expect(state.dan[8]).toBe(2);
  });

  it("T4b: Quan Già, ô quan có quan + 5 dân → ăn được 15 điểm", () => {
    const s = makeState({ dan: [0, 1, 1, 1, 0, 0, 5, 1, 1, 1, 1, 1], options: { camAnQuanNon: true } });
    const { state } = play(s, sow(3, 1));
    expect(state.captured[0]).toEqual({ dan: 5, quan: 1 });
  });

  it("T4c: Quan Già, ăn ô dân rồi ăn liên hoàn tới ô quan non → giữ ô đã ăn, dừng trước ô quan", () => {
    // B đi ô 7 chiều -1 (1 dân) → rơi vào ô quan 6. Ô 5 trống, ăn ô 4 (2 dân), ô 3 trống, ăn ô 2 (3 dân),
    // ô 1 trống, ô quan 0 có quan + 2 dân → dừng. Kho A có sẵn 5 dân để bù dân.
    const s = makeState({
      dan: [2, 0, 3, 0, 2, 0, 0, 1, 1, 1, 1, 1],
      turn: 1,
      captured: [
        { dan: 5, quan: 0 },
        { dan: 0, quan: 0 },
      ],
      options: { camAnQuanNon: true },
    });
    const { state, events } = play(s, sow(7, -1));
    expect(captures(events).map((e) => e.i)).toEqual([4, 2]);
    expect(turnEnd(events)).toEqual({ t: "turnEnd", reason: "quan-non" });
    expect(state.captured[1]).toEqual({ dan: 5, quan: 0 });
    expect(state.quan[0]).toBe(true);
    expect(state.dan[0]).toBe(2);
  });

  it("T4d: Quan Già, ô quan đã mất quan, có 2 dân → ăn bình thường 2 điểm", () => {
    const s = makeState({
      dan: [0, 1, 1, 1, 0, 0, 2, 1, 1, 1, 1, 1],
      quan: [true, false],
      options: { camAnQuanNon: true },
    });
    const { state, events } = play(s, sow(3, 1));
    expect(captures(events)).toEqual([{ t: "capture", i: 6, dan: 2, quan: 0, by: 0 }]);
    expect(state.captured[0]).toEqual({ dan: 2, quan: 0 });
  });
});

describe("T5 — ăn liên hoàn", () => {
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
    const { state, events } = play(s, sow(5, 1));
    expect(captures(events)).toEqual([
      { t: "capture", i: 8, dan: 2, quan: 0, by: 0 },
      { t: "capture", i: 10, dan: 3, quan: 0, by: 0 },
      { t: "capture", i: 0, dan: 4, quan: 1, by: 0 },
    ]);
    expect(turnEnd(events)).toEqual({ t: "turnEnd", reason: "het-an" });
    expect(state.captured[0]).toEqual({ dan: 9, quan: 1 });
  });
});

describe("T6 — hai ô trống", () => {
  it("sau viên cuối là hai ô trống: kết thúc lượt, không ăn", () => {
    const s = makeState({ dan: [0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1] });
    const { state, events } = play(s, sow(1, 1));
    expect(state.dan).toEqual([0, 0, 2, 0, 0, 1, 0, 1, 1, 1, 1, 1]);
    expect(captures(events)).toEqual([]);
    expect(turnEnd(events)).toEqual({ t: "turnEnd", reason: "hai-o-trong" });
  });
});

describe("T7 — ăn liên hoàn qua ô quan đã trống hẳn", () => {
  it("ô quan trống hẳn được xem là ô trống, ăn tiếp ô phía sau", () => {
    // A đi ô 2 chiều +1 → rơi vào ô 3. Ô 4 trống, ăn ô 5 (2), ô quan 6 trống hẳn, ăn ô 7 (3), ô 8 có dân → dừng.
    const s = makeState({ dan: [0, 1, 1, 0, 0, 2, 0, 3, 1, 1, 1, 1], quan: [true, false] });
    const { state, events } = play(s, sow(2, 1));
    expect(captures(events).map((e) => [e.i, e.dan])).toEqual([
      [5, 2],
      [7, 3],
    ]);
    expect(state.captured[0]).toEqual({ dan: 5, quan: 0 });
  });

  it("ô n là ô quan trống hẳn: được ăn ô sau nó (trường hợp c)", () => {
    const s = makeState({ dan: [0, 1, 1, 1, 1, 0, 0, 2, 1, 1, 1, 1], quan: [true, false] });
    const { state, events } = play(s, sow(4, 1));
    expect(captures(events)).toEqual([{ t: "capture", i: 7, dan: 2, quan: 0, by: 0 }]);
    expect(state.captured[0]).toEqual({ dan: 2, quan: 0 });
  });
});

describe("T8 — rải đủ một vòng", () => {
  it("ô có 12 dân: ô vừa bốc nhận lại 1 dân khi rải vòng tới", () => {
    const s = makeState({
      dan: [0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      captured: [
        { dan: 0, quan: 0 },
        { dan: 38, quan: 0 },
      ],
    });
    const { state, events } = play(s, sow(1, 1));
    const drops = events.filter((e) => e.t === "drop").map((e) => e.i);
    expect(drops.slice(0, 12)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1]);
    // Viên cuối rơi vào ô 1 → ô 2 có 1 dân → bốc rải vào 3 → ô 4 có 1 → bốc rải vào 5 → gặp ô quan 6.
    expect(state.dan).toEqual([1, 1, 0, 2, 0, 2, 1, 1, 1, 1, 1, 1]);
    expect(turnEnd(events)).toEqual({ t: "turnEnd", reason: "gap-o-quan" });
  });
});

describe("T9–T11 — Bù dân", () => {
  // A đi ô 1 chiều -1 (1 dân) → rơi vào ô quan 0. Ô 11 và 10 trống → hết lượt. Hàng B trống hết.
  const board = [0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0];
  const move = sow(1, -1);

  it("T9: kho B có ≥ 5 dân → trừ 5 dân, mỗi ô 1 dân, buDan(doiQuan = false)", () => {
    const s = makeState({
      dan: board,
      captured: [
        { dan: 3, quan: 0 },
        { dan: 7, quan: 0 },
      ],
    });
    const { state, events } = play(s, move);
    expect(events.at(-1)).toEqual({ t: "buDan", seat: 1, doiQuan: false });
    expect(state.dan.slice(7, 12)).toEqual([1, 1, 1, 1, 1]);
    expect(state.captured).toEqual([
      { dan: 3, quan: 0 },
      { dan: 2, quan: 0 },
    ]);
    expect(state.buDanCount).toEqual([0, 1]);
    expect(state.turn).toBe(1);
    expect(state.status).toBe("playing");
    expect(validMoves(state, 1)).toHaveLength(10);
  });

  it("T10: kho B có 2 dân + 1 quan (v = 10) → đổi 1 quan thành 10 dân rồi trừ 5: còn 7 dân, 0 quan", () => {
    const s = makeState({
      dan: board,
      captured: [
        { dan: 10, quan: 0 },
        { dan: 2, quan: 1 },
      ],
    });
    const { state, events } = play(s, move);
    expect(events.at(-1)).toEqual({ t: "buDan", seat: 1, doiQuan: true });
    expect(state.captured[1]).toEqual({ dan: 7, quan: 0 });
    expect(state.captured[0]).toEqual({ dan: 10, quan: 0 });
    expect(state.dan.slice(7, 12)).toEqual([1, 1, 1, 1, 1]);
  });

  it("T10 (v = 5): kho 2 dân + 1 quan → đổi quan thành 5 dân, trừ 5: còn 2 dân", () => {
    const s = makeState({
      dan: board,
      captured: [
        { dan: 10, quan: 0 },
        { dan: 2, quan: 1 },
      ],
      options: { giaTriQuan: 5 },
    });
    const { state } = play(s, move);
    expect(state.captured[1]).toEqual({ dan: 2, quan: 0 });
  });

  it("T11: cần bù dân nhưng kho < 5 điểm → ván kết thúc khong-du-bu-dan, bên đó thua dù điểm cao hơn", () => {
    const s = makeState({
      dan: board,
      controller: [1, 0],
      captured: [
        { dan: 1, quan: 0 },
        { dan: 4, quan: 0 },
      ],
    });
    const { state, events } = play(s, move);
    expect(events.some((e) => e.t === "buDan")).toBe(false);
    expect(events.at(-1)?.t).toBe("gameOver");
    expect(state.status).toBe("finished");
    // Bên B do ghế 0 điều khiển, 4 điểm > 1 điểm nhưng vẫn thua. Không thu quân trên bàn.
    expect(state.result).toEqual({
      winner: 1,
      scores: [4, 1],
      reason: "khong-du-bu-dan",
      detail: [
        { side: 1, dan: 4, quan: 0, rowDan: 0, buDan: 0, total: 4 },
        { side: 0, dan: 1, quan: 0, rowDan: 0, buDan: 0, total: 1 },
      ],
    });
    expect(result(state)).toEqual(state.result);
    expect(validMoves(state, 0)).toEqual([]);
    expect(validMoves(state, 1)).toEqual([]);
    expect(totalPoints(state)).toBe(totalPoints(s));
  });
});

describe("T12/T15 — hết quan", () => {
  // A đi ô 3 chiều +1 (1 dân) → rơi vào ô 4. Ô 5 trống, ăn ô quan 6 (quan + 2 dân). Ô 7 có dân → dừng.
  // Ô quan 0 đã trống hẳn → hết quan. Tổng: bàn 15 dân + 1 quan, kho A 20 dân + 1 quan, kho B 15 dân.
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

  it("T12: ăn ô quan cuối → ván kết thúc, mỗi bên thu dân trên hàng mình, so điểm", () => {
    const s = base();
    expect(totalPoints(s)).toBe(70);
    const { state, events } = play(s, sow(3, 1));
    expect(captures(events)).toEqual([{ t: "capture", i: 6, dan: 2, quan: 1, by: 0 }]);
    expect(events.at(-1)?.t).toBe("gameOver");
    expect(state.status).toBe("finished");
    // A: 22 dân + 2 quan × 10 + hàng mình (ô 1: 5, ô 4: 1) = 48. B: 15 + hàng mình (4 + 2 + 1) = 22.
    expect(state.result).toEqual({
      winner: 0,
      scores: [48, 22],
      reason: "het-quan",
      detail: [
        { side: 0, dan: 22, quan: 2, rowDan: 6, buDan: 0, total: 48 },
        { side: 1, dan: 15, quan: 0, rowDan: 7, buDan: 0, total: 22 },
      ],
    });
    expect(totalPoints(state)).toBe(70);
  });

  it("hoà khi 35–35", () => {
    const s = base({
      captured: [
        { dan: 7, quan: 1 },
        { dan: 28, quan: 0 },
      ],
    });
    const { state } = play(s, sow(3, 1));
    expect(state.result?.scores).toEqual([35, 35]);
    expect(state.result?.winner).toBeNull();
  });

  it("số lần bù dân được ghi vào ScoreDetail", () => {
    const { state } = play(base({ buDanCount: [2, 1] }), sow(3, 1));
    expect(details(state).map((d) => d.buDan)).toEqual([2, 1]);
  });

  it("T15: giaTriQuan = 5 → tổng điểm hai bên cuối ván = 60", () => {
    const s = base({ options: { giaTriQuan: 5 } });
    expect(totalPoints(s)).toBe(60);
    const { state } = play(s, sow(3, 1));
    expect(state.result?.scores).toEqual([38, 22]);
    expect(state.result!.scores.reduce((a, b) => a + b, 0)).toBe(60);
  });
});

describe("T13 — lặp nước", () => {
  // X = A đi ô 4 chiều +1 (1 dân) → rơi vào ô 5, gặp ô quan 6. Y = B đi ô 10 chiều +1 (1 dân) → rơi vào 11, gặp ô quan 0.
  // Bốn nước X Y X Y đã đi trước đó (ghi sẵn trong recentSows).
  const X = sow(4, 1);
  const Y = sow(10, 1);
  const base = () =>
    makeState({
      dan: [9, 2, 2, 2, 1, 1, 10, 2, 2, 2, 1, 1],
      captured: [
        { dan: 10, quan: 0 },
        { dan: 5, quan: 0 },
      ],
      moveNo: 4,
      recentSows: [X, Y, X, Y],
    });

  it("6 nước gần nhất dạng X Y X Y X Y → ván kết thúc lap-nuoc, quân trong ô quan không tính", () => {
    const s = base();
    expect(totalPoints(s)).toBe(70);
    const after5 = play(s, X).state;
    expect(after5.status).toBe("playing");
    const { state, events } = play(after5, Y);
    expect(events.at(-1)?.t).toBe("gameOver");
    // A: kho 10 + hàng (2 + 2 + 2 + 0 + 2) = 18. B: kho 5 + hàng (2 + 2 + 2 + 0 + 2) = 13.
    // Ô quan 0 (9 dân + quan) và ô quan 6 (10 dân + quan) không được tính.
    expect(state.result).toEqual({
      winner: 0,
      scores: [18, 13],
      reason: "lap-nuoc",
      detail: [
        { side: 0, dan: 10, quan: 0, rowDan: 8, buDan: 0, total: 18 },
        { side: 1, dan: 5, quan: 0, rowDan: 8, buDan: 0, total: 13 },
      ],
    });
    expect(totalPoints(state)).toBe(70);
  });

  it("nước thứ 6 khác → ván tiếp tục, recentSows chỉ giữ 6 nước gần nhất", () => {
    const after5 = play(base(), X).state;
    const { state } = play(after5, sow(9, 1));
    expect(state.status).toBe("playing");
    expect(state.recentSows).toEqual([X, Y, X, Y, X, sow(9, 1)]);
  });
});

describe("T14 — nước đi không hợp lệ", () => {
  const cases: [string, number, Move][] = [
    ["sai lượt", 1, sow(8, 1)],
    ["ô của đối thủ", 0, sow(8, 1)],
    ["ô quan 0", 0, sow(0, 1)],
    ["ô quan 6", 0, sow(6, -1)],
    ["ô ngoài bàn", 0, sow(12, 1)],
    ["ô âm", 0, sow(-1, 1)],
    ["ô không phải số nguyên", 0, sow(1.5, 1)],
    ["chiều 0", 0, sow(1, 0 as never)],
    ["chiều 2", 0, sow(1, 2 as never)],
    ["kiểu nước lạ", 0, { kind: "khac" } as never],
    ["ghế không tồn tại", 2, sow(1, 1)],
  ];

  it.each(cases)("%s → trả về lỗi, state không đổi", (_name, seat, move) => {
    const s = setup(defaultOptions, [0, 1], 0);
    const snapshot = clone(s);
    expect(applyMove(s, seat, move)).toHaveProperty("error");
    expect(s).toEqual(snapshot);
  });

  it("sai lượt → NOT_YOUR_TURN; ô không hợp lệ → INVALID_MOVE", () => {
    const s = setup(defaultOptions, [0, 1], 0);
    expect(applyMove(s, 1, sow(8, 1))).toEqual({ error: "NOT_YOUR_TURN" });
    expect(applyMove(s, 0, sow(8, 1))).toEqual({ error: "INVALID_MOVE" });
  });

  it("ô trống → lỗi", () => {
    const t = makeState({ dan: [0, 0, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5] });
    const before = clone(t);
    expect(applyMove(t, 0, sow(1, 1))).toHaveProperty("error");
    expect(t).toEqual(before);
  });

  it("ván đã kết thúc → lỗi", () => {
    expect(applyMove(makeState({ status: "finished" }), 0, sow(1, 1))).toHaveProperty("error");
  });

  it("nước hợp lệ không sửa state đầu vào", () => {
    const s = setup(defaultOptions, [0, 1], 0);
    const snapshot = clone(s);
    applyMove(s, 0, sow(3, 1));
    expect(s).toEqual(snapshot);
  });
});

describe("T17/T18 — Lật bàn", () => {
  const opened = () => play(setup({ ...defaultOptions, latBan: true }, [0, 1], 0), sow(3, 1)).state;

  it("T17: sau nước mở đầu, người đi sau lật → đổi controller, lượt giữ nguyên, người mở đầu phải đi tiếp", () => {
    const s = opened();
    expect(s.turn).toBe(1);
    expect(validMoves(s, 1)).toContainEqual(LAT_BAN);
    expect(validMoves(s, 0)).toEqual([]);

    const { state, events } = play(s, LAT_BAN, 1);
    expect(events).toEqual([{ t: "latBan" }]);
    expect(state.controller).toEqual([1, 0]);
    expect(state.turn).toBe(1);
    expect(state.moveNo).toBe(1);
    expect(state.latBanUsed).toBe(true);
    expect(state.recentSows).toEqual([]);
    // Bàn và kho giữ nguyên
    expect(state.dan).toEqual(s.dan);
    expect(state.captured).toEqual(s.captured);

    // Người vừa lật không được đi ngay
    expect(applyMove(state, 1, sow(7, 1))).toEqual({ error: "NOT_YOUR_TURN" });
    // Người mở đầu giờ điều khiển bên B và phải đi
    expect(validMoves(state, 0).length).toBeGreaterThan(0);
    expect(validMoves(state, 0)).not.toContainEqual(LAT_BAN);
    const next = play(state, sow(7, 1), 0).state;
    expect(next.turn).toBe(0);
    expect(next.controller[0]).toBe(1);
  });

  it("đi quân thay vì lật → mất quyền lật bàn", () => {
    const s = play(opened(), sow(7, 1), 1).state;
    expect(validMoves(s, s.controller[s.turn])).not.toContainEqual(LAT_BAN);
  });

  const invalid: [string, () => State, number][] = [
    ["tuỳ chọn tắt", () => play(setup(defaultOptions, [0, 1], 0), sow(3, 1)).state, 1],
    ["trước nước đầu", () => setup({ ...defaultOptions, latBan: true }, [0, 1], 0), 0],
    ["sau nước thứ 2", () => play(opened(), sow(7, 1), 1).state, 0],
    ["lật lần hai", () => play(opened(), LAT_BAN, 1).state, 0],
    ["người mở đầu bấm lật", () => opened(), 0],
  ];

  it.each(invalid)("T18: %s → lỗi, state không đổi", (_name, make, seat) => {
    const s = make();
    const snapshot = clone(s);
    expect(applyMove(s, seat, LAT_BAN)).toHaveProperty("error");
    expect(s).toEqual(snapshot);
    expect(validMoves(s, seat)).not.toContainEqual(LAT_BAN);
  });

  it("T18: người mở đầu bấm lật → NOT_YOUR_TURN", () => {
    expect(applyMove(opened(), 0, LAT_BAN)).toEqual({ error: "NOT_YOUR_TURN" });
  });
});

describe("T19 — ví dụ 11.2 trong luật", () => {
  // A đi ô 3 chiều +1 → rơi vào ô 4. Ô 5 trống, ô quan 6 có 1 quan + 2 dân, ô 7 trống, ô 8 có 4 dân, ô 9 có dân.
  const board = [0, 1, 1, 1, 0, 0, 2, 0, 4, 1, 1, 1];

  it("Cơ bản: ăn ô quan 12 điểm + ăn liên hoàn 4 → 16 điểm", () => {
    const { state } = play(makeState({ dan: board }), sow(3, 1));
    expect(state.captured[0]).toEqual({ dan: 6, quan: 1 });
  });

  it("Quan Già: ô quan chỉ có 2 dân → 0 điểm", () => {
    const { state } = play(makeState({ dan: board, options: { camAnQuanNon: true } }), sow(3, 1));
    expect(state.captured[0]).toEqual({ dan: 0, quan: 0 });
  });
});

describe("T20 — kết thúc ván khi đã lật bàn", () => {
  it("scores và ScoreDetail theo người chơi, lấy kho của bên người đó đang điều khiển", () => {
    // Như T12, nhưng ghế 1 đang điều khiển bên A (đã lật bàn).
    const s = makeState({
      dan: [0, 5, 0, 1, 0, 0, 2, 4, 2, 1, 0, 0],
      quan: [false, true],
      captured: [
        { dan: 20, quan: 1 },
        { dan: 15, quan: 0 },
      ],
      controller: [1, 0],
      latBanUsed: true,
      moveNo: 10,
    });
    expect(applyMove(s, 0, sow(3, 1))).toEqual({ error: "NOT_YOUR_TURN" });
    const { state } = play(s, sow(3, 1), 1);
    expect(state.result).toEqual({
      winner: 1,
      scores: [22, 48],
      reason: "het-quan",
      detail: [
        { side: 1, dan: 15, quan: 0, rowDan: 7, buDan: 0, total: 22 },
        { side: 0, dan: 22, quan: 2, rowDan: 6, buDan: 0, total: 48 },
      ],
    });
  });
});

describe("forfeit — hết giờ / bỏ cuộc", () => {
  it("người bị xử thua thua ngay, điểm là kho hiện tại, không thu quân trên bàn", () => {
    const s = makeState({
      controller: [1, 0],
      captured: [
        { dan: 12, quan: 1 },
        { dan: 3, quan: 0 },
      ],
      dan: [0, 5, 5, 0, 0, 0, 0, 5, 5, 5, 0, 0],
    });
    const r = forfeit(s, 1, "het-gio");
    if ("error" in r) throw new Error(r.error);
    expect(r.events).toEqual([{ t: "gameOver", result: r.state.result }]);
    expect(r.state.status).toBe("finished");
    expect(r.state.result).toEqual({
      winner: 0,
      scores: [3, 22],
      reason: "het-gio",
      detail: [
        { side: 1, dan: 3, quan: 0, rowDan: 0, buDan: 0, total: 3 },
        { side: 0, dan: 12, quan: 1, rowDan: 0, buDan: 0, total: 22 },
      ],
    });
    expect(s.status).toBe("playing");
  });

  it("bỏ cuộc khi không phải lượt mình vẫn được", () => {
    const r = forfeit(setup(defaultOptions, [0, 1], 0), 1, "bo-cuoc");
    if ("error" in r) throw new Error(r.error);
    expect(r.state.result).toMatchObject({ winner: 0, reason: "bo-cuoc" });
  });

  it("ván đã kết thúc hoặc ghế không có trong ván → lỗi", () => {
    expect(forfeit(makeState({ status: "finished" }), 0, "bo-cuoc")).toHaveProperty("error");
    expect(forfeit(makeState({}), 5, "bo-cuoc")).toHaveProperty("error");
  });
});

const FUZZ_MAX_MOVES = 5000;

/** Chọn nước ngẫu nhiên. Khi được lật bàn thì lật một nửa số lần, để fuzz phủ được nhánh này. */
function randomMove(legal: Move[], rng: () => number): Move {
  if (legal.some((m) => m.kind === "latBan") && rng() < 0.5) return LAT_BAN;
  return pickRandom(
    legal.filter((m) => m.kind === "sow"),
    rng,
  )!;
}

/** Bất biến sau mỗi nước: tổng điểm bàn + kho không đổi, không ô hay kho nào âm. */
function checkInvariants(state: State, total: number, where: string): void {
  const negative = state.dan.some((d) => d < 0) || state.captured.some((p) => p.dan < 0 || p.quan < 0);
  if (totalPoints(state) !== total || negative) throw new Error(`${where}: sai bất biến ${JSON.stringify(state)}`);
}

/** Kết quả cuối ván: hết quan thì tổng điểm đủ; người thắng đúng theo lý do kết thúc. */
function checkResult(state: State, total: number, where: string): void {
  const res = state.result!;
  const [a, b] = res.scores as [number, number];
  if (res.reason === "het-quan" && a + b !== total) throw new Error(`${where}: hết quan nhưng tổng điểm ${a + b}`);
  // Bên đến lượt không bù được dân thì người điều khiển bên đó thua; còn lại so điểm
  const expected = res.reason === "khong-du-bu-dan" ? state.controller[1 - state.turn] : a === b ? null : a > b ? 0 : 1;
  if (res.winner !== expected) throw new Error(`${where}: sai người thắng ${JSON.stringify(res)}`);
}

/** Chơi một ván ngẫu nhiên tới hết, kiểm tra bất biến sau mỗi nước. */
function playRandomGame(options: Options, rng: () => number, game: number): { state: State; flips: number } {
  const total = 50 + 2 * options.giaTriQuan;
  let state = setup(options, [0, 1], rng() < 0.5 ? 0 : 1);
  let flips = 0;
  for (let moves = 1; state.status === "playing"; moves++) {
    const where = `ván ${game}, nước ${moves}`;
    const seatId = state.controller[state.turn];
    const legal = validMoves(state, seatId);
    if (legal.length === 0) throw new Error(`${where}: đến lượt mà không có nước đi`);
    if (validMoves(state, 1 - seatId).length !== 0) throw new Error(`${where}: người không đến lượt có nước đi`);
    if (moves > FUZZ_MAX_MOVES) throw new Error(`${where}: quá ${FUZZ_MAX_MOVES} nước, nghi bị treo`);

    const move = randomMove(legal, rng);
    if (move.kind === "latBan") flips++;
    const r = applyMove(state, seatId, move);
    if ("error" in r) throw new Error(`${where}: nước hợp lệ bị từ chối: ${r.error}`);
    state = r.state;
    checkInvariants(state, total, where);
  }
  checkResult(state, total, `ván ${game}`);
  return { state, flips };
}

describe("T16 — fuzz", () => {
  it("10.000 ván ngẫu nhiên (Quan Già, Lật bàn bật ngẫu nhiên): không lỗi, bất biến tổng điểm, mọi ván kết thúc", () => {
    const rng = createRng(20261020);
    const reasons: Record<string, number> = {};
    let flips = 0;

    for (let game = 0; game < 10_000; game++) {
      const options: Options = {
        ...defaultOptions,
        giaTriQuan: game % 2 === 0 ? 10 : 5,
        camAnQuanNon: rng() < 0.5,
        latBan: rng() < 0.5,
      };
      const played = playRandomGame(options, rng, game);
      flips += played.flips;
      const reason = played.state.result!.reason;
      reasons[reason] = (reasons[reason] ?? 0) + 1;
    }

    expect(reasons["het-quan"], JSON.stringify(reasons)).toBeGreaterThan(0);
    expect(reasons["khong-du-bu-dan"], JSON.stringify(reasons)).toBeGreaterThan(0);
    expect(flips).toBeGreaterThan(0);
  }, 120_000);
});

describe("parseOptions — kiểm tra tuỳ chọn chủ phòng gửi lên", () => {
  it("nhận giá trị hợp lệ, giữ nguyên phần không gửi", () => {
    expect(parseOptions({ giaTriQuan: 5, latBan: true, targetScore: 200 }, defaultOptions)).toEqual({
      ...defaultOptions,
      giaTriQuan: 5,
      latBan: true,
      targetScore: 200,
    });
    expect(parseOptions({ thoiGianLuot: null }, defaultOptions).thoiGianLuot).toBeNull();
    expect(parseOptions({ targetScore: null }, defaultOptions).targetScore).toBeNull();
    expect(parseOptions({ targetScore: 500 }, defaultOptions).targetScore).toBe(500);
    expect(parseOptions({ targetScore: 70 }, defaultOptions).targetScore).toBe(70);
  });

  it("bỏ qua giá trị sai kiểu, sai miền, và khoá lạ", () => {
    const raw = { giaTriQuan: 7, camAnQuanNon: "có", latBan: 1, thoiGianLuot: 45, targetScore: 999, hack: true };
    expect(parseOptions(raw, defaultOptions)).toEqual(defaultOptions);
    expect(parseOptions("rác", defaultOptions)).toEqual(defaultOptions);
    expect(parseOptions(null, defaultOptions)).toEqual(defaultOptions);
  });
});
