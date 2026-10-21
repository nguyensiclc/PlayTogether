import type { GameEvent } from "@playtogether/engine/o-an-quan";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTO_FAST_MS, FAST_SPEED, Playback, type Stage } from "./playback.ts";
import type { BoardView } from "./view-model.ts";

const initialView: BoardView = {
  dan: [5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5, 0],
  quan: [true, true],
  captured: [
    { dan: 0, quan: 0 },
    { dan: 0, quan: 0 },
  ],
  controller: [0, 1],
  buDanCount: [0, 0],
  hand: null,
};

describe("Playback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("AUTO_FAST_MS mặc định là 15.000ms", () => {
    expect(AUTO_FAST_MS).toBe(15_000);
  });

  it("chạy các event và cập nhật stage", async () => {
    const pb = new Playback();
    const rendered: BoardView[] = [];
    const stage: Stage = {
      render: (v) => rendered.push(v),
      effect: () => {},
    };

    const events: GameEvent[] = [
      { t: "pick", i: 2, n: 2 },
      { t: "drop", i: 3 },
      { t: "drop", i: 4 },
    ];

    const runPromise = pb.run(events, initialView, 10, stage);
    await vi.runAllTimersAsync();
    const finalView = await runPromise;

    expect(rendered.length).toBe(3);
    expect(finalView.dan[2]).toBe(0);
    expect(finalView.dan[3]).toBe(6);
    expect(finalView.dan[4]).toBe(6);
  });

  it("skip() ngắt sleep ngay lập tức", async () => {
    const pb = new Playback();
    const rendered: BoardView[] = [];
    const stage: Stage = {
      render: (v) => rendered.push(v),
      effect: () => {},
    };

    const events: GameEvent[] = [
      { t: "drop", i: 1 },
      { t: "drop", i: 2 },
      { t: "drop", i: 3 },
    ];

    const runPromise = pb.run(events, initialView, 10, stage);
    pb.skip();
    const finalView = await runPromise;

    expect(finalView.dan[1]).toBe(6);
    expect(finalView.dan[2]).toBe(6);
    expect(finalView.dan[3]).toBe(6);
  });

  it("tự động bật x4 sau autoFastAfterMs nếu chưa rải xong", async () => {
    const pb = new Playback();
    pb.autoFastAfterMs = 15_000;
    const speedChanges: number[] = [];
    pb.onSpeedChange = (s) => speedChanges.push(s);

    const stage: Stage = {
      render: () => {},
      effect: () => {},
    };

    // 20 drops: ở tốc độ 1x (1000ms/viên) sẽ tốn 20s
    const events: GameEvent[] = Array.from({ length: 20 }, (_, i) => ({
      t: "drop" as const,
      i: (i % 5) + 1,
    }));

    const runPromise = pb.run(events, initialView, 10, stage);

    // Tiến hành 14.999s: vẫn tốc độ 1x
    await vi.advanceTimersByTimeAsync(14_999);
    expect(pb.speed).toBe(1);
    expect(speedChanges).toHaveLength(0);

    // Sang 15s: tự động chuyển sang FAST_SPEED (4)
    await vi.advanceTimersByTimeAsync(1);
    expect(pb.speed).toBe(FAST_SPEED);
    expect(speedChanges).toEqual([4]);

    await vi.runAllTimersAsync();
    await runPromise;
  });

  it("hoàn thành trước autoFastAfterMs thì hủy hẹn giờ và không đổi tốc độ", async () => {
    const pb = new Playback();
    pb.autoFastAfterMs = 15_000;
    const speedChanges: number[] = [];
    pb.onSpeedChange = (s) => speedChanges.push(s);

    const stage: Stage = {
      render: () => {},
      effect: () => {},
    };

    // Chỉ có 2 drops (2s)
    const events: GameEvent[] = [
      { t: "drop", i: 1 },
      { t: "drop", i: 2 },
    ];

    const runPromise = pb.run(events, initialView, 10, stage);
    await vi.runAllTimersAsync();
    await runPromise;

    expect(pb.speed).toBe(1);
    expect(speedChanges).toHaveLength(0);
  });
});
