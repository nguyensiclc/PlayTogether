// Kiểu dữ liệu Cờ vua (docs/co-vua/03-thiet-ke-ky-thuat.md).

import type { GameResult, SeatId } from "../game-module.ts";

export type Color = "w" | "b"; // w = Trắng (đi trước, players[0]), b = Đen (players[1])
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k"; // Tốt, Mã, Tượng, Xe, Hậu, Vua

export interface Piece {
  type: PieceType;
  color: Color;
}

/**
 * Chỉ số phẳng ô cờ từ 0 đến 63:
 * file = sq % 8 (0..7 tương ứng a..h)
 * rank = Math.floor(sq / 8) (0..7 tương ứng hàng 1..8)
 * a1 = 0, b1 = 1, ..., h1 = 7, a2 = 8, ..., h8 = 63.
 */
export type Square = number;

export interface StandardMove {
  from: Square;
  to: Square;
  promotion?: PieceType; // 'q' | 'r' | 'b' | 'n' khi Tốt tới hàng 8 (Trắng) hoặc hàng 1 (Đen)
}

export interface DrawOfferMove {
  drawOffer: true;
}

export interface DrawAcceptMove {
  drawAccept: true;
}

export type Move = StandardMove | DrawOfferMove | DrawAcceptMove;

export interface CastlingRights {
  k: boolean; // Nhập thành cánh Vua (ngắn O-O)
  q: boolean; // Nhập thành cánh Hậu (dài O-O-O)
}

export interface Options {
  thoiGianLuot: 15 | 30 | 60 | 180 | null;
}

export type EndReason =
  | "chieu-bi"
  | "the-bi"
  | "lap-3-lan"
  | "50-nuoc"
  | "thieu-luc-luong"
  | "hoa-thuan"
  | "bo-cuoc"
  | "het-gio";

export interface ScoreDetail {
  moves: number;
  winnerColor: Color | null;
  captured: {
    w: PieceType[];
    b: PieceType[];
  };
}

export interface State {
  board: (Piece | null)[];
  players: [SeatId, SeatId]; // players[0] cầm Trắng, players[1] cầm Đen
  turn: Color;
  castling: {
    w: CastlingRights;
    b: CastlingRights;
  };
  enPassant: Square | null; // Ô đích mà tốt có thể bị bắt qua đường
  halfmoveClock: number; // Đếm số nửa nước cho luật 50 nước
  fullmoveNumber: number; // Số thứ tự nước đi đầy đủ (bắt đầu từ 1)
  lastMove: Move | null;
  isCheck: boolean;
  positionHistory: string[]; // Chuỗi vị trí chuẩn để kiểm tra lặp 3 lần
  drawOfferedBy: Color | null; // Bên đang đề nghị hoà (null nếu không có)
  captured: {
    w: PieceType[]; // Quân trắng bị ăn
    b: PieceType[]; // Quân đen bị ăn
  };
  options: Options;
  status: "playing" | "finished";
  result: GameResult | null;
}

export type GameEvent =
  | {
      t: "move";
      from: Square;
      to: Square;
      piece: Piece;
      captured?: Piece;
      promotion?: PieceType;
      castling?: "k" | "q";
      enPassant?: boolean;
    }
  | { t: "check"; color: Color }
  | { t: "checkmate"; winner: Color }
  | { t: "stalemate" }
  | { t: "draw"; reason: "50-moves" | "repetition" | "insufficient-material" | "agreement" }
  | { t: "drawOffer"; by: Color }
  | { t: "drawDecline"; by: Color }
  | { t: "gameOver"; result: GameResult };
