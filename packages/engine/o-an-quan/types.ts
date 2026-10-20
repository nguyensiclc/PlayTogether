// Mô hình dữ liệu Ô ăn quan (mục 4 tài liệu kỹ thuật).
import type { GameResult } from "../game-module.ts";

/** 0 = A (ô 1..5), 1 = B (ô 7..11) */
export type Seat = 0 | 1;
export type Dir = 1 | -1;

export interface Options {
  giaTriQuan: 10 | 5;
  camAnQuanNon: boolean;
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
  /** Theo Seat */
  captured: [Pile, Pile];
  /** Số dân Seat i đã vay của đối phương */
  debt: [number, number];
  turn: Seat;
  moveNo: number;
  options: Options;
  status: "playing" | "finished";
  result: GameResult | null;
}

export interface Move {
  square: number;
  dir: Dir;
}

/** GameResult.detail của Ô ăn quan: ScoreDetail[] theo Seat */
export interface ScoreDetail {
  /** Dân đã ăn trong ván */
  dan: number;
  /** Quan đã ăn, cộng cả quan thu trên bàn khi kết thúc theo mục 6.4 */
  quan: number;
  /** Dân thu trên bàn cuối ván */
  rowDan: number;
  /** Nợ đã vay (bị trừ) */
  borrowed: number;
  /** Nợ đã cho vay (được cộng) */
  lent: number;
  /** dan + quan × giaTriQuan + rowDan − borrowed + lent */
  total: number;
}

export type TurnEndReason = "gap-o-quan" | "hai-o-trong" | "het-an" | "quan-non";

export type GameEvent =
  | { t: "pick"; i: number; n: number }
  | { t: "drop"; i: number }
  | { t: "capture"; i: number; dan: number; quan: number; by: Seat }
  | { t: "turnEnd"; reason: TurnEndReason }
  | { t: "spread"; seat: Seat; fromOwn: number; borrowed: number }
  | { t: "gameOver"; result: GameResult };
