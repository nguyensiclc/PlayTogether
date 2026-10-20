// Mô hình dữ liệu Ô ăn quan (mục 4 tài liệu kỹ thuật).
import type { GameResult, SeatId } from "../game-module.ts";

/** Bên bàn: 0 = A (ô 1..5), 1 = B (ô 7..11) */
export type Seat = 0 | 1;
export type Dir = 1 | -1;

export interface Options {
  giaTriQuan: 10 | 5;
  /** UI: "Quan Già" */
  camAnQuanNon: boolean;
  /** UI: "Lật bàn" */
  latBan: boolean;
  /** giây, null = không giới hạn */
  thoiGianLuot: 15 | 30 | 60 | null;
}

export interface Pile {
  dan: number;
  quan: number;
}

export interface State {
  /** Độ dài 12, số dân ở từng ô (kể cả ô quan 0 và 6) */
  dan: number[];
  /** quan[0] = ô 0 còn quan?, quan[1] = ô 6 còn quan? */
  quan: [boolean, boolean];
  /** Kho điểm, theo Seat (bên bàn), không theo người chơi */
  captured: [Pile, Pile];
  /** controller[seat] = ghế phòng đang điều khiển bên đó. Lật bàn hoán đổi mảng này */
  controller: [SeatId, SeatId];
  /** Bên đang đến lượt */
  turn: Seat;
  /** Số nước rải đã đi */
  moveNo: number;
  latBanUsed: boolean;
  /** Tối đa 6 nước rải gần nhất, để phát hiện lặp nước */
  recentSows: SowMove[];
  /** Số lần bù dân, theo Seat */
  buDanCount: [number, number];
  options: Options;
  status: "playing" | "finished";
  result: GameResult | null;
}

export interface SowMove {
  kind: "sow";
  square: number;
  dir: Dir;
}

export type Move = SowMove | { kind: "latBan" };

export type EndReason = "het-quan" | "khong-du-bu-dan" | "lap-nuoc" | "het-gio" | "bo-cuoc";

/** GameResult.detail của Ô ăn quan: ScoreDetail[] theo SeatId (người chơi) */
export interface ScoreDetail {
  /** Bên người đó điều khiển lúc kết thúc */
  side: Seat;
  /** Dân trong kho (đã trừ bù dân) */
  dan: number;
  /** Quan trong kho */
  quan: number;
  /** Dân thu trên hàng mình cuối ván (chỉ khi het-quan / lap-nuoc) */
  rowDan: number;
  /** Số lần bù dân */
  buDan: number;
  /** dan + quan × giaTriQuan + rowDan */
  total: number;
}

export type TurnEndReason = "gap-o-quan" | "hai-o-trong" | "het-an" | "quan-non";

export type GameEvent =
  | { t: "pick"; i: number; n: number }
  | { t: "drop"; i: number }
  | { t: "capture"; i: number; dan: number; quan: number; by: Seat }
  | { t: "turnEnd"; reason: TurnEndReason }
  /** Trừ 5 điểm, mỗi ô 1 dân */
  | { t: "buDan"; seat: Seat; doiQuan: boolean }
  /** controller đã hoán đổi */
  | { t: "latBan" }
  | { t: "gameOver"; result: GameResult };
