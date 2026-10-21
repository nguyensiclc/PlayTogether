// Test bot Cờ tướng (docs/co-tuong/03-thiet-ke-ky-thuat.md mục 8): nước đi hợp lệ, xác định theo seed, và độ mạnh tăng theo mức.

import { describe, expect, it } from "vitest";
import { type BotLevelId, createRng } from "../game-module.ts";
import { BOT_LEVELS, chooseBotMove } from "./ai.ts";
import { isInCheck } from "./moves.ts";
import { applyMove, defaultOptions, setup, validMoves } from "./rules.ts";
import type { Kind, Move, Piece, Side, State } from "./types.ts";

const RED = 0;
const BLACK = 1;
const idx = (x: number, y: number): number => y * 9 + x;

type Placement = readonly [kind: Kind, side: Side, x: number, y: number];

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
const key = (m: Move | null): string => (m ? `${m.from}>${m.to}` : "none");

describe("B1 — nước đi hợp lệ", () => {
  it.each(BOT_LEVELS.map((l) => l.id))("mức %s chọn nước hợp lệ ở thế xuất phát", (level) => {
    const s = start();
    const move = chooseBotMove(s, 0, level, createRng(7));
    expect(validMoves(s, 0).map(key)).toContain(key(move));
  });

  it("không phải lượt của ghế đó, hoặc ván đã xong, thì không chọn", () => {
    expect(chooseBotMove(start(), 1, "hard", createRng(1))).toBeNull();
    const done: State = { ...start(), status: "finished" };
    expect(chooseBotMove(done, 0, "easy", createRng(1))).toBeNull();
  });

  it("cùng seed cho cùng nước (xác định)", () => {
    for (const { id: level } of BOT_LEVELS) {
      const a = chooseBotMove(start(), 0, level, createRng(42));
      const b = chooseBotMove(start(), 0, level, createRng(42));
      expect(key(a)).toBe(key(b));
    }
  });

  it("không sửa state đầu vào", () => {
    const s = start();
    const before = JSON.stringify(s);
    chooseBotMove(s, 0, "hard", createRng(3));
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe("B2 — chiến thuật", () => {
  // Hai xe chiếu bí (như E10): Xe (0,5) → (0,0)
  const mateInOne = (): State =>
    makeState([
      ["tuong", RED, 3, 9],
      ["tuong", BLACK, 4, 0],
      ["xe", RED, 0, 5],
      ["xe", RED, 8, 1],
    ]);

  it.each(["medium", "hard"] as BotLevelId[])("mức %s chiếu bí khi có nước chiếu bí", (level) => {
    const move = chooseBotMove(mateInOne(), 0, level, createRng(5));
    expect(key(move)).toBe(key({ from: idx(0, 5), to: idx(0, 0) }));
  });

  it.each(["medium", "hard"] as BotLevelId[])("mức %s ăn quân không có bảo vệ thay vì đi bừa", (level) => {
    // Xe Đỏ ăn được Xe Đen ở (4,3), không ai bảo vệ
    const s = makeState([
      ["tuong", RED, 5, 9],
      ["tuong", BLACK, 3, 0],
      ["xe", RED, 4, 6],
      ["xe", BLACK, 4, 3],
    ]);
    expect(key(chooseBotMove(s, 0, level, createRng(9)))).toBe(key({ from: idx(4, 6), to: idx(4, 3) }));
  });

  it("mức khó không ăn quân được bảo vệ bằng cách mất quân lớn hơn", () => {
    // Xe Đỏ (4,6) có thể ăn Tốt Đen (4,3) nhưng Xe Đen (4,1) ăn lại ngay: mất Xe đổi lấy Tốt
    const s = makeState([
      ["tuong", RED, 5, 9],
      ["tuong", BLACK, 3, 0],
      ["xe", RED, 4, 6],
      ["tot", BLACK, 4, 3],
      ["xe", BLACK, 4, 1],
    ]);
    expect(key(chooseBotMove(s, 0, "hard", createRng(2)))).not.toBe(key({ from: idx(4, 6), to: idx(4, 3) }));
  });
});

/** Cho `redLevel` (ghế 0) đấu `blackLevel` (ghế 1) tối đa `plies` nước; trả về chênh lệch giá trị quân (Đỏ − Đen) hoặc thắng thua */
function duel(redLevel: BotLevelId, blackLevel: BotLevelId, plies: number, seed: number): number {
  const rng = createRng(seed);
  let s = start();
  for (let ply = 0; ply < plies && s.status === "playing"; ply++) {
    const seat = s.turn;
    const move = chooseBotMove(s, seat, seat === 0 ? redLevel : blackLevel, rng);
    if (!move) break;
    const r = applyMove(s, seat, move);
    if ("error" in r) throw new Error(`Bot đi sai luật: ${r.error}`);
    s = r.state;
  }
  if (s.result?.winner === 0) return 1000;
  if (s.result?.winner === 1) return -1000;
  const value: Record<Kind, number> = { tuong: 0, si: 2, voi: 2, xe: 9, phao: 4.5, ma: 4, tot: 1 };
  return s.cells.reduce((sum, c) => (c ? sum + (c.side === 0 ? 1 : -1) * value[c.kind] : sum), 0);
}

describe("B3 — độ mạnh tăng theo mức", () => {
  it("mức khó hơn không thua mức dễ (hai bên đổi màu)", () => {
    const asRed = duel("hard", "easy", 70, 11);
    const asBlack = -duel("easy", "hard", 70, 12);
    expect(asRed + asBlack).toBeGreaterThan(0);
  }, 120_000);

  it("mức vừa hơn mức dễ (hai bên đổi màu)", () => {
    const asRed = duel("medium", "easy", 70, 21);
    const asBlack = -duel("easy", "medium", 70, 22);
    expect(asRed + asBlack).toBeGreaterThan(0);
  }, 120_000);
});
