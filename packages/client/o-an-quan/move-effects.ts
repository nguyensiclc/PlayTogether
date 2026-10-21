// Hiệu ứng cho từng event của một nước đi (UX mục 4): nháy ô, nhãn "+N", thông báo nhỏ.
// Chỉ vẽ; thứ tự và thời lượng do Playback điều khiển.

import type { SeatId } from "@playtogether/engine";
import type { EndReason, GameEvent, Seat, TurnEndReason } from "@playtogether/engine/o-an-quan";
import { isQuanSquare, ROWS } from "@playtogether/engine/o-an-quan";
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
  /** Cập nhật thanh trạng thái phía dưới bàn */
  status?(text: string): void;
}

const TURN_END_TOAST: Record<TurnEndReason, string> = {
  "gap-o-quan": "Gặp ô quan còn quân — Hết lượt",
  "hai-o-trong": "Hai ô trống liên tiếp — Hết lượt",
  "quan-non": "Quan Già (chưa đủ 5 dân) — Không được ăn, hết lượt",
  "het-an": "Hết nước ăn — Hết lượt",
};

const GAME_OVER_TOAST: Record<EndReason, string> = {
  "het-quan": "Hết quan — Thu dân tính điểm",
  "khong-du-bu-dan": "Không đủ điểm bù dân",
  "lap-nuoc": "Lặp nước 3 lần — Thu dân tính điểm",
  "het-gio": "Hết giờ",
  "bo-cuoc": "Bỏ cuộc",
};

const squareLabel = (i: number): string => (isQuanSquare(i) ? `ô quan ${i}` : `ô ${i}`);

function notify(text: string, ms: number, t: EffectTargets): void {
  t.board.toast(text, ms);
  t.status?.(text);
}

export function playEffect(e: GameEvent, ctx: StepContext, t: EffectTargets): void {
  switch (e.t) {
    case "pick":
      showPick(e, ctx, t);
      return;
    case "drop":
      t.board.flash(e.i, "drop", ctx.ms);
      return;
    case "capture":
      showCapture(e, ctx, t);
      return;
    case "turnEnd":
      notify(TURN_END_TOAST[e.reason], ctx.ms, t);
      return;
    case "buDan":
      showBuDan(e, ctx, t);
      return;
    case "latBan":
      showLatBan(ctx, t);
      return;
    case "gameOver":
      showGameOver(e, ctx, t);
      return;
  }
}

function showPick(e: Extract<GameEvent, { t: "pick" }>, ctx: StepContext, t: EffectTargets): void {
  const isContinue = ctx.index > 0;
  t.board.flash(e.i, isContinue ? "pick2" : "pick", ctx.ms);
  if (isContinue) {
    notify(`Ô kế có quân — Bốc ${squareLabel(e.i)} rải tiếp`, ctx.ms, t);
  }
}

function showCapture(e: Extract<GameEvent, { t: "capture" }>, ctx: StepContext, t: EffectTargets): void {
  const gain = e.dan + e.quan * t.giaTriQuan;
  t.board.capture(e.i, gain, ctx.ms);
  t.cardOf(e.by).showDelta(`+${gain}`);
  const isChain = ctx.events ? ctx.events.slice(0, ctx.index).some((x) => x.t === "capture") : false;
  const name = squareLabel(e.i);
  const text = isChain ? `Ăn liên hoàn ${name} (+${gain} điểm)` : `Cách 1 ô trống — Ăn ${name} (+${gain} điểm)`;
  notify(text, ctx.ms, t);
}

function showBuDan(e: Extract<GameEvent, { t: "buDan" }>, { prev, ms }: StepContext, t: EffectTargets): void {
  for (const i of ROWS[e.seat]) t.board.flash(i, "budan", ms);
  t.cardOf(e.seat).showDelta("−5", true);
  const who = t.nameOf(prev.controller[e.seat]);
  notify(`${who} hết dân — Bù dân −5 điểm${e.doiQuan ? " (đổi 1 quan)" : ""}`, ms * 2, t);
}

/** Lật bàn không đổi bên đến lượt: người lật là người vừa điều khiển bên đó (luật mục 9). */
function showLatBan({ prev, ms }: StepContext, t: EffectTargets): void {
  t.cardOf(0).flashSwap(ms);
  t.cardOf(1).flashSwap(ms);
  const flipper = t.nameOf(prev.controller[t.turnAfter]);
  const opener = t.nameOf(prev.controller[t.turnAfter === 0 ? 1 : 0]);
  notify(`${flipper} đã lật bàn — đến lượt ${opener}`, ms * 2, t);
}

/** Hết quan / lặp nước: các ô dân còn quân nháy lên vì được thu về (luật mục 7). */
function showGameOver(e: Extract<GameEvent, { t: "gameOver" }>, ctx: StepContext, t: EffectTargets): void {
  const reason = e.result.reason as EndReason;
  if (reason === "het-quan" || reason === "lap-nuoc") {
    for (const i of [...ROWS[0], ...ROWS[1]]) {
      if ((ctx.prev.dan[i] ?? 0) > 0) t.board.flash(i, "collect", ctx.ms);
    }
  }
  notify(`Hết ván — ${GAME_OVER_TOAST[reason] ?? "Kết thúc"}`, ctx.ms, t);
}
