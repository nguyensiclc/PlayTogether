// Phát lại events thành hiệu ứng theo thời lượng ở UX mục 4. Hỗ trợ tua nhanh và bỏ qua.
import type { GameEvent } from "@playtogether/engine/o-an-quan";
import { applyEvent, type BoardView } from "./view-model.ts";

export const DURATION_MS: Record<GameEvent["t"], number> = {
  pick: 250,
  drop: 180,
  capture: 400,
  turnEnd: 300,
  buDan: 600,
  latBan: 600,
  gameOver: 600,
};

/** Tốc độ khi bấm Tua nhanh */
export const FAST_SPEED = 4;

export interface StepContext {
  /** Thứ tự event trong nước đi */
  index: number;
  prev: BoardView;
  next: BoardView;
  /** Thời lượng của bước này, đã tính tốc độ */
  ms: number;
}

export interface Stage {
  render(view: BoardView, ms: number): void;
  effect(e: GameEvent, ctx: StepContext): void;
}

export class Playback {
  speed = 1;
  private skipped = false;
  private wake: (() => void) | null = null;

  /** Bỏ qua phần hiệu ứng còn lại. */
  skip(): void {
    this.skipped = true;
    this.wake?.();
  }

  async run(events: readonly GameEvent[], start: BoardView, giaTriQuan: number, stage: Stage): Promise<BoardView> {
    let view = start;
    for (const [index, e] of events.entries()) {
      const next = applyEvent(view, e, giaTriQuan);
      if (!this.skipped) {
        const ms = DURATION_MS[e.t] / this.speed;
        stage.render(next, ms);
        stage.effect(e, { index, prev: view, next, ms });
        await this.sleep(ms);
      }
      view = next;
    }
    return view;
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
