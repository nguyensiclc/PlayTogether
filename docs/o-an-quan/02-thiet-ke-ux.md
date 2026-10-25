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
- **Thanh trên cùng:** chip **nickname** (lần đầu điền sẵn tên ngẫu nhiên kiểu "Cò Trắng 42", lưu `localStorage`). Bấm vào chip để sửa tên tại chỗ. Trên desktop có thêm ô **Mã phòng** + nút **Vào**.
- **Điện thoại:** dưới khẩu hiệu có ô **Có mã phòng?** + nút **Vào phòng**. Mã sai định dạng thì báo "Mã phòng gồm 6 ký tự".
- **Phòng gần đây:** tối đa 5 phòng đã vào trên máy này (mã phòng, đã chơi với ai, bao lâu trước), nút **Vào lại**. Chưa vào phòng nào thì ẩn mục này.
- Nút **Tạo phòng** (thẻ nổi bật, thẻ Ô ăn quan trong lưới, nút chính trên desktop) tạo phòng rồi chuyển thẳng sang `/r/MÃ`.
- **M5:** nút **Luật chơi**.

### 2.2 Nhập nickname (khi vào bằng link)

Giao diện: `docs/design/nen-tang/nhap-nickname.html` (Đã chốt, Q22b).

- Chỉ hiện khi trình duyệt chưa có nickname. Đã có nickname thì vào thẳng phòng.
- Hiện "**Cò Trắng 42** mời bạn chơi Ô ăn quan", thẻ phòng (mã phòng, avatar người đang ngồi, số ghế trống). Thông tin lấy từ `GET /api/rooms/:code` trước khi kết nối. Phòng đã đủ người thì ghi "bạn sẽ vào xem".
- Ô nhập tên (tối đa 20 ký tự, có bộ đếm), điền sẵn một tên gợi ý; chip **🎲 Ngẫu nhiên** và hai tên gợi ý. Nút **Vào phòng**.
- Mã phòng không có thì hiện "Không tìm thấy phòng …" và nút **Về trang chủ**.

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

Giao diện: `docs/design/nen-tang/phong-cho.html`, `phong-cho-desktop.html` (Đã chốt, Q22b). Sơ đồ trên chỉ để hình dung.

- Thẻ **Mời bạn bè vào chơi**: link (tự động thay `localhost` bằng địa chỉ IP nội bộ của máy chủ để bạn bè cùng mạng Wi-Fi/LAN quét QR hoặc bấm link là vào được ngay), nút **Sao chép** (đổi thành "Đã chép"), **Chia sẻ** (Web Share API, chỉ hiện khi máy hỗ trợ), **Mã QR** (điện thoại bấm để mở; desktop hiện sẵn bên cột phải). Điện thoại đặt thẻ này ngay dưới tên phòng.
- Danh sách ghế: avatar, tên, "(bạn)", nhãn **Chủ phòng** / **● Đã vào** / **Mất kết nối**. Ghế trống ghi "Đang chờ bạn bè…". Desktop hiện hai thẻ ghế kiểu VS.
- **Tuỳ chọn:** Giá trị quan, Quan Già, Lật bàn, Mốc điểm thắng (Đấu trận: Từng ván, 70, 100, 200, 300, 500 điểm). Chỉ chủ phòng chỉnh được, người khác thấy nhưng không bấm được. "Thời gian mỗi lượt" ẩn cho tới M4 (Q22d).
- Nút cuối: chủ phòng đủ người thì **Bắt đầu ván** (kèm "Người đi trước được chọn ngẫu nhiên" hoặc "… đi trước"); chưa đủ người thì "Cần thêm 1 người để bắt đầu"; khách thì "Chờ chủ phòng bắt đầu".
- Nút quay lại / **Rời phòng**: rời phòng thật (đang chơi thì bị xử thua — Q22f), về trang chủ.
- Người vào phòng tự động ngồi ghế trống. Hết ghế thì vào làm **người xem**.
- Người xem có thể bấm **Ngồi đây** ở ghế trống để ngồi.
- Chủ phòng rời đi thì người ngồi ghế còn lại trở thành chủ phòng.

### 2.4 Bàn chơi

Bố cục màn hình dọc trên điện thoại (chiều rộng ~360px):

```
  Mèo Mun  ·  12 điểm (Tổng 45/200)  ·  ⏱ ─────           ← đối thủ (ở trên)
  ┌────┬────┬────┬────┬────┬────┬────┐
  │    │ 5  │ 5  │ 5  │ 5  │ 5  │    │
  │ Q  ├────┼────┼────┼────┼────┤ Q  │
  │ 1  │ 5  │ 5  │ 5  │ 5  │ 5  │ 1  │
  └────┴────┴────┴────┴────┴────┴────┘
  Cò Trắng 42  ·  6 điểm (Tổng 38/200)  ·  ⏱ ██████        ← mình (luôn ở dưới)
           "Lượt của bạn — chọn một ô"
```

Giao diện: `docs/design/o-an-quan/ban-choi.html`, `ban-choi-doi-thu.html`, `ban-choi-desktop.html` (Đã chốt, Q20). Sơ đồ trên chỉ để hình dung bố cục.

- **Mình luôn ở hàng dưới.** Khi mình đổi bên (Lật bàn) thì hai hàng được vẽ lại ngay, **không có hiệu ứng xoay** (Q22h). Người xem thấy người ngồi ghế 1 ở dưới.
- Thanh trên cùng ghi "Phòng ABCD · Lượt N"; khi bật Đấu trận ghi "Phòng ABCD · Trận X điểm (Ván K) · Lượt N". Nút quay lại về trang chủ (vẫn giữ ghế, vào lại bằng link hoặc Phòng gần đây).
- Đối thủ mất kết nối thì thẻ của họ mờ đi và ghi **Mất kết nối**. Mình mất kết nối thì có thanh đỏ "Mất kết nối, đang thử lại…" trên cùng và bàn bị khoá (Q22e).
- Hai **thẻ người chơi** ở trên và dưới bàn: avatar, tên, kho điểm (`N dân · M quan`), điểm lớn bên phải kèm huy hiệu tổng điểm trận `(Tổng: X/Y)` nếu đang đấu trận. Thẻ của người đến lượt có viền vàng. Khi ăn quân, kho hiện "+N" thoáng qua; khi bù dân hiện "−5".
- Nhãn **"Hàng của …"** phía trên bàn và **"Hàng của bạn"** phía dưới. Khi đến lượt mình, hàng đối thủ tối hơn hàng mình.
- Mỗi ô hiển thị **hình viên sỏi** (tối đa 14 viên ở ô dân, 10 viên ở ô quan) kèm **con số** ở góc. Ô quan vẽ viên quan to hơn.
- **Hai đầu bàn bo tròn theo nửa elip** (`border-radius: 13.5% / 50%`), ôm sát hai ô quan; mỗi ô quan là một nửa elip trọn vẹn. Cả điện thoại và desktop dùng cùng tỉ lệ.
- Bàn rộng 7 cột (hai ô quan hẹp hơn). Trên màn 360px, mỗi ô dân rộng khoảng 46px, đạt chuẩn vùng chạm tối thiểu 44px.
- Dưới bàn là **viên trạng thái** ("Lượt của bạn · chọn một ô", "… đang rải…") và một dòng **mô tả nước vừa đi** (vd "Mèo Mun rải ô 9 → ăn ô 2 +4").
- **Desktop (≥ 1024px) có bố cục riêng**, không còn là "cùng bố cục, chỉ phóng to": thanh trên cùng hiện tuỳ chọn ván (và chip Đấu trận), bàn to hơn (mỗi hàng cao 124px), **cột phải** gồm **Nhật ký ván** (mỗi nước một dòng, lấy từ `events`) và **Phím tắt**. Từ 420px đến 1023px dùng bố cục điện thoại, căn giữa.
- Làm sau: đồng hồ lượt trong thẻ người chơi (M4), biểu cảm, âm thanh, nút `?` / tab Luật chơi (M5), danh sách người xem ở cột phải desktop (M5).

### 2.5 Kết quả

Giao diện: `docs/design/o-an-quan/ket-qua.html`, `ket-qua-desktop.html` (Đã chốt, Q20).

- Hiện đè lên bàn (overlay; desktop là modal chia hai cột): cúp, **Thắng / Thua / Hoà**, chip **lý do kết thúc** ("Hết quan · thu dân về", "Không đủ điểm bù dân", "Lặp nước 3 lần", "Hết giờ" hoặc "Bỏ cuộc"), điểm hai bên, và bảng điểm chi tiết gồm dân đã ăn, quan đã ăn, số lần bù dân, dân thu cuối ván, tổng ván này.
- Khi bật **Đấu trận** (`targetScore`):
  - Bảng điểm hiển thị thêm dòng **Tổng điểm trận đấu** (vd `120 / 200 điểm`).
  - Nếu chưa có ai đạt mốc: Tiêu đề là kết quả ván ("Bạn thắng ván này!"), nút chính là **Ván tiếp theo · Ván K+1 (Mèo Mun đi trước)**.
  - Nếu đã có người đạt mốc: Tiêu đề là **Bạn thắng chung cuộc trận đấu!** (hoặc **Mèo Mun thắng chung cuộc!**), chip ghi rõ "Đạt mốc X điểm · Ván K", nút chính chuyển thành **Trận mới** (bắt đầu lại chuỗi đấu trận).
- Nút chính ghi rõ ai đi trước ván sau: **Ván nữa · Mèo Mun đi trước** (cả hai bấm thì bắt đầu ngay). Desktop: phím `Enter`.
- Tiêu đề: **Bạn thắng!** / **Bạn thua** / **Hoà!**; người xem thấy "Mèo Mun thắng!" và không có nút Ván nữa.
- Đã bấm Ván nữa thì nút chuyển thành "Đang chờ đối thủ bấm Ván nữa…". Người kia thấy dòng "Mèo Mun muốn chơi ván nữa".
- Nút phụ: **Về phòng chờ** (về phòng chờ, chủ phòng chỉnh tuỳ chọn rồi bắt đầu lại được), **Rời phòng**. **Chia sẻ kết quả** để M5.

### 2.6 ~~Chơi chung một máy~~ (đã bỏ)

Chế độ chơi chung một máy (`/offline`, M2, Q8–Q12, Q19, Q21) đã bị xoá theo Q22a. Đường dẫn `/offline` cũ chuyển về trang chủ.

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
- Khi lật: hai người đổi bên, mỗi người vẫn thấy bên mình ở dưới nên hai hàng được vẽ lại ngay, **không có hiệu ứng xoay** (Q22h). Kèm thông báo "Mèo Mun đã lật bàn — đến lượt bạn".

## 4. Hiệu ứng rải quân

Hiệu ứng là phần giúp người chơi **hiểu luật**, không chỉ để trang trí.

| Sự kiện | Hiệu ứng | Thời lượng |
|---|---|---|
| Bốc ô đầu | Các viên sỏi bay lên "bàn tay" (con trỏ) | 250ms |
| Rải 1 viên | 1 viên sỏi mới màu đỏ rơi vào ô kế, các viên sỏi cũ giữ nguyên vị trí. Khi hết sỏi trên tay, toàn bộ sỏi đỏ chuyển mượt về màu trắng | 1.000ms / viên (1s) |
| Bốc rải tiếp (a) | Ô được bốc nháy vàng, thông báo "Ô kế có quân — Bốc ô X rải tiếp" | 1.200ms |
| Ăn (c) | Ô bị ăn chuyển xanh với nhãn "+N", thông báo "Cách 1 ô trống — Ăn ô X (+N điểm)" (hoặc "Ăn liên hoàn") | 1.400ms |
| Hết lượt (b)/(d) | Thông báo lý do: gặp ô quan, hai ô trống, quan già, hết nước ăn | 1.400ms |
| Bù dân (mục 6 luật) | 5 viên bay từ kho điểm xuống 5 ô, kèm thông báo "Bù dân −5 điểm". Nếu phải đổi quan thì thêm "(đổi 1 quan)" | 800ms |
| Lật bàn | Hai thẻ người chơi nháy, hai hàng và hai kho đổi chỗ (không xoay bàn), thông báo nhỏ | 800ms |

- Một nước đi dài có thể mất 5–10 giây. Cả hai người đều có nút **⏩ Tua nhanh ×4** và **Bỏ qua hiệu ứng** (desktop: `Space` để tua nhanh). Nếu nước rải kéo dài quá 15 giây mà chưa xong, hệ thống tự động bật Tua nhanh ×4.
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
