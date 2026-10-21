# Cờ vua — Thiết kế kỹ thuật

Tài liệu này xác định kiến trúc, mô hình dữ liệu, thuật toán và các điểm tích hợp cho module **Cờ vua** (`co-vua`) trên nền tảng PlayTogether theo hợp đồng chuẩn `GameModule`.

## 1. Cấu trúc thư mục

```
/packages
  /engine
    /co-vua
      types.ts           ← Kiểu dữ liệu cờ vua (Piece, Square, Move, State, Options...)
      rules.ts           ← Setup, validMoves, applyMove, isCheck, parseMove, parseOptions...
      fen.ts             ← Khởi tạo bàn cờ, chuỗi vị trí kiểm tra lặp 3 lần
      index.ts           ← Xuất module implements GameModule<State, Move, Options, GameEvent>
      rules.test.ts      ← Test suite toàn diện (các thế cờ chuẩn, nước đặc biệt, fuzz test)
  /protocol              ← Thêm "co-vua" vào GAME_IDS, kiểu CoVuaRoom, MoveApplied
  /server                ← Đăng ký coVua vào MODULES trong room-manager.ts
  /client
    /co-vua
      client-game.ts     ← Định nghĩa ClientGame cho co-vua
      board-svg.ts       ← Render bàn cờ và 12 quân cờ SVG sắc nét
      game-view.ts       ← Điều phối tương tác bàn cờ, chọn quân, di chuyển, phong cấp
      game-page.ts       ← Khung HTML bàn cờ
      co-vua.css         ← Giao diện riêng bàn cờ cờ vua
      rules-html.ts      ← Nội dung luật chơi
      history-html.ts    ← Lịch sử cờ vua thế giới và Việt Nam
      lobby-options.ts   ← Tuỳ chọn phòng chờ (thời gian ván, v.v.)
```

## 2. Mô hình dữ liệu (`packages/engine/co-vua/types.ts`)

```ts
import type { GameResult, SeatId } from "../game-module.ts";

export type Color = "w" | "b"; // w = Trắng (đi trước, ghế 0), b = Đen (ghế 1)
export type PieceType = "p" | "n" | "b" | "r" | "q" | "k"; // Tốt, Mã, Tượng, Xe, Hậu, Vua

export interface Piece {
  type: PieceType;
  color: Color;
}

/**
 * Chỉ số phẳng ô cờ từ 0 đến 63:
 * file = index % 8 (0..7 tương ứng a..h)
 * rank = Math.floor(index / 8) (0..7 tương ứng hàng 1..8)
 * a1 = 0, b1 = 1, ..., h1 = 7, a2 = 8, ..., h8 = 63.
 */
export type Square = number;

export interface Move {
  from: Square;
  to: Square;
  promotion?: PieceType; // Bắt buộc khi Tốt đi tới hàng cuối ('q', 'r', 'b', 'n')
}

export interface Options {
  /** Thời gian cho mỗi lượt đi hoặc đồng hồ tích lũy (dành cho M4) */
  thoiGianLuot: 15 | 30 | 60 | 180 | null;
}

export interface CastlingRights {
  k: boolean; // Nhập thành cánh Vua (ngắn)
  q: boolean; // Nhập thành cánh Hậu (dài)
}

export interface State {
  /** 64 ô cờ, index 0..63 */
  board: (Piece | null)[];
  /** Ghế ngồi: players[0] cầm Trắng, players[1] cầm Đen */
  players: [SeatId, SeatId];
  /** Lượt hiện tại: 'w' hoặc 'b' */
  turn: Color;
  /** Quyền nhập thành của 2 bên */
  castling: {
    w: CastlingRights;
    b: CastlingRights;
  };
  /** Ô có thể bắt tốt qua đường (nếu có ở nước vừa đi) */
  enPassant: Square | null;
  /** Bộ đếm nửa nước cho luật 50 nước (reset khi đi Tốt hoặc có quân bị ăn) */
  halfmoveClock: number;
  /** Số thứ tự nước đi đầy đủ */
  fullmoveNumber: number;
  /** Nước đi vừa qua */
  lastMove: Move | null;
  /** Trạng thái chiếu hiện tại */
  isCheck: boolean;
  /** Danh sách các thế cờ đã qua (chuỗi định danh vị trí) để kiểm tra lặp 3 lần */
  positionHistory: string[];
  /** Danh sách quân đã bị ăn của mỗi bên */
  captured: {
    w: PieceType[]; // Quân trắng bị đối phương ăn
    b: PieceType[]; // Quân đen bị đối phương ăn
  };
  /** Trạng thái ván đấu */
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
  | { t: "resign"; by: SeatId }
  | { t: "gameOver"; result: GameResult };
```

---

## 3. Thuật toán Engine (`rules.ts`)

Engine là hàm thuần 100%, không phụ thuộc I/O, thời gian thực hay ngẫu nhiên trực tiếp.

### 3.1 Sinh nước đi hợp lệ (`validMoves`)
1. Duyệt qua tất cả 64 ô cờ, tìm các ô có quân thuộc màu của `turn`.
2. Với mỗi quân cờ:
   - Sinh các nước đi bán hợp lệ (pseudo-legal moves) theo luật di chuyển đặc trưng của quân đó (Tốt, Mã, Tượng, Xe, Hậu, Vua, nhập thành, en passant).
   - Thử thực hiện nước đi trên bản sao tạm thời của bàn cờ.
   - Kiểm tra xem sau nước đi đó, Vua của bên đang đi có bị chiếu hay không (`isKingInCheck(tempBoard, turn)`).
   - Nếu Vua **không bị chiếu**, nước đi đó là **hợp lệ** (legal move).

### 3.2 Kiểm tra chiếu (`isKingInCheck`)
- Tìm toạ độ ô Vua của màu chỉ định.
- Kiểm tra xem có bất kỳ quân nào của đối phương có thể tấn công trực tiếp vào ô đó không (quét theo đường thẳng của Xe/Hậu, đường chéo của Tượng/Hậu, 8 vị trí nhảy của Mã, 2 hướng ăn chéo của Tốt đối phương, và Vua đối phương).

### 3.3 Thực hiện nước đi (`applyMove`)
1. Xác thực: `state.status === "playing"`, người gửi lệnh tương ứng với ghế của `turn`.
2. Kiểm tra `move` nằm trong danh sách `validMoves(state, seat)`.
3. Cập nhật vị trí quân cờ, bắt quân (nếu có), xử lý nhập thành (di chuyển Xe tương ứng), xử lý en passant (xóa Tốt bị ăn ở hàng ngang), xử lý phong cấp.
4. Cập nhật quyền nhập thành (nếu Vua hoặc Xe di chuyển, hoặc Xe bị ăn).
5. Đặt lại hoặc tăng `halfmoveClock` (về 0 nếu là nước Tốt hoặc ăn quân, ngược lại +1).
6. Đổi `turn` sang đối thủ, tăng `fullmoveNumber` sau lượt Đen.
7. Kiểm tra trạng thái chiếu (`isCheck`).
8. Kiểm tra kết thúc ván:
   - Nếu đối thủ **không còn nước đi hợp lệ**:
     - Đang bị chiếu: **Chiếu bí (Checkmate)** → Người vừa đi thắng (`scores = [1, 0]` hoặc `[0, 1]`).
     - Không bị chiếu: **Thế bí (Stalemate)** → Hoà (`scores = [0.5, 0.5]`).
   - Nếu thoả mãn điều kiện hoà:
     - `halfmoveClock >= 100` (luật 50 nước).
     - Thế cờ xuất hiện lần thứ 3 (`positionHistory`).
     - Thiếu lực lượng chiếu bí (Insufficient material).

---

## 4. Bất biến kiểm tra trong Fuzz Test

Test ngẫu nhiên (Fuzz testing với 5.000–10.000 ván) kiểm tra các bất biến bất di bất dịch sau mỗi nước đi:
1. Luôn tồn tại chính xác **1 Vua Trắng** và **1 Vua Đen** trên bàn cờ.
2. Vua của bên vừa hoàn thành nước đi **không bao giờ ở trong trạng thái bị chiếu**.
3. Tổng số quân mỗi bên không vượt quá 16; số Tốt mỗi bên không vượt quá 8.
4. Hai Vua không bao giờ đứng ở hai ô kề sát nhau.
5. Ván đấu luôn dừng lại và cho ra kết quả hợp lệ (`GameResult`).

