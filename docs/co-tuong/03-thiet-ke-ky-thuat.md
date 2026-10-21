# Cờ tướng — Thiết kế kỹ thuật

Dùng lại kiến trúc nền tảng (`docs/kien-truc-module.md`): server quyết định mọi thứ, engine là hàm thuần theo `GameModule`, lớp phòng không chứa luật. Làm theo **danh sách ở `kien-truc-module.md` mục 3**. Không cần sửa hợp đồng dùng chung; nếu thấy phải sửa (`GameModule`, `ClientGame`…) thì dừng và theo CLAUDE.md quy tắc 8.

## 1. Cấu trúc thư mục

```
packages/engine/co-tuong/   types.ts, moves.ts (cách đi, phát hiện chiếu), rules.ts (luồng ván), index.ts, rules.test.ts
packages/client/co-tuong/   client-game.ts, game-view.ts, game-page.ts, board-svg.ts,
                            board-svg.ts, board-dom.ts, player-card.ts, move-log.ts, result-view.ts,
                            rules-html.ts, history-html.ts, lobby-options.ts, art.ts, co-tuong.css
```

Điểm đăng ký (mỗi nơi một dòng): `engine/package.json` (`exports`), `protocol/index.ts` (`GAME_IDS`, kiểu `CoTuongRoom`), `server/room-manager.ts` (`MODULES`), `client/games/registry.ts`. Bỏ mục "sắp có" của Cờ tướng khỏi `client/games/catalog.ts` nếu có.

## 2. Mô hình dữ liệu

```ts
type Side = 0 | 1;                       // 0 = Đỏ (đi trước), 1 = Đen
type Kind = "tuong" | "si" | "voi" | "xe" | "phao" | "ma" | "tot";
interface Piece { kind: Kind; side: Side }

interface Options {
  thoiGianLuot: 15 | 30 | 60 | null;       // ẩn tới M4
}

interface State {
  cells: (Piece | null)[];            // 90 ô, chỉ số i = y × 9 + x (luật mục 2)
  players: [SeatId, SeatId];          // players[side]; players[0] cầm Đỏ
  turn: Side;
  moveNo: number;
  last: { from: number; to: number } | null;
  captured: Piece[];                  // quân đã bị bắt, theo thứ tự
  inCheck: boolean;                   // bên đang đến lượt có bị chiếu
  history: string[];                  // khoá thế cờ để phát hiện lặp (T5)
  options: Options;
  status: "playing" | "finished";
  result: GameResult | null;
}

interface Move { from: number; to: number }
```

`GameEvent`: `move` (kèm quân bị ăn nếu có), `check`, `win`, `draw`, `gameOver`. `GameResult.reason`: `"chieu-bi"`, `"het-nuoc"`, `"bo-cuoc"`, `"het-gio"`, `"hoa"`. `scores` thắng 1, thua 0, hoà 0,5.

## 3. Thuật toán

- `pseudoMoves(state, i)`: các nước đúng cách đi của quân tại `i` (luật mục 4), chưa xét chiếu.
- `isInCheck(cells, side)` (trong `moves.ts`): đi các tia ngang dọc từ ô Tướng (Xe, Tướng đối mặt, Pháo qua ngòi), xét Mã (kèm chân mã) và Tốt; không duyệt mọi quân địch.
- `legalMoves(state, seat)`: mỗi nước của `pseudoMoves`, thử đi trên bản sao, giữ nước mà `isInCheck` sai cho bên vừa đi. Bàn nhỏ (90 ô), nên chi phí không đáng kể.
- `applyMove`: kiểm tra đúng lượt và `to` có trong `legalMoves`; cập nhật bàn, `captured`, `last`, `moveNo`; đổi lượt; tính `inCheck` cho bên kế tiếp; nếu bên đó hết nước thì kết thúc (`chieu-bi` nếu đang bị chiếu, ngược lại `het-nuoc`).
- `parseMove(raw)`: `{ from, to }` là số nguyên trong `[0, 90)`. `parseOptions(raw, base)`: chỉ nhận giá trị trong miền cho phép, còn lại giữ `base`.
- `forfeit(state, seat, reason)`: đối thủ thắng.
- `viewFor`: không có thông tin ẩn, trả nguyên state.

Engine không biết "xoay bàn" hay phía người xem; client lo.

## 4. Bất biến (kiểm tra sau mỗi nước trong fuzz)

- Mỗi bên đúng 1 Tướng cho tới khi ván kết thúc; số quân mỗi loại không tăng; `cells` đủ 90 ô.
- Tổng quân trên bàn + `captured` = 32.
- Sau mỗi nước, tướng của bên **vừa đi** không bị chiếu và hai tướng không đối mặt.
- `turn` đúng với `moveNo` chẵn / lẻ; ván kết thúc khi và chỉ khi bên đến lượt không có nước hợp lệ (hoặc bỏ cuộc / hoà theo T4–T6).
- `legalMoves` so với bộ kiểm tra chậm viết riêng trong test.

## 5. Client

- Bàn vẽ bằng SVG: lưới, sông, cung, các điểm đánh dấu pháo và tốt; quân là hình tròn có chữ Hán hoặc chữ Việt (T9). Hàm thuần `cellAt`, `orient` (xoay cho người cầm Đen).
- Quân phân biệt bằng **chữ**, không chỉ bằng màu (Đỏ / Đen).
- Dùng lại `game-ui/` (log, kết quả, thẻ người chơi, hộp xác nhận). Chưa có gì để chuyển lên phần chung ngoài những gì đã có; nếu phát hiện lặp với Caro thì gom lại theo quy tắc 4.

## 5b. Xin thua (T4)

Dùng message dùng chung `{ type: "resign" }`: `Room.resign` gọi `module.forfeit(seat, "bo-cuoc")`, tăng `actionNo`, người xin thua **giữ ghế và ở lại phòng**. `GameActions.resign()` có sẵn cho mọi game; hiện chỉ Cờ tướng có nút.

## 6. Bảo mật

Như Ô ăn quan (kỹ thuật mục 10). Mọi nước đi qua `parseMove` rồi `applyMove`; server không tin client về quân đang chọn hay danh sách nước đi.

## 7. Test

Danh sách ở `04-ke-hoach-prototype.md` mục 4. Viết **trước**, thấy fail, rồi mới cài luật. Fuzz dùng `createRng(seed)` cố định.

## 8. Bot (chơi một mình)

Chốt với chủ dự án: bot **chỉ cho Cờ tướng** lần này, vào bằng **ghế 2 trong phòng chờ**, ba mức khó, AI chạy **trên server**.

- **Hạ tầng bot dùng chung** (đã có trên main, do Cờ vua thêm trước): `GameModule.bot?: BotSupport` (`levels`, `chooseMove`), message `addBot { seat, level }` / `removeBot { seat }`, `PublicMember.isBot`, `room.botSupported`, `ClientGame.botSupported`. Máy là thành viên của phòng, tự đồng ý Ván nữa, Gateway hẹn máy đi sau một khoảng ngắn. Cờ tướng chỉ cung cấp `coTuongBot` (`engine/co-tuong/ai.ts`) và đặt `botSupported: true`; không thêm gì vào phần dùng chung.
- **AI (`engine/co-tuong/ai.ts`)**: hàm thuần, giới hạn việc bằng **số nút tìm kiếm** (không dùng đồng hồ), ngẫu nhiên chỉ qua `rng`.
  - **Dễ:** một nửa số lần chọn nước ăn quân giá trị nhất nếu có, còn lại đi ngẫu nhiên.
  - **Vừa:** tìm 2 nước (negamax alpha-beta, kèm tìm thêm các nước ăn quân ở cuối nhánh), chọn ngẫu nhiên trong các nước kém nước tốt nhất không quá 0,8 Tốt. Thấy chiếu bí trong 1 nước.
  - **Khó:** tìm sâu dần tới 4 nước, ngân sách 90.000 nút (khoảng 0,8 giây mỗi nước, tối đa chừng 3 giây), chọn ngẫu nhiên giữa các nước ngang điểm tốt nhất.
  - Điểm thế cờ: giá trị quân (Xe 9, Pháo 4,5, Mã 4, Sĩ và Tượng 2, Tốt 1) cộng Tốt qua sông/tiến sâu và Xe, Mã, Pháo gần giữa bàn. Hết nước đi tính là thua, như luật.
- **Hạn chế đã biết:** AI chạy đồng bộ trên luồng của server (mức Khó có thể chặn vài giây khi nhiều phòng cùng chơi với máy); chưa biết tránh lặp thế cờ; test độ mạnh chỉ so các mức với nhau qua vài ván giới hạn số nước.
