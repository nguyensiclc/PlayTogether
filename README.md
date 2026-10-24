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
| [Cờ vua — Luật chơi](docs/co-vua/01-luat-choi.md) | Luật chuẩn FIDE, nước đặc biệt (nhập thành, bắt tốt qua đường, phong cấp) |
| [Cờ vua — Thiết kế UX](docs/co-vua/02-thiet-ke-ux.md) | Bàn cờ SVG, tap-to-move, phong cấp, lật bàn theo góc nhìn người chơi |
| [Cờ vua — Thiết kế kỹ thuật](docs/co-vua/03-thiet-ke-ky-thuat.md) | Mô hình dữ liệu, sinh nước đi hợp lệ, kiểm tra chiếu, bất biến fuzz test |
| [Cờ vua — Kế hoạch prototype](docs/co-vua/04-ke-hoach-prototype.md) | Phạm vi, các mốc V1–V4, test cases V01–V25, câu hỏi mở V1–V5 |
| [Tiến lên miền Nam — Luật chơi](docs/tien-len/01-luat-choi.md) | Bộ bài, các bộ hợp lệ, chặt heo, tới trắng, xếp hạng (đề xuất, chờ chốt câu hỏi mở) |
| [Tiến lên miền Nam — Thiết kế UX](docs/tien-len/02-thiet-ke-ux.md) | Phòng chờ 2–4 người, tay bài quạt, chọn bài, kết quả xếp hạng |
| [Tiến lên miền Nam — Thiết kế kỹ thuật](docs/tien-len/03-thiet-ke-ky-thuat.md) | Kiểu dữ liệu, thuật toán bộ bài, bài giấu, đổi hợp đồng dùng chung cho nhiều người |
| [Tiến lên miền Nam — Kế hoạch prototype](docs/tien-len/04-ke-hoach-prototype.md) | Phạm vi, các mốc TL0–TL-H, test case TL01–TL24, câu hỏi mở TL1–TL10 |

## Trạng thái

| Hạng mục | Trạng thái |
|---|---|
| Ô ăn quan (game thử nghiệm đầu tiên) | M1, M1.1, M2, M3 xong (engine, giao diện, chơi qua link mời). Còn M4 (đồng hồ lượt, giữ ghế 60 giây) và M5 (emoji, âm thanh) |
| Nền tảng phòng chơi (room, link mời) | M3 xong: server WebSocket, phòng chờ, link mời, QR, tự kết nối lại (giữ ghế không giới hạn), Ván nữa, xin thua, bot dùng chung. Chưa có đồng hồ lượt |
| Cờ caro | Engine, nền tảng đa game và giao diện đã xong (C1–C3). Còn thử trên điện thoại thật (C4) |
| Cờ tướng | Engine, đăng ký game và giao diện đã xong (T0, T-E, T-P, T-U), có bot Dễ, Vừa, Khó. Còn thử trên điện thoại thật (T-H) |
| Cờ vua | Engine (V1), Protocol & Server (V2), Giao diện (V3), thử nghiệm (V4) và bot 3 cấp (V5) đã xong |
| Tiến lên miền Nam | Đã viết tài liệu (luật, UX, kỹ thuật, kế hoạch). **Đang chờ trả lời câu hỏi mở TL1–TL10** trước khi làm nền tảng nhiều người và engine |

## Triển khai thử (Render)

Repo có sẵn `render.yaml`. Trên render.com: **New → Blueprint**, chọn repo này và nhánh muốn chạy, bấm **Apply**. Render cài đặt, build client rồi chạy `npm start` (Node 24, cổng do Render cấp qua `PORT`). Sau vài phút có link `https://playtogether-….onrender.com` để chơi thật qua link mời. Gói miễn phí tự ngủ khi không có người dùng (lần mở đầu chậm) và phòng nằm trong RAM nên khởi động lại là mất phòng.
