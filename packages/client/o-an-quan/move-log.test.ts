import type { GameEvent, Move, State } from "@playtogether/engine/o-an-quan";
import { applyMove, defaultOptions, setup } from "@playtogether/engine/o-an-quan";
import { describe, expect, it } from "vitest";
import { describeMove, keepSideEntry } from "./move-log.ts";

const names = ["Người chơi A", "Người chơi B"];

function run(state: State, move: Move) {
  const r = applyMove(state, state.controller[state.turn], move);
  if ("error" in r) throw new Error(r.error);
  return r;
}

const side = (s: State) => (i: 0 | 1) => names[s.controller[i]]!;

describe("describeMove", () => {
  it("ví dụ chuẩn T1: rải ô 3 → ăn ô 4, +6", () => {
    const s = setup(defaultOptions, [0, 1], 0);
    const r = run(s, { kind: "sow", square: 3, dir: 1 });
    expect(describeMove(1, "Người chơi A", { kind: "sow", square: 3, dir: 1 }, r.events, 10, side(r.state))).toEqual([
      { n: 1, who: "Người chơi A", text: "rải ô 3 → ăn ô 4", gain: 6 },
    ]);
  });

  const sow: Move = { kind: "sow", square: 5, dir: 1 };
  const cases: [string, GameEvent[], string, number | undefined][] = [
    ["gặp ô quan", [{ t: "turnEnd", reason: "gap-o-quan" }], "rải ô 5 → gặp ô quan, hết lượt", undefined],
    ["hai ô trống", [{ t: "turnEnd", reason: "hai-o-trong" }], "rải ô 5 → hai ô trống, hết lượt", undefined],
    ["Quan Già", [{ t: "turnEnd", reason: "quan-non" }], "rải ô 5 → gặp Quan Già, hết lượt", undefined],
    [
      "ăn ô quan",
      [
        { t: "capture", i: 6, dan: 2, quan: 1, by: 0 },
        { t: "turnEnd", reason: "het-an" },
      ],
      "rải ô 5 → ăn ô quan 6",
      12,
    ],
    [
      "ăn liên hoàn rồi gặp Quan Già",
      [
        { t: "capture", i: 8, dan: 2, quan: 0, by: 0 },
        { t: "capture", i: 10, dan: 3, quan: 0, by: 0 },
        { t: "turnEnd", reason: "quan-non" },
      ],
      "rải ô 5 → ăn liên hoàn 2 ô, dừng trước Quan Già",
      5,
    ],
  ];

  it.each(cases)("%s", (_name, events, text, gain) => {
    const [entry] = describeMove(4, "A", sow, events, 10, () => "B");
    expect(entry).toEqual({ n: 4, who: "A", text, ...(gain ? { gain } : {}) });
  });

  it("bù dân và hết ván thành các dòng riêng", () => {
    const events: GameEvent[] = [
      { t: "turnEnd", reason: "hai-o-trong" },
      { t: "buDan", seat: 1, doiQuan: true },
    ];
    expect(describeMove(7, "Người chơi A", sow, events, 10, (i) => names[i]!)).toEqual([
      { n: 7, who: "Người chơi A", text: "rải ô 5 → hai ô trống, hết lượt" },
      { n: 7, who: "Người chơi B", text: "hết dân, bù dân (đổi 1 quan)", ev: "−5" },
    ]);
    const over = describeMove(
      9,
      "A",
      sow,
      [{ t: "gameOver", result: { winner: 0, scores: [40, 30], reason: "het-quan" } }],
      10,
      () => "",
    );
    expect(over.at(-1)).toEqual({ n: 9, who: "", text: "Hết ván · Hết quan" });
  });

  it("lật bàn và giữ bên", () => {
    expect(describeMove(2, "Người chơi B", { kind: "latBan" }, [{ t: "latBan" }], 10, () => "")).toEqual([
      { n: 2, who: "Người chơi B", text: "lật bàn, đổi bên với đối thủ" },
    ]);
    expect(keepSideEntry(2, "Người chơi B")).toEqual({
      n: 2,
      who: "Người chơi B",
      text: "chọn giữ bên, không lật bàn",
    });
  });
});
