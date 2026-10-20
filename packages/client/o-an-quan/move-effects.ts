// Hiệu ứng cho từng event của một nước đi (UX mục 4): nháy ô, nhãn "+N", thông báo nhỏ.
// Chỉ vẽ; thứ tự và thời lượng do Playback điều khiển.

import type { SeatId } from "@playtogether/engine";
import type { EndReason, GameEvent, Seat } from "@playtogether/engine/o-an-quan";
import { ROWS } from "@playtogether/engine/o-an-quan";
import type { BoardDom } from "./board-dom.ts";
import type { StepContext } from "./playback.ts";
import type { PlayerCard } from "./player-card.ts";

/** Những gì hiệu ứng cần chạm tới trên màn hình */
export interface EffectTargets {
  board: BoardDom;
  /** Thẻ người chơi đang hiển thị bên bàn `side` */
  cardOf(side: Seat): PlayerCard;
  giaTriQuan: number;
  nameOf(seat: SeatId): string;
  /** Bên đến lượt sau nước đi */
  turnAfter: Seat;
}

export function playEffect(e: GameEvent, ctx: StepContext, t: EffectTargets): void {
  switch (e.t) {
    case "pick":
      t.board.flash(e.i, ctx.index === 0 ? "pick" : "pick2", ctx.ms);
      return;
    case "drop":
      t.board.flash(e.i, "drop", ctx.ms);
      return;
    case "capture":
      showCapture(e, ctx, t);
      return;
    case "turnEnd":
      t.board.toast(e.reason === "quan-non" ? "Quan Già — không được ăn" : "Hết lượt", ctx.ms);
      return;
    case "buDan":
      showBuDan(e, ctx, t);
      return;
    case "latBan":
      showLatBan(ctx, t);
      return;
    case "gameOver":
      showCollect(e.result.reason as EndReason, ctx, t);
      return;
  }
}

function showCapture(e: Extract<GameEvent, { t: "capture" }>, { ms }: StepContext, t: EffectTargets): void {
  const gain = e.dan + e.quan * t.giaTriQuan;
  t.board.capture(e.i, gain, ms);
  t.cardOf(e.by).showDelta(`+${gain}`);
}

function showBuDan(e: Extract<GameEvent, { t: "buDan" }>, { prev, ms }: StepContext, t: EffectTargets): void {
  for (const i of ROWS[e.seat]) t.board.flash(i, "budan", ms);
  t.cardOf(e.seat).showDelta("−5", true);
  const who = t.nameOf(prev.controller[e.seat]);
  t.board.toast(`${who} hết dân — Bù dân −5 điểm${e.doiQuan ? " (đổi 1 quan)" : ""}`, ms * 2);
}

/** Lật bàn không đổi bên đến lượt: người lật là người vừa điều khiển bên đó (luật mục 9). */
function showLatBan({ prev, ms }: StepContext, t: EffectTargets): void {
  t.cardOf(0).flashSwap(ms);
  t.cardOf(1).flashSwap(ms);
  const flipper = t.nameOf(prev.controller[t.turnAfter]);
  const opener = t.nameOf(prev.controller[t.turnAfter === 0 ? 1 : 0]);
  t.board.toast(`${flipper} đã lật bàn — đến lượt ${opener}`, ms * 2);
}

/** Hết quan / lặp nước: các ô dân còn quân nháy lên vì được thu về (luật mục 7). */
function showCollect(reason: EndReason, { prev, ms }: StepContext, t: EffectTargets): void {
  if (reason !== "het-quan" && reason !== "lap-nuoc") return;
  for (const i of [...ROWS[0], ...ROWS[1]]) {
    if ((prev.dan[i] ?? 0) > 0) t.board.flash(i, "collect", ms);
  }
}
