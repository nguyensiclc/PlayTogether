import type { GameEvent, Seat } from "@playtogether/engine/o-an-quan";
import { describe, expect, it, vi } from "vitest";
import type { EffectTargets } from "./move-effects.ts";
import { playEffect } from "./move-effects.ts";
import type { StepContext } from "./playback.ts";
import { durationFor } from "./playback.ts";
import type { BoardView } from "./view-model.ts";

const dummyView: BoardView = {
  dan: Array(12).fill(0),
  quan: [false, false],
  captured: [
    { dan: 0, quan: 0 },
    { dan: 0, quan: 0 },
  ],
  controller: [0, 1],
  buDanCount: [0, 0],
  hand: null,
};

function makeCtx(e: GameEvent, index: number, events?: readonly GameEvent[]): StepContext {
  return {
    index,
    prev: dummyView,
    next: dummyView,
    ms: durationFor(e, index),
    events,
  };
}

describe("durationFor — thời lượng từng event", () => {
  it("bốc ô đầu là 250ms, bốc rải tiếp (index > 0) chậm lại 1.200ms để kịp quan sát", () => {
    const pickEv: GameEvent = { t: "pick", i: 3, n: 5 };
    expect(durationFor(pickEv, 0)).toBe(250);
    expect(durationFor(pickEv, 1)).toBe(1200);
  });

  it("rải đá là 1.000ms / viên", () => {
    expect(durationFor({ t: "drop", i: 4 }, 1)).toBe(1000);
  });

  it("ăn quân và hết lượt là 1.400ms để người chơi đọc được thông báo", () => {
    expect(durationFor({ t: "capture", i: 4, dan: 6, quan: 0, by: 0 }, 5)).toBe(1400);
    expect(durationFor({ t: "turnEnd", reason: "hai-o-trong" }, 6)).toBe(1400);
  });
});

describe("playEffect — thông báo và hiệu ứng", () => {
  function makeTargets() {
    const toast = vi.fn();
    const flash = vi.fn();
    const capture = vi.fn();
    const status = vi.fn();
    const showDelta = vi.fn();
    const targets: EffectTargets = {
      board: { toast, flash, capture } as unknown as EffectTargets["board"],
      cardOf: (_side: Seat) => ({ showDelta }) as unknown as ReturnType<EffectTargets["cardOf"]>,
      giaTriQuan: 10,
      nameOf: (s) => (s === 0 ? "Người chơi A" : "Người chơi B"),
      turnAfter: 1,
      status,
    };
    return { targets, toast, flash, capture, status, showDelta };
  }

  it("bốc ô đầu chỉ nháy pick; bốc rải tiếp nháy pick2 và hiện thông báo", () => {
    const { targets, toast, flash, status } = makeTargets();
    const pickEv: GameEvent = { t: "pick", i: 3, n: 5 };

    playEffect(pickEv, makeCtx(pickEv, 0), targets);
    expect(flash).toHaveBeenCalledWith(3, "pick", 250);
    expect(toast).not.toHaveBeenCalled();

    playEffect(pickEv, makeCtx(pickEv, 2), targets);
    expect(flash).toHaveBeenCalledWith(3, "pick2", 1200);
    expect(toast).toHaveBeenCalledWith("Ô kế có quân — Bốc ô 3 rải tiếp", 1200);
    expect(status).toHaveBeenCalledWith("Ô kế có quân — Bốc ô 3 rải tiếp");
  });

  it("ăn ô đầu báo 'Cách 1 ô trống — Ăn ô X'; ăn tiếp báo 'Ăn liên hoàn'", () => {
    const { targets, toast, capture } = makeTargets();
    const cap1: GameEvent = { t: "capture", i: 4, dan: 6, quan: 0, by: 0 };
    const cap2: GameEvent = { t: "capture", i: 6, dan: 2, quan: 1, by: 0 };
    const allEvents: GameEvent[] = [{ t: "pick", i: 2, n: 2 }, { t: "drop", i: 3 }, cap1, cap2];

    playEffect(cap1, makeCtx(cap1, 2, allEvents), targets);
    expect(capture).toHaveBeenCalledWith(4, 6, 1400);
    expect(toast).toHaveBeenCalledWith("Cách 1 ô trống — Ăn ô 4 (+6 điểm)", 1400);

    playEffect(cap2, makeCtx(cap2, 3, allEvents), targets);
    expect(capture).toHaveBeenCalledWith(6, 12, 1400);
    expect(toast).toHaveBeenCalledWith("Ăn liên hoàn ô quan 6 (+12 điểm)", 1400);
  });

  it.each([
    ["gap-o-quan", "Gặp ô quan còn quân — Hết lượt"],
    ["hai-o-trong", "Hai ô trống liên tiếp — Hết lượt"],
    ["quan-non", "Quan Già (chưa đủ 5 dân) — Không được ăn, hết lượt"],
    ["het-an", "Hết nước ăn — Hết lượt"],
  ] as const)("turnEnd lý do %s hiện thông báo: %s", (reason, expectedText) => {
    const { targets, toast, status } = makeTargets();
    const ev: GameEvent = { t: "turnEnd", reason };
    playEffect(ev, makeCtx(ev, 5), targets);
    expect(toast).toHaveBeenCalledWith(expectedText, 1400);
    expect(status).toHaveBeenCalledWith(expectedText);
  });

  it("gameOver hiện thông báo kết thúc ván kèm lý do", () => {
    const { targets, toast } = makeTargets();
    const ev: GameEvent = {
      t: "gameOver",
      result: { winner: 0, scores: [45, 25], reason: "het-quan" },
    };
    playEffect(ev, makeCtx(ev, 8), targets);
    expect(toast).toHaveBeenCalledWith("Hết ván — Hết quan — Thu dân tính điểm", 1200);
  });
});
