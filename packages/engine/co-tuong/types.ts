// Mô hình dữ liệu Cờ tướng (docs/co-tuong/03-thiet-ke-ky-thuat.md mục 2).

import type { GameResult, SeatId } from "../game-module.ts";

/** 0 = Đỏ (đi trước), 1 = Đen */
export type Side = 0 | 1;

/** `voi` là Tượng (`tuong` đã dùng cho Tướng; luật mục 3) */
export type Kind = "tuong" | "si" | "voi" | "xe" | "phao" | "ma" | "tot";

export interface Piece {
  kind: Kind;
  side: Side;
}

export interface Options {
  /** giây, null = không giới hạn. Ẩn ở giao diện tới khi có đồng hồ lượt (M4) */
  thoiGianLuot: 15 | 30 | 60 | null;
}

export interface Capture {
  from: number;
  to: number;
}

export interface State {
  /** 90 ô; chỉ số i = y × 9 + x (luật mục 2) */
  cells: (Piece | null)[];
  /** players[side] = ghế cầm bên đó. Cố định cả ván; players[0] cầm Đỏ và đi trước */
  players: [SeatId, SeatId];
  turn: Side;
  /** Số nước đã đi */
  moveNo: number;
  /** Nước vừa đi */
  last: Capture | null;
  /** Quân đã bị bắt, theo thứ tự */
  captured: Piece[];
  /** Bên đang đến lượt có bị chiếu không */
  inCheck: boolean;
  /** Khoá thế cờ sau mỗi nước (kèm bên đi tiếp), kể cả thế xuất phát; dùng bắt lặp thế cờ (T5) */
  history: string[];
  options: Options;
  status: "playing" | "finished";
  result: GameResult | null;
}

export interface Move {
  from: number;
  to: number;
}

export type EndReason = "chieu-bi" | "het-nuoc" | "lap-the" | "bo-cuoc" | "het-gio";

/** GameResult.detail của Cờ tướng */
export interface ScoreDetail {
  /** Số nước đã đi */
  moves: number;
  /** marks[side] = ghế cầm bên đó */
  marks: [SeatId, SeatId];
}

export type GameEvent =
  | { t: "move"; from: number; to: number; piece: Piece; captured: Piece | null }
  | { t: "check"; side: Side }
  | { t: "draw" }
  | { t: "gameOver"; result: GameResult };
