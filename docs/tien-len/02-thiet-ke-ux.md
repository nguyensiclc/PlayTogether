# Tiến lên miền Nam — Thiết kế UX

Làm cho điện thoại trước (360px), vùng chạm ≥ 44px. Màn hình và hệ màu theo `docs/design/README.md` (hướng "Quán trà / bàn chơi dân gian", nền mặt bàn gỗ tối khi vào ván). Mockup chưa có: cần trả lời TL10 trước khi vẽ.

## 1. Luồng

`Trang chủ → Tạo phòng Tiến lên → Phòng chờ (chọn số người, tuỳ chọn) → mời bạn qua link → Bắt đầu → Chơi → Kết quả → Ván nữa`

## 2. Phòng chờ

- **Số người chơi** (2, 3, 4): chọn ở phần Tuỳ chọn, chỉ chủ phòng đổi. Số ghế hiển thị đổi theo; đổi xuống ít ghế hơn số người đang ngồi thì bị chặn kèm lời nhắc (TL1).
- Ghế hiển thị dạng lưới 2 cột (điện thoại) hoặc hàng ngang (desktop); ghế trống viền nét đứt, nhấp nháy như các game khác.
- **Tuỳ chọn luật** (TL3, TL4): bật/tắt "Chặt heo", "Tới trắng". Mặc định bật cả hai.
- Nút "Bắt đầu" bật khi **đủ số ghế đã chọn** (không bắt đủ 4 người nếu chủ phòng chọn 3).

## 3. Màn chơi (điện thoại 360px)

Từ trên xuống:

1. **Thanh trên**: nút quay lại, tên phòng, nút `?` luật chơi.
2. **Đối thủ quanh bàn**: 4 người = trái, trên, phải (theo thứ tự đi: trái → trên → phải), 3 người = trái và phải, 2 người = trên. Mỗi thẻ có avatar, tên, **số lá còn lại** dạng chip `🂠 9`; viền vàng khi đến lượt; nhãn mờ "Bỏ lượt" khi đã bỏ vòng này; nhãn hạng khi đã hết bài. Bài trên tay to hơn (62px điện thoại, 76px desktop).
3. **Mặt bàn** (giữa): bộ bài vừa đánh, xếp ngang các lá ngửa kèm tên người đánh; nếu bàn trống ghi "Đi tự do". Hiệu ứng lá bay từ ghế người đánh tới mặt bàn; chặt có nhãn "Chặt!".
4. **Viên trạng thái**: "Lượt của bạn · chọn bài", "Lượt của Mèo Mun", "Bàn trống: bạn đi tự do".
5. **Tay bài của bạn**: 13 lá xếp **quạt chồng nhau** theo thứ tự tăng dần (lá nhỏ bên trái), mỗi lá lộ ≥ 24px để chạm; lá lớn hơn rộng ~56 × 80px. Chạm một lá để **nâng lên** (chọn); chạm lại để bỏ chọn. Kéo ngón tay qua nhiều lá để chọn nhanh một đoạn.
6. **Thanh nút**: `Bỏ lượt` (phụ), `Đánh` (chính, chỉ bật khi lá đang chọn tạo thành bộ hợp lệ và thắng được bộ trên bàn), `Bỏ chọn`. Nút `Sắp xếp` đổi giữa xếp theo giá trị và xếp gom bộ (đôi, ba, sảnh trước).
7. **Hàng biểu cảm** (M5 của nền tảng).

### Cách chọn bài

- Khi đang chọn mà chưa hợp lệ, nút Đánh mờ và dòng gợi ý nhỏ nói lý do ("Chưa cùng loại với bộ trên bàn", "Cần 3 đôi liền nhau").
- Khi bàn có bộ, lá không thể tạo bộ thắng nào bị làm tối nhẹ (vẫn chọn được để tránh khó chịu), lá thuộc ít nhất một nước hợp lệ sáng bình thường.
- Chạm hai lần vào một lá: chọn luôn bộ nhỏ nhất thắng được bộ trên bàn có chứa lá đó (chọn nhanh, TL10).

## 4. Màn chơi (desktop ≥ 1024px)

- Bàn tròn ở giữa: bạn ở dưới, đối thủ trái/trên/phải (theo số người), mỗi người một thẻ và quạt bài úp.
- Tay bài của bạn rộng, lá lộ ~44px, đủ chỗ cho cả 13 lá.
- Cột phải: **Nhật ký ván** và **Phím tắt**: `←/→` di chuyển con trỏ giữa các lá, `Space` chọn/bỏ chọn, `Enter` đánh, `P` bỏ lượt, `S` sắp xếp.

## 5. Kết quả

Hộp kết quả (giống các game khác): danh sách **xếp hạng** nhất → bét với avatar, điểm hạng (3/2/1/0) và số lá còn lại của người bị bét; nút Ván nữa ("Người nhất đi trước" theo TL6) / Về phòng chờ / Rời phòng. Trường hợp tới trắng ghi rõ "Tới trắng: sảnh rồng của …".

## 6. Trạng thái và lỗi

- Mất kết nối: viền mờ + nhãn "Mất kết nối" trên thẻ; bàn tạm khoá nếu là mình (như game khác).
- Người rời ván: thẻ chuyển xám "Đã rời", bài bị loại; thông báo ngắn "X đã rời, ván tiếp tục" (TL7).
- Đối thủ đánh trong lúc mình đang chọn: lá đã chọn giữ nguyên nhưng nút Đánh được kiểm lại theo bộ mới trên bàn.

## 7. Hình ảnh

- **Lá bài**: SVG 3D bóng như quân cờ (viền bo, bóng đổ, vệt sáng), góc trên trái ghi số và chất; chất Rô, Cơ màu đỏ, Bích, Chuồn màu đen; vẽ trong `packages/client/tien-len/card-art.ts` (không dùng ảnh bitmap). Mặt lưng lá bài cho đối thủ.
- **Ảnh thẻ game** (trang chủ, đầu phòng chờ): ảnh 3D xoè vài lá bài, tạo bằng Canva như các game trước.
- Mặt bàn: nền gỗ tối (`table-page`), thảm xanh rêu quanh khu vực đánh bài.
