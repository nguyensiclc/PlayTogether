# PlayTogether

Website chơi game chung nhiều người: tạo phòng → chọn game → gửi link mời → chơi. Không cần đăng ký.
Game đầu tiên: **Ô ăn quan**. Sau đó sẽ có Tiến lên, Cờ tướng, Caro.

## Tài liệu là nguồn sự thật

Đọc tài liệu liên quan **trước khi** viết code:

- Luật chơi: `docs/o-an-quan/01-luat-choi.md`. Engine phải khớp **chính xác** tài liệu này, kể cả cách đánh số ô `0..11`.
- UX: `docs/o-an-quan/02-thiet-ke-ux.md`
- Kỹ thuật (kiến trúc, kiểu dữ liệu, thuật toán, giao thức WS): `docs/o-an-quan/03-thiet-ke-ky-thuat.md`
- Kế hoạch, các mốc M1–M5 (gồm M1.1), test case T1–T20, câu hỏi mở: `docs/o-an-quan/04-ke-hoach-prototype.md`
- Thiết kế màn hình (mockup, hệ màu): `docs/design/`. Màn hình đã có thiết kế thì code UI phải theo thiết kế đó.
- Cờ caro: `docs/caro/` (luật, UX, kỹ thuật, kế hoạch). Câu hỏi mở của Caro đánh số `C1…` ở `docs/caro/04-ke-hoach-prototype.md` mục 6. Mockup đã chốt trong `docs/design/caro/` (Claude tự thiết kế), bản yêu cầu gốc ở `docs/design/caro/README.md`. Code UI Caro ở `packages/client/caro/` và `packages/client/screens/caro-game.ts`.
- Kiến trúc module (cái gì dùng chung, cái gì riêng từng game, cách thêm game): `docs/kien-truc-module.md`. **Đọc trước khi thêm game hoặc thêm tính năng dùng cho nhiều game.**
- Prompt bắt đầu session mới (nắm tình hình, các biến thể: thêm game, sửa lỗi, tiếp tục việc dở, rà soát trước khi gộp): `docs/prompt-bat-dau-session.md`.
- Quy ước code, clean code: `docs/quy-uoc-code.md`. Code mới và code sửa phải theo quy ước này. Trước khi commit chạy `npm run check`.

Nếu code cần làm khác tài liệu thì **cập nhật tài liệu trong cùng thay đổi** và nêu rõ lý do. Câu hỏi mở Q1–Q6 chưa chốt thì dùng phương án "Đề xuất hiện tại" trong bảng.

**Có câu hỏi thì ghi vào docs.** Khi gặp chỗ tài liệu mơ hồ hoặc mâu thuẫn, không tự đoán. Thêm câu hỏi vào bảng "Câu hỏi mở" (mục 6 của `04-ke-hoach-prototype.md`, hoặc tài liệu tương ứng của game khác), ghi rõ bối cảnh, ảnh hưởng và các phương án, rồi dừng lại. **Phải có câu trả lời cho mọi câu hỏi mới làm tiếp.** Khi đã có câu trả lời thì ghi vào docs và cập nhật tài liệu luật/kỹ thuật liên quan.

## Kiến trúc (tóm tắt)

- **Server quyết định mọi thứ.** Client chỉ gửi ý định (`move`), server kiểm tra rồi phát `state` + `events`.
- **Engine là hàm thuần** trong `packages/engine`: không I/O, không `Date.now()`, không `Math.random()` trực tiếp (nhận RNG qua tham số), không phụ thuộc DOM hay Node.
- Mỗi game là một module theo interface `GameModule`. Lớp phòng (`packages/server`) không được chứa luật của game cụ thể.
- Stack: TypeScript, Node 24 + `ws`, Vite (TS thuần) cho client, Vitest. Lưu trạng thái trong RAM.

Cấu trúc thư mục (chi tiết ở `docs/kien-truc-module.md`):

```
packages/engine/game-module.ts   ← hợp đồng GameModule, RNG (dùng chung)
packages/engine/<game>/          ← luật của một game
packages/protocol                ← giao thức client–server (dùng chung, đăng ký danh sách game)
packages/server                  ← http + ws, phòng chơi (dùng chung, không có luật game)
packages/client                  ← nền tảng: screens/, games/, game-ui/, rules/, style.css
packages/client/<game>/          ← mọi thứ giao diện riêng của một game
```

## Quy tắc tách module (bắt buộc cho code mới)

Mục tiêu: có hàng trăm game vẫn không lặp code. Thêm game = thêm thư mục + vài dòng đăng ký. `npm run check` có `packages/architecture.test.ts` kiểm tra các quy tắc 1–5.

1. **Nền tảng không biết từng game.** Code ở `server/`, `protocol/` (ngoài chỗ đăng ký), `client/screens`, `client/games`, `client/game-ui`, `client/rules`, `client/style.css`, `engine/game-module.ts` không chứa luật, chữ, CSS hay `if/switch` theo `gameId`. Cần khác nhau theo game thì thêm trường vào `ClientGame` (client) hoặc `GameModule` (engine).
2. **Game không biết game khác.** `client/<game>/` và `engine/<game>/` không import thư mục của game khác. Thứ cần cho hai game trở lên thì đưa vào phần dùng chung.
3. **Nền tảng chỉ gặp game ở các điểm đăng ký**, mỗi điểm một dòng: `engine/package.json` (`exports`), `protocol/index.ts` (`GAME_IDS`, kiểu `<Game>Room`), `server/room-manager.ts` (`MODULES`), `client/games/registry.ts`.
4. **Không sao chép, dùng chung.** Trước khi viết thành phần giao diện hoặc logic cho một game, kiểm tra `client/game-ui/`, `client/games/` và game khác xem đã có chưa. Phát hiện hai nơi giống nhau thì gom về phần dùng chung trong cùng thay đổi. Chỉ một game dùng thì để trong thư mục game; có game thứ hai cần thì mới chuyển lên.
5. **Mỗi game đóng gói đủ trong thư mục của nó**: màn chơi, luật hiển thị (`rules-html.ts`), lịch sử (`history-html.ts`), tuỳ chọn phòng (`lobby-options.ts`), hình (`art.ts`), CSS (`<game>.css`), test. CSS riêng game **không** đặt trong `style.css`; `style.css` chỉ chứa nền tảng và các lớp dùng chung (`.player`, `.status-pill`, `.result`, `.sheet`…).
6. **Mỗi file một việc, đặt đúng chỗ.** File mới: nền tảng hay game? Nếu phân vân, đặt trong game. Tên file theo vai trò (`game-view.ts`, `client-game.ts`, `rules-html.ts`), không đặt tên chung chung. Hàm dài quá 40 dòng hoặc complexity > 15 thì tách (Biome sẽ báo).
7. **Thêm game mới theo danh sách ở `docs/kien-truc-module.md` mục 3**, và cập nhật tài liệu đó nếu cách làm đổi.
8. **Đổi hợp đồng dùng chung** (`GameModule`, `ClientGame`, `GameActions`, protocol) thì sửa đồng thời mọi game đang có, cập nhật `docs/kien-truc-module.md`, và chạy e2e hai người chơi cho **mọi** game, không chỉ game đang làm.
9. **Quy ước kèm theo**: dữ liệu từ client không tin (server kiểm tra bằng `parseMove`/`parseOptions` của module); không dùng `any`, không `!` trong code sản xuất; chuỗi hiển thị người dùng bằng tiếng Việt; vùng chạm ≥ 44px.

## Cách làm việc

- Làm theo thứ tự các mốc trong kế hoạch. **Mốc hiện tại: M3 — Phòng & mạng.** (M1, M1.1: xong. M2 khép lại theo Q22a, chế độ chơi một máy đã bỏ.)
- Với engine: viết test trước (T1–T16), sau đó mới viết luật. Test fuzz (T16) phải kiểm tra bất biến: tổng dân = 50, tổng quan = 2.
- Làm cho điện thoại trước. Vùng chạm tối thiểu 44px. Thử ở chiều rộng 360px.
- Giao diện người dùng viết bằng tiếng Việt. Tên biến và hàm viết bằng tiếng Anh, riêng thuật ngữ luật giữ tiếng Việt không dấu như trong tài liệu (`dan`, `quan`, `camAnQuanNon`, `giaTriQuan`...).
- Không thêm bất cứ thứ gì liên quan đến tiền thật hoặc xu đổi thưởng.

## Lệnh

Monorepo npm workspaces (`packages/*`). Chạy ở thư mục gốc:

```
npm install          # cài phụ thuộc
npm run dev          # server Node (cổng 3000) + Vite (cổng 5173, --host để điện thoại cùng Wi-Fi vào được); mở http://localhost:5173
npm run build        # build client ra packages/client/dist
npm start            # chạy bản build: server phục vụ luôn client (PORT, mặc định 3000)
npm test             # Vitest, chạy toàn bộ test (gồm fuzz T16)
npm run test:watch   # Vitest chế độ theo dõi
npm run typecheck    # tsc cho mọi workspace có script typecheck
npm run lint         # Biome: kiểm tra định dạng + lint (không sửa)
npm run format       # Biome: tự sửa định dạng, sắp xếp import, lỗi lint an toàn
npm run check        # lint → typecheck → test; phải xanh trước khi commit
npx vitest run -t T5 # chạy riêng các test có tên chứa "T5"
```

Server (`packages/server`) chạy thẳng file `.ts` bằng Node 24 (tự bỏ kiểu), nên server và engine chỉ dùng cú pháp TypeScript "bỏ được" (`erasableSyntaxOnly`: không `enum`, không parameter property). Thử giữa hai máy qua Internet: Cloudflare Tunnel hoặc ngrok trỏ vào cổng của `npm start` (kỹ thuật mục 11).

Import trong TS dùng đuôi `.ts` (`allowImportingTsExtensions`), để sau này Node 24 chạy trực tiếp được.
