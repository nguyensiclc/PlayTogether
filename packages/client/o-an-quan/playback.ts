// Phát lại events thành hiệu ứng theo thời lượng ở UX mục 4. Hỗ trợ tua nhanh và bỏ qua.
import type { GameEvent } from "@playtogether/engine/o-an-quan";
import { applyEvent, type BoardView } from "./view-model.ts";

export const DURATION_MS: Record<GameEvent["t"] | "pickContinue", number> = {
  pick: 250,
  pickContinue: 1200,
  drop: 1000,
  capture: 1400,
  turnEnd: 1400,
  buDan: 800,
  latBan: 800,
  gameOver: 1200,
};

/** Tốc độ khi bấm Tua nhanh */
export const FAST_SPEED = 4;

/** Tự động chuyển tốc độ x4 nếu nước đi kéo dài quá 15s */
export const AUTO_FAST_MS = 15_000;

/** Thời lượng chuẩn cho từng event; riêng bốc rải tiếp (pick khi index > 0) chậm lại để đọc thông báo */
export function durationFor(e: GameEvent, index: number): number {
  if (e.t === "pick" && index > 0) return DURATION_MS.pickContinue;
  return DURATION_MS[e.t];
}

export interface StepContext {
  /** Thứ tự event trong nước đi */
  index: number;
  prev: BoardView;
  next: BoardView;
  /** Thời lượng của bước này, đã tính tốc độ */
  ms: number;
  /** Toàn bộ events của nước đi để hiệu ứng biết bối cảnh (vd ăn liên hoàn) */
  events?: readonly GameEvent[] | undefined;
}

export interface Stage {
  render(view: BoardView, ms: number): void;
  effect(e: GameEvent, ctx: StepContext): void;
}

export class Playback {
  speed = 1;
  /** Thời gian tối đa trước khi tự động bật tua nhanh x4 (ms). 0 = không bật. */
  autoFastAfterMs = 0;
  /** Callback được gọi khi tốc độ thay đổi tự động */
  onSpeedChange: ((speed: number) => void) | null = null;
  private skipped = false;
  private wake: (() => void) | null = null;
  private autoFastTimer: ReturnType<typeof setTimeout> | null = null;

  /** Bỏ qua phần hiệu ứng còn lại. */
  skip(): void {
    this.skipped = true;
    this.clearAutoFast();
    this.wake?.();
  }

  async run(events: readonly GameEvent[], start: BoardView, giaTriQuan: number, stage: Stage): Promise<BoardView> {
    this.startAutoFast();
    try {
      let view = start;
      for (const [index, e] of events.entries()) {
        const next = applyEvent(view, e, giaTriQuan);
        if (!this.skipped) {
          const ms = durationFor(e, index) / this.speed;
          stage.render(next, ms);
          stage.effect(e, { index, prev: view, next, ms, events });
          await this.sleep(ms);
        }
        view = next;
      }
      return view;
    } finally {
      this.clearAutoFast();
    }
  }

  private startAutoFast(): void {
    if (this.autoFastAfterMs <= 0) return;
    this.autoFastTimer = setTimeout(() => {
      if (!this.skipped && this.speed < FAST_SPEED) {
        this.speed = FAST_SPEED;
        this.onSpeedChange?.(this.speed);
      }
    }, this.autoFastAfterMs);
  }

  private clearAutoFast(): void {
    if (this.autoFastTimer !== null) {
      clearTimeout(this.autoFastTimer);
      this.autoFastTimer = null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(id);
        this.wake = null;
        resolve();
      };
      const id = setTimeout(done, ms);
      this.wake = done;
    });
  }
}
