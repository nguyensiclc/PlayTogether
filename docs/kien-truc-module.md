# Kiến trúc module: phần dùng chung và phần riêng từng game

Mục tiêu: khi có hàng chục, hàng trăm game, **thêm một game chỉ là thêm một thư mục và vài dòng đăng ký**, không sửa logic của nền tảng và không chép lại code của game khác.

Quy tắc ngắn gọn nằm ở `CLAUDE.md` mục "Quy tắc tách module". Tài liệu này giải thích chi tiết và có danh sách việc cần làm khi thêm game. Ranh giới được **kiểm tra tự động** bằng `packages/architecture.test.ts` (chạy trong `npm run check`).

## 1. Nơi đặt từng thứ

### Engine (`packages/engine`)

| Dùng chung | Riêng từng game |
|---|---|
| `game-module.ts`: interface `GameModule`, `SeatId`, `GameResult`, RNG (`createRng`, `pickRandom`) | `<game>/types.ts`, `rules.ts`, `index.ts`, `rules.test.ts` |
| `index.ts` chỉ xuất phần dùng chung | Được khai báo trong `package.json` mục `exports`: `"./<game>": "./<game>/index.ts"` |

Engine là hàm thuần: không `Math.random`, `Date.now`, `new Date()`, không import Node hay DOM. Game không import game khác.

### Protocol (`packages/protocol/index.ts`)

Dùng chung: khung message, mã lỗi, `PublicRoomOf<S, O, G>`, mã phòng. **Điểm đăng ký game duy nhất** của lớp này: `GAME_IDS`, kiểu `<Game>Room` và hai union `PublicRoom`, `ServerMessage` (nhánh `MoveApplied`).

### Server (`packages/server`)

Hoàn toàn dùng chung. `room.ts`, `gateway.ts`, `parse.ts`, `http.ts`… không được biết luật của game nào. Điểm đăng ký duy nhất: `room-manager.ts` (`MODULES`). Mọi thứ riêng của game đi qua `GameModule` (`parseMove`, `parseOptions`, `applyMove`, `forfeit`…).

### Client (`packages/client`)

| Thư mục | Vai trò |
|---|---|
| `main.ts`, `dom.ts`, `identity.ts`, `qr.ts`, `net/` | Nền tảng: khởi động, tiện ích DOM, danh tính, mã QR, WebSocket |
| `screens/` | Nền tảng: trang chủ, phòng chờ, phòng, nhập nickname, hộp xác nhận rời phòng |
| `rules/` | Nền tảng: hộp "Luật chơi / Lịch sử" (nội dung do từng game cung cấp) |
| `games/` | Hợp đồng và danh sách game: `types.ts` (`ClientGame`, `GameScreen`, `GameActions` gồm `move`, `rematch`, `resign`…, `LobbyOptions`), `registry.ts` (**nơi duy nhất nền tảng được import thư mục game**), `catalog.ts` (game "sắp có"), `option-controls.ts` (nút tuỳ chọn dùng chung) |
| `game-ui/` | Mảnh giao diện dùng chung **bên trong màn chơi** của mọi game: nhật ký ván (`log-view.ts`), phần chung của màn kết quả (`result-parts.ts`), thẻ người chơi (`player-card-base.ts`), hộp xác nhận (`confirm-box.ts`) |
| `style.css` | CSS của nền tảng và các lớp dùng chung (`.player`, `.status-pill`, `.result`, `.sheet`, `.scrim`, `.seg-btn`…) |
| `<game>/` | Mọi thứ riêng của game: `client-game.ts` (mô tả cho nền tảng), `game-view.ts` (màn chơi), `game-page.ts`, bàn chơi, luật (`rules-html.ts`), lịch sử (`history-html.ts`), tuỳ chọn phòng (`lobby-options.ts`), hình (`art.ts`), CSS riêng (`<game>.css`), test |

Chiều phụ thuộc: **game → nền tảng / game-ui** (được), **nền tảng → game** (chỉ qua `games/registry.ts`), **game → game khác** (cấm).

## 2. Khi nào chuyển code sang phần dùng chung

1. Đang viết code mà **giống** code đã có ở game khác: dừng, đưa phần chung vào `game-ui/` (hoặc nền tảng) và cho **cả hai** game dùng, rồi mới viết phần riêng. Không sao chép.
2. Đã dùng chung mà một game cần khác một chút: thêm tham số hoặc điểm mở rộng (như `PlayerCardBase`, `rematchHtml(…, match)`), không rẽ nhánh theo `gameId`.
3. Chỉ một game dùng: để trong thư mục của game, kể cả khi trông "có vẻ chung". Chuyển lên khi có game thứ hai thật sự cần.
4. Nền tảng **không được** có `if (gameId === …)` hay `switch (gameId)`. Cần hành vi khác nhau theo game thì thêm trường vào `ClientGame` / `GameModule`.

## 3. Thêm một game mới: danh sách việc

1. **Tài liệu**: `docs/<game>/` (luật, UX, kỹ thuật, kế hoạch, câu hỏi mở), mockup ở `docs/design/<game>/`. Câu hỏi chưa rõ thì ghi vào bảng câu hỏi mở và dừng (CLAUDE.md).
2. **Engine**: `packages/engine/<game>/` (`types.ts`, `rules.ts`, `index.ts`, test viết trước, có fuzz kiểm tra bất biến) và dòng `exports` trong `packages/engine/package.json`. Cài `GameModule` đầy đủ, gồm `parseMove`, `parseOptions`.
3. **Protocol**: thêm id vào `GAME_IDS`, kiểu `<Game>Room`, thêm vào `PublicRoom` và nhánh `MoveApplied` của `ServerMessage`.
4. **Server**: một dòng trong `MODULES` ở `room-manager.ts`. Không sửa gì khác ở server; nếu thấy phải sửa, đó là dấu hiệu `GameModule` thiếu điểm mở rộng: bổ sung vào interface.
5. **Client**: tạo `packages/client/<game>/` với `client-game.ts` xuất một đối tượng `ClientGame`, rồi thêm **một dòng** vào `games/registry.ts`. CSS riêng đặt trong `<game>/<game>.css` và import từ `game-view.ts`.
6. **Kiểm tra**: `npm run check` (gồm `architecture.test.ts`). Chạy thử hai người chơi trên điện thoại 360px và desktop.
7. **Cập nhật** `README.md`, `CLAUDE.md` (nếu có quy tắc mới) và bảng game ở `docs/design/README.md`.

## 4. Những điểm còn đăng ký thủ công (chủ ý)

- `GAME_IDS` và các union kiểu trong `protocol`: TypeScript cần biết danh sách game để thu hẹp kiểu theo `gameId`. Đổi lại, cả client và server biết đủ kiểu mà không cần `any`.
- `MODULES` ở server và `registry.ts` ở client: mỗi nơi một dòng.

## 5. Việc nên làm khi số game lớn

- **Tải màn hình theo nhu cầu**: hiện mọi game được đóng gói chung một file JS. Khi có nhiều game, đổi `createScreen` của `ClientGame` thành `() => import("./game-view.ts")` để chia nhỏ bundle (kèm `room.ts` chờ bất đồng bộ).
- **`style.css`** của nền tảng vẫn dài (khoảng 2100 dòng): tách tiếp theo màn hình (trang chủ, phòng chờ…) khi có thay đổi lớn ở đó.
- **Khung HTML màn chơi** (`game-page.ts`) mỗi game có một bản vì bố cục khác nhau; nếu nhiều game giống bố cục (hai thẻ người chơi + bàn + viên trạng thái) thì rút thành khung chung trong `game-ui/`.
