# Cờ vua — Thiết kế UX

Mục tiêu chung của nền tảng: **từ lúc bấm link đến lúc đi nước đầu tiên dưới 30 giây**, kể cả với người chơi mới trên điện thoại. Cờ vua dùng chung toàn bộ nền tảng (trang chủ, tạo phòng, phòng chờ, link mời LAN/QR, đồng bộ WebSocket, kết nối lại). Tài liệu này tập trung vào các trải nghiệm **riêng biệt của Cờ vua**.

## 1. Luồng trải nghiệm người dùng

```
[Trang chủ] ──Tạo phòng Cờ vua──► [Phòng chờ] ──Bắt đầu──► [Bàn cờ] ──Hết ván──► [Kết quả]
                                      ▲                                              │
                                      └─────────────── Ván nữa ─────────────────────┘
```

## 2. Bàn cờ và Tương tác (Điện thoại 360px)

### 2.1 Bố cục màn hình
Bàn cờ hình vuông kích thước 8 × 8 được dàn đều vừa khít chiều rộng màn hình (chiều rộng khả dụng ~340px đến 360px, mỗi ô cờ rộng khoảng ~42px – 44px).

```
  ┌─────────────────────────────────────────────────────────┐
  │  Mèo Mun (Đen)  ·  [Quân ăn được] +3  ·  ⏱ 02:45        │  ← Đối thủ (ở trên)
  ├─────────────────────────────────────────────────────────┤
  │    a   b   c   d   e   f   g   h                        │
  │  8 ♜   ♞   ♝   ♛   ♚   ♝   ♞   ♜  8                     │
  │  7 ♟   ♟   ♟   ♟   ·   ♟   ♟   ♟  7                     │
  │  6 ·   ·   ·   ·   ·   ·   ·   ·  6                     │
  │  5 ·   ·   ·   ·   ♟   ·   ·   ·  5                     │
  │  4 ·   ·   ·   ·   ♙   ·   ·   ·  4                     │
  │  3 ·   ·   ·   ·   ·   ♘   ·   ·  3                     │
  │  2 ♙   ♙   ♙   ♙   ·   ♙   ♙   ♙  2                     │
  │  1 ♖   ♘   ♗   ♕   ♔   ♗   ·   ♖  1                     │
  │    a   b   c   d   e   f   g   h                        │
  ├─────────────────────────────────────────────────────────┤
  │  Cò Trắng (Trắng) · [Quân ăn được]  ·  ⏱ 02:50          │  ← Bạn (luôn ở dưới)
  │                                                         │
  │  [Chiếu!] "Lượt của bạn — Vua đang bị chiếu"            │  ← Viên trạng thái
  │  [Xin hoà]                   [Đầu hàng]                 │  ← Các nút thao tác phụ
  └─────────────────────────────────────────────────────────┘
```

### 2.2 Hướng nhìn bàn cờ (Lật bàn theo người chơi)
- **Người cầm Trắng**: luôn thấy hàng 1 ở dưới cùng, hàng 8 ở trên cùng.
- **Người cầm Đen**: luôn thấy hàng 8 ở dưới cùng, hàng 1 ở trên cùng (bàn tự động xoay 180° để góc nhìn tự nhiên nhất).
- **Người xem**: mặc định nhìn từ góc nhìn bên Trắng (hàng 1 ở dưới).

### 2.3 Cách đi quân (Tap-to-move)
Để tránh bấm nhầm trên màn hình cảm ứng:
1. **Chạm chọn quân**: Chạm vào quân cờ của mình (chỉ những quân có ít nhất một nước đi hợp lệ mới có thể chọn).
   - Ô quân cờ được highlight màu vàng sáng (`--primary-light`).
   - Các ô đến hợp lệ được đánh dấu:
     - Ô trống: hiện dấu chấm tròn mờ ở tâm ô (`radius = 6px`).
     - Ô có quân đối phương (có thể ăn): hiện vòng tròn viền ngoài ôm quanh ô cờ.
2. **Chạm ô đích**:
   - Chạm vào một trong các ô đích hợp lệ: quân cờ di chuyển đến ô đích và hoàn thành lượt đi.
   - Chạm lại vào chính quân đó hoặc ra ngoài bàn cờ: huỷ chọn.
   - Chạm vào quân cờ khác của mình: đổi sang chọn quân cờ đó.
3. **Kéo thả (Drag & Drop)**: Hỗ trợ kéo quân cờ thả vào ô đích trên cả desktop lẫn điện thoại.

### 2.4 Hộp chọn phong cấp (Promotion Picker)
Khi Tốt đi đến hàng cuối cùng:
- Một popup nhỏ xuất hiện ngay tại vị trí cột phong cấp với 4 lựa chọn: **Hậu (♕), Xe (♖), Tượng (♗), Mã (♘)**.
- Người chơi chạm chọn 1 quân để hoàn tất nước đi.
- Trên điện thoại, kích thước mỗi ô lựa chọn tối thiểu 48px × 48px để bấm chuẩn xác.

---

## 3. Điểm nhấn thị giác & Hiệu ứng

| Tình huống | Hiển thị thị giác |
|---|---|
| **Nước đi vừa diễn ra** | Highlight màu vàng nhạt ở ô xuất phát và ô đích của nước đi gần nhất |
| **Bị chiếu (Check)** | Ô Vua của bên bị chiếu nhấp nháy nền đỏ cảnh báo (`rgba(220, 38, 38, 0.6)`) |
| **Chiếu bí (Checkmate)** | Vua ngã nhẹ hoặc viền đỏ đậm; xuất hiện thông báo thắng/thua nổi bật |
| **Quân bị ăn** | Thanh danh sách quân ăn được thu nhỏ ở cạnh thẻ người chơi kèm điểm chênh lệch (ví dụ: `+3`) |
| **Nước đi đặc biệt** | Nhập thành: Xe tự động lướt qua Vua (150ms). Bắt tốt qua đường: Tốt đối phương biến mất kèm hiệu ứng tan biến |

---

## 4. Giao diện Desktop (≥ 1024px)

- Bàn cờ nằm ở trung tâm bên trái với kích thước lớn (khoảng 560px – 640px).
- Cột bên phải bao gồm:
  1. **Thẻ người chơi** và đồng hồ điện tử cỡ lớn.
  2. **Biên bản ván đấu (Move Log)** theo chuẩn ký hiệu FIDE (ví dụ: `1. e4 e5`, `2. Nf3 Nc6`, `3. Bb5 a6`). Người chơi có thể bấm vào từng nước trong danh sách để xem lại thế cờ.
  3. **Danh sách phím tắt**:
     - `Esc`: Huỷ chọn quân.
     - `Space` / `Enter`: Xác nhận nước đi.
     - `Z`: Đề nghị hoà.
     - `R`: Đầu hàng (có modal xác nhận).
  4. Nút mở tab **Luật chơi** và **Lịch sử cờ vua**.

---

## 5. Thao tác đặc biệt: Đề nghị hoà và Đầu hàng

- **Đầu hàng (Xin thua)**: Nút nằm ở cạnh dưới bàn cờ. Bấm vào sẽ hiện một hộp xác nhận ngắn ("Bạn có chắc chắn muốn đầu hàng không?"). Nếu đồng ý, ván cờ kết thúc, đối thủ thắng cuộc.
- **Đề nghị hoà**: Nút "Xin hoà" gửi một đề nghị tới đối thủ. Màn hình đối thủ xuất hiện một thông báo popup ("Đối thủ đề nghị hoà, bạn có đồng ý không?") gồm 2 nút: "Đồng ý" và "Từ chối". Mỗi người chơi chỉ được gửi tối đa 1 đề nghị hoà mỗi 5 lượt đi để tránh làm phiền.

