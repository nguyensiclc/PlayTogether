# Cờ caro — Luật chơi

Cờ caro (gomoku) có nhiều biến thể. Tài liệu này chốt **một bộ luật mặc định** để lập trình. Các biến thể phổ biến được đưa vào **tuỳ chọn phòng**, do chủ phòng chọn trước khi bắt đầu. Những chỗ chưa chắc được ghi **(đề xuất)** kèm câu hỏi tương ứng ở mục 6 của `04-ke-hoach-prototype.md`.

## 1. Bàn chơi và quân

- 2 người chơi: **X** (đi trước) và **O**.
- Bàn là lưới ô vuông `kichThuoc × kichThuoc`. Mặc định **15 × 15**, tuỳ chọn 19 × 19 **(đề xuất, C1)**.
- Mỗi lượt đặt **một quân** vào một ô trống. Quân đã đặt không được xoá, không được di chuyển.

### Đánh số ô (dùng thống nhất trong mọi tài liệu và code)

```
        x →   0   1   2   3  …  14
   y = 0      ·   ·   ·   ·      ·
   y = 1      ·   ·   ·   ·      ·
   y = 2      ·   ·   ·   ·      ·
   ↓
```

- Ô `(x, y)`: `x` là cột, từ trái sang phải; `y` là hàng, từ trên xuống dưới; cả hai chạy `0 .. kichThuoc − 1`.
- Chỉ số phẳng của ô: `i = y × kichThuoc + x`.
- Khi hiển thị, **mọi người luôn thấy bàn cùng một hướng** (không xoay bàn như Ô ăn quan, vì caro đối xứng).

## 2. Ai đi trước

- Ván đầu tiên: hệ thống chọn ngẫu nhiên người đi trước. Người đó cầm **X**.
- Ván tiếp theo: người **thua** ván trước đi trước (cầm X). Nếu hoà thì đổi lượt so với ván trước. Giống Ô ăn quan.

## 3. Một lượt đi

1. Người đến lượt chọn **một ô trống** trên bàn.
2. Quân của họ được đặt vào ô đó.
3. Xét thắng / hoà (mục 4, 5). Nếu ván chưa kết thúc thì đến lượt người kia.

Không có nước "bỏ lượt". Không có đi lại nước.

### 3.1 Nhường lượt

Người được đi trước (cầm **X**) có quyền **nhường lượt** **(yêu cầu của chủ dự án, C14)**:

- Chỉ được nhường **trước khi có quân nào được đặt** (`moveNo = 0`), và chỉ **một lần mỗi ván**.
- Khi nhường, hai người **đổi quân cho nhau**: đối thủ cầm **X** và đi nước đầu tiên, người nhường cầm **O**. Không có quân nào được đặt, nên tính là một nước đi của ván (`actionNo` tăng) nhưng **không** tăng `moveNo`.
- Người nhận (giờ cầm X) **không** nhường lại được.
- Nhường lượt không thay đổi quy tắc "ai đi trước ván sau": người **thua** ván này vẫn được đề nghị đi trước ở ván sau (hoà thì đổi lượt so với ván trước), người đó lại được quyền nhường.

## 4. Thắng

Sau mỗi nước, xét 4 hướng đi qua **quân vừa đặt**: ngang, dọc, chéo `\`, chéo `/`.

- **Chuỗi** là các quân **cùng loại, liền nhau** trên một hướng, gồm cả quân vừa đặt.
- **Hai đầu** của chuỗi là hai ô ngay trước quân đầu và ngay sau quân cuối.

**Mặc định (`chanHaiDau` tắt):** chuỗi có **từ 5 quân trở lên** thì người đặt quân đó **thắng**, kể cả khi hai đầu bị chặn. Chuỗi 6, 7… quân cũng thắng.

**Bật `chanHaiDau`** (luật "chặn 2 đầu" phổ biến ở Việt Nam): chuỗi từ 5 quân trở lên chỉ thắng nếu **ít nhất một đầu không bị chặn**. Một đầu **bị chặn** khi ô đó có **quân đối thủ**, hoặc **nằm ngoài bàn** **(đề xuất, C3)**. Chuỗi bị chặn cả hai đầu thì **không thắng**, ván vẫn tiếp tục.

| Tình huống (X là quân của người vừa đi) | `chanHaiDau` tắt | `chanHaiDau` bật |
|---|---|---|
| `· X X X X X ·` | Thắng | Thắng (hai đầu trống) |
| `O X X X X X ·` | Thắng | Thắng (một đầu trống) |
| `O X X X X X O` | Thắng | **Không thắng** (chặn cả hai đầu) |
| `O X X X X X X ·` (6 quân) | Thắng | Thắng (một đầu trống) **(đề xuất, C4)** |
| `X X X X ·` (4 quân) | Chưa thắng | Chưa thắng |
| 5 quân sát mép bàn, đầu kia bị `O` chặn | Thắng | **Không thắng** (mép bàn cũng là chặn) |

Nếu một nước tạo ra **nhiều chuỗi thắng cùng lúc** thì ván kết thúc, người đi nước đó thắng; tất cả các chuỗi thắng được đánh dấu.

## 5. Hoà

Bàn đã **đầy** (không còn ô trống) mà chưa ai thắng thì **hoà**.

## 6. Kết thúc ván

Ván kết thúc khi:
- Có người tạo được chuỗi thắng (mục 4); hoặc
- Bàn đầy (hoà); hoặc
- Một người **rời phòng giữa ván**: người đó bị xử thua (`bo-cuoc`); hoặc
- Hết giờ liên tục (`het-gio`): làm cùng đồng hồ lượt ở M4, dùng chung với Ô ăn quan.

Điểm của ván: người thắng **1**, người thua **0**, hoà **0,5** mỗi người.

## 7. Thời gian

Làm ở M4, dùng chung nền tảng với Ô ăn quan (tuỳ chọn `thoiGianLuot`: 15, 30, 60 giây hoặc không giới hạn; mặc định 30). Hết giờ thì hệ thống tự đặt một quân vào một ô trống ngẫu nhiên; bị đi thay 3 lượt liên tiếp thì xử thua. Ở M3 trở đi tuỳ chọn này **ẩn** cho tới khi có đồng hồ.

## 8. Ví dụ minh hoạ

Bàn 15 × 15, X đi trước. Sau 7 nước (X đã đặt 4 quân, O đặt 3 quân), đến lượt O:

```
y\x  3 4 5 6 7 8
 6   · · · · · ·
 7   · X X X X ·      ← X có 4 quân liền (ô (4,7) … (7,7)); hai đầu (3,7) và (8,7) đều trống
 8   · O O O · ·      ← O có 3 quân
```

- Đây là thế **"bốn hở hai đầu"**: X chỉ cần một quân nữa ở **một trong hai đầu** là có 5 quân liền. O chỉ chặn được một đầu, nên X sẽ thắng ở lượt sau.
- Ví dụ O chặn (8,7), X đặt (3,7): X có 5 quân (3,7) … (7,7) và **thắng**. Ở cả hai chế độ: nếu bật `chanHaiDau` thì đầu (2,7) trống nên chuỗi chỉ bị chặn một đầu, vẫn thắng.

## 9. Bảng tuỳ chọn phòng

| Tuỳ chọn | Tên hiển thị | Giá trị | Mặc định |
|---|---|---|---|
| `kichThuoc` | Cỡ bàn | 15, 19 | 15 |
| `chanHaiDau` | Chặn 2 đầu | bật, tắt | tắt |
| `thoiGianLuot` | Thời gian mỗi lượt | 15, 30, 60, không giới hạn (giây) | 30 (ẩn tới M4) |

## 10. Ngoài phạm vi prototype

Luật cấm tay (Renju: cấm 3-3, 4-4, chuỗi dài cho quân đi trước), luật đổi bên sau nước đầu, hoàn nước, bàn lớn hơn 19 × 19, chơi với máy.
