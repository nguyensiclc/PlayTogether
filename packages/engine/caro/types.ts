// Mô hình dữ liệu Cờ caro (docs/caro/03-thiet-ke-ky-thuat.md mục 2).

import type { GameResult, SeatId } from "../game-module.ts";

/** 0 = X (đi trước), 1 = O */
export type Mark = 0 | 1;

export interface Options {
  /** Bàn kichThuoc × kichThuoc ô */
  kichThuoc: 15 | 19;
  /** UI: "Chặn 2 đầu" — chuỗi 5+ quân bị chặn cả hai đầu thì chưa thắng */
  chanHaiDau: boolean;
  /** giây, null = không giới hạn. Ẩn ở giao diện tới khi có đồng hồ lượt (M4) */
  thoiGianLuot: 15 | 30 | 60 | null;
}

export interface State {
  /** = options.kichThuoc */
  size: number;
  /** Độ dài size × size; chỉ số ô i = y × size + x */
  cells: (Mark | null)[];
  /** players[mark] = ghế đang cầm quân đó. Cố định cả ván; players[0] đi trước */
  players: [SeatId, SeatId];
  turn: Mark;
  /** Số quân đã đặt */
  moveNo: number;
  /** Người đi trước đã nhường lượt (luật mục 3.1); mỗi ván tối đa một lần */
  nhuong: boolean;
  /** Chỉ số ô vừa đặt */
  last: number | null;
  /** Các ô của (các) chuỗi thắng, theo chỉ số tăng dần */
  winLine: number[] | null;
  options: Options;
  status: "playing" | "finished";
  result: GameResult | null;
}

/** Đặt một quân vào ô (x, y) */
export interface PlaceMove {
  x: number;
  y: number;
}

/** Người đi trước nhường lượt: đối thủ cầm X và đi nước đầu tiên (luật mục 3.1) */
export interface YieldMove {
  nhuong: true;
}

export type Move = PlaceMove | YieldMove;

export type EndReason = "nam-quan" | "het-ban" | "bo-cuoc" | "het-gio";

/** GameResult.detail của Cờ caro */
export interface ScoreDetail {
  /** Số quân đã đặt */
  moves: number;
  /** Chuỗi thắng (null nếu hoà hoặc xử thua) */
  line: number[] | null;
  /** marks[mark] = ghế cầm quân đó */
  marks: [SeatId, SeatId];
}

export type GameEvent =
  | { t: "place"; x: number; y: number; by: Mark }
  | { t: "nhuong"; from: SeatId; to: SeatId }
  | { t: "win"; line: number[] }
  | { t: "draw" }
  | { t: "gameOver"; result: GameResult };
