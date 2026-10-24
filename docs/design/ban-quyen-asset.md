# Nguồn gốc và giấy phép asset

Ghi nguồn mọi asset hình ảnh của giao diện (xem `danh-sach-asset.md`). Asset tạo bằng AI phải ghi công cụ và ngày tạo.

## Avatar con vật (A4)

- **Vị trí:** `packages/client/assets/avatars/*.webp` (16 file, 200 × 200, tổng ~72 KB).
- **Con vật:** thỏ, shiba, sóc, mèo, cáo, gấu, ếch, vịt, nai, cú, chim cánh cụt, hổ, heo, hải ly, gà con, gấu trúc.
- **Nguồn:** tạo bằng công cụ tạo ảnh AI của Canva (`generate-image`), ngày **2026-10-22**. Thỏ tạo trước làm ảnh tham chiếu cho 15 con còn lại để giữ cùng nét vẽ (3D bóng, nền kem `#F3EADB`).
- **Lời nhắc mẫu:** "Cute glossy 3D avatar of a <con vật> … chest-up, centered, cream background (#F3EADB), no text, square" (thêm khăn hoặc phụ kiện nhỏ cho mỗi con).
- **Giấy phép:** **chưa xác nhận.** Cần đọc điều khoản của Canva về dùng thương mại với ảnh AI tạo ra (và điều khoản tài khoản đang dùng) trước khi phát hành công khai. Cập nhật mục này sau khi xác nhận.
- **Giới hạn kỹ thuật:** bản lấy về chỉ là ảnh xem trước 200 px, không có nền trong suốt. Đủ để hiện trong vòng tròn tới ~64 px (màn 2×). Cần bản lớn hơn thì xuất từ Canva.
- **Cách dùng trong code:** `packages/client/avatars.ts` gán con vật theo băm của tên người chơi (cùng tên luôn ra cùng một con). Máy (bot) không dùng avatar con vật, hiện biểu tượng 🤖.

## Ảnh 3D của game (B1 đến B5)

- **Vị trí:** `packages/client/<game>/assets/card.webp` (Ô ăn quan, Cờ tướng, Cờ caro, Cờ vua, Tiến lên; 200 × 133).
- **Nguồn:** tạo bằng `generate-image` của Canva, ngày **2026-10-22**, phong cách "glossy 3D render for a mobile game card" (bàn cờ trên nền gỗ, giấy, kem hoặc nỉ xanh).
- **Giấy phép:** **chưa xác nhận**, như avatar ở trên.
- **Giới hạn:** chỉ có bản xem trước 200 px nên hơi mềm khi hiện trên desktop (thẻ ~266 px). Cần xuất bản lớn từ Canva nếu muốn nét hơn.
- **Lưu ý nội dung:** bàn Ô ăn quan trong ảnh chỉ là minh hoạ, **không** khớp lưới của bàn chơi thật.
