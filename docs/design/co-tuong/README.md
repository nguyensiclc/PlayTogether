# Cờ tướng — Yêu cầu thiết kế màn hình

> **Trạng thái: Đã chốt.** Mockup do Canva tạo từ bản yêu cầu này (design `DAHYoDDHajo`), được duyệt; ảnh ở `mockup-1.jpg` … `mockup-4.jpg` (bàn xuất phát, đang chọn quân, bị chiếu, kết quả). Phần dưới là bản yêu cầu gốc, giữ để tham chiếu. Màn desktop, phòng chờ, luật chơi do Claude dựng theo hệ thiết kế chung vì mockup không có.

Luồng, hành vi, tương tác lấy theo `docs/co-tuong/02-thiet-ke-ux.md`; luật ở `docs/co-tuong/01-luat-choi.md`. Ở đây chỉ chốt **giao diện trông thế nào**. Các lựa chọn chưa chốt (T7–T9 ở `docs/co-tuong/04-ke-hoach-prototype.md`) đã ghi đề xuất; nếu canvas design thấy phương án khác tốt hơn thì ghi lại để chốt.

## 1. Bối cảnh

- **PlayTogether**: website chơi game nhiều người, tạo phòng → gửi link → chơi, không cần đăng ký. Đã có Ô ăn quan và Cờ caro. Game này là **Cờ tướng**: hai người, bàn 9 × 10 giao điểm có **sông** và hai **cung**, mỗi bên 16 quân (Tướng, Sĩ, Tượng, Xe, Pháo, Mã, Tốt), Đỏ đi trước, chiếu bí tướng để thắng.
- Phong cách chung: ấm, giấy và gỗ, bo tròn, thân thiện, chữ **Be Vietnam Pro**. Cờ tướng nên trông **cùng một gia đình** với Ô ăn quan và Caro, nhưng bàn mang dáng **bàn cờ tướng truyền thống** (nền gỗ sáng / giấy ngả vàng, nét kẻ mực, chữ "SỞ HÀ"-kiểu có thể thay bằng chữ Việt, xem mục 5).
- Toàn bộ chữ trên giao diện là **tiếng Việt**.

## 2. Ràng buộc

| | |
|---|---|
| Khung | Điện thoại **360 × 740** (làm trước), desktop **1280 × 800**. Từ 420px đến 1023px dùng bố cục điện thoại căn giữa |
| Vùng chạm | Tối thiểu **44px** cho nút. Giao điểm bàn rộng khoảng **36px** (9 cột trên 328px): vùng chạm của quân/giao điểm được nới ra nửa ô mỗi phía, mô tả cách làm rõ trong mockup |
| Màu | Dùng lại token của nền tảng trong `docs/design/shared/tokens.css`. Cần màu mới thì **đề xuất tên token và mã màu**, không viết cứng mã hex trong mockup. Hai bên cần hai màu quân dễ phân biệt (gợi ý Đỏ dùng `--primary`, Đen dùng `--quan`) |
| Nhận diện quân | Phân biệt Đỏ / Đen bằng **chữ và màu chữ/viền**, không chỉ bằng màu nền (người mù màu vẫn phải phân biệt được); Tướng và Tượng phải **không thể nhầm lẫn** với nhau |
| Chuyển động | Mô tả hiệu ứng bằng CSS; có phương án khi máy bật `prefers-reduced-motion` |
| Kỹ thuật | Mỗi màn hình một file `.html` tĩnh, tên `kebab-case` tiếng Việt không dấu, dùng chung `../shared/tokens.css` và `../shared/desktop.css`. Ghi chú đầu file: màn hình nào, mốc nào, các trạng thái |

## 3. Cần dùng lại (đã thiết kế, không vẽ lại)

Trang chủ, nhập nickname, khung phòng chờ (link mời, QR, ghế, người xem), thẻ người chơi, thanh trạng thái, mất kết nối, khung kết quả, hộp xác nhận. Xem `docs/design/o-an-quan/`, `docs/design/nen-tang/` và `docs/design/caro/`. Cờ tướng **chỉ khác** ở các màn hình dưới đây.

## 4. Danh sách màn hình cần thiết kế

Mỗi màn hình có bản điện thoại và bản desktop (trừ ghi chú khác).

| # | File | Nội dung | Ghi chú |
|---|---|---|---|
| 1 | `phong-cho.html`, `phong-cho-desktop.html` | Phần **Tuỳ chọn** trong phòng chờ: **Ai cầm Đỏ (đi trước)**: Ngẫu nhiên / Chủ phòng / Khách | Chỉ vẽ phần tuỳ chọn trong khung phòng chờ đã có. Chủ phòng sửa, khách chỉ xem |
| 2 | `ban-choi.html` | **Bàn chơi, lượt mình**, chưa chọn quân. Đối thủ ở trên, mình ở dưới, bàn 9 × 10 có sông và cung, đủ 32 quân ở thế xuất phát. Viên trạng thái "Lượt của bạn" | Thẻ người chơi có chỗ cho **màu quân** và **quân đã bắt được** |
| 3 | `ban-choi-chon-quan.html` | **Đang chọn một quân**: quân nhấc lên / phóng nhẹ, **chấm tròn** ở ô đi được, **vòng nhấn** ở quân ăn được. Thế cờ giữa ván có cả Pháo (có ngòi) và Mã | Màn hình quan trọng nhất: các nước đi phải đọc được ngay |
| 4 | `ban-choi-doi-thu.html` | **Đối thủ vừa đi**: đánh dấu ô đi và ô đến, quân vừa bị ăn mờ ra, viên trạng thái nhạt (chưa đến lượt mình) | |
| 5 | `ban-choi-chieu.html` | **Tướng bị chiếu**: vòng đỏ nhấp nháy quanh Tướng, viên trạng thái "Bạn đang bị chiếu!"; thêm biến thể đối phương bị chiếu "Chiếu tướng!" | Mô tả hiệu ứng nháy |
| 6 | `ban-choi-den.html` | Bàn chơi của **người cầm Đen**: bàn xoay 180°, quân Đen ở dưới | Chữ trên quân đối thủ vẫn đọc được (không cần ngược chữ nếu bàn xoay; nói rõ chọn cách nào) |
| 7 | `ban-choi-desktop.html` | Bàn desktop: bàn to ở giữa, **cột phải** có Nhật ký ván và Phím tắt, rê chuột vào quân hiện nước đi | |
| 8 | `ket-qua.html`, `ket-qua-desktop.html` | Kết quả: **thắng / thua / hoà**, lý do ("Chiếu bí", "Hết nước đi", "Đối thủ xin thua", "Đối thủ rời phòng", "Hoà"), số nước, **bàn thu nhỏ**, nút **Ván nữa** (ghi bên nào cầm Đỏ), Về phòng chờ, Rời phòng | Desktop là modal giữa màn hình |
| 9 | `xin-thua.html` | Hộp xác nhận **Xin thua** (dùng lại hộp xác nhận, chỉ cần chữ và vị trí nút) | |
| 10 | `luat-choi.html` | Hộp **Luật chơi** có hình cách đi từng quân (7 quân) | Thẻ hình nhỏ, dễ đọc trên 360px |
| 11 | (trong file 2) | **Biểu tượng Cờ tướng** trên thẻ trang chủ | Trang chủ đã có biểu tượng tạm; kiểm tra lại cho khớp phong cách quân mới |

## 5. Bàn chơi: những điều cần quyết

- **Bàn cờ:** lưới 9 cột × 10 hàng, **sông** ở giữa (chữ trên sông: đề xuất "Sở hà / Hán giới" dạng chữ Việt hoặc để trống; canvas design chọn), **hai cung** có đường chéo, **dấu vị trí** quanh Pháo và Tốt. Quân đặt **trên giao điểm**.
- **Quân:** hình tròn có viền, **chữ Việt** (Tướng, Sĩ, Tượng, Xe, Pháo, Mã, Tốt) làm đề xuất (T9); nêu phương án chữ Hán nếu thấy đẹp hơn để chốt. Quân Đỏ chữ/viền đỏ, quân Đen chữ/viền đen, nền quân sáng.
- **Quân đang chọn:** nhấc lên hoặc phóng nhẹ + bóng. **Ô đi được:** chấm tròn. **Ô ăn được:** vòng quanh quân địch.
- **Nước vừa đi:** đánh dấu ô xuất phát (mờ) và ô đến (viền), không che quân.
- **Tướng bị chiếu:** vòng đỏ nhấp nháy; có phương án cho `prefers-reduced-motion` (viền đậm không nhấp nháy).
- **Hai thẻ người chơi:** tên, màu quân, **quân đã bắt** (chuỗi quân nhỏ), chỉ báo đến lượt, và (M4) thanh thời gian.
- **Xoay bàn:** nêu hướng chữ trên quân của đối thủ khi bàn xoay 180° (khuyến nghị: chữ **luôn thẳng** để đọc được).

## 6. Trạng thái cần có

Chưa đến lượt · đến lượt, chưa chọn · đang chọn quân · đối thủ vừa đi · bị chiếu · chiếu đối phương · chiếu bí · hết nước đi · hoà (lặp thế cờ) · đối thủ mất kết nối (dùng lại) · bàn bị khoá khi mình mất kết nối (dùng lại).

## 7. (Đã làm) Cập nhật danh sách sau khi nhận mockup

Khi các file mockup đã vào thư mục này: cập nhật bảng "Danh sách màn hình" trong `docs/design/README.md` (trạng thái **Bản nháp 1**; dòng Cờ tướng đã có sẵn, đang ghi **Chờ canvas design**), thêm xem được trong `canvas.html`. Khi duyệt thì đổi thành **Đã chốt**; từ đó code UI phải theo đúng thiết kế. Nếu mockup làm đổi luồng hay hành vi thì sửa `docs/co-tuong/02-thiet-ke-ux.md` trong cùng thay đổi.
