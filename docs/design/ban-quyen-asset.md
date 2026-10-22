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
