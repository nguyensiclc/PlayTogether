# PlayTogether — Tài liệu

Website chơi game chung nhiều người: **tạo phòng → chọn game → gửi link mời bạn → chơi**. Không cần đăng ký.
Nhóm game: bài, cờ, trò chơi dân gian Việt Nam.

## Nguyên tắc sản phẩm

1. **Vào chơi trong 10 giây.** Không đăng ký, chỉ cần nickname.
2. **Link là tất cả.** Bấm link từ Zalo/Messenger là vào thẳng phòng.
3. **Phòng sống lâu hơn ván.** Chơi xong có thể "Ván nữa" hoặc đổi game mà không cần link mới.
4. **Làm cho điện thoại trước.**
5. **Không tiền thật, không xu đổi thưởng.**

## Mục lục

| Tài liệu | Nội dung |
|---|---|
| [Ô ăn quan — Luật chơi](docs/o-an-quan/01-luat-choi.md) | Luật chuẩn được chọn, các biến thể, ví dụ minh hoạ |
| [Ô ăn quan — Thiết kế UX](docs/o-an-quan/02-thiet-ke-ux.md) | Màn hình, luồng, tương tác, hiệu ứng |
| [Ô ăn quan — Thiết kế kỹ thuật](docs/o-an-quan/03-thiet-ke-ky-thuat.md) | Kiến trúc, mô hình dữ liệu, engine, giao thức |
| [Ô ăn quan — Kế hoạch prototype](docs/o-an-quan/04-ke-hoach-prototype.md) | Phạm vi, các mốc, test case, câu hỏi mở |
| [Thiết kế màn hình](docs/design/README.md) | Mockup các màn hình, quy ước, hệ màu, trạng thái thiết kế |
| [Cờ caro — Luật chơi](docs/caro/01-luat-choi.md) | Luật mặc định, biến thể Chặn 2 đầu, ví dụ minh hoạ |
| [Cờ caro — Thiết kế UX](docs/caro/02-thiet-ke-ux.md) | Bàn chơi, cách đặt quân trên điện thoại, danh sách màn hình cần thiết kế |
| [Cờ caro — Thiết kế kỹ thuật](docs/caro/03-thiet-ke-ky-thuat.md) | Dữ liệu, thuật toán, tổng quát hoá nền tảng đa game |
| [Cờ caro — Kế hoạch prototype](docs/caro/04-ke-hoach-prototype.md) | Phạm vi, các mốc C1–C4, test case, câu hỏi mở C1–C13 |
| [Cờ caro — Yêu cầu thiết kế](docs/design/caro/README.md) | Bản yêu cầu thiết kế (mockup đã chốt) |

## Trạng thái

| Hạng mục | Trạng thái |
|---|---|
| Ô ăn quan (game thử nghiệm đầu tiên) | Engine xong (M1, M1.1). Đang làm M3: chơi qua link mời |
| Nền tảng phòng chơi (room, link mời) | M3: server WebSocket, phòng chờ, link mời, QR, tự kết nối lại |
| Cờ caro | Engine, nền tảng đa game và giao diện đã xong (C1–C3, nhánh `caro`). Còn thử trên điện thoại thật (C4) |
| Tiến lên, Cờ tướng | Chưa bắt đầu |
