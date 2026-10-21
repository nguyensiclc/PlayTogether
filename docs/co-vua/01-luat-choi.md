# Cờ vua — Luật chơi

Tài liệu này xác định bộ luật chuẩn của trò chơi **Cờ vua** (Chess theo quy chuẩn quốc tế FIDE) áp dụng cho nền tảng PlayTogether. Những điểm cần lựa chọn cho bản prototype được đánh dấu **(đề xuất)** và liệt kê trong bảng "Câu hỏi mở" tại `04-ke-hoach-prototype.md` để người dùng xác nhận trước khi triển khai.

## 1. Bàn cờ và quân cờ

- Trò chơi dành cho **2 người chơi**: bên **Trắng** (White) và bên **Đen** (Black).
- Bàn cờ hình vuông kích thước **8 × 8** gồm 64 ô vuông xen kẽ màu sáng (ô trắng) và màu tối (ô đen).
- Ô góc dưới cùng bên tay phải của mỗi người chơi luôn là **ô màu sáng**.

### Đánh số toạ độ ô (chuẩn quốc tế)

```
        a   b   c   d   e   f   g   h
    8   ♜   ♞   ♝   ♛   ♚   ♝   ♞   ♜   8   (Hàng quân đen)
    7   ♟   ♟   ♟   ♟   ♟   ♟   ♟   ♟   7
    6   ·   ·   ·   ·   ·   ·   ·   ·   6
    5   ·   ·   ·   ·   ·   ·   ·   ·   5
    4   ·   ·   ·   ·   ·   ·   ·   ·   4
    3   ·   ·   ·   ·   ·   ·   ·   ·   3
    2   ♙   ♙   ♙   ♙   ♙   ♙   ♙   ♙   2
    1   ♖   ♘   ♗   ♕   ♔   ♗   ♘   ♖   1   (Hàng quân trắng)
        a   b   c   d   e   f   g   h
```

- Cột (file): ký hiệu từ `a` đến `h` (từ trái sang phải theo góc nhìn bên Trắng).
- Hàng (rank): đánh số từ `1` đến `8` (từ dưới lên trên theo góc nhìn bên Trắng).
- Chỉ số phẳng nội bộ (0..63): ô `(col, row)` với `col = 0..7` (`a..h`) và `row = 0..7` (tương ứng rank 1..8):
  `index = row * 8 + col` (ô `a1` = 0, `h1` = 7, `a8` = 56, `h8` = 63).

### Quân cờ mỗi bên (16 quân khi bắt đầu)

| Quân cờ | Ký hiệu quốc tế | Ký hiệu FIDE viết tắt | Số lượng | Giá trị ước lượng |
|---|---|---|---|---|
| **Tốt** (Pawn) | ♙ / ♟ | P | 8 | 1 |
| **Mã** (Knight) | ♘ / ♞ | N | 2 | 3 |
| **Tượng** (Bishop) | ♗ / ♝ | B | 2 | 3 |
| **Xe** (Rook) | ♖ / ♜ | R | 2 | 5 |
| **Hậu** (Queen) | ♕ / ♛ | Q | 1 | 9 |
| **Vua** (King) | ♔ / ♚ | K | 1 | Vô giá |

## 2. Ai đi trước

- Bên **Trắng luôn đi trước**.
- Ván đầu tiên: hệ thống chọn ngẫu nhiên người cầm Trắng.
- Các ván tiếp theo: người **thua ván trước được cầm Trắng** (đi trước). Nếu ván trước hoà thì đổi màu quân so với ván trước **(đề xuất, V2)**.

## 3. Cách di chuyển và ăn quân

Mỗi lượt đi, người chơi di chuyển một quân cờ của mình đến một ô hợp lệ. Nếu ô đích có quân đối phương, quân đó bị ăn và loại khỏi bàn cờ. Không quân nào được đi vào ô đang có quân cùng màu của mình.

### 3.1 Tốt (Pawn)
- **Đi**: Tiến thẳng 1 ô về phía trước nếu ô đó trống. Ở vị trí ban đầu (hàng 2 với Trắng, hàng 7 với Đen), Tốt có thể chọn tiến **1 hoặc 2 ô** nếu cả 2 ô đều trống.
- **Ăn**: Ăn chéo 1 ô về phía trước sang trái hoặc sang phải nếu ở đó có quân đối phương. Tốt không thể ăn quân khi tiến thẳng.

### 3.2 Mã (Knight)
- Đi và ăn theo hình chữ "L": 2 ô theo một trục rồi 1 ô vuông góc, hoặc 1 ô theo một trục rồi 2 ô vuông góc (tổng cộng tối đa 8 ô có thể đến).
- **Mã là quân duy nhất có thể nhảy qua các quân khác** (cả quân mình lẫn đối phương).

### 3.3 Tượng (Bishop)
- Đi và ăn theo đường chéo bất kỳ khoảng cách nào, miễn là không bị quân khác cản đường.
- Mỗi bên có một Tượng ô sáng và một Tượng ô tối, suốt ván chỉ đi trên các ô cùng màu xuất phát.

### 3.4 Xe (Rook)
- Đi và ăn theo hàng ngang hoặc cột dọc bất kỳ khoảng cách nào, miễn là không bị quân khác cản đường.

### 3.5 Hậu (Queen)
- Đi và ăn theo hàng ngang, cột dọc hoặc đường chéo bất kỳ khoảng cách nào (kết hợp sức mạnh của cả Xe và Tượng), miễn là không bị cản.

### 3.6 Vua (King)
- Đi và ăn 1 ô theo bất kỳ hướng nào (ngang, dọc, chéo).
- Vua **không bao giờ được đi vào ô bị quân đối phương kiểm soát** (tự đưa mình vào thế bị chiếu).

---

## 4. Các nước đi đặc biệt

### 4.1 Bắt tốt qua đường (En passant)
- Khi một Tốt đối phương tiến 2 ô vượt qua ô bị Tốt mình kiểm soát (đứng ngang hàng với Tốt mình ở hàng 5 với Trắng hoặc hàng 4 với Đen), Tốt mình có quyền ăn chéo vào ô mà Tốt đối phương vừa đi qua như thể nó chỉ tiến 1 ô.
- **Quyền bắt qua đường chỉ có hiệu lực ngay ở nước đi tiếp theo**. Nếu không thực hiện ngay, quyền này sẽ mất.

### 4.2 Nhập thành (Castling)
Nước đi đồng thời cả Vua và Xe để đưa Vua vào vị trí an toàn và đưa Xe ra tham chiến. Vua di chuyển 2 ô về phía Xe, và Xe nhảy qua Vua sang ô bên cạnh.
- **Nhập thành cánh Vua (O-O, ngắn)**: Vua di chuyển 2 ô sang cánh phải (`g1` đối với Trắng, `g8` đối với Đen), Xe ở góc `h` nhảy sang ô `f`.
- **Nhập thành cánh Hậu (O-O-O, dài)**: Vua di chuyển 2 ô sang cánh trái (`c1` đối với Trắng, `c8` đối với Đen), Xe ở góc `a` nhảy sang ô `d`.

**Điều kiện nhập thành:**
1. Vua và Xe tham gia nhập thành **chưa từng di chuyển** từ đầu ván.
2. Không có bất kỳ quân nào đứng giữa Vua và Xe.
3. Vua **không đang bị chiếu**.
4. Các ô mà Vua phải đi qua và ô đích của Vua **không bị quân đối phương kiểm soát**.

### 4.3 Phong cấp (Pawn promotion)
- Khi một Tốt tiến tới hàng cuối cùng (hàng 8 với Trắng, hàng 1 với Đen), nó bắt buộc phải được phong cấp ngay thành một trong 4 quân: **Hậu (Q), Xe (R), Tượng (B) hoặc Mã (N)** cùng màu.
- Không giới hạn số lượng quân được phong cấp (có thể có nhiều hơn 1 Hậu hoặc 2 Xe).
- Quyền đi của quân mới có hiệu lực ngay lập tức.

---

## 5. Chiếu, Chiếu bí và Thắng cuộc

### 5.1 Chiếu (Check)
- Khi Vua bị một hoặc nhiều quân đối phương đe dọa tấn công ở lượt tiếp theo.
- Người chơi đang bị chiếu **bắt buộc phải hoá giải thế chiếu** ngay ở nước đi tiếp theo bằng một trong ba cách:
  1. Di chuyển Vua sang một ô an toàn không bị tấn công.
  2. Dùng quân khác ăn quân đang chiếu Vua.
  3. Đưa một quân vào giữa chắn đường chiếu (không áp dụng khi bị Mã chiếu hoặc bị Tốt chiếu sát cạnh).
- Mọi nước đi không hoá giải thế chiếu hoặc làm Vua mình bị chiếu đều là **bất hợp lệ**.

### 5.2 Chiếu bí (Checkmate) — Thắng cuộc
- Vua đang bị chiếu và **không có bất kỳ nước đi hợp lệ nào** để hoá giải thế chiếu.
- Người tạo ra thế chiếu bí **thắng ván cờ**.

### 5.3 Đầu hàng (Resign)
- Người chơi có thể xin thua bất kỳ lúc nào khi đến lượt hoặc không đến lượt. Đối thủ được xử thắng ngay.

### 5.4 Hết giờ (Timeout)
- Người chơi hết thời gian cho phép mà chưa hoàn thành nước đi sẽ bị xử thua (M4 nền tảng).

---

## 6. Các trường hợp Hoà (Draw)

### 6.1 Thế bí / Hết nước đi (Stalemate)
- Người đến lượt đi **không bị chiếu** nhưng **không có bất kỳ nước đi hợp lệ nào**. Ván cờ kết thúc **hoà ngay lập tức**.

### 6.2 Lặp lại thế cờ 3 lần (Threefold repetition)
- Một thế cờ giống hệt nhau (cùng vị trí các quân, cùng lượt đi, cùng các quyền nhập thành và quyền bắt tốt qua đường) xuất hiện lần thứ 3 trong ván cờ. Hệ thống tự động xử **hoà** **(đề xuất, V3)**.

### 6.3 Quy tắc 50 nước (50-move rule)
- Trôi qua 50 nước liên tiếp của mỗi bên (tổng 100 nửa nước) mà **không có Tốt nào di chuyển** và **không có quân nào bị ăn**. Ván cờ tự động xử **hoà** **(đề xuất, V3)**.

### 6.4 Không đủ lực lượng chiếu bí (Insufficient material)
Không bên nào có thể tạo ra thế chiếu bí dù đối phương đi thế nào đi nữa:
- Vua đối Vua (K vs K).
- Vua và Tượng đối Vua (K+B vs K).
- Vua và Mã đối Vua (K+N vs K).
- Vua và Tượng đối Vua và Tượng cùng màu ô (K+B vs K+B cùng màu ô).
Ván cờ kết thúc **hoà ngay lập tức**.

### 6.5 Thoả thuận hoà (Draw offer)
- Người chơi có thể gửi đề nghị hoà cho đối phương. Nếu đối phương đồng ý, ván cờ kết thúc hoà **(đề xuất, V4)**.

