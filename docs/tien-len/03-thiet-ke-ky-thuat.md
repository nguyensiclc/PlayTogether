# Tiến lên miền Nam — Thiết kế kỹ thuật

Theo `docs/kien-truc-module.md`: engine là hàm thuần trong `packages/engine/tien-len/`, lớp phòng chỉ làm việc qua `GameModule`.

## 1. Kiểu dữ liệu (`types.ts`)

```ts
type Card = number;                 // 0..51, giaTri = so * 4 + chat; so 0..12 = 3..K,A,2; chat 0..3 = Bích, Chuồn, Rô, Cơ
type ComboKind = "le" | "doi" | "ba" | "tuQuy" | "sanh" | "doiThong";
interface Combo { kind: ComboKind; cards: Card[]; /* tăng dần */ top: Card; /* lá cao nhất */ len: number }

type Move = { type: "play"; cards: Card[] } | { type: "pass" };

interface Options { soNguoi: 2 | 3 | 4; chatHeo: boolean; toiTrang: boolean }

interface State {
  options: Options;
  seats: SeatId[];                  // ghế đang tham gia, theo thứ tự đi
  hands: Card[][];                  // theo chỉ số ghế; bài của người đã hết/rời là []
  turn: SeatId;
  table: { combo: Combo; by: SeatId } | null;   // bộ trên bàn; null = đi tự do
  passed: boolean[];                // đã bỏ lượt trong vòng này
  finished: SeatId[];               // thứ tự hết bài (nhất, nhì…)
  left: SeatId[];                   // người đã rời ván
  winByDeal: SeatId | null;         // tới trắng
  round: number;                    // số vòng đã diễn ra (cho nhật ký)
}
```

## 2. Hàm chính (`rules.ts`, `combos.ts`)

- `deal(rng, soNguoi): Card[][]` — xáo bài (Fisher–Yates với RNG truyền vào), chia 13 lá mỗi người.
- `classify(cards): Combo | null` — nhận diện bộ hợp lệ: kiểm tra số lá, cùng số, liên tiếp (không có số 2), đôi liên tiếp.
- `beats(table: Combo | null, next: Combo, opts): boolean` — `table == null` thì mọi bộ hợp lệ thắng; cùng loại cùng độ dài thì so `top`; ngược lại áp dụng bảng chặt (`chatHeo`).
- `validMoves(state, seat)` — sinh mọi bộ có thể tạo từ `hands[seat]` (đủ nhỏ để duyệt: lẻ, đôi, ba, tứ quý, mọi đoạn sảnh, mọi đoạn đôi thông), lọc theo `table`, thêm `pass` khi bàn không trống.
- `applyMove` — kiểm tra đúng lượt, người chơi sở hữu các lá, `classify` hợp lệ, `beats`; cập nhật bài, `table`, `passed`; khi người đánh hết bài thêm vào `finished`; chuyển `turn` sang người kế còn bài và chưa bỏ lượt; khi mọi người còn lại đã bỏ → xoá `table` và `passed`, quyền đi tự do thuộc người đánh cuối (hoặc người kế tiếp còn bài nếu họ đã hết).
- `result(state)` — `null` khi còn ≥ 2 người còn bài; khi còn ≤ 1: `winner = finished[0]`, `scores` theo hạng, `reason` ∈ `"het-bai" | "toi-trang" | "doi-thu-roi"`, `detail = { ranking: SeatId[], toiTrang?: ... }`.
- `forfeit(state, seat, reason)` — xoá `hands[seat]`, thêm vào `left`; nếu đang đến lượt thì chuyển lượt; nếu chỉ còn một người còn bài thì xong ván.
- `viewFor(state, seat)` — **bài úp**: chỉ trả `hands` của chính `seat` (đầy đủ), còn lại chỉ có số lá; người xem (`seat === null`) chỉ thấy số lá. `table`, `finished`, `passed`, `turn` công khai.
- `parseMove` — chỉ kiểm tra hình dạng (mảng số nguyên 0..51 không trùng, độ dài ≤ 13); `parseOptions` giữ giá trị hợp lệ.

## 3. Sự kiện (`events`)

`deal` (chỉ trong `gameStarted`), `play` {seat, combo}, `cut` {seat, kind} (khi chặt), `pass` {seat}, `newRound` {leader}, `out` {seat, rank}, `toiTrang` {seat, kind}, `left` {seat}. Sự kiện không chứa bài của người khác.

## 4. Bất biến để fuzz (`rules.test.ts`)

1. Tổng số lá có mặt (trong tay, đã đánh, không dùng) luôn là 52 và không trùng.
2. Mỗi người có đúng 13 lá khi bắt đầu; tay bài chỉ giảm.
3. `finished` không trùng; ván luôn kết thúc (mọi ván ngẫu nhiên xong trong ≤ 500 nước, giả sử mỗi người chọn ngẫu nhiên trong `validMoves`).
4. Mọi nước trong `validMoves` đều được `applyMove` chấp nhận; mọi nước ngoài danh sách bị từ chối.
5. `viewFor(state, a)` không chứa lá nào trong tay người khác.

## 5. Đổi hợp đồng dùng chung (TL9)

Hiện nền tảng giả định: số ghế cố định theo `maxPlayers`, phải đủ ghế mới bắt đầu, kết quả có một `winner`, ván sau người thua đi trước, bot chỉ thêm ở ghế 1. Tiến lên cần (mỗi mục là một thay đổi nhỏ có thể làm riêng, **phải sửa đồng thời mọi game và chạy e2e hai người cho cả 4 game**, CLAUDE.md quy tắc 8):

| # | Thay đổi | Nơi sửa |
|---|---|---|
| a | **Số ghế theo tuỳ chọn**: `GameModule.seatCount?(options): number` (mặc định `maxPlayers`); `Room` dựng lại mảng ghế khi `setOptions` đổi số người (chặn nếu đang ngồi quá số mới) | `engine/game-module.ts`, `server/room.ts` |
| b | **Kết quả nhiều hạng**: thêm `GameResult.ranking?: SeatId[]` (thứ tự nhất → bét), client dùng khi có; vẫn giữ `winner` | `engine/game-module.ts`, `game-ui/result-parts.ts` |
| c | **Người đi trước ván sau**: `GameModule.nextFirst?(result, seats): SeatId \| null` thay cho mặc định "người thua"; game hiện có giữ hành vi cũ | `engine/game-module.ts`, `server/room.ts` (đoạn tính `nextFirst`) |
| d | **Lobby nhiều ghế**: lưới ghế 2 đến 4 thay cho cặp VS; thẻ đối thủ nhiều người ở màn chơi | `screens/lobby.ts`, `style.css`, `game-ui/player-card-base.ts` |
| e | **Bot nhiều ghế**: "Chơi với máy" từ trang chủ lấp **mọi** ghế còn lại (thay vì cố định ghế 1) | `screens/home.ts`, `server/room.ts` (đã có `addBot(seat)`) |
| g | **`setup` nhận RNG và ngữ cảnh**: `setup(options, seats, firstPlayer, rng, ctx?: { firstGame })` để game chia bài bằng RNG của phòng và biết đây có phải ván đầu không (game hiện có bỏ qua hai tham số mới) | `engine/game-module.ts`, `server/room.ts` |
| f | **Bài giấu theo ghế**: `viewFor` đã có; kiểm tra gateway không phát `state` gốc, và `moveApplied.events` không rò bài | `server/gateway.ts`, test |

Mỗi mục được bảo vệ bằng test của lớp phòng (`room.test.ts`, `gateway.test.ts`) và e2e hai người cho từng game hiện có.

## 6. Cấu trúc file

```
packages/engine/tien-len/   types.ts  combos.ts  rules.ts  index.ts  rules.test.ts  (bot.ts sau)
packages/client/tien-len/   client-game.ts  game-view.ts  game-page.ts  hand-view.ts  card-art.ts
                            player-card.ts  result-view.ts  rules-html.ts  history-html.ts
                            lobby-options.ts  art.ts  tien-len.css  assets/card.webp  *.test.ts
```

Đăng ký (một dòng mỗi nơi): `engine/package.json` exports `./tien-len`, `protocol` (`GAME_IDS` thêm `"tien-len"`, kiểu `TienLenRoom`), `server/room-manager.ts` (`MODULES`), `client/games/registry.ts`; bỏ mục "Tiến lên miền Nam" khỏi `games/catalog.ts` (game sắp có).
