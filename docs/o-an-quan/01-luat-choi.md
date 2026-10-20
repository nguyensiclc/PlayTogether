# Ô ăn quan — Luật chơi

Ô ăn quan có nhiều biến thể theo vùng miền. Tài liệu này chốt **một bộ luật mặc định** để lập trình. Các biến thể phổ biến được đưa vào **tuỳ chọn phòng**, do chủ phòng chọn trước khi bắt đầu.

**Nguồn tham chiếu:** [oanquan.online — Hướng dẫn chơi](https://oanquan.online/huong-dan-choi-o-an-quan). Luật "Cơ bản", luật Bù dân, Lặp nước và hai biến thể Quan Già, Lật bàn đều theo trang này. Những chỗ trang không nói rõ được ghi là **(diễn giải)**, kèm câu hỏi tương ứng trong mục 6 của `04-ke-hoach-prototype.md`.

## 1. Bàn chơi và quân

- 2 người chơi: **A** (đi trước) và **B**. Trang tham chiếu có chế độ 3 người, nhưng chế độ này nằm ngoài phạm vi prototype.
- Bàn có **12 ô**: 10 ô dân (mỗi người sở hữu một hàng 5 ô) và 2 ô quan hình bán nguyệt ở hai đầu.
- Khởi đầu:
  - Mỗi ô dân có **5 dân**.
  - Mỗi ô quan có **1 quan**, chưa có dân.
- Giá trị: **1 dân = 1 điểm**, **1 quan = 10 điểm** (tuỳ chọn: 5 điểm).
- Tổng điểm: 50 + 20 = **70** (hoặc 60 nếu quan = 5).

### Đánh số ô (dùng thống nhất trong mọi tài liệu và code)

```
            B11  B10  B9   B8   B7          ← hàng của B
   ┌────┐                          ┌────┐
   │ Q0 │                          │ Q6 │
   └────┘                          └────┘
            A1   A2   A3   A4   A5          ← hàng của A
```

- Chỉ số `0..11` xếp theo vòng tròn: `0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 0`.
- `0` và `6` là ô quan. `1..5` thuộc A. `7..11` thuộc B.
- **Chiều `+1`** là đi theo chỉ số tăng dần, **chiều `-1`** là ngược lại.
- Khi hiển thị, mỗi người luôn thấy hàng của mình ở dưới. Nhờ vậy, với cả A và B, **chiều `+1` luôn hiện là "sang phải"** trên hàng của mình. Nhìn trên màn hình, `+1` là **ngược chiều kim đồng hồ** và `-1` là **thuận chiều kim đồng hồ**. Trang tham chiếu gọi hai chiều theo chiều kim đồng hồ.

## 2. Ai đi trước

- Ván đầu tiên: hệ thống chọn ngẫu nhiên.
- Ván tiếp theo: người **thua** ván trước đi trước. Nếu hoà thì đổi lượt so với ván trước.
- Nếu bật **Lật bàn** (mục 9), người đi sau được quyền đổi bên sau nước mở đầu.

## 3. Một lượt đi

1. **Chọn ô:** người chơi chọn 1 **ô dân trên hàng của mình** đang có ít nhất 1 dân. Không được chọn ô trống, cũng không được chọn ô quan.
2. **Chọn chiều:** `+1` hoặc `-1`.
3. **Rải:** bốc toàn bộ dân trong ô đó, rồi rải lần lượt mỗi ô kế tiếp 1 dân theo chiều đã chọn. Ô quan và ô của đối phương cũng được rải. Ô vừa bốc lên không được bỏ qua khi rải vòng tới.
4. **Xét ô kế tiếp** sau ô vừa rải viên cuối cùng (gọi là ô `n`):

| Trường hợp | Xử lý |
|---|---|
| **(a)** `n` là ô dân và có quân | Bốc hết ô `n`, **rải tiếp** cùng chiều, rồi quay lại bước 4. Có thể lặp nhiều lần. |
| **(b)** `n` là ô quan và còn quân (có quan hoặc có dân) | **Kết thúc lượt.** Không bao giờ được bốc ô quan để rải. |
| **(c)** `n` trống (ô dân trống, hoặc ô quan đã trống hẳn) và ô sau nó (`n+1` theo chiều đi) có quân | **Ăn** toàn bộ ô `n+1`, gồm cả quan và dân. Sau đó xét **ăn liên hoàn** (mục 4). |
| **(d)** `n` trống và `n+1` cũng trống | **Kết thúc lượt** (không ăn được gì). |

## 4. Ăn liên hoàn (ăn dây)

Sau khi ăn ô `k`, xét tiếp ô `k+1` và `k+2` theo chiều đi:
- Nếu `k+1` trống và `k+2` có quân thì **ăn tiếp** ô `k+2`, rồi lặp lại bước xét này.
- Trường hợp khác thì **kết thúc lượt**.

> Ăn liên hoàn có thể vòng qua ô quan và cả hàng của chính mình: ăn được ô nào thì lấy ô đó.

## 5. Quan Già (tuỳ chọn, trước đây gọi là "quan non")

- Tuỳ chọn `camAnQuanNon`. Giao diện hiển thị tên **"Quan Già"**. **Mặc định: tắt** (luật Cơ bản).
- Khi **tắt**: được ăn ô quan bất kể có bao nhiêu dân. Ví dụ ô quan có 1 quan + 2 dân thì ăn được 12 điểm.
- Khi **bật**: hạn chế chỉ áp dụng khi **ô quan còn quan** và ô đó là **mục tiêu ăn** (theo mục 3c hoặc mục 4):
  - Có **dưới 5 dân** (vd: 1 quan + 4 dân): **không được ăn**. Lượt **kết thúc ngay tại đó**, không được bỏ qua ô quan để ăn ô phía sau. Các ô đã ăn trước đó trong cùng lượt vẫn được giữ.
  - Có **từ 5 dân trở lên**: ăn bình thường. Ví dụ 1 quan + 5 dân thì được 15 điểm (khi quan = 10).
  - Số dân được đếm **tại thời điểm xét ăn**, tức là sau mọi lần rải trong nước đang đi.
  - Ô quan **đã mất quan** thì ăn theo luật thường, không cần đủ 5 dân.

## 6. Bù dân (khi hàng của mình hết dân)

Đầu lượt của một người chơi, nếu **cả 5 ô dân của người đó đều trống**:

1. Hệ thống **trừ 5 điểm** từ kho điểm đã ăn của người đó, rồi đặt **1 dân vào mỗi ô** trong 5 ô. Sau đó người chơi đi bình thường.
2. Nếu kho điểm **dưới 5 điểm**, người đó **thua ngay lập tức**. Ván kết thúc (mục 7).
3. **(diễn giải)** Kho điểm tính theo **điểm**, gồm cả quan. Nếu kho có đủ 5 điểm nhưng không đủ 5 dân, hệ thống **đổi 1 quan đã ăn thành dân** (10 hoặc 5 dân theo `giaTriQuan`) rồi mới trừ. Tổng điểm vì thế được bảo toàn. (Câu hỏi Q13.)
4. Không vay dân của đối phương. Luật vay trước đây đã bị **bỏ**.

## 7. Kết thúc ván

| Cách kết thúc | Khi nào | Xử lý quân còn trên bàn | Thắng/thua |
|---|---|---|---|
| **Hết quan** | Sau một lượt, **cả hai ô quan đều trống hẳn** (không quan, không dân) | Mỗi người **thu toàn bộ dân còn trên hàng của mình** | So điểm. Tổng luôn = 70 (60), nên ai **≥ 36** (31) điểm thì thắng, **35–35** (30–30) thì hoà |
| **Không đủ bù dân** | Đầu lượt cần bù dân mà kho dưới 5 điểm (mục 6.2) | Không thu | Người không bù được **thua**, bất kể điểm |
| **Lặp nước** | **Cùng một cặp nước** của hai bên lặp lại **3 lần liên tiếp** (mục 8) | Mỗi người thu dân còn trên hàng mình. **Quan và dân còn trong ô quan không được tính** | So điểm, hoà nếu bằng. Mốc 36/70 không áp dụng |
| **Hết giờ / bỏ cuộc** | Bị đi thay 3 lượt liên tiếp, hoặc mất kết nối quá 60 giây | Không thu | Người đó **thua** |

Điểm = số dân đã ăn + số quan đã ăn × `giaTriQuan` + dân thu cuối ván (nếu có).

> **(diễn giải)** Trang tham chiếu nhắc tới "mốc 36/70 để xác định thắng thua" mà không giải thích thêm. Tài liệu này hiểu đó là **ngưỡng quá nửa** khi so điểm cuối ván, **không** phải luật dừng ván sớm. Lý do: có Bù dân thì điểm trong kho có thể quay lại bàn, nên đạt 36 giữa ván chưa chắc đã thắng. (Câu hỏi Q14.)

## 8. Lặp nước

- Một **cặp nước** gồm một nước đi rải của mỗi bên, liền nhau. Nước đi được so theo ô và chiều.
- Nếu 3 cặp nước liên tiếp giống hệt nhau (6 nước gần nhất có dạng `X Y X Y X Y`), ván **dừng ngay** sau nước thứ 6 và tính điểm như bảng ở mục 7.
- Áp dụng cho **mọi chế độ** **(diễn giải**: trang chỉ nêu rõ cho Quan Già và Lật bàn. Áp dụng chung để không có ván kéo dài vô hạn. Câu hỏi Q15.)
- Thao tác Lật bàn (mục 9) không phải nước rải. Nó không được tính vào cặp nước, nhưng có làm ngắt chuỗi lặp.

## 9. Lật bàn (tuỳ chọn)

- Tuỳ chọn `latBan`, **mặc định: tắt**. Chỉ có ở ván 2 người.
- Sau **đúng một nước mở đầu**, khi đến lượt người đi sau (và hiệu ứng đã chạy xong), người này được chọn:
  - **Lật bàn:** hai người **đổi bên** và quản lý luôn kho điểm của bên mới. Bàn giữ nguyên: không rải, không bốc, không ăn thêm quân nào. Người mở đầu giờ ở bên đang đến lượt và **phải đi tiếp**. Người vừa lật **không** được đi thêm nước nào ngay.
  - **Giữ bên:** đóng hộp hỏi, hoặc đi một nước rải bình thường. Chỉ khi **đi quân** thì mới mất quyền lật bàn.
- Mỗi ván chỉ được lật **một lần**. Không được lật giữa ván, sau khi ván kết thúc, hoặc trong lúc hiệu ứng đang chạy.
- Lật bàn **không** cộng thêm thời gian. Thời gian đã dùng để cân nhắc vẫn bị tính vào lượt.
- Ý nghĩa: người đi sau được "chọn bên" sau khi thấy nước mở đầu, giúp giảm lợi thế của người đi trước. Đổi bên không phải lúc nào cũng có lợi, nên người chơi cần so điểm và thế cờ trước khi quyết định.

## 10. Thời gian

- Mỗi lượt có **30 giây** (tuỳ chọn: 15, 30, 60 giây hoặc không giới hạn).
- Hết giờ thì hệ thống **tự đi một nước rải ngẫu nhiên hợp lệ** thay người chơi. Nước tự đi không bao giờ là Lật bàn.
- Bị đi thay **3 lượt liên tiếp** thì người chơi đó bị xử thua.

## 11. Ví dụ minh hoạ

### 11.1 Ăn dân (bàn khởi đầu, A chọn ô 3, chiều +1)

| Bước | Diễn biến | Trạng thái liên quan |
|---|---|---|
| 1 | Bốc 5 dân ở ô 3, rải vào 4, 5, Q6, 7, 8 | ô3=0, ô4=6, ô5=6, Q6=1 quan + 1 dân, ô7=6, ô8=6 |
| 2 | Ô kế là **ô 9** (5 dân) → trường hợp (a): bốc lên rải tiếp vào 10, 11, Q0, 1, 2 | ô9=0, ô10=6, ô11=6, Q0=1 quan + 1 dân, ô1=6, ô2=6 |
| 3 | Ô kế là **ô 3**, đang trống. Ô sau đó là **ô 4** (6 dân) → trường hợp (c): **ăn 6 dân** | ô4=0 |
| 4 | Xét ăn liên hoàn: ô 5 có 6 dân, không trống → **kết thúc lượt** | A: 6 điểm |

### 11.2 Cơ bản và Quan Già (theo ví dụ của trang tham chiếu)

Viên cuối rơi xuống, ô kế tiếp trống, sau đó là ô quan có **1 quan + 2 dân**. Ô sau ô quan trống, rồi tới một ô có **4 dân**.

| Chế độ | Kết quả |
|---|---|
| Cơ bản (`camAnQuanNon` tắt) | Ăn ô quan được **12** điểm, ăn liên hoàn thêm **4** → tổng **16** |
| Quan Già (`camAnQuanNon` bật) | Ô quan chỉ có 2 dân → dừng ngay trước ô quan, **0** điểm |

## 12. Bảng tuỳ chọn phòng

| Tuỳ chọn | Tên hiển thị | Giá trị | Mặc định |
|---|---|---|---|
| `giaTriQuan` | Giá trị quan | 10, 5 | 10 |
| `camAnQuanNon` | Quan Già | bật, tắt | tắt |
| `latBan` | Lật bàn | bật, tắt | tắt |
| `thoiGianLuot` | Thời gian mỗi lượt | 15, 30, 60, không giới hạn (giây) | 30 |
