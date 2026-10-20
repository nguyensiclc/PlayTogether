# Ô ăn quan — Thiết kế kỹ thuật

## 1. Nguyên tắc

1. **Server quyết định mọi thứ.** Client chỉ gửi *ý định* (chọn ô X, chiều Y). Server kiểm tra, tính toán và phát kết quả.
2. **Engine là hàm thuần.** `(state, move) → { state, events }`, không I/O, không phụ thuộc thời gian thực. Nhờ vậy engine dễ test và dùng chung được cho server và client.
3. **Mỗi game là một module theo cùng giao diện `GameModule`.** Ô ăn quan là module đầu tiên. Lớp phòng chơi và lớp mạng không biết gì về luật của từng game.
4. **Trạng thái phòng có thể tái tạo được.** Lưu nước đi theo thứ tự thì phát lại (replay) sẽ ra đúng ván cũ.

## 2. Kiến trúc

```
┌──────────── Trình duyệt ─────────────┐         ┌──────────────── Server Node.js ────────────────┐
│ UI (render bàn, hiệu ứng)            │         │ HTTP: phục vụ file tĩnh, GET /r/:code          │
│   ▲  state + events                  │  WS     │ WS gateway: nhận/gửi message, xác thực client  │
│   │                                  │◄──────► │ RoomManager: tạo/xoá phòng, ghế, chủ phòng     │
│ Client store ── gửi intent ──────────┤         │ Room: vòng đời lobby → playing → finished      │
│ (dùng chung engine để kiểm tra trước,│         │   └─ GameModule (o-an-quan engine)             │
│  sáng ô hợp lệ)                      │         │ Timer: đồng hồ lượt, dọn phòng rỗng            │
└──────────────────────────────────────┘         └────────────────────────────────────────────────┘
```

### Công nghệ cho prototype

| Phần | Lựa chọn | Lý do |
|---|---|---|
| Ngôn ngữ | TypeScript ở cả hai phía | Engine dùng chung, có kiểu dữ liệu chặt |
| Server | Node.js 24 + `ws` | Tối giản, đủ cho game theo lượt. Khi có nhiều game sẽ cân nhắc chuyển sang Colyseus |
| Client | Vite + TypeScript thuần (chưa dùng framework) | Bàn cờ nhỏ, render bằng DOM/CSS là đủ. Nếu UI phình to thì chuyển sang React |
| Lưu trữ | Bộ nhớ RAM trên server | Prototype chưa cần lưu bền. Bản sau dùng Redis |
| Test | Vitest | Chủ yếu test engine |

### Cấu trúc thư mục dự kiến

```
/packages
  /engine            ← dùng chung, KHÔNG phụ thuộc DOM hay Node
    game-module.ts   ← interface GameModule
    /o-an-quan
      rules.ts       ← setup, validMoves, applyMove, result
      types.ts
      rules.test.ts
  /server
    index.ts         ← http + ws
    room-manager.ts
    room.ts
  /client
    index.html
    main.ts          ← định tuyến: / (trang chủ), /offline
    style.css        ← token và bố cục theo docs/design (desktop ≥ 1024px bằng media query)
    /screens
      home.ts        ← trang chủ, danh sách trò chơi, lọc theo nhóm
      offline.ts     ← M2: màn hình bắt đầu, bàn chơi chung một máy, Lật bàn, kết quả, phím tắt
    /o-an-quan
      layout.ts      ← xếp 12 ô lên bàn 7 cột theo bên ngồi dưới
      view-model.ts  ← phát lại events trên state cũ (BoardView)
      playback.ts    ← chạy events theo thời lượng UX mục 4, tua nhanh, bỏ qua
      board-dom.ts   ← vẽ bàn bằng DOM/CSS, hiệu ứng ô, thanh ◀ ▶
      move-log.ts    ← nhật ký ván: mô tả từng nước từ events
```

Engine có hai đường import: `@playtogether/engine` (GameModule, RNG) và `@playtogether/engine/o-an-quan` (luật và kiểu dữ liệu Ô ăn quan).

## 3. Giao diện `GameModule`

```ts
type SeatId = number;                // chỉ số ghế trong phòng: 0, 1, ...

interface GameResult {
  winner: SeatId | null;             // null = hoà
  scores: number[];                  // điểm cuối, theo SeatId
  reason: string;                    // vd "het-quan", "khong-du-dan"
  detail?: unknown;                  // chi tiết riêng của từng game
}

interface GameModule<S, M, O, E> {
  id: string;                        // "o-an-quan"
  minPlayers: number;                // 2
  maxPlayers: number;                // 2
  defaultOptions: O;
  setup(options: O, seats: SeatId[], firstPlayer: SeatId): S;
  validMoves(state: S, seat: SeatId): M[];
  applyMove(state: S, seat: SeatId, move: M): { state: S; events: E[] } | { error: string };
  viewFor(state: S, seat: SeatId | null): unknown;   // Ô ăn quan không có thông tin ẩn → trả về nguyên state
  result(state: S): GameResult | null;
}
```

- `E` là kiểu event riêng của từng game (của Ô ăn quan là `GameEvent` ở mục 5). Nhờ vậy lớp phòng không phụ thuộc event của game cụ thể.
- `applyMove` không sửa state đầu vào. Lỗi trả về dùng mã của giao thức (mục 7): `NOT_YOUR_TURN` khi sai lượt hoặc ghế không hợp lệ, `INVALID_MOVE` cho mọi trường hợp còn lại (ván đã kết thúc, ô không thuộc mình, ô trống, ô quan, chiều sai).
- `game-module.ts` có thêm `type Rng = () => number`, `createRng(seed)` (RNG có seed, dùng cho test/replay) và `pickRandom(items, rng)` (chọn nước ngẫu nhiên khi hết giờ). Luật Ô ăn quan không cần ngẫu nhiên, vì người đi trước được truyền vào `setup`.

## 4. Mô hình dữ liệu Ô ăn quan

```ts
type Seat = 0 | 1;          // 0 = A (ô 1..5), 1 = B (ô 7..11)
type Dir = 1 | -1;

interface Options {
  giaTriQuan: 10 | 5;
  camAnQuanNon: boolean;               // UI: "Quan Già"
  latBan: boolean;                     // UI: "Lật bàn"
  thoiGianLuot: 15 | 30 | 60 | null;   // giây
}

interface State {
  dan: number[];                 // độ dài 12, số dân ở từng ô (kể cả ô quan 0 và 6)
  quan: [boolean, boolean];      // quan[0] = ô 0 còn quan?, quan[1] = ô 6 còn quan?
  captured: [Pile, Pile];        // kho điểm, theo Seat (bên bàn), KHÔNG theo người chơi
  controller: [SeatId, SeatId];  // controller[seat] = ghế phòng đang điều khiển bên đó. Lật bàn hoán đổi mảng này
  turn: Seat;                    // bên đang đến lượt
  moveNo: number;                // số nước rải đã đi
  latBanUsed: boolean;
  recentSows: SowMove[];         // tối đa 6 nước rải gần nhất, để phát hiện lặp nước. Lật bàn xoá mảng này
  buDanCount: [number, number];  // số lần bù dân, theo Seat (để hiển thị)
  options: Options;
  status: "playing" | "finished";
  result: GameResult | null;
}

interface Pile { dan: number; quan: number; }

type SowMove = { kind: "sow"; square: number; dir: Dir };
type Move = SowMove | { kind: "latBan" };

type EndReason = "het-quan" | "khong-du-bu-dan" | "lap-nuoc" | "het-gio" | "bo-cuoc";

// GameResult.detail của Ô ăn quan: ScoreDetail[] theo SeatId (người chơi)
interface ScoreDetail {
  side: Seat;         // bên người đó điều khiển lúc kết thúc
  dan: number;        // dân trong kho (đã trừ bù dân)
  quan: number;       // quan trong kho
  rowDan: number;     // dân thu trên hàng mình cuối ván (chỉ khi het-quan / lap-nuoc)
  buDan: number;      // số lần bù dân
  total: number;      // dan + quan × giaTriQuan + rowDan
}
```

- `GameResult.reason` là một `EndReason`. Với `khong-du-bu-dan`, `het-gio` và `bo-cuoc`, người thua được xác định theo lý do kết thúc, **không** theo điểm.
- Engine có thêm hàm `forfeit(state, seatId, reason: "het-gio" | "bo-cuoc")` để lớp phòng xử thua. Lớp phòng tự đếm số lượt bị đi thay và thời gian mất kết nối.
- Khi validate một nước đi, quyền đi được xác định bằng `controller[turn] === seatId`, không dùng `turn === seatId`.
- `setup(options, seats, firstPlayer)`: **bên A luôn đi trước**, tức `turn = 0`, `controller[0] = firstPlayer`, `controller[1]` là ghế còn lại (Q17).
- `validMoves(state, seatId)` trả về **mọi** nước hợp lệ của người đó, gồm cả `{ kind: "latBan" }` khi được phép lật. Client dựa vào đó để biết lúc nào hiện hộp hỏi Lật bàn (Q18).
- Khi ván kết thúc, engine **giữ nguyên quân trên bàn**. Dân thu cuối ván chỉ được ghi vào `ScoreDetail.rowDan`, không chuyển vào `captured`. Nhờ vậy bất biến tổng điểm vẫn đúng sau nước cuối, kể cả khi lặp nước (quân trong ô quan không được tính).
- `forfeit` trả về cùng dạng với `applyMove`: `{ state, events: [gameOver] } | { error }`. Lỗi `INVALID_MOVE` khi ván đã kết thúc hoặc ghế không có trong ván. Điểm là kho hiện tại, không thu quân trên bàn.
- Engine export thêm `ROWS` (các ô dân của từng bên), `isQuanSquare`, `owner`, `next`, `isEmpty` để client dùng chung.

Các hàm tiện ích:
- `isQuanSquare(i) = i === 0 || i === 6`
- `owner(i) = 1 ≤ i ≤ 5 ? 0 : 7 ≤ i ≤ 11 ? 1 : null`
- `next(i, dir) = (i + dir + 12) % 12`
- `isEmpty(i) = dan[i] === 0 && !(isQuanSquare(i) && quanAt(i))`

**Bất biến** (kiểm tra trong test sau mỗi nước đi): **tổng điểm** = (dân trên bàn + quan trên bàn × v) + (kho dân + kho quan × v của cả hai bên) = 70 (hoặc 60), với v = `giaTriQuan`. Không còn bất biến "tổng quan = 2", vì khi bù dân có thể đổi quan thành dân.

## 5. Thuật toán `applyMove`

### 5.1 Lật bàn

```
validate: status = playing, options.latBan, !latBanUsed, moveNo = 1, controller[turn] = seatId
controller = [controller[1], controller[0]]; latBanUsed = true; recentSows = []
turn giữ nguyên  → người mở đầu giờ điều khiển bên đang đến lượt và phải đi
emit latBan
```

### 5.2 Nước rải

```
validate: status = playing, controller[turn] = seatId, owner(square) = turn, dan[square] > 0, dir ∈ {1,-1}
seat = turn

hand = dan[square]; dan[square] = 0; emit pick(square, hand)
pos = square
loop:
  while hand > 0: pos = next(pos); dan[pos]++; hand--; emit drop(pos)
  n = next(pos)
  if !isQuanSquare(n) && dan[n] > 0:            # (a) bốc rải tiếp
      hand = dan[n]; dan[n] = 0; pos = n; emit pick(n, hand); continue
  if isQuanSquare(n) && !isEmpty(n):            # (b)
      emit turnEnd("gap-o-quan"); break
  # n trống
  t = next(n)
  if isEmpty(t): emit turnEnd("hai-o-trong"); break      # (d)
  # (c) + ăn dây
  while true:
      if isQuanSquare(t) && quanAt(t) && dan[t] < 5 && options.camAnQuanNon:
          emit turnEnd("quan-non"); break
      capture(t) → cộng vào captured[seat]; emit capture(t, dan, quan)
      e = next(t); t2 = next(e)
      if isEmpty(e) && !isEmpty(t2): t = t2; continue
      emit turnEnd("het-an"); break
  break

moveNo++; recentSows.push(move), chỉ giữ 6 phần tử cuối

if cả hai ô quan isEmpty:
    kết thúc "het-quan": mỗi bên thu dân trên hàng mình; so điểm; emit gameOver
elif recentSows có 6 phần tử dạng X Y X Y X Y:
    kết thúc "lap-nuoc": mỗi bên thu dân trên hàng mình; quân trong ô quan không tính; so điểm; emit gameOver
else:
  turn = 1 - turn
  if 5 ô của turn đều trống:                                   # Bù dân
      v = giaTriQuan; p = captured[turn]
      if p.dan + p.quan × v < 5:
          kết thúc "khong-du-bu-dan": bên turn thua; emit gameOver
      else:
          doiQuan = p.dan < 5
          if doiQuan: p.quan--; p.dan += v
          p.dan -= 5; mỗi ô của turn = 1; buDanCount[turn]++
          emit buDan(turn, doiQuan)
```

Thứ tự kiểm tra kết thúc ván: **hết quan → lặp nước → bù dân**.

> Vòng lặp `while hand > 0` có thể đi qua chính ô vừa bốc. Điều này đúng luật: ô đó chỉ bị bỏ qua tại thời điểm bốc, không bị bỏ qua khi rải vòng tới.

### Sự kiện (events) cho hiệu ứng

```ts
type GameEvent =
  | { t: "pick"; i: number; n: number }
  | { t: "drop"; i: number }
  | { t: "capture"; i: number; dan: number; quan: number; by: Seat }
  | { t: "turnEnd"; reason: "gap-o-quan" | "hai-o-trong" | "het-an" | "quan-non" }
  | { t: "buDan"; seat: Seat; doiQuan: boolean }   // trừ 5 điểm, mỗi ô 1 dân
  | { t: "latBan" }                                // controller đã hoán đổi
  | { t: "gameOver"; result: GameResult };
```

Client nhận `events` cùng `state` cuối. Client **phát lại** các events trên bản state cũ để chạy hiệu ứng, xong thì **ghi đè bằng state cuối** của server. Cách này tránh lệch trạng thái nếu hiệu ứng có lỗi.

## 6. Phòng chơi (dùng chung cho mọi game)

```ts
interface Room {
  code: string;                  // 4 ký tự, bỏ các ký tự dễ nhầm: 0 O 1 I L
  gameId: "o-an-quan";
  hostId: ClientId;
  seats: (ClientId | null)[];    // độ dài = maxPlayers
  members: Map<ClientId, Member>;// gồm cả người xem
  status: "lobby" | "playing" | "finished";
  options: Options;
  game: State | null;
  moves: Move[];                 // để replay/debug
  turnDeadline: number | null;   // epoch ms
  rematchVotes: Set<ClientId>;
  lastActivity: number;
}

interface Member { id: ClientId; name: string; connected: boolean; disconnectedAt?: number; }
```

- **Danh tính:** client tự sinh `clientId` (UUID) và lưu trong `localStorage`, gửi kèm khi kết nối. Prototype chấp nhận rủi ro mạo danh. Bản sau server sẽ cấp token ký số.
- **Mã phòng:** 4 ký tự từ bảng 31 ký tự, cho khoảng 920 nghìn tổ hợp. Mỗi lần sinh thì kiểm tra trùng.
- **Dọn phòng:** phòng không còn ai kết nối trong 10 phút thì bị xoá.

## 7. Giao thức WebSocket

Mọi message là JSON có dạng `{ type, ...payload }`. Kết nối tại `wss://<host>/ws`.

### Client → Server

| type | payload | Ghi chú |
|---|---|---|
| `hello` | `clientId, name` | Gửi đầu tiên sau khi kết nối |
| `createRoom` | `gameId, options?` | Trả về `roomJoined` |
| `joinRoom` | `code` | Tự ngồi ghế trống nếu có |
| `takeSeat` / `leaveSeat` | `seat?` | Chỉ dùng khi ở phòng chờ |
| `setOptions` | `options` | Chỉ chủ phòng, chỉ khi ở phòng chờ |
| `start` | — | Chỉ chủ phòng, cần đủ người |
| `move` | `move, moveNo` | `moveNo` dùng để chống gửi trùng hoặc gửi nước cũ |
| `rematch` | — | Bỏ phiếu chơi lại |
| `emote` | `emoji` | Giới hạn 1 lần / giây |
| `leaveRoom` | — | |

### Server → Client

| type | payload |
|---|---|
| `roomJoined` | `room` (bản công khai), `you: { clientId, seat }` |
| `roomUpdated` | `room` (thành viên, ghế, tuỳ chọn, trạng thái) |
| `gameStarted` | `state, turnDeadline` |
| `moveApplied` | `seat, move, events, state, turnDeadline` |
| `emote` | `from, emoji` |
| `error` | `code, message` (vd: `ROOM_NOT_FOUND`, `NOT_YOUR_TURN`, `INVALID_MOVE`, `STALE_MOVE`) |

## 8. Đồng hồ lượt

- Server đặt `turnDeadline = now + thoiGianLuot + animationBudget(events)`, với `animationBudget ≈ 180ms × số drop + 400ms × số capture` (tối đa 8 giây).
- Hết giờ: server chọn ngẫu nhiên trong các nước `kind = "sow"` của `validMoves` (không bao giờ chọn `latBan`) rồi áp dụng như nước đi bình thường. Đếm số lượt bị đi thay liên tiếp của người đó, đủ 3 lần thì xử thua.
- Client chỉ hiển thị đếm ngược dựa trên `turnDeadline`. Client không tự quyết định hết giờ.

## 9. Mất kết nối và kết nối lại

- Khi WS bị ngắt: client tự kết nối lại với độ trễ tăng dần (1s, 2s, 4s, tối đa 10s), rồi gửi lại `hello` và `joinRoom`. Server khôi phục đúng ghế nhờ `clientId`.
- Server đánh dấu `connected = false` và **vẫn giữ ghế 60 giây**. Trong thời gian này đồng hồ lượt vẫn chạy bình thường.
- Quá 60 giây mà người chơi đang trong ván: xử **thua do bỏ cuộc**, phòng chuyển sang `finished`.
- Khi tab chuyển ra nền (người chơi qua Zalo rồi quay lại): dùng sự kiện `visibilitychange` để chủ động kiểm tra kết nối ngay khi quay lại.

## 10. Bảo mật và chống gian lận (mức prototype)

- Mọi nước đi đều được kiểm tra lại trên server. Client không thể tự ý sửa điểm.
- Giới hạn tần suất: tối đa 20 message / giây mỗi kết nối, vượt quá thì ngắt kết nối.
- Nickname: tối đa 20 ký tự, cắt khoảng trắng thừa, escape khi hiển thị để chống XSS.
- Kích thước message tối đa 4KB.

## 11. Triển khai thử

- Chạy local: `npm run dev` (server và Vite chạy cùng lúc).
- Mời bạn chơi thử từ xa: dùng **Cloudflare Tunnel** hoặc **ngrok** để có link HTTPS công khai.
- Khi cần cố định: deploy lên một VPS nhỏ hoặc Fly.io/Render. Cần dịch vụ hỗ trợ WebSocket, tức là **không dùng được** môi trường serverless thuần như Vercel Functions.
