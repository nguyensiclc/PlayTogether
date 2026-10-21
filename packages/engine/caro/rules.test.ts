// Test K1–K23 (docs/caro/04-ke-hoach-prototype.md mục 4). Thế cờ được dựng thẳng, trừ các test theo lượt.

import { describe, expect, it } from "vitest";
import { createRng, pickRandom, type SeatId } from "../game-module.ts";
import {
  applyMove,
  caro,
  defaultOptions,
  forfeit,
  hasBlockedLine,
  parseMove,
  parseOptions,
  result,
  setup,
  validMoves,
} from "./rules.ts";
import type { Mark, Options, State } from "./types.ts";

type Stone = readonly [x: number, y: number];

interface Layout {
  size?: 15 | 19;
  xs?: Stone[];
  os?: Stone[];
  options?: Partial<Options>;
  players?: [SeatId, SeatId];
}

/** Dựng state tuỳ ý. Đến lượt X nếu hai bên đã đặt số quân bằng nhau, ngược lại đến lượt O. */
function makeState(l: Layout = {}): State {
  const size = l.size ?? 15;
  const cells: (Mark | null)[] = new Array(size * size).fill(null);
  for (const [x, y] of l.xs ?? []) cells[y * size + x] = 0;
  for (const [x, y] of l.os ?? []) cells[y * size + x] = 1;
  const nx = l.xs?.length ?? 0;
  const no = l.os?.length ?? 0;
  return {
    size,
    cells,
    players: l.players ?? [0, 1],
    turn: nx > no ? 1 : 0,
    moveNo: nx + no,
    nhuong: false,
    last: null,
    winLine: null,
    options: { ...defaultOptions, kichThuoc: size, ...l.options },
    status: "playing",
    result: null,
  };
}

/** n quân O đặt cách nhau, nằm xa vùng đang thử (hàng y), không tạo chuỗi và không chặn ai */
const spread = (n: number, y = 12): Stone[] => Array.from({ length: n }, (_, k) => [2 * k, y] as const);

const run = (from: Stone, step: Stone, n: number): Stone[] =>
  Array.from({ length: n }, (_, k) => [from[0] + step[0] * k, from[1] + step[1] * k] as const);

const idx = (x: number, y: number, size = 15): number => y * size + x;
const clone = (s: State): State => JSON.parse(JSON.stringify(s)) as State;

/** Đi một nước bằng ghế đang đến lượt */
function play(s: State, x: number, y: number) {
  const r = applyMove(s, s.players[s.turn], { x, y });
  if ("error" in r) throw new Error(`nước đi bị từ chối: ${r.error}`);
  return r;
}

/** Quân vừa đặt thắng: kết thúc `nam-quan`, đúng người, đúng các ô, đúng thứ tự event */
function expectWin(r: ReturnType<typeof play>, mark: Mark, line: Stone[], size = 15): void {
  // Hai chuỗi giao nhau thì ô chung chỉ tính một lần
  const expected = [...new Set(line.map(([x, y]) => idx(x, y, size)))].sort((a, b) => a - b);
  expect(r.state.status).toBe("finished");
  expect(r.state.result?.reason).toBe("nam-quan");
  expect(r.state.result?.winner).toBe(r.state.players[mark]);
  expect(r.state.winLine).toEqual(expected);
  expect(r.events.map((e) => e.t)).toEqual(["place", "win", "gameOver"]);
}

/** Bộ kiểm tra thắng độc lập với engine: quét cả bàn, tìm đầu mỗi chuỗi rồi đếm tới (engine thì đi lùi từ quân vừa đặt) */
function bruteHasWin(cells: readonly (Mark | null)[], size: number, chanHaiDau: boolean): boolean {
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ] as const;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (cells[y * size + x] == null) continue;
      if (dirs.some(([dx, dy]) => bruteRunWins(cells, size, chanHaiDau, x, y, dx, dy))) return true;
    }
  }
  return false;
}

/** Ô (x, y) là đầu của một chuỗi theo hướng (dx, dy) và chuỗi đó thắng */
function bruteRunWins(
  cells: readonly (Mark | null)[],
  size: number,
  chanHaiDau: boolean,
  x: number,
  y: number,
  dx: number,
  dy: number,
): boolean {
  const inside = (cx: number, cy: number) => cx >= 0 && cy >= 0 && cx < size && cy < size;
  const mark = cells[y * size + x];
  const beforeInside = inside(x - dx, y - dy);
  if (beforeInside && cells[(y - dy) * size + (x - dx)] === mark) return false;
  let len = 0;
  let cx = x;
  let cy = y;
  while (inside(cx, cy) && cells[cy * size + cx] === mark) {
    len++;
    cx += dx;
    cy += dy;
  }
  const blockedBefore = !beforeInside || cells[(y - dy) * size + (x - dx)] !== null;
  const blockedAfter = !inside(cx, cy) || cells[cy * size + cx] !== null;
  return len >= 5 && !(chanHaiDau && blockedBefore && blockedAfter);
}

describe("K1 — setup", () => {
  it("bàn 15 × 15 rỗng, X do người đi trước cầm, đến lượt X", () => {
    const s = setup(defaultOptions, [0, 1], 0);
    expect(s.size).toBe(15);
    expect(s.cells).toHaveLength(225);
    expect(s.cells.every((c) => c === null)).toBe(true);
    expect(s.players).toEqual([0, 1]);
    expect(s).toMatchObject({ turn: 0, moveNo: 0, last: null, winLine: null, status: "playing", result: null });
    expect(s.options).toEqual(defaultOptions);
  });

  it("người đi trước là ghế 1 thì cầm X; bàn 19 × 19 có 361 ô", () => {
    const s = setup({ ...defaultOptions, kichThuoc: 19 }, [0, 1], 1);
    expect(s.players).toEqual([1, 0]);
    expect(s.cells).toHaveLength(361);
    expect(s.size).toBe(19);
  });

  it("danh sách ghế không hợp lệ thì báo lỗi", () => {
    expect(() => setup(defaultOptions, [0, 1], 5)).toThrow();
    expect(() => setup(defaultOptions, [0, 1, 2], 0)).toThrow();
    expect(() => setup(defaultOptions, [0, 0], 0)).toThrow();
  });

  it("tuỳ chọn mặc định (C1, C2): 15 × 15, Chặn 2 đầu tắt", () => {
    expect(defaultOptions).toMatchObject({ kichThuoc: 15, chanHaiDau: false });
  });
});

describe("K2 — đặt quân", () => {
  it("quân vào đúng ô, ghi nước vừa đi, đổi lượt, không sửa state đầu vào", () => {
    const s = setup(defaultOptions, [0, 1], 0);
    const before = clone(s);
    const r = play(s, 7, 7);
    expect(r.state.cells[idx(7, 7)]).toBe(0);
    expect(r.state).toMatchObject({ last: idx(7, 7), moveNo: 1, turn: 1, status: "playing", winLine: null });
    expect(r.events).toEqual([{ t: "place", x: 7, y: 7, by: 0 }]);
    expect(s).toEqual(before);
    expect(play(r.state, 8, 7).state.cells[idx(8, 7)]).toBe(1);
  });

  it("validMoves: mọi ô trống cho người đang đến lượt, rỗng cho người kia", () => {
    const s = makeState({ xs: [[3, 3]], os: [[4, 4]] });
    expect(validMoves(s, 0)).toHaveLength(225 - 2);
    expect(validMoves(s, 0)).not.toContainEqual({ x: 3, y: 3 });
    expect(validMoves(s, 1)).toEqual([]);
    // 225 ô trống và nước nhường lượt (còn quyền nhường ở nước đầu)
    expect(validMoves(setup(defaultOptions, [0, 1], 0), 0)).toHaveLength(226);
  });
});

describe("K3 — nước đi không hợp lệ", () => {
  const cases: [string, number, number, number, string][] = [
    ["ô đã có quân", 0, 7, 7, "INVALID_MOVE"],
    ["x = -1", 0, -1, 3, "INVALID_MOVE"],
    ["x = size", 0, 15, 3, "INVALID_MOVE"],
    ["y = size", 0, 3, 15, "INVALID_MOVE"],
    ["y = -1", 0, 3, -1, "INVALID_MOVE"],
    ["số lẻ", 0, 1.5, 2, "INVALID_MOVE"],
    ["NaN", 0, Number.NaN, 2, "INVALID_MOVE"],
    ["sai lượt", 1, 3, 3, "NOT_YOUR_TURN"],
    ["ghế không tồn tại", 5, 3, 3, "NOT_YOUR_TURN"],
  ];

  it.each(cases)("%s → lỗi, state không đổi", (_name, seat, x, y, code) => {
    const s = makeState({ xs: [[7, 7]], os: [[8, 8]] });
    s.turn = 0;
    const before = clone(s);
    expect(applyMove(s, seat, { x, y })).toEqual({ error: code });
    expect(s).toEqual(before);
  });

  it("ván đã kết thúc thì không đặt thêm được", () => {
    const s = makeState({ xs: run([3, 7], [1, 0], 4), os: spread(4) });
    const done = play(s, 7, 7).state;
    expect(applyMove(done, done.players[done.turn], { x: 0, y: 0 })).toEqual({ error: "INVALID_MOVE" });
  });
});

describe("K4–K6 — thắng theo 4 hướng (mặc định, đặt quân cuối ở đầu / giữa / cuối chuỗi)", () => {
  it("K4 hàng ngang: quân cuối ở đầu trái, đầu phải, và giữa", () => {
    const row = (xs: number[]) => xs.map((x) => [x, 7] as const);
    for (const [have, last] of [
      [[4, 5, 6, 7], 3],
      [[3, 4, 5, 6], 7],
      [[3, 4, 6, 7], 5],
    ] as const) {
      const r = play(makeState({ xs: row([...have]), os: spread(4) }), last, 7);
      expectWin(r, 0, row([3, 4, 5, 6, 7]));
    }
  });

  it("K5 hàng dọc", () => {
    const r = play(makeState({ xs: run([5, 3], [0, 1], 4), os: spread(4) }), 5, 7);
    expectWin(r, 0, run([5, 3], [0, 1], 5));
  });

  it("K6 chéo \\ và chéo /", () => {
    expectWin(play(makeState({ xs: run([3, 3], [1, 1], 4), os: spread(4) }), 7, 7), 0, run([3, 3], [1, 1], 5));
    expectWin(play(makeState({ xs: run([7, 3], [-1, 1], 4), os: spread(4) }), 3, 7), 0, run([7, 3], [-1, 1], 5));
  });

  it("O cũng thắng được (đến lượt O)", () => {
    const r = play(makeState({ xs: [...spread(4, 13), [0, 11]], os: run([3, 7], [1, 0], 4) }), 7, 7);
    expectWin(r, 1, run([3, 7], [1, 0], 5));
  });
});

describe("K7–K10 — chưa thắng và chuỗi dài", () => {
  it("K7 chỉ 4 quân liền thì chưa thắng", () => {
    const r = play(makeState({ xs: run([3, 7], [1, 0], 3), os: spread(3) }), 6, 7);
    expect(r.state.status).toBe("playing");
    expect(r.state.winLine).toBeNull();
    expect(r.state.turn).toBe(1);
    expect(r.events.map((e) => e.t)).toEqual(["place"]);
  });

  it("K8 chuỗi bị ngắt bởi ô trống hoặc quân đối thủ thì không tính liền", () => {
    const gap = play(
      makeState({
        xs: [
          [3, 7],
          [4, 7],
          [6, 7],
          [7, 7],
        ],
        os: spread(4),
      }),
      8,
      7,
    );
    expect(gap.state.status).toBe("playing");
    const blocked = play(
      makeState({
        xs: [
          [3, 7],
          [4, 7],
          [6, 7],
          [7, 7],
        ],
        os: [[5, 7], ...spread(3)],
      }),
      8,
      7,
    );
    expect(blocked.state.status).toBe("playing");
  });

  it("K9 chuỗi 6 và 7 quân vẫn thắng (Chặn 2 đầu tắt), winLine có đủ", () => {
    const six = play(makeState({ xs: [...run([3, 7], [1, 0], 3), ...run([7, 7], [1, 0], 2)], os: spread(5) }), 6, 7);
    expectWin(six, 0, run([3, 7], [1, 0], 6));
    const seven = play(makeState({ xs: [...run([3, 7], [1, 0], 3), ...run([7, 7], [1, 0], 3)], os: spread(6) }), 6, 7);
    expectWin(seven, 0, run([3, 7], [1, 0], 7));
  });

  it("K10 một nước tạo hai chuỗi 5 cùng lúc: thắng và đánh dấu cả hai", () => {
    const xs = [
      [3, 7],
      [4, 7],
      [6, 7],
      [7, 7],
      [5, 3],
      [5, 4],
      [5, 5],
      [5, 6],
    ] as const;
    const r = play(makeState({ xs: [...xs], os: spread(8) }), 5, 7);
    expectWin(r, 0, [...run([3, 7], [1, 0], 5), ...run([5, 3], [0, 1], 5)]);
    expect(r.state.winLine).toHaveLength(9);
  });
});

describe("K11 — chuỗi sát mép bàn", () => {
  for (const size of [15, 19] as const) {
    const m = size - 1;
    const edges: [string, Stone, Stone, Stone][] = [
      ["hàng trên", [0, 0], [1, 0], [4, 0]],
      ["hàng dưới", [m - 4, m], [1, 0], [m, m]],
      ["cột trái", [0, 0], [0, 1], [0, 4]],
      ["cột phải", [m, m - 4], [0, 1], [m, m]],
      ["chéo \\ ở góc trên trái", [0, 0], [1, 1], [4, 4]],
      ["chéo / ở góc trên phải", [m, 0], [-1, 1], [m - 4, 4]],
    ];
    it.each(edges)(`bàn ${size} × ${size}: %s`, (_name, from, step, last) => {
      const xs = run(from, step, 5).filter(([x, y]) => x !== last[0] || y !== last[1]);
      const r = play(
        makeState({
          size,
          xs,
          os: [
            [7, 9],
            [9, 9],
            [11, 9],
            [13, 9],
          ],
        }),
        last[0],
        last[1],
      );
      expectWin(r, 0, run(from, step, 5), size);
    });
  }
});

describe("K12–K15 — Chặn 2 đầu", () => {
  const chan = { chanHaiDau: true };
  const five = run([4, 7], [1, 0], 4);

  it("K12 5 quân bị chặn cả hai đầu bằng quân đối thủ: chưa thắng (tắt thì thắng)", () => {
    const layout = {
      xs: five,
      os: [
        [3, 7],
        [9, 7],
        [0, 0],
        [2, 0],
      ] as Stone[],
    };
    const blocked = play(makeState({ ...layout, options: chan }), 8, 7);
    expect(blocked.state.status).toBe("playing");
    expect(blocked.state.winLine).toBeNull();
    expectWin(play(makeState(layout), 8, 7), 0, run([4, 7], [1, 0], 5));
  });

  it("K12b hasBlockedLine báo chuỗi 5 bị chặn cả hai đầu để giao diện giải thích; tắt Chặn 2 đầu thì luôn false", () => {
    const layout = {
      xs: five,
      os: [
        [3, 7],
        [9, 7],
        [0, 0],
        [2, 0],
      ] as Stone[],
    };
    const after = play(makeState({ ...layout, options: chan }), 8, 7).state;
    expect(hasBlockedLine(after, 8, 7)).toBe(true);
    expect(hasBlockedLine(after, 4, 7)).toBe(true);
    const open = play(makeState({ xs: five, os: [[3, 7], ...spread(3)], options: chan }), 8, 7).state;
    expect(hasBlockedLine(open, 8, 7)).toBe(false);
    expect(hasBlockedLine(play(makeState(layout), 8, 7).state, 8, 7)).toBe(false);
  });

  it("K13 một đầu bị chặn, một đầu trống: thắng", () => {
    const r = play(makeState({ xs: five, os: [[3, 7], ...spread(3)], options: chan }), 8, 7);
    expectWin(r, 0, run([4, 7], [1, 0], 5));
  });

  it("K14 sát mép bàn, đầu kia bị chặn: chưa thắng; đầu kia trống: thắng (C3)", () => {
    const xs = run([0, 7], [1, 0], 4);
    const blocked = play(makeState({ xs, os: [[5, 7], ...spread(3)], options: chan }), 4, 7);
    expect(blocked.state.status).toBe("playing");
    expectWin(play(makeState({ xs, os: spread(4), options: chan }), 4, 7), 0, run([0, 7], [1, 0], 5));
  });

  it("K15 chuỗi 6 quân: bị chặn một đầu thì thắng, bị chặn cả hai đầu thì chưa (C4)", () => {
    const xs = [...run([4, 7], [1, 0], 3), ...run([8, 7], [1, 0], 2)];
    const oneEnd = play(makeState({ xs, os: [[3, 7], ...spread(4)], options: chan }), 7, 7);
    expectWin(oneEnd, 0, run([4, 7], [1, 0], 6));
    const bothEnds = play(makeState({ xs, os: [[3, 7], [10, 7], ...spread(3)], options: chan }), 7, 7);
    expect(bothEnds.state.status).toBe("playing");
  });

  it("chuỗi ngang bị chặn cả hai đầu không tính, nhưng chuỗi dọc hở đầu cùng nước đó vẫn thắng: winLine chỉ có chuỗi dọc", () => {
    const xs = [...five, ...run([8, 3], [0, 1], 4)];
    const r = play(makeState({ xs, os: [[3, 7], [9, 7], ...spread(6)], options: chan }), 8, 7);
    expectWin(r, 0, run([8, 3], [0, 1], 5));
  });
});

/** Màu theo hoa văn (⌊x/2⌋ + y) mod 2: không có chỗ nào quá 2 quân liền theo 4 hướng, nên không ai thắng */
const patternMark = (x: number, y: number): Mark => ((Math.floor(x / 2) + y) % 2 === 0 ? 0 : 1);

describe("K24–K27 — nhường lượt (luật mục 3.1)", () => {
  const fresh = (): State => setup(defaultOptions, [0, 1], 0);

  it("K24 người đi trước nhường: đối thủ cầm X và đi trước, bàn vẫn trống", () => {
    const s = fresh();
    const r = applyMove(s, 0, { nhuong: true });
    if ("error" in r) throw new Error(r.error);
    expect(r.state.players).toEqual([1, 0]);
    expect(r.state.turn).toBe(0);
    expect(r.state.moveNo).toBe(0);
    expect(r.state.nhuong).toBe(true);
    expect(r.state.cells.every((c) => c === null)).toBe(true);
    expect(r.events).toEqual([{ t: "nhuong", from: 0, to: 1 }]);
    // Ghế 0 giờ cầm O: ghế 1 mới được đặt quân, ghế 0 không
    expect(applyMove(r.state, 0, { x: 7, y: 7 })).toEqual({ error: "NOT_YOUR_TURN" });
    const next = play(r.state, 7, 7);
    expect(next.state.cells[idx(7, 7)]).toBe(0);
    expect(next.state.players[0]).toBe(1);
  });

  it("K25 chỉ được nhường một lần: người nhận không nhường lại được", () => {
    const first = applyMove(fresh(), 0, { nhuong: true });
    if ("error" in first) throw new Error(first.error);
    expect(applyMove(first.state, 1, { nhuong: true })).toEqual({ error: "INVALID_MOVE" });
    expect(validMoves(first.state, 1).some((m) => "nhuong" in m)).toBe(false);
  });

  it("K26 hết quyền nhường khi đã có quân trên bàn; người đi sau không nhường được", () => {
    const s = fresh();
    expect(applyMove(s, 1, { nhuong: true })).toEqual({ error: "NOT_YOUR_TURN" });
    expect(validMoves(s, 0).some((m) => "nhuong" in m)).toBe(true);
    const after = play(s, 7, 7).state;
    expect(applyMove(after, 1, { nhuong: true })).toEqual({ error: "INVALID_MOVE" });
    expect(validMoves(after, 1).some((m) => "nhuong" in m)).toBe(false);
  });

  it("K27 parseMove nhận {nhuong:true}; kết quả ván sau nhường ghi đúng ghế cầm quân", () => {
    expect(parseMove({ nhuong: true })).toEqual({ nhuong: true });
    expect(parseMove({ nhuong: false })).toBeNull();
    const yielded = applyMove(fresh(), 0, { nhuong: true });
    if ("error" in yielded) throw new Error(yielded.error);
    // Ghế 1 (X) thắng 5 quân ngang, ghế 0 (O) đi xen kẽ ở hàng khác
    let s = yielded.state;
    const xs = [3, 4, 5, 6, 7];
    for (let k = 0; k < 5; k++) {
      s = play(s, xs[k] ?? 0, 7).state;
      if (k < 4) s = play(s, xs[k] ?? 0, 9).state;
    }
    expect(s.result?.winner).toBe(1);
    expect(s.result?.detail).toMatchObject({ marks: [1, 0] });
  });
});

describe("K16–K18 — bàn đầy và kết thúc ván", () => {
  it("K16 bàn đầy mà không ai thắng: hoà, mỗi người 0,5 điểm", () => {
    const xs: Stone[] = [];
    const os: Stone[] = [];
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 15; x++) (patternMark(x, y) === 0 ? xs : os).push([x, y]);
    }
    // X có 113 ô, O có 112 ô: đi xen kẽ đúng luật (X, O, X, O...), nước cuối (thứ 225) là của X
    expect([xs.length, os.length]).toEqual([113, 112]);
    const order = xs.flatMap((stone, k) => (os[k] ? [stone, os[k]] : [stone]));
    let s = setup(defaultOptions, [0, 1], 0);
    let last: ReturnType<typeof play> | null = null;
    for (const [x, y] of order) {
      expect(s.status).toBe("playing");
      last = play(s, x, y);
      s = last.state;
    }
    expect(s.status).toBe("finished");
    expect(s.moveNo).toBe(225);
    expect(s.winLine).toBeNull();
    expect(s.result).toMatchObject({ winner: null, scores: [0.5, 0.5], reason: "het-ban" });
    expect(last?.events.map((e) => e.t)).toEqual(["place", "draw", "gameOver"]);
  });

  it("K17 thắng ở nước cuối khi bàn vừa đầy: thắng, không phải hoà", () => {
    const stones: [number, number, Mark][] = [];
    for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) stones.push([x, y, patternMark(x, y)]);
    // Sửa thế để X có 4 quân (3..6, 7), ô cuối (7, 7) hoàn thành 5 quân
    const override = new Map<string, Mark>([
      ["2,7", 1],
      ["4,7", 0],
      ["5,7", 0],
    ]);
    const xs: Stone[] = [];
    const os: Stone[] = [];
    for (const [x, y, m] of stones) {
      if (x === 7 && y === 7) continue;
      const mark = override.get(`${x},${y}`) ?? m;
      (mark === 0 ? xs : os).push([x, y]);
    }
    const s = makeState({ xs, os });
    s.turn = 0;
    expect(s.moveNo).toBe(224);
    expect(bruteHasWin(s.cells, 15, false)).toBe(false);
    const r = play(s, 7, 7);
    expect(r.state.moveNo).toBe(225);
    expect(r.state.result?.reason).toBe("nam-quan");
    expect(r.state.result?.winner).toBe(0);
    expect(r.events.map((e) => e.t)).toEqual(["place", "win", "gameOver"]);
  });

  it("K18 sau khi kết thúc: validMoves rỗng cho cả hai ghế, result trả đúng kết quả", () => {
    const done = play(makeState({ xs: run([3, 7], [1, 0], 4), os: spread(4) }), 7, 7).state;
    expect(validMoves(done, 0)).toEqual([]);
    expect(validMoves(done, 1)).toEqual([]);
    expect(result(done)).toBe(done.result);
    expect(result(setup(defaultOptions, [0, 1], 0))).toBeNull();
  });
});

describe("K19 — forfeit", () => {
  it.each(["bo-cuoc", "het-gio"] as const)("%s: đối thủ thắng, ghế rời thua, bàn giữ nguyên", (reason) => {
    const s = makeState({ xs: [[7, 7]], os: [[8, 8]] });
    s.turn = 0;
    const r = forfeit(s, 0, reason);
    if ("error" in r) throw new Error(r.error);
    expect(r.state.status).toBe("finished");
    expect(r.state.result).toMatchObject({ winner: 1, scores: [0, 1], reason });
    expect(r.state.cells).toEqual(s.cells);
    expect(r.events.map((e) => e.t)).toEqual(["gameOver"]);
    expect(s.status).toBe("playing");
  });

  it("người không đến lượt cũng rời được; ván đã kết thúc hoặc ghế lạ thì báo lỗi", () => {
    const s = setup(defaultOptions, [0, 1], 0);
    expect(forfeit(s, 1, "bo-cuoc")).toHaveProperty("state");
    expect(forfeit(s, 7, "bo-cuoc")).toEqual({ error: "INVALID_MOVE" });
    const done = play(makeState({ xs: run([3, 7], [1, 0], 4), os: spread(4) }), 7, 7).state;
    expect(forfeit(done, 0, "bo-cuoc")).toEqual({ error: "INVALID_MOVE" });
  });
});

describe("K20–K21 — dữ liệu từ ngoài", () => {
  it("K20 parseOptions nhận giá trị hợp lệ, bỏ qua sai kiểu, sai miền, khoá lạ", () => {
    expect(parseOptions({ kichThuoc: 19, chanHaiDau: true, thoiGianLuot: null }, defaultOptions)).toEqual({
      kichThuoc: 19,
      chanHaiDau: true,
      thoiGianLuot: null,
    });
    expect(parseOptions({ kichThuoc: 17, chanHaiDau: "có", thoiGianLuot: 45, hack: 1 }, defaultOptions)).toEqual(
      defaultOptions,
    );
    expect(parseOptions("rác", defaultOptions)).toEqual(defaultOptions);
    expect(parseOptions(null, defaultOptions)).toEqual(defaultOptions);
    expect(caro.parseOptions({ chanHaiDau: true }, defaultOptions).chanHaiDau).toBe(true);
  });

  it("K21 parseMove chỉ nhận { x, y } là số nguyên", () => {
    expect(parseMove({ x: 3, y: 4 })).toEqual({ x: 3, y: 4 });
    expect(parseMove({ x: 3, y: 4, thua: 1 })).toEqual({ x: 3, y: 4 });
    for (const bad of [
      null,
      undefined,
      "3,4",
      7,
      [],
      { x: 3 },
      { y: 4 },
      { x: "3", y: 4 },
      { x: 1.5, y: 2 },
      { x: Number.NaN, y: 1 },
    ]) {
      expect(parseMove(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe("K22 — điểm theo ghế", () => {
  it("người đi trước ngồi ghế 1: scores, winner và marks theo đúng ghế", () => {
    const s = makeState({ xs: run([3, 7], [1, 0], 4), os: spread(4), players: [1, 0] });
    const r = play(s, 7, 7);
    expect(r.state.result).toMatchObject({ winner: 1, scores: [0, 1], reason: "nam-quan" });
    expect(r.state.result?.detail).toEqual({ moves: 9, line: r.state.winLine, marks: [1, 0] });
  });

  it("hoà: detail không có chuỗi thắng", () => {
    const forfeited = forfeit(setup(defaultOptions, [0, 1], 0), 1, "bo-cuoc");
    if ("error" in forfeited) throw new Error(forfeited.error);
    expect(forfeited.state.result?.detail).toEqual({ moves: 0, line: null, marks: [0, 1] });
  });
});

describe("K23 — fuzz", () => {
  const MAX_GAMES = 10_000;
  /** Quét toàn bàn bằng bộ kiểm tra độc lập sau MỖI nước cho chừng này ván đầu; các ván sau chỉ kiểm tra khi kết thúc */
  const SCAN_EVERY_MOVE = 2_000;

  /** Bất biến sau mỗi nước (không cần quét bàn) */
  function checkInvariants(s: State, where: string): void {
    const filled = s.cells.filter((c) => c !== null).length;
    const xs = s.cells.filter((c) => c === 0).length;
    const os = s.cells.filter((c) => c === 1).length;
    if (filled !== s.moveNo) throw new Error(`${where}: moveNo ${s.moveNo} khác số quân ${filled}`);
    if (xs - os !== 0 && xs - os !== 1) throw new Error(`${where}: số quân X − O = ${xs - os}`);
    if (s.status === "playing" && s.turn !== s.moveNo % 2) throw new Error(`${where}: sai lượt`);
    if (s.cells.length !== s.size * s.size) throw new Error(`${where}: sai kích thước`);
  }

  /** Đi một nước ngẫu nhiên của người đang đến lượt */
  function randomStep(s: State, rng: () => number, where: string): State {
    const seat = s.players[s.turn];
    const move = pickRandom(validMoves(s, seat), rng);
    if (!move) throw new Error(`${where}: đến lượt mà không có nước đi`);
    const r = applyMove(s, seat, move);
    if ("error" in r) throw new Error(`${where}: nước hợp lệ bị từ chối: ${r.error}`);
    return r.state;
  }

  /** Kết quả cuối ván phải khớp bộ kiểm tra độc lập, và chuỗi thắng phải chứa quân vừa đặt */
  function checkFinal(s: State, game: number): string {
    const won = s.result?.reason === "nam-quan";
    if (bruteHasWin(s.cells, s.size, s.options.chanHaiDau) !== won) {
      throw new Error(`ván ${game}: kết quả lệch bộ kiểm tra độc lập`);
    }
    if (won && !s.winLine?.includes(s.last ?? -1)) throw new Error(`ván ${game}: winLine không chứa quân vừa đặt`);
    return s.result?.reason ?? "?";
  }

  /** Chơi một ván ngẫu nhiên tới hết; trả về lý do kết thúc */
  function playRandomGame(options: Options, rng: () => number, scanEveryMove: boolean, game: number): string {
    let s = setup(options, [0, 1], rng() < 0.5 ? 0 : 1);
    while (s.status === "playing") {
      const where = `ván ${game}, nước ${s.moveNo + 1}`;
      s = randomStep(s, rng, where);
      checkInvariants(s, where);
      if (scanEveryMove && s.status === "playing" && bruteHasWin(s.cells, s.size, options.chanHaiDau)) {
        throw new Error(`${where}: bàn có chuỗi thắng mà ván chưa kết thúc`);
      }
    }
    return checkFinal(s, game);
  }

  it("10.000 ván ngẫu nhiên (cả hai cỡ bàn, Chặn 2 đầu bật tắt): bất biến luôn đúng, mọi ván kết thúc, kết quả khớp bộ kiểm tra độc lập", () => {
    const rng = createRng(20261021);
    const reasons: Record<string, number> = {};
    for (let game = 0; game < MAX_GAMES; game++) {
      const options: Options = {
        ...defaultOptions,
        kichThuoc: game % 4 === 0 ? 19 : 15,
        chanHaiDau: rng() < 0.5,
      };
      const reason = playRandomGame(options, rng, game < SCAN_EVERY_MOVE, game);
      reasons[reason] = (reasons[reason] ?? 0) + 1;
    }
    expect(reasons["nam-quan"], JSON.stringify(reasons)).toBeGreaterThan(MAX_GAMES * 0.9);
  }, 300_000);
});
