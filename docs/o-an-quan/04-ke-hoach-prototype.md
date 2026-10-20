# Ô ăn quan — Kế hoạch prototype

## 1. Mục tiêu

Kiểm chứng **luồng chính** của cả nền tảng qua một game thật:

> Hai người ở hai máy khác nhau, một người tạo phòng và gửi link. Người kia bấm link, nhập tên, rồi cả hai chơi hết một ván Ô ăn quan và bấm "Ván nữa". **Toàn bộ quá trình không có lỗi và không cần giải thích gì thêm.**

## 2. Phạm vi

| Có trong prototype | Chưa làm |
|---|---|
| Engine Ô ăn quan đầy đủ luật mặc định + 3 tuỳ chọn | Đánh với máy (bot) |
| Tạo phòng, link mời, QR, Web Share | Tài khoản, lịch sử ván |
| Phòng chờ: ghế, người xem, chủ phòng, tuỳ chọn | Chat chữ |
| Bàn chơi trên điện thoại, chạm 2 lần để đi | Bảng xếp hạng |
| Hiệu ứng rải/ăn, tua nhanh | Âm thanh (để giai đoạn hoàn thiện, nếu kịp) |
| Đồng hồ lượt, tự đi khi hết giờ | Lưu phòng bền (Redis) |
| Kết nối lại, giữ ghế 60 giây | Deploy chính thức |
| Kết quả + Ván nữa | |
| Biểu cảm emoji | |

## 3. Các mốc

| Mốc | Nội dung | Tiêu chí xong |
|---|---|---|
| **M1 — Engine** | `rules.ts` + toàn bộ test case ở mục 4 | Test xanh, bất biến tổng quân luôn đúng sau 10.000 ván ngẫu nhiên |
| **M2 — Bàn chơi offline** | Render bàn + tương tác + hiệu ứng, hai người chơi trên cùng một máy | Chơi hết một ván trên điện thoại thật |
| **M3 — Phòng & mạng** | Server WS, phòng chờ, link mời, đồng bộ nước đi | Chơi được giữa hai tab, rồi giữa hai máy qua tunnel |
| **M4 — Chịu lỗi** | Đồng hồ, tự đi khi hết giờ, kết nối lại, rời phòng | Tắt Wi-Fi 20 giây rồi bật lại, ván vẫn tiếp tục |
| **M5 — Hoàn thiện** | Kết quả, Ván nữa, emoji, hướng dẫn luật, âm thanh | Cho 3–5 người chơi thử và ghi nhận phản hồi |

## 4. Test case cho engine

| # | Tình huống | Kỳ vọng |
|---|---|---|
| T1 | Ví dụ chuẩn trong tài liệu luật: bàn khởi đầu, A chọn ô 3, chiều +1 | A ăn 6 dân (ô 4), lượt chuyển sang B |
| T2 | Viên cuối rơi ngay trước ô quan còn quan | Kết thúc lượt, không ăn gì |
| T3 | Viên cuối, sau đó là 1 ô trống, rồi đến ô quan có quan + 3 dân, `camAnQuanNon = tắt` | Ăn 1 quan + 3 dân |
| T4 | Như T3 nhưng `camAnQuanNon = bật` | Không ăn, kết thúc lượt |
| T5 | Ăn dây 3 ô (trống–có–trống–có–trống–có) | Ăn cả 3 ô |
| T6 | Sau viên cuối là hai ô trống | Kết thúc lượt, không ăn |
| T7 | Ăn dây đi vòng qua ô quan đã trống hẳn | Được ăn tiếp ô phía sau |
| T8 | Ô được chọn có ≥ 12 dân (rải đủ một vòng) | Ô vừa bốc nhận lại 1 dân khi rải vòng tới |
| T9 | Đầu lượt, hàng mình trống hết, mình đã ăn ≥ 5 dân | Trừ 5 dân của mình, mỗi ô có 1 dân |
| T10 | Như T9 nhưng mình chỉ có 2 dân | Dùng 2 dân của mình, vay 3 dân của đối phương, `debt` = 3 |
| T11 | Cả hai bên cộng lại không đủ 5 dân để rải, ô quan vẫn còn quan + dân | Ván kết thúc. Người còn lại thu toàn bộ quân trên bàn (kể cả ô quan). Tổng điểm = 70 |
| T12 | Ô quan cuối cùng bị ăn, hai ô quan đều trống hẳn | Ván kết thúc, mỗi bên thu dân trên hàng mình, điểm cộng đúng |
| T13 | Tính điểm có nợ | Điểm cuối = dân + quan × giá trị − nợ vay + nợ cho vay |
| T14 | Đi sai lượt / chọn ô của đối thủ / ô trống / ô quan / chiều không hợp lệ | Trả về lỗi, state không đổi |
| T15 | `giaTriQuan = 5` | Tổng điểm hai bên cuối ván = 60 |
| T16 | Fuzz: 10.000 ván với nước đi ngẫu nhiên, chạy với cả hai giá trị quan | Không treo, không lỗi, bất biến tổng quân luôn đúng, mọi ván đều kết thúc, tổng điểm cuối ván luôn = 70 (hoặc 60) |

> T16 còn kiểm tra vòng lặp rải có luôn dừng hay không. Theo luật thì luôn dừng, nhưng nên đặt thêm giới hạn an toàn (vd: 10.000 bước rải trong một lượt) để phát hiện lỗi.

## 5. Kịch bản chơi thử với người thật (M5)

1. Gửi link qua Zalo cho người chưa từng vào trang. Đo thời gian từ lúc bấm link đến nước đi đầu tiên (mục tiêu dưới 30 giây).
2. Không giải thích luật. Quan sát xem họ có hiểu từ hiệu ứng và phần hướng dẫn hay không.
3. Hỏi 3 câu sau ván: *Có chỗ nào khó hiểu không? Có muốn chơi ván nữa không? Muốn chơi game nào tiếp theo?*

## 6. Câu hỏi mở

| # | Câu hỏi | Trả lời | Trạng thái |
|---|---|---|---|
| Q1 | Quan = 10 hay 5 dân? | **10** mặc định, có tuỳ chọn 5 | Đã chốt |
| Q2 | Mặc định có cấm ăn quan non không? | **Không cấm** (tắt), có tuỳ chọn bật | Đã chốt |
| Q3 | Ô quan đã trống hẳn được xem như ô trống (cho phép ăn qua nó)? | **Có** | Đã chốt |
| Q4 | Khi vay dân không đủ, có cho đổi quan đã ăn ra dân không? | **Không** | Đã chốt |
| Q5 | Bị đi thay mấy lượt liên tiếp thì xử thua? | **3** lượt | Đã chốt |
| Q6 | Tên miền / tên thương hiệu | Tạm dùng **PlayTogether**. Không ảnh hưởng M1–M4, chốt trước khi deploy | Đã chốt (tạm) |
| Q7 | Ván kết thúc theo mục 6.4 luật (hai bên cộng lại không đủ 5 dân để rải) trong khi ô quan vẫn còn quan và/hoặc dân: số quân còn trong 2 ô quan xử lý thế nào? | **Phương án C**, xem chi tiết bên dưới | Đã chốt |

### Q7 — Quân còn trong ô quan khi ván kết thúc theo mục 6.4

**Bối cảnh:** Mục 7 luật chỉ nói "mỗi người thu toàn bộ dân còn trên hàng của mình". Nếu ván kết thúc do hết quan thì hai ô quan đã trống hẳn nên không có vấn đề. Nhưng nếu ván kết thúc theo mục 6.4 thì ô quan có thể vẫn còn quan và dân, và tài liệu chưa nói số quân này thuộc về ai.

**Ảnh hưởng:** T11 (kết quả ván), T13 (tính điểm), T15 (tổng điểm = 60 có còn đúng cho mọi ván không).

| Phương án | Mô tả | Hệ quả |
|---|---|---|
| A | Không ai được. Chỉ tính quân đã ăn + dân trên hàng mình | Đúng nguyên văn mục 7. Tổng điểm có thể nhỏ hơn 70 (hoặc 60). T15 chỉ áp dụng cho ván kết thúc do hết quan |
| B | Người không rải được bị xử thua ngay, không so điểm | Đơn giản, nhưng điểm hiển thị có thể ngược với kết quả |
| C | Người còn dân thu toàn bộ quân còn trên bàn, kể cả 2 ô quan | Tổng điểm luôn bằng 70 (hoặc 60) |

**Trả lời: Phương án C.** Người còn lại (người không phải rải) thu toàn bộ quân còn trên bàn: dân trên cả hai hàng cùng quan và dân trong hai ô quan. Lý do chọn:
- Giữ được bất biến "tổng điểm cuối ván = 70 (hoặc 60)" cho **mọi** ván, nên test và hiển thị điểm đơn giản hơn.
- Hợp với tinh thần "thu quân": người còn quân trên bàn là người kiểm soát số quân còn lại.
- B làm điểm hiển thị có thể ngược với kết quả. A làm "mất" quân một cách khó giải thích với người chơi.

Đã cập nhật: mục 7 trong `01-luat-choi.md`, `ScoreDetail` trong `03-thiet-ke-ky-thuat.md`, test T11 và T15 ở mục 4.
