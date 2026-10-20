// Mô hình hiển thị: client phát lại events trên state cũ để chạy hiệu ứng,
// xong thì ghi đè bằng state cuối (mục 5 tài liệu kỹ thuật).

import type { SeatId } from "@playtogether/engine";
import type { GameEvent, Pile, State } from "@playtogether/engine/o-an-quan";
import { ROWS } from "@playtogether/engine/o-an-quan";

export interface BoardView {
  dan: number[];
  quan: [boolean, boolean];
  /** Kho điểm theo bên bàn */
  captured: [Pile, Pile];
  /** Ghế đang điều khiển từng bên */
  controller: [SeatId, SeatId];
  buDanCount: [number, number];
  /** Số dân đang cầm trên tay và ô vừa bốc/rải tới */
  hand: { at: number; n: number } | null;
}

export function viewFromState(s: State): BoardView {
  return {
    dan: [...s.dan],
    quan: [s.quan[0], s.quan[1]],
    captured: [{ ...s.captured[0] }, { ...s.captured[1] }],
    controller: [s.controller[0], s.controller[1]],
    buDanCount: [s.buDanCount[0], s.buDanCount[1]],
    hand: null,
  };
}

function clone(v: BoardView): BoardView {
  return {
    dan: [...v.dan],
    quan: [v.quan[0], v.quan[1]],
    captured: [{ ...v.captured[0] }, { ...v.captured[1] }],
    controller: [v.controller[0], v.controller[1]],
    buDanCount: [v.buDanCount[0], v.buDanCount[1]],
    hand: v.hand && { ...v.hand },
  };
}

/** Áp một event lên mô hình hiển thị, trả về bản mới. */
export function applyEvent(view: BoardView, e: GameEvent, giaTriQuan: number): BoardView {
  const v = clone(view);
  switch (e.t) {
    case "pick":
      v.dan[e.i] = 0;
      v.hand = { at: e.i, n: e.n };
      break;
    case "drop":
      v.dan[e.i] = (v.dan[e.i] ?? 0) + 1;
      v.hand = v.hand && v.hand.n > 1 ? { at: e.i, n: v.hand.n - 1 } : null;
      break;
    case "capture":
      v.dan[e.i] = 0;
      if (e.quan) v.quan[e.i === 0 ? 0 : 1] = false;
      v.captured[e.by].dan += e.dan;
      v.captured[e.by].quan += e.quan;
      break;
    case "buDan": {
      const p = v.captured[e.seat];
      if (e.doiQuan) {
        p.quan--;
        p.dan += giaTriQuan;
      }
      p.dan -= 5;
      for (const i of ROWS[e.seat]) v.dan[i] = 1;
      v.buDanCount[e.seat]++;
      break;
    }
    case "latBan":
      v.controller = [v.controller[1], v.controller[0]];
      break;
    case "turnEnd":
    case "gameOver":
      // Hết ván: quân trên bàn giữ nguyên, điểm nằm trong result
      v.hand = null;
      break;
  }
  return v;
}

/** Điểm trong kho: dân + quan × giá trị. */
export function points(p: Pile, giaTriQuan: number): number {
  return p.dan + p.quan * giaTriQuan;
}
