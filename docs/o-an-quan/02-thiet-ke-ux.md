# Ô ăn quan — Thiết kế UX

Mục tiêu: **từ lúc bấm link đến lúc đi nước đầu tiên dưới 30 giây**, kể cả với người chưa từng vào trang.

## 1. Luồng tổng thể

```
[Trang chủ] ──Tạo phòng──► [Phòng chờ] ──Chủ phòng bấm Bắt đầu──► [Bàn chơi] ──Hết ván──► [Kết quả]
     ▲                         ▲                                                   │
     │                         └──────────────────── Ván nữa ──────────────────────┘
     │
 Bấm link /r/ABCD ──(chưa có nickname)──► [Nhập nickname] ──► [Phòng chờ]
```

## 2. Màn hình

### 2.1 Trang chủ `/`

- Ô nhập **nickname**, điền sẵn một tên ngẫu nhiên (vd: "Cò Trắng 42"), lưu vào `localStorage`.
- Nút chính: **Tạo phòng Ô ăn quan**. Sau này sẽ thành lưới chọn game.
- Ô nhập **mã phòng** + nút **Vào**.

### 2.2 Nhập nickname (khi vào bằng link)

- Chỉ hiện khi trình duyệt chưa có nickname. Có 1 ô nhập và 1 nút **Vào phòng**.
- Đã có nickname thì vào thẳng phòng chờ.

### 2.3 Phòng chờ `/r/:code`

```
┌──────────────────────────────────┐
│  Ô ăn quan · Phòng ABCD          │
│                                  │
│  [ Sao chép link ] [ Chia sẻ ]   │  ← Chia sẻ dùng Web Share API (mở Zalo/Messenger trên điện thoại)
│  [ QR ]                          │
│                                  │
│  Ghế 1:  Cò Trắng 42 (chủ phòng) │
│  Ghế 2:  — Đang chờ bạn bè… —    │
│                                  │
│  Người xem: Mèo Mun              │
│                                  │
│  ⚙ Tuỳ chọn (chủ phòng sửa được) │
│    Quan = 10 · Cấm quan non: tắt │
│    Thời gian lượt: 30s           │
│                                  │
│  [   BẮT ĐẦU   ]                 │  ← chỉ bật khi đủ 2 người ngồi ghế
└──────────────────────────────────┘
```

- Người vào phòng tự động ngồi ghế trống. Hết ghế thì vào làm **người xem**.
- Người xem có thể bấm vào ghế trống để ngồi.
- Chủ phòng rời đi thì người ngồi ghế còn lại trở thành chủ phòng.

### 2.4 Bàn chơi

Bố cục màn hình dọc trên điện thoại (chiều rộng ~360px):

```
  Mèo Mun  ·  12 điểm  ·  ⏱ ─────           ← đối thủ (ở trên)
  ┌────┬────┬────┬────┬────┬────┬────┐
  │    │ 5  │ 5  │ 5  │ 5  │ 5  │    │
  │ Q  ├────┼────┼────┼────┼────┤ Q  │
  │ 1  │ 5  │ 5  │ 5  │ 5  │ 5  │ 1  │
  └────┴────┴────┴────┴────┴────┴────┘
  Cò Trắng 42  ·  6 điểm  ·  ⏱ ██████        ← mình (luôn ở dưới)
           "Lượt của bạn — chọn một ô"
```

- **Mình luôn ở hàng dưới.** Màn hình của người chơi B xoay bàn 180°.
- Mỗi ô hiển thị **hình viên sỏi** (tối đa ~12 viên, nhiều hơn thì gom thành đống) kèm **con số** ở góc. Ô quan vẽ viên quan to hơn.
- Bàn rộng 7 cột. Trên màn 360px, mỗi ô khoảng 48px, đạt chuẩn vùng chạm tối thiểu 44px.
- Màn hình ngang và desktop dùng cùng bố cục, chỉ phóng to.

### 2.5 Kết quả

- Hiện đè lên bàn (overlay): **Thắng / Thua / Hoà** và bảng điểm chi tiết gồm dân, quan, nợ, dân thu cuối ván.
- Các nút: **Ván nữa** (cả hai bấm thì bắt đầu ngay), **Về phòng chờ**, **Chia sẻ kết quả**.

## 3. Tương tác đi một nước

1. Đến lượt mình: các ô hợp lệ trên hàng mình **sáng viền**, ô trống bị mờ đi.
2. **Chạm vào một ô** thì hai mũi tên **◀ ▶** hiện ngay trên ô đó.
3. **Chạm mũi tên** để gửi nước đi. Chạm ra ngoài thì huỷ chọn.
4. Desktop có phím tắt: `1–5` chọn ô, `←` / `→` chọn chiều.

Chỉ chạm hai lần để đi, không kéo thả, vì kéo thả dễ thao tác nhầm trên điện thoại.

## 4. Hiệu ứng rải quân

Hiệu ứng là phần giúp người chơi **hiểu luật**, không chỉ để trang trí.

| Sự kiện | Hiệu ứng | Thời lượng |
|---|---|---|
| Bốc ô | Các viên sỏi bay lên "bàn tay" (con trỏ) | 250ms |
| Rải 1 viên | 1 viên rơi vào ô kế, ô đó nháy nhẹ | 180ms / viên |
| Bốc rải tiếp (a) | Ô được bốc nháy màu vàng | 250ms |
| Ăn (c) | Ô bị ăn nháy xanh, sỏi bay về khu điểm của người ăn, hiện chữ "+N" | 400ms |
| Mất lượt (b)/(d) | Hiện chữ "Hết lượt" nhỏ | 300ms |
| Rải quân khi hết dân (mục 6 luật) | 5 viên bay từ khu điểm xuống 5 ô, kèm thông báo "Vay 2 dân từ Mèo Mun" nếu có vay | 600ms |

- Một nước đi dài có thể mất 5–10 giây. Cả hai người đều có nút **⏩ Tua nhanh** (gấp 4 lần tốc độ) và **Bỏ qua**.
- Đồng hồ của người chơi kế tiếp **chỉ chạy sau khi hiệu ứng kết thúc** (server cộng thêm thời gian hiệu ứng ước tính, xem tài liệu kỹ thuật).
- Có tuỳ chọn **giảm chuyển động**: khi máy bật `prefers-reduced-motion` thì bỏ bay sỏi, chỉ cập nhật số.

## 5. Trạng thái và thông báo

| Tình huống | Hiển thị |
|---|---|
| Đối thủ mất kết nối | Avatar mờ + "Đang kết nối lại… (còn 60s)" |
| Mình mất kết nối | Thanh đỏ ở trên cùng "Mất kết nối, đang thử lại…", bàn bị khoá |
| Đối thủ rời hẳn | "Mèo Mun đã rời phòng" + nút **Chờ người khác** hoặc **Về trang chủ** |
| Mình bấm vào ô không hợp lệ | Ô rung nhẹ, không hiện thông báo lỗi |
| Hết giờ, bị đi thay | Thông báo nhỏ "Hết giờ — đã đi ngẫu nhiên" |

## 6. Phần nhỏ nhưng nên có ngay

- **Biểu cảm nhanh**: 6 emoji (😂 😮 😡 👏 🤝 😭) bay lên từ avatar. Thay cho chat chữ, đủ vui mà không cần kiểm duyệt nội dung.
- **Hướng dẫn luật** dạng 4 thẻ ngắn có hình minh hoạ, mở bằng nút `?` trên bàn chơi.
- **Âm thanh**: tiếng sỏi rơi, tiếng ăn quân, có nút tắt.

## 7. Ngoài phạm vi prototype

Chat chữ, tài khoản, bảng xếp hạng, đánh với máy, giao diện tối, đa ngôn ngữ.
