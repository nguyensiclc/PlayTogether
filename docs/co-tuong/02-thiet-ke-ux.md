# Cờ tướng — Thiết kế UX

Luồng phòng (tạo phòng, link mời, QR, ghế, người xem, mất kết nối, rời phòng) **dùng lại của nền tảng**, không mô tả lại. Tài liệu này chỉ nói phần riêng của Cờ tướng. Giao diện trông thế nào do `docs/design/co-tuong/` quyết định.

## 1. Phòng chờ

Tuỳ chọn (chủ phòng sửa, khách chỉ xem), theo `04-ke-hoach-prototype.md` mục 6:

- Chưa có tuỳ chọn nào để chỉnh: phòng chờ chỉ ghi "Đỏ đi trước; ván đầu chọn ngẫu nhiên, ván sau người thua cầm Đỏ" *(T1)*.
- **Thời gian mỗi lượt:** ẩn tới M4 của nền tảng.

## 2. Bàn chơi

- Bàn **dọc** (9 cột × 10 hàng) vừa chiều rộng điện thoại: ô khoảng **36px** trên 360px, nên **vùng chạm của giao điểm gần đạt 44px** (chạm vào quân hoặc giao điểm quanh đó; vùng chạm của quân kéo dài ra nửa ô mỗi phía). Không cần kính lúp như Caro.
- **Người chơi luôn thấy quân của mình ở dưới.** Người cầm Đen thấy bàn xoay 180°. Người xem thấy theo phía Đỏ.
- Chữ trên quân luôn thẳng kể cả khi bàn xoay. Quân ghi **chữ Hán** (帥仕相俥炮傌兵 / 將士象車砲馬卒), như mockup *(T9)*; tên Việt dùng ở nhật ký, luật và chú thích.
- Hai thẻ người chơi: đối thủ ở trên, mình ở dưới, kèm màu quân, quân đối phương đã bị bắt, chỉ báo đến lượt.
- Viên trạng thái: "Lượt của bạn", "Lượt của …", và **"Bạn đang bị chiếu!"** / **"Chiếu tướng!"** khi có chiếu.

## 3. Đi quân (điện thoại và chuột)

1. Chạm một quân của mình: quân được nhấc lên, hiện **chấm tròn** ở các ô đi được và **vòng đỏ** ở các quân ăn được.
2. Chạm ô đích: đi ngay (mặc định, như Ô ăn quan). Chạm quân khác của mình thì đổi quân đang chọn; chạm chỗ khác thì bỏ chọn.

Nước bị chặn vì để tướng bị chiếu hay lộ mặt tướng thì **không hiện chấm**; chạm vào quân bị ghim nhưng không có nước đi thì báo ngắn "Đi quân này sẽ để tướng bị chiếu".

Đi ngay, không có bước xác nhận *(T7)*.

## 4. Hiệu ứng và đánh dấu

- Quân vừa đi: đánh dấu ô đi và ô đến.
- Tướng bị chiếu: vòng đỏ nhấp nháy quanh quân tướng. Tôn trọng `prefers-reduced-motion`.
- Nhật ký ván (desktop, cột phải): "Xe (1,1) → (1,4) ăn Tốt", cột và hàng đếm từ 1, hàng 1 là hàng sau của Đỏ *(T8)*.

## 5. Kết thúc và Ván nữa

Khung kết quả dùng lại của nền tảng: thắng / thua / hoà, lý do (**"Chiếu bí"**, **"Hết nước đi"**, **"Bỏ cuộc"** (xin thua hoặc rời phòng), **"Lặp thế cờ, hoà"**), số nước, bàn thu nhỏ, **Ván nữa** (ghi bên nào cầm Đỏ), Về phòng chờ, Rời phòng.

Nút **Xin thua** (góc phải thanh trên, có hộp xác nhận, người chơi vẫn ở lại phòng). Chưa có Cầu hoà *(T4)*.

## 6. Phím tắt (desktop)

`Esc` bỏ chọn quân; `Enter` Ván nữa khi hết ván.

## 7. Chơi với máy

Ở phòng chờ, chủ phòng thấy dòng "Đấu với máy: 🤖 Dễ / Vừa / Khó" ngay dưới ghế 2 còn trống (giao diện chung của phòng chờ, cũng có nút "Chơi với máy" ở trang chủ). Bấm một mức thì máy ngồi ghế 2 (avatar 🤖, tên "Máy (Vừa)"); nút "Gỡ" trả lại ghế để mời bạn bè. Bắt đầu ván như thường; máy đi sau chừng 0,7 giây, tự đồng ý Ván nữa. Rời phòng giữa chừng là bỏ cuộc như mọi ván. Máy không giữ phòng: khi người cuối cùng rời, phòng bị xoá.

## 8. Luật chơi và Lịch sử

Mỗi game có hộp **Luật chơi / Lịch sử** do chính game cung cấp (`rules-html.ts`, `history-html.ts`). Luật hiện là chữ, chưa có hình minh hoạ cách đi từng quân.
