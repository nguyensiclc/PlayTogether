# Cờ caro — Thiết kế UX

Mục tiêu giống Ô ăn quan: **từ lúc bấm link đến lúc đặt quân đầu tiên dưới 30 giây**, kể cả với người chưa từng vào trang. Caro dùng chung nền tảng đã có (trang chủ, nhập nickname, phòng, kết nối lại). Tài liệu này chỉ nói phần **riêng của Caro**.

## 1. Luồng tổng thể

Giống Ô ăn quan (xem `docs/o-an-quan/02-thiet-ke-ux.md` mục 1):

```
[Trang chủ] ──Tạo phòng Cờ caro──► [Phòng chờ] ──Bắt đầu──► [Bàn chơi] ──Hết ván──► [Kết quả]
                                        ▲                                                │
                                        └─────────────── Ván nữa ───────────────────────┘
```

## 2. Màn hình

| Màn hình | Dùng chung hay riêng | Ghi chú |
|---|---|---|
| Trang chủ | Dùng chung | Thẻ **Cờ caro** trong lưới trò chơi chuyển từ "Sắp có" sang chơi được, có nút **Tạo phòng** |
| Nhập nickname (vào bằng link) | Dùng chung | Đổi chữ "chơi Ô ăn quan" thành tên game của phòng, biểu tượng game theo phòng |
| Phòng chờ | Dùng chung khung, **riêng phần tuỳ chọn** | Tuỳ chọn Caro: Cỡ bàn (15/19), Chặn 2 đầu (bật/tắt) |
| Bàn chơi | **Riêng** | Mục 3 |
| Kết quả | Dùng chung khung, **riêng nội dung** | Mục 5 |
| Mất kết nối | Dùng chung | Thanh đỏ và khoá bàn, như Ô ăn quan (M4) |

## 3. Bàn chơi

### 3.1 Bố cục (điện thoại 360px)

```
  Mèo Mun  ·  ✕  ·  ⏱ ─────                ← đối thủ (ở trên), ký hiệu quân của họ
  ┌─────────────────────────┐
  │ · · · · · · · · · · · · │
  │ · · · ✕ ◯ · · · · · · · │              ← bàn vuông, vừa chiều rộng màn hình
  │ · · · · ✕ ◯ · · · · · · │
  │ · · · · · ✕ · · · · · · │              ← quân vừa đi có dấu vòng nhấn mạnh
  │ · · · · · · · · · · · · │
  └─────────────────────────┘
  Cò Trắng 42  ·  ◯  ·  ⏱ ██████           ← mình (luôn ở dưới)
        "Lượt của bạn — chạm một ô trống"
```

- **Bàn không xoay.** Mọi người thấy bàn cùng một hướng. Hai thẻ người chơi ở trên và dưới như Ô ăn quan: mình luôn ở dưới, đối thủ ở trên. Người xem thấy ghế 1 ở dưới.
- Thẻ người chơi hiện **ký hiệu quân** (X / O, màu khác nhau), tên, và biểu tượng "đến lượt".
- Cỡ bàn: 15 × 15 trên màn 360px cho mỗi ô khoảng **22px**, nhỏ hơn vùng chạm tối thiểu 44px. Xem cách đặt quân ở mục 3.2.
- Quân vừa đặt có **vòng đánh dấu**, để đối thủ thấy ngay nước vừa đi.
- Khi có người thắng: chuỗi thắng **nháy và nối bằng một vạch**, phần còn lại của bàn mờ đi chút.
- Desktop (≥ 1024px): bàn to, có cột phải gồm **Nhật ký ván** (danh sách nước đi) và **Phím tắt**, như Ô ăn quan.

### 3.2 Đặt quân (điện thoại)

Ô nhỏ hơn 44px nên **không đặt quân bằng một chạm**, vì dễ đặt nhầm. Đề xuất **chạm hai lần** (cùng tinh thần "chạm 2 lần để đi" của Ô ăn quan) **(đề xuất, C5)**:

1. **Chạm** vào một ô trống: ô đó sáng lên, hiện **quân xem trước** màu của mình, và một **kính lúp** phóng to vùng quanh ngón tay nổi phía trên ngón tay (không bị ngón che).
2. **Kéo** ngón tay để chọn ô khác (kính lúp đi theo). Nhấc ngón tay thì ô đó giữ trạng thái "đang chọn".
3. **Chạm lại đúng ô đó** hoặc bấm nút **Đặt quân** (nằm dưới bàn, rộng, ≥ 48px) để xác nhận. Chạm ô khác thì đổi ô đang chọn. Chạm ra ngoài bàn thì huỷ chọn.

Chỉ ô **trống** mới chọn được. Chạm vào ô đã có quân thì ô đó rung nhẹ, không báo lỗi.

### 3.3 Đặt quân (desktop)

- **Di chuột** vào ô trống: hiện quân xem trước mờ.
- **Click một lần** để đặt quân.
- Phím tắt: các phím **mũi tên** di chuyển ô đang chọn, **Enter** hoặc **Space** để đặt, **Esc** để bỏ chọn.

## 4. Hiệu ứng

| Sự kiện | Hiệu ứng | Thời lượng |
|---|---|---|
| Đặt quân | Quân xuất hiện từ nhỏ đến to, vòng đánh dấu nước vừa đi | 150ms |
| Thắng | Các quân trong chuỗi thắng nháy lần lượt, rồi vạch nối chạy qua chuỗi | 600ms |
| Hoà | Hiện thông báo "Hoà", bàn mờ nhẹ | 300ms |

- Có **giảm chuyển động** khi máy bật `prefers-reduced-motion`: bỏ nháy và vạch chạy, chỉ đổi màu chuỗi thắng.
- Caro không có hiệu ứng dài như Ô ăn quan nên **không cần** nút Tua nhanh / Bỏ qua.

## 5. Kết quả

- Hiện đè lên bàn (overlay): **Bạn thắng / Bạn thua / Hoà**, lý do ngắn: "5 quân liên tiếp", "Hết bàn, hoà", "Đối thủ rời phòng", "Hết giờ". Người xem thấy tên người thắng.
- Hiện **số nước** đã đi và **thu nhỏ bàn** với chuỗi thắng nổi bật.
- Nút **Ván nữa** (cả hai bấm thì bắt đầu ngay, ghi rõ ai đi trước), **Về phòng chờ**, **Rời phòng**. Chia sẻ kết quả để M5.

## 6. Trạng thái và thông báo

Dùng chung với Ô ăn quan (mất kết nối, đối thủ rời phòng...). Riêng Caro:

| Tình huống | Hiển thị |
|---|---|
| Chưa đến lượt | "Lượt của Mèo Mun…" (viên trạng thái nhạt), bàn không bấm được |
| Đến lượt, chưa chọn ô | "Lượt của bạn — chạm một ô trống" |
| Đang chọn ô (điện thoại) | "Chạm lại ô đó hoặc bấm Đặt quân" |
| Chạm ô đã có quân | Ô rung nhẹ, không hiện thông báo lỗi |
| Chuỗi bị chặn hai đầu (khi bật Chặn 2 đầu) | Thông báo nhỏ "Chuỗi 5 bị chặn 2 đầu — chưa thắng" để người chơi hiểu vì sao ván tiếp tục |

## 7. Danh sách màn hình cần thiết kế

Mockup đặt trong `docs/design/caro/` (xem `docs/design/caro/README.md`, là bản yêu cầu thiết kế). Cần cả bản **điện thoại 360 × 740** và **desktop 1280 × 800**:

1. Phòng chờ, phần **tuỳ chọn Caro** (Cỡ bàn, Chặn 2 đầu).
2. **Bàn chơi, lượt mình, chưa chọn ô.**
3. **Bàn chơi, đang chọn một ô** (quân xem trước, kính lúp, nút Đặt quân) — chỉ điện thoại.
4. **Bàn chơi, đối thủ vừa đi** (vòng đánh dấu nước vừa đi).
5. **Bàn chơi, có chuỗi thắng** (nháy và vạch nối).
6. **Kết quả** (thắng / thua / hoà).
7. Biểu tượng Cờ caro trên trang chủ (đã có trong mockup trang chủ, kiểm tra lại cho khớp).

Phần trang chủ, nhập nickname, mất kết nối **dùng lại thiết kế đã chốt** của nền tảng, chỉ cần đổi tên game và biểu tượng.

## 8. Ngoài phạm vi prototype

Âm thanh đặt quân, hoàn nước, gợi ý nước đi, chat chữ, xem lại ván.
