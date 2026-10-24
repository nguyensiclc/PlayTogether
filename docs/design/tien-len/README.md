# Thiết kế Tiến lên miền Nam

Theo câu hỏi mở **TL10**: Claude tự thiết kế rồi bạn duyệt (như Cờ caro). Mockup là **ảnh chụp giao diện đang chạy** (không có file HTML tĩnh riêng), nên code UI và thiết kế luôn khớp nhau. Hướng thiết kế dùng chung với các game khác (`docs/design/README.md`: "Quán trà / bàn chơi dân gian", mặt bàn gỗ tối `table-page`, avatar con vật 3D).

| Màn hình | Ảnh |
|---|---|
| Phòng chờ, 4 ghế, tuỳ chọn số người / chặt heo / tới trắng (điện thoại) | `phong-cho-dien-thoai.png` |
| Phòng chờ (desktop) | `phong-cho-desktop.png` |
| Bàn chơi: hàng đối thủ, thảm xanh, tay bài quạt, nút Đánh (điện thoại) | `ban-choi-dien-thoai.png` |
| Bàn chơi (desktop, cột Nhật ký và Phím tắt bên phải) | `ban-choi-desktop.png` |
| Kết quả: xếp hạng nhất đến bét, bài còn lại của người bét (điện thoại) | `ket-qua-dien-thoai.png` |

## Quyết định thiết kế

- **Lá bài** vẽ bằng HTML và CSS (`packages/client/tien-len/tien-len.css`): số ở góc, chất to ở góc dưới, vệt sáng chéo, đổ bóng. Rô và Cơ đỏ, Bích và Chuồn đen. Mặt lưng kẻ chéo đỏ gạch.
- **Tay bài quạt** chồng lên nhau vừa khít chiều rộng khung (điện thoại 13 lá, mỗi lá lộ khoảng 24px); lá được chọn nhô lên 18px kèm viền vàng. Khi bàn đang có bộ, các lá không thuộc nước đánh được nào bị làm tối nhẹ.
- **Đối thủ** là thẻ nhỏ xếp ngang (tối đa 3): avatar, tên, số lá còn lại ở góc, viền vàng khi đến lượt, nhãn "Bỏ lượt", "Hạng n", "Đã rời".
- **Chọn nhanh**: chạm hai lần vào một lá để chọn bộ nhỏ nhất đè được bộ trên bàn mà chứa lá đó. Phím tắt trên desktop: mũi tên, Space, Enter, P, Esc, S.
- **Ảnh thẻ game** (trang chủ, đầu phòng chờ): ảnh 3D xoè năm lá bài tạo bằng Canva (`packages/client/tien-len/assets/card.webp`, nguồn ở `docs/design/ban-quyen-asset.md`).

## Chưa có

- Hàng biểu cảm emoji và âm thanh (M5 của nền tảng), đồng hồ lượt (M4).
- Bot (mốc TL-B).
