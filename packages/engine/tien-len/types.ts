// Mô hình dữ liệu Tiến lên miền Nam (docs/tien-len/03-thiet-ke-ky-thuat.md mục 1).

import type { GameResult, SeatId } from "../game-module.ts";

/** Lá bài 0..51: `so * 4 + chat`. so 0..12 = 3,4,…,K,A,2; chat 0..3 = Bích, Chuồn, Rô, Cơ. Số lớn hơn là bài lớn hơn. */
export type Card = number;

export type ComboKind = "le" | "doi" | "ba" | "tuQuy" | "sanh" | "doiThong";

/** Một bộ bài hợp lệ */
export interface Combo {
  kind: ComboKind;
  /** Các lá theo thứ tự tăng dần */
  cards: Card[];
  /** Lá cao nhất, dùng để so sánh */
  top: Card;
  /** Số lá (sảnh), số đôi (đôi thông), 1 với các bộ còn lại tính theo `cards.length` */
  len: number;
}

export type Move = { type: "play"; cards: Card[] } | { type: "pass" };

export interface Options {
  soNguoi: 2 | 3 | 4;
  /** Cho phép chặt heo (3 đôi thông, tứ quý, 4 đôi thông) */
  chatHeo: boolean;
  /** Cho phép tới trắng khi chia bài */
  toiTrang: boolean;
}

export type ToiTrangKind = "tuQuyHeo" | "sanhRong" | "sauDoi";

export interface TableCombo {
  combo: Combo;
  by: SeatId;
}

/** Trạng thái đầy đủ (chỉ server giữ); client nhận `View` */
export interface State {
  options: Options;
  /** Các ghế tham gia, tăng dần; cũng là thứ tự đi */
  seats: SeatId[];
  /** hands[ghế]: bài còn trên tay, tăng dần; rỗng với ghế không tham gia, đã hết bài hoặc đã rời */
  hands: Card[][];
  turn: SeatId;
  /** Bộ đang phải đánh đè; null = đi tự do */
  table: TableCombo | null;
  /** Đã bỏ lượt trong vòng này */
  passed: SeatId[];
  /** Thứ tự hết bài: nhất, nhì… */
  finished: SeatId[];
  /** Người đã rời ván, theo thứ tự rời */
  left: SeatId[];
  /** Lá bài bắt buộc có trong bộ đầu tiên của ván đầu; null khi không ràng buộc */
  mustInclude: Card | null;
  /** Số vòng đã bắt đầu (vòng đầu = 1) */
  round: number;
  /** Số nước đã đi (đánh hoặc bỏ lượt) */
  moveNo: number;
  toiTrang: { seat: SeatId; kind: ToiTrangKind } | null;
  status: "playing" | "finished";
  result: GameResult | null;
}

/** Ván nhìn từ một ghế: chỉ bài của chính mình; hết ván thì lộ hết bài còn lại */
export interface View {
  options: Options;
  seats: SeatId[];
  /** Số lá còn lại theo ghế */
  handSizes: number[];
  /** Bài của người xem; null với người xem không ngồi ghế */
  hand: Card[] | null;
  turn: SeatId;
  table: TableCombo | null;
  passed: SeatId[];
  finished: SeatId[];
  left: SeatId[];
  mustInclude: Card | null;
  round: number;
  moveNo: number;
  toiTrang: { seat: SeatId; kind: ToiTrangKind } | null;
  status: "playing" | "finished";
  result: GameResult | null;
  /** Bài của mọi ghế khi ván đã xong (lộ bài); null khi đang chơi */
  revealed: Card[][] | null;
}

export type GameEvent =
  | { type: "play"; seat: SeatId; cards: Card[]; kind: ComboKind; cut: boolean }
  | { type: "pass"; seat: SeatId }
  | { type: "newRound"; leader: SeatId }
  | { type: "out"; seat: SeatId; rank: number }
  | { type: "left"; seat: SeatId }
  | { type: "toiTrang"; seat: SeatId; kind: ToiTrangKind };
