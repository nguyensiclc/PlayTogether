# Cờ tướng — Luật chơi

Nguồn sự thật cho engine `packages/engine/co-tuong`. Code phải khớp **chính xác** tài liệu này, kể cả cách đánh số ô. Chỗ nào còn mơ hồ thì ghi ở `04-ke-hoach-prototype.md` mục 6 (câu hỏi `T1…`), không tự đoán.

## 1. Tổng quan

Hai người, một bên **Đỏ**, một bên **Đen**. Mỗi bên có 16 quân. Mục tiêu: **chiếu bí** tướng đối phương (tướng bị chiếu và không có nước nào thoát). Đỏ đi trước.

## 2. Bàn cờ

- Lưới **9 cột × 10 hàng** = 90 giao điểm; quân đặt **trên giao điểm**.
- Giữa hàng 4 và hàng 5 là **sông**. Mỗi bên có một **cung** 3 × 3 (cột 3–5; hàng 0–2 của Đen, hàng 7–9 của Đỏ) với hai đường chéo.
- **Đánh số ô:** `i = y × 9 + x`, `x ∈ [0, 8]` từ trái sang phải, `y ∈ [0, 9]` từ trên xuống dưới, theo hệ toạ độ **cố định** của state. Đen ở các hàng trên (`y` 0–4), Đỏ ở các hàng dưới (`y` 5–9). Client của người cầm Đen xoay bàn 180° khi vẽ; engine không biết chuyện này.

## 3. Quân và vị trí xếp ban đầu

| Quân | Mã | Số lượng / bên | Hàng xuất phát (Đen / Đỏ) |
|---|---|---|---|
| Tướng | `tuong` | 1 | `y=0` cột 4 / `y=9` cột 4 |
| Sĩ | `si` | 2 | `y=0` cột 3, 5 / `y=9` cột 3, 5 |
| Tượng | `voi` | 2 | `y=0` cột 2, 6 / `y=9` cột 2, 6 |
| Mã | `ma` | 2 | `y=0` cột 1, 7 / `y=9` cột 1, 7 |
| Xe | `xe` | 2 | `y=0` cột 0, 8 / `y=9` cột 0, 8 |
| Pháo | `phao` | 2 | `y=2` cột 1, 7 / `y=7` cột 1, 7 |
| Tốt | `tot` | 5 | `y=3` cột 0, 2, 4, 6, 8 / `y=6` cột 0, 2, 4, 6, 8 |

> Mã `voi` cho Tượng vì `tuong` (Tướng) đã dùng; ngoại lệ ghi ở đây để khỏi nhầm.

## 4. Cách đi

Mọi quân **ăn** bằng cách đi vào ô có quân đối phương (quân đó bị bắt khỏi bàn). Không được đi vào ô có quân mình.

| Quân | Cách đi |
|---|---|
| Tướng | 1 bước ngang hoặc dọc, **chỉ trong cung** |
| Sĩ | 1 bước chéo, **chỉ trong cung** |
| Tượng | Đi chéo 2 ô (hình chữ điền), **không qua sông**; bị cản nếu ô chéo giữa có quân ("cản mắt tượng") |
| Mã | 1 ô thẳng rồi 1 ô chéo ra (hình chữ nhật); bị cản nếu ô thẳng đầu tiên có quân ("cản chân mã") |
| Xe | Đi ngang hoặc dọc bao nhiêu ô cũng được, không nhảy qua quân nào |
| Pháo | Đi như Xe khi **không ăn**. Khi **ăn**, phải nhảy qua **đúng một** quân (của bên nào cũng được, gọi là "ngòi") rồi ăn quân đối phương ngay sau đó trên cùng đường |
| Tốt | Chưa qua sông: 1 bước **tiến**. Đã qua sông: 1 bước tiến hoặc 1 bước ngang. **Không bao giờ đi lùi** |

"Tiến" là hướng về phía cung đối phương (Đỏ: `y` giảm; Đen: `y` tăng). Tốt Đỏ đã qua sông khi `y ≤ 4`; Tốt Đen khi `y ≥ 5`.

## 5. Chiếu, tướng đối mặt, nước đi hợp lệ

- **Chiếu:** một quân có thể ăn tướng đối phương ở nước kế tiếp. Người bị chiếu **phải** hoá giải ngay (di chuyển tướng, ăn quân chiếu, hoặc chặn đường).
- **Tướng đối mặt ("lộ mặt tướng"):** hai tướng cùng cột và **không có quân nào ở giữa** thì coi như tướng này chiếu tướng kia. Nước đi gây ra tình huống này là **bất hợp lệ**.
- **Nước đi hợp lệ** = đúng cách đi của quân, và **sau nước đi tướng của chính mình không bị chiếu** (kể cả bởi tướng đối mặt).
- Không có nhập thành, bắt tốt qua đường hay phong cấp như cờ vua.

## 6. Kết thúc ván

| Kết quả | Điều kiện |
|---|---|
| **Thắng** (`chiếu bí`) | Đến lượt một bên mà tướng bị chiếu và không có nước hợp lệ nào |
| **Thắng** (`het-nuoc`) | Đến lượt một bên mà tướng **không bị chiếu** nhưng không có nước hợp lệ nào: bên đó **thua** (khác cờ vua, nơi đây là hoà). Xem T3 |
| **Thắng** (`bo-cuoc`) | Đối thủ xin thua hoặc rời phòng/hết giờ giữ ghế |
| **Hoà** | Hai bên thoả thuận hoà (Xem T4); các điều kiện hoà tự động xem T5, T6 |

Tính điểm cho bảng tỉ số: thắng 1, thua 0, hoà 0,5 mỗi người (như Caro).

## 7. Lặp thế cờ và đuổi bắt

Luật chính thức cấm **chiếu liên tục** và **đuổi bắt liên tục** (bên gây ra phải đổi nước, nếu không bị xử thua). Đây là phần phức tạp và gây tranh cãi nhất của cờ tướng. Phương án cho prototype ở câu hỏi **T5, T6**.

## 8. Thông tin ẩn

Không có. State công khai cho cả hai người và người xem.
