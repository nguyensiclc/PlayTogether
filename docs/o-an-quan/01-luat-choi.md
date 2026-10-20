# Ô ăn quan — Luật chơi

Ô ăn quan có nhiều biến thể theo vùng miền. Tài liệu này chốt **một bộ luật mặc định** để lập trình. Các biến thể phổ biến được đưa vào **tuỳ chọn phòng**, do chủ phòng chọn trước khi bắt đầu.

## 1. Bàn chơi và quân

- 2 người chơi: **A** (đi trước) và **B**.
- Bàn có **12 ô**: 10 ô dân (mỗi người sở hữu một hàng 5 ô) và 2 ô quan hình bán nguyệt ở hai đầu.
- Khởi đầu:
  - Mỗi ô dân có **5 dân**.
  - Mỗi ô quan có **1 quan**, chưa có dân.
- Giá trị: **1 dân = 1 điểm**, **1 quan = 10 điểm** (tuỳ chọn: 5 điểm).
- Tổng điểm trên bàn: 50 + 20 = **70** (hoặc 60 nếu quan = 5).

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
- Khi hiển thị, mỗi người luôn thấy hàng của mình ở dưới. Nhờ vậy, với cả A và B, **chiều `+1` luôn hiện là "sang phải"** trên hàng của mình.

## 2. Ai đi trước

- Ván đầu tiên: hệ thống chọn ngẫu nhiên. Có thể thêm mini-game oẳn tù tì sau.
- Ván tiếp theo: người **thua** ván trước đi trước. Nếu hoà thì đổi lượt so với ván trước.

## 3. Một lượt đi

1. **Chọn ô:** người chơi chọn 1 **ô dân trên hàng của mình** đang có ít nhất 1 dân. Không được chọn ô quan.
2. **Chọn chiều:** `+1` hoặc `-1`.
3. **Rải:** bốc toàn bộ dân trong ô đó, rồi rải lần lượt mỗi ô kế tiếp 1 dân theo chiều đã chọn. Ô quan và ô của đối phương cũng được rải. Ô vừa bốc lên không được bỏ qua khi rải vòng tới.
4. **Xét ô kế tiếp** sau ô vừa rải viên cuối cùng (gọi là ô `n`):

| Trường hợp | Xử lý |
|---|---|
| **(a)** `n` là ô dân và có quân | Bốc hết ô `n`, **rải tiếp** cùng chiều, rồi quay lại bước 4. |
| **(b)** `n` là ô quan và còn quân (có quan hoặc có dân) | **Kết thúc lượt.** Không bao giờ được bốc ô quan để rải. |
| **(c)** `n` trống (ô dân trống, hoặc ô quan đã trống hẳn) và ô sau nó (`n+1` theo chiều đi) có quân | **Ăn** toàn bộ ô `n+1`, gồm cả quan và dân. Sau đó xét **ăn dây** (mục 4). |
| **(d)** `n` trống và `n+1` cũng trống | **Kết thúc lượt** (không ăn được gì). |

### 4. Ăn dây (ăn liên tiếp)

Sau khi ăn ô `k`, xét tiếp ô `k+1` và `k+2` theo chiều đi:
- Nếu `k+1` trống và `k+2` có quân thì **ăn tiếp** ô `k+2`, rồi lặp lại bước xét này.
- Trường hợp khác thì **kết thúc lượt**.

> Ăn dây có thể vòng qua ô quan và cả hàng của chính mình. Đây là luật chuẩn: ăn được ô nào thì lấy ô đó.

## 5. Quan non (tuỳ chọn)

- **Quan non** là ô quan vẫn còn quan nhưng có **ít hơn 5 dân**.
- Tuỳ chọn `camAnQuanNon`, **mặc định: tắt**.
  - Khi **tắt**: được ăn ô quan bất kể có bao nhiêu dân.
  - Khi **bật**: nếu lượt đi dẫn tới việc ăn một ô quan non thì **không được ăn**, lượt kết thúc ngay tại đó. Các ô đã ăn trước đó trong cùng lượt vẫn được giữ.

## 6. Hết dân trên hàng của mình (rải quân)

Đầu lượt của một người chơi, nếu **cả 5 ô dân của người đó đều trống**:

1. Người đó lấy **5 dân** từ số dân mình đã ăn và rải vào mỗi ô 1 dân, rồi đi bình thường.
2. Nếu không đủ 5 dân thì **vay** phần còn thiếu từ số dân đã ăn của đối phương. Khoản vay được ghi nợ (`debt`).
3. Quan đã ăn **không** được đổi ra dân để rải.
4. Nếu cả hai bên cộng lại vẫn không đủ 5 dân thì **ván kết thúc ngay** (xem mục 7).

Khi tính điểm cuối ván, nợ được trả lại: người vay bị trừ, người cho vay được cộng.

## 7. Kết thúc ván

Ván kết thúc khi xảy ra một trong hai trường hợp:
- **Cả hai ô quan đều trống hẳn** (không còn quan, không còn dân), tức là "hết quan, tàn dân". Điều kiện này được kiểm tra **sau mỗi lượt**.
- Không thể rải quân theo mục 6.4.

Khi kết thúc:
1. Thu quân còn trên bàn:
   - Kết thúc do **hết quan**: mỗi người **thu toàn bộ dân còn trên hàng của mình**.
   - Kết thúc do **không rải được** (mục 6.4): người còn lại, tức người *không* phải rải, **thu toàn bộ quân còn trên bàn**, gồm dân trên cả hai hàng cùng quan và dân trong hai ô quan. Người không rải được không thu gì thêm, vì hàng của người đó vốn đã trống. (Câu hỏi Q7.)
   - Nhờ vậy tổng điểm hai bên cuối ván **luôn bằng 70** (hoặc 60 nếu quan = 5).
2. Điểm = số dân đã ăn + số quan đã ăn × 10 (hoặc × 5) − nợ đã vay + nợ đã cho vay. Quân thu ở bước 1 được cộng vào số dân và số quan đã ăn.
3. Ai nhiều điểm hơn thì thắng. Bằng điểm thì **hoà**.

## 8. Thời gian

- Mỗi lượt có **30 giây** (tuỳ chọn: 15, 30, 60 giây hoặc không giới hạn).
- Hết giờ thì hệ thống **tự đi một nước ngẫu nhiên hợp lệ** thay người chơi.
- Bị đi thay **3 lượt liên tiếp** thì người chơi đó bị xử thua (xem mục xử lý rớt mạng trong tài liệu kỹ thuật).

## 9. Ví dụ minh hoạ

Bàn khởi đầu, A chọn **ô 3**, chiều **+1**:

| Bước | Diễn biến | Trạng thái liên quan |
|---|---|---|
| 1 | Bốc 5 dân ở ô 3, rải vào 4, 5, Q6, 7, 8 | ô3=0, ô4=6, ô5=6, Q6=1 quan + 1 dân, ô7=6, ô8=6 |
| 2 | Ô kế là **ô 9** (5 dân) → trường hợp (a): bốc lên rải tiếp vào 10, 11, Q0, 1, 2 | ô9=0, ô10=6, ô11=6, Q0=1 quan + 1 dân, ô1=6, ô2=6 |
| 3 | Ô kế là **ô 3**, đang trống. Ô sau đó là **ô 4** (6 dân) → trường hợp (c): **ăn 6 dân** | ô4=0 |
| 4 | Xét ăn dây: ô 5 có 6 dân, không trống → **kết thúc lượt** | A: 6 điểm |

Ví dụ này được dùng làm **test case chuẩn đầu tiên** cho engine (xem tài liệu kế hoạch).

## 10. Bảng tuỳ chọn phòng

| Tuỳ chọn | Giá trị | Mặc định |
|---|---|---|
| `giaTriQuan` | 10, 5 | 10 |
| `camAnQuanNon` | bật, tắt | tắt |
| `thoiGianLuot` | 15, 30, 60, không giới hạn (giây) | 30 |
