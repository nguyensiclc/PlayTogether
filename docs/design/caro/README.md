# Cờ caro — Yêu cầu thiết kế màn hình

> **Trạng thái: Đã chốt.** Mockup trong thư mục này do Claude tự thiết kế và được duyệt (không qua canvas design). Phần dưới là bản yêu cầu gốc, giữ lại để tham chiếu.

Đây là **bản yêu cầu để đưa cho canvas design**. Mockup tạo ra đặt vào thư mục này, cùng cách làm với `docs/design/o-an-quan/`. Luồng, hành vi, tương tác lấy theo `docs/caro/02-thiet-ke-ux.md`. Ở đây chỉ chốt **giao diện trông thế nào**.

## 1. Bối cảnh

- **PlayTogether**: website chơi game nhiều người, tạo phòng → gửi link → chơi, không cần đăng ký. Game đầu tiên là Ô ăn quan (đã thiết kế xong). Game thứ hai là **Cờ caro**: hai người, bàn lưới vuông, ai nối được **5 quân liền** theo hàng ngang, dọc hoặc chéo thì thắng.
- Phong cách chung: ấm, giấy và gỗ, bo tròn, thân thiện, chữ **Be Vietnam Pro**. Caro nên trông **cùng một gia đình** với Ô ăn quan nhưng bàn là **giấy kẻ ô** (hoặc gỗ sáng), khác với bàn gỗ nâu của Ô ăn quan.
- Toàn bộ chữ trên giao diện là **tiếng Việt**.

## 2. Ràng buộc

| | |
|---|---|
| Khung | Điện thoại **360 × 740** (làm trước), desktop **1280 × 800**. Từ 420px đến 1023px dùng bố cục điện thoại căn giữa |
| Vùng chạm | Tối thiểu **44px** cho mọi nút và thao tác. **Riêng ô bàn thì nhỏ hơn** (xem mục 4); đã có kế hoạch chạm 2 lần |
| Màu | Dùng lại token của nền tảng trong `docs/design/shared/tokens.css`. Cần màu mới thì **đề xuất tên token và mã màu**, không viết cứng mã hex trong mockup |
| Nhận diện quân | Phân biệt X / O bằng **hình dạng** chứ không chỉ bằng màu (người mù màu vẫn phải phân biệt được) |
| Chuyển động | Mô tả hiệu ứng bằng CSS; có phương án khi máy bật `prefers-reduced-motion` |
| Kỹ thuật | Mỗi màn hình một file `.html` tĩnh, đặt tên `kebab-case` tiếng Việt không dấu, dùng chung `../shared/tokens.css` và `../shared/desktop.css`. Ghi chú đầu file: màn hình nào, mốc nào, các trạng thái |

## 3. Cần dùng lại (đã thiết kế, không vẽ lại)

Trang chủ, nhập nickname, khung phòng chờ (link mời, QR, ghế, người xem), thẻ người chơi, thanh trạng thái, mất kết nối, khung kết quả. Xem `docs/design/o-an-quan/` và `docs/design/nen-tang/`. Caro **chỉ khác** ở những màn hình dưới đây.

## 4. Danh sách màn hình cần thiết kế

Mỗi màn hình có bản điện thoại và bản desktop (trừ ghi chú khác).

| # | File | Nội dung | Ghi chú |
|---|---|---|---|
| 1 | `phong-cho.html`, `phong-cho-desktop.html` | Phòng chờ của Caro: phần **Tuỳ chọn** gồm **Cỡ bàn** (15 × 15 / 19 × 19) và **Chặn 2 đầu** (bật/tắt, kèm một dòng giải thích ngắn) | Chỉ cần vẽ phần tuỳ chọn trong khung phòng chờ đã có. Chủ phòng sửa được, khách chỉ xem |
| 2 | `ban-choi.html` | **Bàn chơi, lượt mình**, chưa chọn ô. Hai thẻ người chơi (mình ở dưới), bàn 15 × 15, viên trạng thái "Lượt của bạn — chạm một ô trống" | Thẻ người chơi cần chỗ cho **ký hiệu quân** |
| 3 | `ban-choi-chon-o.html` | **Đang chọn một ô** (chỉ điện thoại): ô sáng, **quân xem trước**, **kính lúp** phóng to vùng quanh ngón tay nổi phía trên ngón, nút **Đặt quân** rộng ở dưới | Đây là màn hình khó nhất, cần suy nghĩ kỹ |
| 4 | `ban-choi-doi-thu.html` | **Đối thủ vừa đi**: **vòng đánh dấu** nước vừa đặt, viên trạng thái "Lượt của …" nhạt (chưa đến lượt mình) | Có một chuỗi 3–4 quân để thấy thế cờ |
| 5 | `ban-choi-thang.html` | **Có chuỗi thắng**: các quân của chuỗi nổi bật, **vạch nối** qua chuỗi, phần còn lại của bàn mờ nhẹ | Thể hiện cả trường hợp chuỗi chéo |
| 6 | `ban-choi-desktop.html` | Bàn chơi desktop: bàn to ở giữa, **cột phải** có Nhật ký ván và Phím tắt (như Ô ăn quan), con trỏ **xem trước** khi rê chuột | |
| 7 | `ket-qua.html`, `ket-qua-desktop.html` | Kết quả: **thắng / thua / hoà**, lý do ("5 quân liên tiếp", "Hoà", "Đối thủ rời phòng"), số nước, **bàn thu nhỏ** với chuỗi thắng, nút **Ván nữa** (ghi ai đi trước), Về phòng chờ, Rời phòng | Desktop là modal giữa màn hình |
| 8 | (trong file 2) | **Biểu tượng Cờ caro** trên thẻ trang chủ | Trang chủ đã có biểu tượng tạm; kiểm tra lại cho khớp phong cách quân X / O mới |

## 5. Bàn chơi: những điều cần quyết

- **Kiểu bàn:** quân đặt trong **ô** (giấy kẻ ô) hay trên **giao điểm** (bàn cờ vây)? Cả hai đều dùng cùng chỉ số ô; chọn kiểu nào dễ nhìn và dễ chạm hơn trên 360px.
- **Cỡ ô:** 15 cột trên 328px (chiều rộng màn hình trừ lề) cho ô khoảng **22px**; 19 cột còn khoảng **17px**. Cần thể hiện được bàn 19 × 19 vẫn đọc được. Có kẻ đậm các điểm sao (như bàn cờ) để dễ định vị không?
- **Quân:** X và O (hoặc hình khác miễn phân biệt được bằng hình dạng), kích thước vừa trong ô, nét rõ trên nền sáng.
- **Quân vừa đi:** vòng hoặc chấm đánh dấu, phải thấy rõ nhưng không che quân.
- **Kính lúp:** đường kính khoảng 96px, nổi **phía trên** điểm chạm, có chữ thập hoặc ô chọn ở giữa. Mô tả nó đi theo ngón tay thế nào khi gần mép bàn (ví dụ sát mép trên thì chuyển sang bên cạnh).
- **Chuỗi thắng:** cách nổi bật các quân và vạch nối; hiệu ứng nháy.
- **Hai thẻ người chơi:** chỗ cho ký hiệu quân, tên, chỉ báo "đến lượt", và (M4) thanh thời gian.

## 6. Trạng thái cần có

Chưa đến lượt · đến lượt, chưa chọn · đang chọn ô · đối thủ vừa đi · có chuỗi thắng · hoà (bàn đầy) · đối thủ mất kết nối (dùng lại) · bàn bị khoá khi mình mất kết nối (dùng lại).

## 7. Cập nhật danh sách sau khi nhận mockup

Khi các file mockup đã vào thư mục này: cập nhật bảng "Danh sách màn hình" trong `docs/design/README.md` (trạng thái **Bản nháp 1**). Khi duyệt xong thì đổi thành **Đã chốt**. Từ đó code UI phải theo đúng thiết kế. Nếu mockup làm thay đổi luồng hoặc hành vi thì sửa `docs/caro/02-thiet-ke-ux.md` trong cùng thay đổi.
