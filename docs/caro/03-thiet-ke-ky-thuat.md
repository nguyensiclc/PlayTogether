# Cờ caro — Thiết kế kỹ thuật

Dùng lại kiến trúc đã có (xem `docs/o-an-quan/03-thiet-ke-ky-thuat.md`): server quyết định mọi thứ, engine là hàm thuần theo `GameModule`, phòng chơi nằm ở `packages/server` và **không chứa luật game cụ thể**. Tài liệu này nói phần **riêng của Caro** và phần **nền tảng cần tổng quát hoá** để chạy được nhiều game.

## 1. Cấu trúc thư mục

```
/packages
  /engine
    /caro
      rules.ts        ← setup, validMoves, applyMove, result, forfeit, parseOptions, parseMove
      types.ts
      rules.test.ts
      index.ts
  /protocol           ← thêm GameId "caro", PublicRoom theo gameId (mục 4)
  /server             ← registry game (mục 4), không chứa luật
  /client
    /caro             ← bàn, quân, kính lúp, hiệu ứng, nhật ký
    /screens          ← chọn LobbyOptions / GameView theo gameId (mục 4)
```

Engine có đường import `@playtogether/engine/caro`. Cú pháp TypeScript chỉ dùng loại "bỏ được" (`erasableSyntaxOnly`) để Node 24 chạy thẳng file `.ts`, như Ô ăn quan.

## 2. Mô hình dữ liệu

```ts
type Mark = 0 | 1;                 // 0 = X (đi trước), 1 = O

interface Options {
  kichThuoc: 15 | 19;
  chanHaiDau: boolean;             // UI: "Chặn 2 đầu"
  thoiGianLuot: 15 | 30 | 60 | null; // giây, ẩn tới M4
}

interface State {
  size: number;                    // = options.kichThuoc
  cells: (Mark | null)[];          // độ dài size × size, chỉ số i = y × size + x
  players: [SeatId, SeatId];       // players[mark] = ghế đang cầm quân đó; players[0] đi trước
  turn: Mark;
  moveNo: number;                  // số quân đã đặt
  last: number | null;             // chỉ số ô vừa đặt
  winLine: number[] | null;        // các ô của (các) chuỗi thắng, theo chỉ số phẳng
  options: Options;
  status: "playing" | "finished";
  result: GameResult | null;
}

interface Move { x: number; y: number }

type GameEvent =
  | { t: "place"; x: number; y: number; by: Mark }
  | { t: "win"; line: number[] }
  | { t: "draw" }
  | { t: "gameOver"; result: GameResult };
```

- `GameResult.winner` là `SeatId`; `scores` theo `SeatId`: thắng 1, thua 0, hoà 0,5. `reason`: `"nam-quan"` (5 quân liên tiếp), `"het-ban"` (hoà), `"bo-cuoc"`, `"het-gio"`. `detail`: `{ moves: number; line: number[] | null; marks: [SeatId, SeatId] }`.
- **Không có `controller`** như Ô ăn quan, vì Caro không có Lật bàn. `players[mark]` cố định cả ván.
- `setup(options, seats, firstPlayer)`: `players = [firstPlayer, người còn lại]`, `turn = 0`.

## 3. Thuật toán

### 3.1 `applyMove`

```
validate: status = playing, players[turn] = seat, x và y là số nguyên trong [0, size), cells[i] = null
cells[i] = turn; last = i; moveNo++; emit place
line = []
for dir in [(1,0), (0,1), (1,1), (1,-1)]:
    run = các ô liền nhau cùng loại qua i theo dir (đếm về hai phía)
    if len(run) >= 5 và (không chanHaiDau hoặc có ít nhất một đầu không bị chặn):
        line ∪= run
if line không rỗng: kết thúc "nam-quan", winner = players[turn]; emit win, gameOver
elif moveNo = size × size: kết thúc "het-ban", hoà; emit draw, gameOver
else turn = 1 − turn
```

- Một đầu **bị chặn** khi ô đó nằm ngoài bàn hoặc có quân đối thủ (C3). Ô trống thì không chặn.
- Chỉ xét các chuỗi **đi qua quân vừa đặt**, nên mỗi nước tốn O(4 × size) thay vì quét cả bàn.
- `validMoves(state, seat)`: mọi ô trống nếu `players[turn] = seat`, ngược lại rỗng. Dùng cho hết giờ (M4) và test.
- `forfeit(state, seat, reason)`: đối thủ thắng, `reason` = `"bo-cuoc"` hoặc `"het-gio"`.
- `parseOptions(raw, base)`: chỉ nhận `kichThuoc ∈ {15, 19}`, `chanHaiDau` boolean, `thoiGianLuot ∈ {15, 30, 60, null}`; còn lại giữ `base`.
- `viewFor`: Caro không có thông tin ẩn, trả về nguyên state.

### 3.2 Bất biến (kiểm tra trong test sau mỗi nước)

- `moveNo` bằng số ô đã có quân; số quân X trừ số quân O ∈ {0, 1}.
- `turn` đúng với `moveNo` chẵn / lẻ khi ván chưa kết thúc.
- Ván kết thúc **khi và chỉ khi** có chuỗi thắng (so với bộ kiểm tra chậm quét toàn bàn, viết riêng trong test) hoặc bàn đầy.
- `winLine` chỉ chứa ô cùng một loại quân và gồm quân vừa đặt.

## 4. Tổng quát hoá nền tảng (mốc C2)

Hiện `protocol`, `server` và `client` mới chỉ biết Ô ăn quan. Để thêm Caro mà **không sao chép**:

| Chỗ | Việc cần làm |
|---|---|
| `GameModule` | Thêm `parseMove(raw: unknown): M \| null` (kiểm tra hình dạng nước đi do client gửi). `parse.ts` của server bỏ hàm `parseMove` riêng của Ô ăn quan và gọi `module.parseMove` |
| `protocol` | `GameId = "o-an-quan" \| "caro"`. `PublicRoom` thành union theo `gameId` (mỗi nhánh có `game` và `options` đúng kiểu); `moveApplied.move` và `events` cũng theo game. Client thu hẹp kiểu bằng `room.gameId` |
| `server` | `RoomManager` có **registry** `{ "o-an-quan": oAnQuan, caro }`. `createRoom` chọn module theo `gameId`. Lớp `Room` và `Gateway` làm việc qua `GameModule`, không import luật game cụ thể |
| `client` | Registry game: tên, biểu tượng, hàm vẽ **tuỳ chọn trong phòng chờ**, hàm dựng **bàn chơi**. `room.ts` chọn theo `room.gameId`. Phòng chờ, nhập nickname, nút Tạo phòng và danh sách trò chơi dùng chung |
| `http` | `GET /api/rooms/:code` trả về `gameId` để màn nhập nickname hiện đúng tên game |

- **Hợp đồng không đổi:** các message WebSocket giữ nguyên. Thêm game chỉ là thêm một giá trị `gameId` và một module.
- Lớp phòng **không bao giờ** kiểm tra luật của game. Tuỳ chọn kiểm bằng `parseOptions`, nước đi kiểm bằng `parseMove` rồi `applyMove`.
- Việc này sửa nhiều **file dùng chung** với Ô ăn quan (`protocol/index.ts`, `server/*`, `client/screens/room.ts`, `lobby.ts`, `home.ts`). Xem mục "Phối hợp" trong `04-ke-hoach-prototype.md`.

### 4.0 Nhường lượt (C14)

`Move = PlaceMove | YieldMove` (`{ nhuong: true }`), `State.nhuong` đánh dấu đã nhường, event `{ t: "nhuong", from, to }`. `applyMove` đổi chỗ `players` và giữ `turn = 0`, `moveNo = 0`. `validMoves` ở nước đầu có thêm nước nhường. Server không cần biết gì thêm: nước đi vẫn qua `parseMove` và `applyMove`.

### 4.1 Client (mốc C3)

```
packages/client/caro/
  board-svg.ts      vẽ bàn thành chuỗi SVG (bàn chính, kính lúp, bàn thu nhỏ) + hàm thuần cellAt, stepCell, loupeViewBox
  board-dom.ts      CaroBoard: nhận chạm / chuột / phím, giữ ô đang chọn, kính lúp
  player-card.ts, move-log.ts, result-view.ts, game-page.ts, caro.css
packages/client/caro/game-view.ts       CaroGameView implements GameScreen
packages/client/caro/client-game.ts     mô tả Cờ caro cho nền tảng (đăng ký ở games/registry.ts)
```

- Bàn vẽ lại cả SVG mỗi lần đổi ô chọn hoặc nước đi (tối đa 361 ô, rẻ). Hiệu ứng quân mới chỉ chạy ở lần vẽ ngay sau nước đi (`fresh`), nên rê chuột không chạy lại.
- `e.target` của `pointerdown` có thể đã bị gỡ khỏi DOM khi sự kiện tới `document` (vì bàn vẽ lại lúc chọn ô), nên kiểm tra "chạm ra ngoài bàn" bằng `composedPath()`.
- Thông báo "Chuỗi 5 bị chặn 2 đầu — chưa thắng" dùng `hasBlockedLine` của engine (không nhân đôi luật ở client).
- Nhật ký ván chỉ có các nước nhận được từ lúc vào màn hình, vì state không lưu thứ tự nước đi. Người nối lại giữa ván thấy nhật ký trống tới nước kế tiếp.

## 5. Bảo mật và chống gian lận

Như Ô ăn quan (kỹ thuật mục 10). Riêng Caro: `x`, `y` phải là số nguyên trong `[0, size)`; kiểm tra ở `parseMove` (hình dạng) và `applyMove` (miền giá trị theo `size`).

## 6. Test

Danh sách ở `04-ke-hoach-prototype.md` mục 4. Test engine viết **trước**, chạy để thấy fail, rồi mới cài luật. Fuzz dùng `createRng(seed)` cố định.
