import { createRng, pickRandom } from "@playtogether/engine";
import type { Options } from "@playtogether/engine/o-an-quan";
import { applyMove, defaultOptions, next, setup, validMoves } from "@playtogether/engine/o-an-quan";
import { describe, expect, it } from "vitest";
import { dirForArrow, layoutFor } from "./layout.ts";
import { applyEvent, viewFromState } from "./view-model.ts";

describe("layoutFor", () => {
  for (const seat of [0, 1] as const) {
    it(`bên ngồi dưới là ${seat === 0 ? "A" : "B"}: hàng dưới là hàng của bên đó, ▶ đi sang phải`, () => {
      const l = layoutFor(seat);
      const own = seat === 0 ? [1, 2, 3, 4, 5] : [7, 8, 9, 10, 11];
      expect([...l.bottom].sort((a, b) => a - b)).toEqual(own);
      // Đi theo chiều ▶ từ ô trái nhất của hàng dưới thì lần lượt qua các ô bên phải, rồi tới ô quan bên phải
      const ring = [...l.bottom, l.right, ...[...l.top].reverse(), l.left];
      let i = l.bottom[0]!;
      for (const expected of ring.slice(1)) {
        i = next(i, dirForArrow("right", "bottom"));
        expect(i).toBe(expected);
      }
      expect(next(i, dirForArrow("right", "bottom"))).toBe(l.bottom[0]);
    });
  }
});

describe("dirForArrow — mũi tên chỉ đúng hướng sỏi chạy trên màn hình (Q21)", () => {
  for (const seat of [0, 1] as const) {
    const l = layoutFor(seat);
    for (const row of ["top", "bottom"] as const) {
      it(`bên ${seat === 0 ? "A" : "B"} ngồi dưới, hàng ${row === "top" ? "trên" : "dưới"}: ▶ sang ô bên phải, ◀ sang ô bên trái`, () => {
        const cells = l[row];
        for (let k = 0; k + 1 < cells.length; k++) {
          expect(next(cells[k]!, dirForArrow("right", row))).toBe(cells[k + 1]);
          expect(next(cells[k + 1]!, dirForArrow("left", row))).toBe(cells[k]);
        }
      });
    }
  }
});

/** Chơi một ván ngẫu nhiên; sau mỗi nước, phát lại events trên state cũ phải ra đúng state mới. */
function replayRandomGame(options: Options, rng: () => number, seen: Set<string>): void {
  let state = setup(options, [0, 1], rng() < 0.5 ? 0 : 1);
  while (state.status === "playing") {
    const seatId = state.controller[state.turn];
    const r = applyMove(state, seatId, pickRandom(validMoves(state, seatId), rng)!);
    if ("error" in r) throw new Error(r.error);
    for (const e of r.events) seen.add(e.t);
    const replayed = r.events.reduce((v, e) => applyEvent(v, e, options.giaTriQuan), viewFromState(state));
    expect(replayed).toEqual(viewFromState(r.state));
    state = r.state;
  }
}

describe("phát lại events", () => {
  it("phát lại events trên state cũ cho ra đúng state mới (1.000 ván ngẫu nhiên, có bù dân và lật bàn)", () => {
    const rng = createRng(42);
    const seen = new Set<string>();
    for (let game = 0; game < 1000; game++) {
      const options: Options = {
        ...defaultOptions,
        giaTriQuan: game % 2 ? 5 : 10,
        camAnQuanNon: rng() < 0.5,
        latBan: rng() < 0.5,
      };
      replayRandomGame(options, rng, seen);
    }
    expect([...seen].sort()).toEqual(["buDan", "capture", "drop", "gameOver", "latBan", "pick", "turnEnd"]);
  });
});
