# PlayTogether

Website chơi game chung nhiều người: tạo phòng → chọn game → gửi link mời → chơi. Không cần đăng ký.
Game đầu tiên: **Ô ăn quan**. Sau đó sẽ có Tiến lên, Cờ tướng, Caro.

## Tài liệu là nguồn sự thật

Đọc tài liệu liên quan **trước khi** viết code:

- Luật chơi: `docs/o-an-quan/01-luat-choi.md`. Engine phải khớp **chính xác** tài liệu này, kể cả cách đánh số ô `0..11`.
- UX: `docs/o-an-quan/02-thiet-ke-ux.md`
- Kỹ thuật (kiến trúc, kiểu dữ liệu, thuật toán, giao thức WS): `docs/o-an-quan/03-thiet-ke-ky-thuat.md`
- Kế hoạch, các mốc M1–M5, test case T1–T16, câu hỏi mở: `docs/o-an-quan/04-ke-hoach-prototype.md`

Nếu code cần làm khác tài liệu thì **cập nhật tài liệu trong cùng thay đổi** và nêu rõ lý do. Câu hỏi mở Q1–Q6 chưa chốt thì dùng phương án "Đề xuất hiện tại" trong bảng.

**Có câu hỏi thì ghi vào docs.** Khi gặp chỗ tài liệu mơ hồ hoặc mâu thuẫn, không tự đoán. Thêm câu hỏi vào bảng "Câu hỏi mở" (mục 6 của `04-ke-hoach-prototype.md`, hoặc tài liệu tương ứng của game khác), ghi rõ bối cảnh, ảnh hưởng và các phương án, rồi dừng lại. **Phải có câu trả lời cho mọi câu hỏi mới làm tiếp.** Khi đã có câu trả lời thì ghi vào docs và cập nhật tài liệu luật/kỹ thuật liên quan.

## Kiến trúc (tóm tắt)

- **Server quyết định mọi thứ.** Client chỉ gửi ý định (`move`), server kiểm tra rồi phát `state` + `events`.
- **Engine là hàm thuần** trong `packages/engine`: không I/O, không `Date.now()`, không `Math.random()` trực tiếp (nhận RNG qua tham số), không phụ thuộc DOM hay Node.
- Mỗi game là một module theo interface `GameModule`. Lớp phòng (`packages/server`) không được chứa luật của game cụ thể.
- Stack: TypeScript, Node 24 + `ws`, Vite (TS thuần) cho client, Vitest. Lưu trạng thái trong RAM.

Cấu trúc thư mục dự kiến (xem mục 2 tài liệu kỹ thuật):

```
packages/engine   ← luật game, dùng chung
packages/server   ← http + ws, phòng chơi
packages/client   ← UI
```

## Cách làm việc

- Làm theo thứ tự các mốc trong kế hoạch. **Mốc hiện tại: M2 — Bàn chơi offline.** (M1 — Engine: xong.)
- Với engine: viết test trước (T1–T16), sau đó mới viết luật. Test fuzz (T16) phải kiểm tra bất biến: tổng dân = 50, tổng quan = 2.
- Làm cho điện thoại trước. Vùng chạm tối thiểu 44px. Thử ở chiều rộng 360px.
- Giao diện người dùng viết bằng tiếng Việt. Tên biến và hàm viết bằng tiếng Anh, riêng thuật ngữ luật giữ tiếng Việt không dấu như trong tài liệu (`dan`, `quan`, `camAnQuanNon`, `giaTriQuan`...).
- Không thêm bất cứ thứ gì liên quan đến tiền thật hoặc xu đổi thưởng.

## Lệnh

Monorepo npm workspaces (`packages/*`). Chạy ở thư mục gốc:

```
npm install          # cài phụ thuộc
npm test             # Vitest, chạy toàn bộ test (gồm fuzz T16)
npm run test:watch   # Vitest chế độ theo dõi
npm run typecheck    # tsc cho mọi workspace có script typecheck
npx vitest run -t T5 # chạy riêng các test có tên chứa "T5"
```

`dev` và `build` chưa có, sẽ thêm khi làm server/client (M2–M3).

Import trong TS dùng đuôi `.ts` (`allowImportingTsExtensions`), để sau này Node 24 chạy trực tiếp được.
