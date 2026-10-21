// Test E1–E16 (docs/co-tuong/04-ke-hoach-prototype.md mục 4). Thế cờ được dựng thẳng, trừ các test theo lượt.

import { describe, expect, it } from "vitest";
import { createRng, pickRandom } from "../game-module.ts";
import { pseudoMoves } from "./moves.ts";
import {
  applyMove,
  coTuong,
  defaultOptions,
  forfeit,
  isInCheck,
  parseMove,
  parseOptions,
  setup,
  validMoves,
} from "./rules.ts";
import type { Kind, Move, Piece, Side, State } from "./types.ts";

const RED = 0;
const BLACK = 1;
const idx = (x: number, y: number): number => y * 9 + x;
const xy = (i: number): string => `${i % 9},${Math.floor(i / 9)}`;

type Placement = readonly [kind: Kind, side: Side, x: number, y: number];

/** Dựng state tuỳ ý từ danh sách quân; ghế 0 cầm Đỏ, ghế 1 cầm Đen */
function makeState(pieces: Placement[], turn: Side = RED): State {
  const cells: (Piece | null)[] = new Array(90).fill(null);
  for (const [kind, side, x, y] of pieces) cells[idx(x, y)] = { kind, side };
  return {
    cells,
    players: [0, 1],
    turn,
    moveNo: 0,
    last: null,
    captured: [],
    inCheck: isInCheck(cells, turn),
    history: [],
    options: { ...defaultOptions },
    status: "playing",
    result: null,
  };
}

const start = (): State => setup(defaultOptions, [0, 1], 0);

/** Các ô đến (dạng "x,y", đã sắp xếp) của quân tại (x, y), theo nước hợp lệ */
function targets(s: State, x: number, y: number): string[] {
  const seat = s.players[s.turn];
  return validMoves(s, seat)
    .filter((m) => m.from === idx(x, y))
    .map((m) => xy(m.to))
    .sort();
}

const sorted = (list: string[]): string[] => [...list].sort();

/** Đi một nước và trả state mới; ném lỗi nếu bị từ chối */
function play(s: State, from: [number, number], to: [number, number]): State {
  const r = applyMove(s, s.players[s.turn], { from: idx(...from), to: idx(...to) });
  if ("error" in r) throw new Error(`Nước bị từ chối: ${r.error}`);
  return r.state;
}

// Hai tướng đặt lệch cột để không đối mặt: Đỏ (5,9), Đen (3,0)
const KINGS: Placement[] = [
  ["tuong", RED, 5, 9],
  ["tuong", BLACK, 3, 0],
];

describe("E1 — thế xuất phát", () => {
  it("32 quân đúng vị trí, Đỏ đi trước, ghế đầu cầm Đỏ", () => {
    const s = setup(defaultOptions, [3, 7], 7);
    expect(s.players).toEqual([7, 3]);
    expect(s.turn).toBe(RED);
    expect(s.cells.filter((c) => c !== null)).toHaveLength(32);
    expect(s.cells[idx(4, 9)]).toEqual({ kind: "tuong", side: RED });
    expect(s.cells[idx(4, 0)]).toEqual({ kind: "tuong", side: BLACK });
    expect(s.cells[idx(1, 7)]).toEqual({ kind: "phao", side: RED });
    expect(s.cells[idx(7, 2)]).toEqual({ kind: "phao", side: BLACK });
    expect(s.cells[idx(2, 6)]).toEqual({ kind: "tot", side: RED });
    expect(s.cells[idx(6, 3)]).toEqual({ kind: "tot", side: BLACK });
    expect(s.history).toHaveLength(1);
  });

  it("Đỏ có đúng 44 nước ở thế xuất phát (số liệu chuẩn của cờ tướng)", () => {
    expect(validMoves(start(), 0)).toHaveLength(44);
  });
});

describe("E2 — Tướng và Sĩ", () => {
  it("Tướng đi 1 bước ngang dọc trong cung", () => {
    const s = makeState([
      ["tuong", RED, 4, 9],
      ["tuong", BLACK, 4, 0],
      ["tot", RED, 4, 5], // chắn giữa hai tướng
    ]);
    expect(targets(s, 4, 9)).toEqual(sorted(["3,9", "5,9", "4,8"]));
  });

  it("Tướng không ra khỏi cung", () => {
    const s = makeState([
      ["tuong", RED, 3, 7],
      ["tuong", BLACK, 5, 0],
    ]);
    expect(targets(s, 3, 7)).toEqual(sorted(["4,7", "3,8"]));
  });

  it("Sĩ chỉ đi chéo 1 bước trong cung, không đè quân mình", () => {
    const s = makeState([...KINGS, ["si", RED, 4, 8]]);
    expect(targets(s, 4, 8)).toEqual(sorted(["3,7", "5,7", "3,9"]));
  });

  it("Sĩ ở góc cung chỉ còn một nước", () => {
    const s = makeState([...KINGS, ["si", RED, 3, 9]]);
    expect(targets(s, 3, 9)).toEqual(["4,8"]);
  });
});

describe("E3 — Tượng", () => {
  it("Đi chéo 2 ô", () => {
    const s = makeState([...KINGS, ["voi", RED, 4, 7]]);
    expect(targets(s, 4, 7)).toEqual(sorted(["2,9", "6,9", "2,5", "6,5"]));
  });

  it("Bị cản mắt tượng thì mất nước đó", () => {
    const s = makeState([...KINGS, ["voi", RED, 4, 7], ["tot", BLACK, 3, 6]]);
    expect(targets(s, 4, 7)).toEqual(sorted(["2,9", "6,9", "6,5"]));
  });

  it("Không qua sông", () => {
    const s = makeState([...KINGS, ["voi", RED, 2, 5]]);
    expect(targets(s, 2, 5)).toEqual(sorted(["0,7", "4,7"]));
  });
});

describe("E4 — Mã", () => {
  it("Đi hình chữ nhật: 8 nước khi không bị cản", () => {
    const s = makeState([...KINGS, ["ma", RED, 4, 5]]);
    expect(targets(s, 4, 5)).toEqual(sorted(["3,3", "5,3", "3,7", "5,7", "2,4", "2,6", "6,4", "6,6"]));
  });

  it("Bị cản chân mã: mất hai nước, không ăn được quân cản", () => {
    const s = makeState([...KINGS, ["ma", RED, 4, 5], ["tot", BLACK, 4, 4]]);
    expect(targets(s, 4, 5)).toEqual(sorted(["3,7", "5,7", "2,4", "2,6", "6,4", "6,6"]));
  });
});

describe("E5 — Xe", () => {
  it("Đi thẳng, dừng trước quân mình, ăn quân địch đầu tiên", () => {
    const s = makeState([...KINGS, ["xe", RED, 4, 5], ["tot", RED, 4, 7], ["tot", BLACK, 4, 1]]);
    const list = targets(s, 4, 5);
    expect(list).toHaveLength(13); // lên 3 + ăn 1, xuống 1, trái 4, phải 4
    expect(list).toContain("4,1");
    expect(list).not.toContain("4,0");
    expect(list).not.toContain("4,7");
    expect(list).not.toContain("4,8");
  });
});

describe("E6 — Pháo", () => {
  const upward = (s: State): string[] => targets(s, 1, 7).filter((t) => Number(t.split(",")[1]) < 7);

  it("Một ngòi: đi không ăn như Xe (dừng trước ngòi), ăn quân địch đầu tiên sau ngòi", () => {
    const s = makeState([...KINGS, ["phao", RED, 1, 7], ["tot", RED, 1, 5], ["xe", BLACK, 1, 3]]);
    expect(upward(s)).toEqual(sorted(["1,6", "1,3"]));
  });

  it("Không có ngòi: không ăn được", () => {
    const s = makeState([...KINGS, ["phao", RED, 1, 7], ["xe", BLACK, 1, 3]]);
    expect(upward(s)).toEqual(sorted(["1,6", "1,5", "1,4"]));
  });

  it("Hai ngòi: không ăn được", () => {
    const s = makeState([...KINGS, ["phao", RED, 1, 7], ["tot", RED, 1, 5], ["tot", RED, 1, 4], ["xe", BLACK, 1, 3]]);
    expect(upward(s)).toEqual(["1,6"]);
  });
});

describe("E7 — Tốt", () => {
  it("Chưa qua sông chỉ tiến (Đỏ lên, Đen xuống)", () => {
    expect(targets(makeState([...KINGS, ["tot", RED, 4, 6]]), 4, 6)).toEqual(["4,5"]);
    expect(targets(makeState([...KINGS, ["tot", BLACK, 4, 3]], BLACK), 4, 3)).toEqual(["4,4"]);
  });

  it("Qua sông thì được đi ngang, vẫn không lùi", () => {
    expect(targets(makeState([...KINGS, ["tot", RED, 4, 4]]), 4, 4)).toEqual(sorted(["4,3", "3,4", "5,4"]));
    expect(targets(makeState([...KINGS, ["tot", BLACK, 4, 5]], BLACK), 4, 5)).toEqual(sorted(["4,6", "3,5", "5,5"]));
  });

  it("Tốt ở hàng cuối chỉ đi ngang", () => {
    const s = makeState(
      [
        ["tuong", RED, 5, 8],
        ["tuong", BLACK, 3, 0],
        ["tot", BLACK, 4, 9],
      ],
      BLACK,
    );
    expect(targets(s, 4, 9)).toEqual(sorted(["3,9", "5,9"]));
  });
});

describe("E8 — Tướng đối mặt", () => {
  const facing = (): State =>
    makeState([
      ["tuong", RED, 4, 9],
      ["tuong", BLACK, 4, 0],
      ["xe", RED, 4, 5],
    ]);

  it("Quân chắn giữa hai tướng bị ghim: chỉ đi dọc cột", () => {
    const list = targets(facing(), 4, 5);
    expect(list.every((t) => t.startsWith("4,"))).toBe(true);
    expect(list).toContain("4,4");
  });

  it("Tướng không được đi sang cột đối mặt tướng kia", () => {
    const s = makeState([
      ["tuong", RED, 5, 9],
      ["tuong", BLACK, 4, 0],
    ]);
    expect(targets(s, 5, 9)).not.toContain("4,9");
  });

  it("isInCheck nhận ra tướng đối mặt", () => {
    const s = makeState([
      ["tuong", RED, 4, 9],
      ["tuong", BLACK, 4, 0],
    ]);
    expect(isInCheck(s.cells, RED)).toBe(true);
    expect(isInCheck(s.cells, BLACK)).toBe(true);
  });
});

describe("E9 — Đang bị chiếu", () => {
  it("Chỉ các nước hoá giải là hợp lệ", () => {
    const s = makeState([
      ["tuong", RED, 4, 9],
      ["tuong", BLACK, 3, 0],
      ["xe", BLACK, 0, 9], // chiếu dọc hàng 9
      ["xe", RED, 3, 5],
    ]);
    expect(s.inCheck).toBe(true);
    const moves = validMoves(s, 0)
      .map((m) => `${xy(m.from)}>${xy(m.to)}`)
      .sort();
    expect(moves).toEqual(sorted(["4,9>4,8", "3,5>3,9"]));
  });

  it("Chiếu bằng Pháo (cần ngòi), Mã (xét chân mã) và Tốt", () => {
    const phao = makeState([...KINGS, ["phao", BLACK, 5, 3], ["tot", RED, 5, 6]]);
    expect(isInCheck(phao.cells, RED)).toBe(true);
    const khongNgoi = makeState([...KINGS, ["phao", BLACK, 5, 3]]);
    expect(isInCheck(khongNgoi.cells, RED)).toBe(false);

    const ma = makeState([...KINGS, ["ma", BLACK, 4, 7]]);
    expect(isInCheck(ma.cells, RED)).toBe(true);
    const maBiCan = makeState([...KINGS, ["ma", BLACK, 4, 7], ["tot", BLACK, 4, 8]]);
    expect(isInCheck(maBiCan.cells, RED)).toBe(false);

    const tot = makeState([...KINGS, ["tot", BLACK, 5, 8]]);
    expect(isInCheck(tot.cells, RED)).toBe(true);
    const totBen = makeState([...KINGS, ["tot", BLACK, 4, 9]]);
    expect(isInCheck(totBen.cells, RED)).toBe(true); // Tốt đã qua sông đi ngang
  });
});

describe("E10 — chiếu bí", () => {
  it("Hai xe chiếu bí: Đỏ thắng, lý do chieu-bi", () => {
    const s = makeState([
      ["tuong", RED, 3, 9],
      ["tuong", BLACK, 4, 0],
      ["xe", RED, 0, 5],
      ["xe", RED, 8, 1],
    ]);
    const r = applyMove(s, 0, { from: idx(0, 5), to: idx(0, 0) });
    if ("error" in r) throw new Error(r.error);
    expect(r.state.status).toBe("finished");
    expect(r.state.result?.reason).toBe("chieu-bi");
    expect(r.state.result?.winner).toBe(0);
    expect(r.state.result?.scores).toEqual([1, 0]);
    expect(r.events.map((e) => e.t)).toEqual(["move", "check", "gameOver"]);
  });
});

describe("E11 — hết nước đi", () => {
  it("Bên hết nước mà không bị chiếu thì thua (T3)", () => {
    const s = makeState([
      ["tuong", RED, 5, 9],
      ["tuong", BLACK, 3, 0],
      ["xe", RED, 4, 6],
      ["xe", RED, 8, 1],
    ]);
    const next = play(s, [4, 6], [4, 5]);
    expect(next.inCheck).toBe(false);
    expect(next.status).toBe("finished");
    expect(next.result?.reason).toBe("het-nuoc");
    expect(next.result?.winner).toBe(0);
  });
});

describe("E12 — nước đi sai", () => {
  it("Từ chối và không đổi state", () => {
    const s = start();
    const before = JSON.stringify(s);
    const cases: [number, Move][] = [
      [1, { from: idx(0, 3), to: idx(0, 4) }], // sai lượt
      [9, { from: idx(0, 6), to: idx(0, 5) }], // ghế lạ
      [0, { from: idx(4, 5), to: idx(4, 4) }], // ô nguồn rỗng
      [0, { from: idx(0, 3), to: idx(0, 4) }], // quân đối phương
      [0, { from: idx(0, 6), to: idx(0, 4) }], // tốt đi 2 ô
      [0, { from: idx(0, 6), to: 90 }],
      [0, { from: idx(0, 6), to: -1 }],
      [0, { from: 0.5, to: 3 }],
    ];
    for (const [seat, move] of cases) {
      const r = applyMove(s, seat, move);
      expect("error" in r).toBe(true);
    }
    expect(applyMove(s, 1, { from: idx(0, 3), to: idx(0, 4) })).toEqual({ error: "NOT_YOUR_TURN" });
    expect(JSON.stringify(s)).toBe(before);
  });

  it("Ván đã kết thúc thì không đi tiếp được", () => {
    const done = forfeit(start(), 1, "bo-cuoc");
    if ("error" in done) throw new Error(done.error);
    expect(applyMove(done.state, 0, { from: idx(0, 6), to: idx(0, 5) })).toEqual({ error: "INVALID_MOVE" });
    expect(validMoves(done.state, 0)).toEqual([]);
  });
});

describe("E13 — ăn quân", () => {
  it("Pháo ăn Mã qua ngòi từ thế xuất phát; ghi quân bị bắt", () => {
    const r = applyMove(start(), 0, { from: idx(1, 7), to: idx(1, 0) });
    if ("error" in r) throw new Error(r.error);
    expect(r.state.captured).toEqual([{ kind: "ma", side: BLACK }]);
    expect(r.state.cells.filter((c) => c !== null)).toHaveLength(31);
    expect(r.state.last).toEqual({ from: idx(1, 7), to: idx(1, 0) });
    expect(r.state.turn).toBe(BLACK);
    expect(r.events[0]).toEqual({
      t: "move",
      from: idx(1, 7),
      to: idx(1, 0),
      piece: { kind: "phao", side: RED },
      captured: { kind: "ma", side: BLACK },
    });
  });
});

describe("E14 — bỏ cuộc và lặp thế cờ", () => {
  it("forfeit: đối thủ thắng", () => {
    const r = forfeit(start(), 1, "bo-cuoc");
    if ("error" in r) throw new Error(r.error);
    expect(r.state.result).toMatchObject({ winner: 0, scores: [1, 0], reason: "bo-cuoc" });
    expect(forfeit(r.state, 0, "bo-cuoc")).toEqual({ error: "INVALID_MOVE" });
  });

  it("Thế cờ lặp lần thứ 3 thì hoà (T5)", () => {
    let s = start();
    const cycle = (): State => {
      let t = play(s, [0, 9], [0, 8]);
      t = play(t, [0, 0], [0, 1]);
      t = play(t, [0, 8], [0, 9]);
      return play(t, [0, 1], [0, 0]);
    };
    s = cycle();
    expect(s.status).toBe("playing");
    s = cycle();
    expect(s.status).toBe("finished");
    expect(s.result).toMatchObject({ winner: null, scores: [0.5, 0.5], reason: "lap-the" });
  });
});

describe("E15 — dữ liệu từ ngoài", () => {
  it("parseMove chỉ nhận { from, to } nguyên", () => {
    expect(parseMove({ from: 3, to: 4 })).toEqual({ from: 3, to: 4 });
    for (const raw of [null, 5, "x", {}, { from: 1 }, { from: 1.5, to: 2 }, { from: "1", to: 2 }]) {
      expect(parseMove(raw)).toBeNull();
    }
  });

  it("parseOptions chỉ nhận giá trị hợp lệ, còn lại giữ base", () => {
    expect(parseOptions({ thoiGianLuot: 60 }, defaultOptions).thoiGianLuot).toBe(60);
    expect(parseOptions({ thoiGianLuot: 7 }, defaultOptions)).toEqual(defaultOptions);
    expect(parseOptions("rác", defaultOptions)).toEqual(defaultOptions);
  });

  it("module khai báo đúng", () => {
    expect(coTuong).toMatchObject({ id: "co-tuong", minPlayers: 2, maxPlayers: 2 });
  });
});

/** Bộ kiểm tra chậm: tướng bị chiếu nếu có quân địch ăn được ô tướng (theo pseudoMoves), hoặc hai tướng đối mặt */
function slowInCheck(cells: (Piece | null)[], side: Side): boolean {
  const g = cells.findIndex((c) => c?.kind === "tuong" && c.side === side);
  if (g < 0) return false;
  if (cells.some((c, i) => c?.side !== side && c !== null && pseudoMoves(cells, i).includes(g))) return true;
  const e = cells.findIndex((c) => c?.kind === "tuong" && c.side !== side);
  if (e < 0 || e % 9 !== g % 9) return false;
  for (let i = Math.min(g, e) + 9; i < Math.max(g, e); i += 9) if (cells[i]) return false;
  return true;
}

function slowLegal(s: State): string[] {
  const out: string[] = [];
  s.cells.forEach((c, from) => {
    if (c?.side !== s.turn) return;
    for (const to of pseudoMoves(s.cells, from)) {
      const next = [...s.cells];
      next[to] = c;
      next[from] = null;
      if (!slowInCheck(next, s.turn)) out.push(`${from}>${to}`);
    }
  });
  return out.sort();
}

/** Bất biến sau mỗi nước (kỹ thuật mục 4) */
function expectInvariants(s: State): void {
  const onBoard = s.cells.filter((c) => c !== null).length;
  expect(onBoard + s.captured.length).toBe(32);
  for (const side of [RED, BLACK] as const) {
    expect(s.cells.filter((c) => c?.kind === "tuong" && c.side === side)).toHaveLength(1);
  }
  const mover: Side = s.turn === RED ? BLACK : RED;
  expect(slowInCheck(s.cells, mover)).toBe(false);
  expect(s.moveNo).toBe(s.history.length - 1);
  if (s.status === "playing") expect(s.turn).toBe(s.moveNo % 2 === 0 ? RED : BLACK);
}

/** Đi một nước ngẫu nhiên; ply chia hết cho 3 thì đối chiếu nước hợp lệ với bộ kiểm tra chậm */
function randomPly(s: State, ply: number, rng: () => number): State {
  const seat = s.players[s.turn];
  const moves = validMoves(s, seat);
  expect(moves.length).toBeGreaterThan(0);
  if (ply % 3 === 0) expect(moves.map((m) => `${m.from}>${m.to}`).sort()).toEqual(slowLegal(s));
  const move = pickRandom(moves, rng);
  if (move === null) throw new Error("Hết nước nhưng ván chưa kết thúc");
  const r = applyMove(s, seat, move);
  if ("error" in r) throw new Error(r.error);
  expectInvariants(r.state);
  return r.state;
}

describe("E16 — fuzz", () => {
  it("Ván ngẫu nhiên: bất biến luôn đúng và nước hợp lệ khớp bộ kiểm tra chậm", () => {
    const rng = createRng(20260721);
    const MAX_PLIES = 300;
    let finished = 0;
    for (let game = 0; game < 120; game++) {
      let s = start();
      for (let ply = 0; ply < MAX_PLIES && s.status === "playing"; ply++) s = randomPly(s, ply, rng);
      if (s.status === "finished") finished++;
    }
    expect(finished).toBeGreaterThan(0);
  }, 120_000);
});
