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

Giao diện: `docs/design/nen-tang/trang-chu.html` và `trang-chu-desktop.html` (Đã chốt, Q20).

- Phần đầu (hero) có khẩu hiệu "Rủ bạn chơi, chỉ cần một đường link.". Trên desktop, hero chia đôi: chữ bên trái, thẻ trò chơi nổi bật bên phải.
- Thẻ **nổi bật** Ô ăn quan: hình bàn, nhãn "Chơi được ngay", số người, thời lượng, nhóm.
- **Lưới tất cả trò chơi** (2 cột trên điện thoại, 4 cột trên desktop), lọc theo nhóm **Tất cả / Dân gian / Cờ / Bài**. Trò chưa làm có nhãn **Sắp có** và không bấm được.
- **Tạm thời đến M3** (Q19): nút chính của Ô ăn quan ghi **Chơi ngay** và dẫn tới `/offline` (chơi trên một máy). Dòng mô tả dưới khẩu hiệu tạm ghi "Chọn trò rồi chơi ngay, không cần đăng ký." thay cho câu về tạo phòng và gửi link. Trên desktop, dòng ba bước "Chọn trò · Gửi link · Chơi ngay" tạm ẩn.
- **Làm cùng M3:** chip **nickname** trên thanh trên cùng (điền sẵn tên ngẫu nhiên, vd "Cò Trắng 42", lưu `localStorage`), ô **Có mã phòng** + nút **Vào phòng**, mục **Phòng gần đây** (vào lại phòng cũ), nút **Tạo phòng** (khi đó "Chơi trên một máy" thành lựa chọn phụ). **M5:** nút **Luật chơi**.

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
│    Quan = 10 · Quan Già: tắt     │
│    Lật bàn: tắt · Lượt: 30s      │
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

Giao diện: `docs/design/o-an-quan/ban-choi.html`, `ban-choi-doi-thu.html`, `ban-choi-desktop.html` (Đã chốt, Q20). Sơ đồ trên chỉ để hình dung bố cục.

- **Mình luôn ở hàng dưới.** Màn hình của người chơi B xoay bàn 180°.
- Hai **thẻ người chơi** ở trên và dưới bàn: avatar, tên, kho điểm (`N dân · M quan`), điểm lớn bên phải. Thẻ của người đến lượt có viền vàng. Khi ăn quân, kho hiện "+N" thoáng qua; khi bù dân hiện "−5".
- Nhãn **"Hàng của …"** phía trên bàn và **"Hàng của bạn"** phía dưới. Khi đến lượt mình, hàng đối thủ tối hơn hàng mình.
- Mỗi ô hiển thị **hình viên sỏi** (tối đa 14 viên ở ô dân, 10 viên ở ô quan) kèm **con số** ở góc. Ô quan vẽ viên quan to hơn.
- Bàn rộng 7 cột (hai ô quan hẹp hơn). Trên màn 360px, mỗi ô dân rộng khoảng 46px, đạt chuẩn vùng chạm tối thiểu 44px.
- Dưới bàn là **viên trạng thái** ("Lượt của bạn · chọn một ô", "… đang rải…") và một dòng **mô tả nước vừa đi** (vd "Mèo Mun rải ô 9 → ăn ô 2 +4").
- **Desktop (≥ 1024px) có bố cục riêng**, không còn là "cùng bố cục, chỉ phóng to": thanh trên cùng hiện tuỳ chọn ván, bàn to hơn (mỗi hàng cao 124px), **cột phải** gồm **Nhật ký ván** (mỗi nước một dòng, lấy từ `events`) và **Phím tắt**. Từ 420px đến 1023px dùng bố cục điện thoại, căn giữa.
- Làm sau: đồng hồ lượt trong thẻ người chơi (M4), biểu cảm, âm thanh, nút `?` / tab Luật chơi (M5), người xem và "Phòng ABCD" trên thanh trên cùng (M3).

### 2.5 Kết quả

Giao diện: `docs/design/o-an-quan/ket-qua.html`, `ket-qua-desktop.html` (Đã chốt, Q20).

- Hiện đè lên bàn (overlay; desktop là modal chia hai cột): cúp, **Thắng / Thua / Hoà**, chip **lý do kết thúc** ("Hết quan · thu dân về", "Không đủ điểm bù dân", "Lặp nước 3 lần", "Hết giờ" hoặc "Bỏ cuộc"), điểm hai bên, và bảng điểm chi tiết gồm dân đã ăn, quan đã ăn, số lần bù dân, dân thu cuối ván, tổng.
- Nút chính ghi rõ ai đi trước ván sau: **Ván nữa · Mèo Mun đi trước** (cả hai bấm thì bắt đầu ngay). Desktop: phím `Enter`.
- Nút phụ: **Về phòng chờ** (M3), **Chia sẻ kết quả** (M5). Dòng "Mèo Mun muốn chơi ván nữa" làm cùng M3.

### 2.6 Chơi chung một máy (`/offline`, M2)

Chế độ để phát triển và thử. **Tạm thời đến M3** được mở từ trang chủ (nút "Chơi ngay" của Ô ăn quan), xem Q12 và Q19. Bàn chơi, hộp hỏi Lật bàn và kết quả dùng giao diện đã chốt ở mục 2.4, 2.5 và 3.

- **Màn hình bắt đầu** (Q9): chọn Giá trị quan (10/5), Quan Già (tắt/bật), Lật bàn (tắt/bật), rồi bấm **Bắt đầu**. Có dòng nhỏ "Chơi hai người trên cùng một máy. Chơi qua link mời: sắp có." Không có đồng hồ lượt (Q10). Màn này không có thiết kế riêng, dùng token chung.
- **"Bạn" là người đang đến lượt** (Q8, Q20). Người đến lượt luôn thấy bên mình ở dưới. Sau khi hiệu ứng nước đi kết thúc, phần bàn chơi xoay 180° (450ms) kèm trạng thái "Chuyền máy cho …".
- **Tên** (Q11): "Người chơi A" / "Người chơi B" theo người, không theo bên bàn. Thẻ người chơi của mỗi bên hiện người đang điều khiển bên đó.
- Thanh trên cùng ghi "Chơi trên một máy · Lượt N" thay cho "Phòng ABCD". Nút quay lại về trang chủ. Desktop có thêm nút **Đổi tuỳ chọn**.
- **Lật bàn:** khi lật, bên đến lượt không đổi nên bàn **không** xoay. Hai thẻ người chơi đổi tên (có hiệu ứng), kèm thông báo "… đã lật bàn — đến lượt …".
- **Kết quả:** "Người chơi A thắng!" thay cho "Bạn thắng!". Nút phụ là **Đổi tuỳ chọn** và **Về trang chủ** (thay cho Về phòng chờ, Chia sẻ kết quả).

## 3. Tương tác đi một nước

1. Đến lượt mình: các ô hợp lệ trên hàng mình **sáng viền**, ô trống bị mờ đi.
2. **Chạm vào một ô** thì thanh **◀ ▶** (hai nút tròn 44px trên nền tối, có mũi nhọn chỉ xuống ô) nổi ngay trên ô đó. Dưới bàn hiện "Chạm ra ngoài bàn để chọn lại ô khác".
3. **Chạm mũi tên** để gửi nước đi. Chạm ra ngoài thì huỷ chọn.
4. Desktop có phím tắt:

| Phím | Tác dụng |
|---|---|
| `1`–`5` | Chọn ô trên hàng mình, trái → phải |
| `←` / `→` | Rải sang trái / phải |
| `Esc` | Chọn lại ô; khi hộp hỏi Lật bàn đang mở thì là **Giữ bên** |
| `L` | Lật bàn (khi được phép) |
| `Space` | Bật/tắt tua nhanh trong lúc hiệu ứng chạy |
| `Enter` | Ván nữa (ở màn kết quả) |

Chỉ chạm hai lần để đi, không kéo thả, vì kéo thả dễ thao tác nhầm trên điện thoại.

### Lật bàn (khi phòng bật tuỳ chọn này)

Giao diện: `docs/design/o-an-quan/lat-ban.html`, `lat-ban-desktop.html` (Đã chốt, Q20).

- Sau nước mở đầu, khi hiệu ứng đã chạy xong, người đi sau thấy hộp hỏi **"Đổi bên với đối thủ?"**: trên điện thoại là bottom sheet, trên desktop là modal giữa màn hình. Hộp có một câu giải thích, hai ô so sánh **Giữ bên** (điểm bên mình, "bạn đi tiếp") ⇄ **Lật bàn** (điểm bên đối thủ, "đối thủ đi tiếp"), và hai nút **Giữ bên** / **Lật bàn**.
- Đồng hồ lượt vẫn chạy trong lúc hộp hỏi đang mở (M4).
- Đóng hộp hỏi (chạm ra lớp phủ, `Esc`) nghĩa là giữ bên. Hộp hỏi phủ lên bàn nên muốn đi quân thì đóng hộp hỏi trước.
- Khi lật: bàn xoay 180° cho cả hai người (mỗi người vẫn thấy bên mình ở dưới), tên và kho điểm đổi chỗ, kèm thông báo "Mèo Mun đã lật bàn — đến lượt bạn".

## 4. Hiệu ứng rải quân

Hiệu ứng là phần giúp người chơi **hiểu luật**, không chỉ để trang trí.

| Sự kiện | Hiệu ứng | Thời lượng |
|---|---|---|
| Bốc ô | Các viên sỏi bay lên "bàn tay" (con trỏ) | 250ms |
| Rải 1 viên | 1 viên rơi vào ô kế, ô đó nháy nhẹ | 180ms / viên |
| Bốc rải tiếp (a) | Ô được bốc nháy màu vàng | 250ms |
| Ăn (c) | Ô bị ăn chuyển xanh với nhãn "+N" phía trên ô; kho của người ăn hiện "+N" | 400ms |
| Mất lượt (b)/(d) | Hiện chữ "Hết lượt" nhỏ | 300ms |
| Bù dân (mục 6 luật) | 5 viên bay từ kho điểm xuống 5 ô, kèm thông báo "Bù dân −5 điểm". Nếu phải đổi quan thì thêm "(đổi 1 quan)" | 600ms |
| Lật bàn | Bàn xoay 180°, tên và kho điểm đổi chỗ | 600ms |

- Một nước đi dài có thể mất 5–10 giây. Cả hai người đều có nút **⏩ Tua nhanh ×4** và **Bỏ qua hiệu ứng** (desktop: `Space` để tua nhanh).
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
