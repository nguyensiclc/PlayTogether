# Danh sách asset cho giao diện kiểu Canva "PlayTogether Desktop UI"

Dùng để giao cho người vẽ hoặc để tạo ảnh. Nguồn tham chiếu: bản Canva `https://www.canva.com/design/DAHYpf0f30s` (8 trang desktop 1920 × 1080). Mockup HTML hiện có ở `docs/design/*-v2.html` vẫn là hướng cơ sở; asset dưới đây là phần "chất liệu" để nâng nó lên mức của bản Canva.

## Quy ước chung

- **Định dạng:** ảnh chụp, texture, nền: WebP (chất lượng 80), kèm AVIF nếu có. Hình vẽ phẳng, biểu tượng, avatar: SVG. Không dùng PNG cho ảnh lớn.
- **Cỡ:** xuất 2× (màn hình retina) rồi nén. Mỗi ảnh có bản cho điện thoại (rộng ≤ 800px) và desktop.
- **Ngân sách:** tổng ảnh tải ở trang chủ ≤ 400 KB trên điện thoại. Texture lát ≤ 60 KB mỗi cái.
- **Nền trong suốt** cho mọi thứ đặt chồng lên nền (quân, sỏi, avatar).
- **Bản quyền:** ghi nguồn và giấy phép dùng thương mại trong `docs/design/ban-quyen-asset.md`. Ảnh tạo bằng AI phải ghi công cụ và ngày tạo.
- **Đặt tên:** chữ thường, gạch ngang, vd `texture-go-sang.webp`. Đặt trong `packages/client/assets/` (nền tảng dùng chung) hoặc `packages/client/<game>/assets/` (riêng game, theo quy tắc 5 ở `CLAUDE.md`).

## A. Dùng chung (nền tảng)

| # | Asset | Mô tả | Cỡ gốc | Định dạng | Ghi chú |
|---|---|---|---|---|---|
| A1 | `texture-giay-kem` | Giấy kem có vân rất nhẹ, lát liền được | 512 × 512 | WebP | Nền trang, màu gần `#F3EADB` |
| A2 | `texture-go-sang` | Vân gỗ sáng (mặt bàn, khung) | 1024 × 1024 | WebP | Lát liền, dùng làm nền khối "gỗ" |
| A3 | `texture-go-toi` | Vân gỗ nâu sẫm | 1024 × 1024 | WebP | Nền chơi tối, cột phải khối tối (`#2A1F1A`) |
| A4 | `avatar-*` (**đã có**, xem `ban-quyen-asset.md`) | Bộ 16 con vật vẽ minh hoạ: thỏ, shiba, sóc, mèo, cáo, gấu, ếch, vịt, nai, cú, chim cánh cụt, hổ, heo, hải ly, gà, cá | 256 × 256 | SVG | Cùng một nét vẽ, nền trong suốt hoặc tròn. Client gán theo băm của tên |
| A5 | `avatar-trong` | Ghế trống (cái ghế) | 256 × 256 | SVG | Thay cho số ghế nét đứt |
| A6 | `logo` | Logo PlayTogether (ba chấm trong ô đỏ) và bản chữ ngang | vector | SVG | Có bản trắng cho nền tối |
| A7 | `qr-khung` | Khung trang trí quanh mã QR | 320 × 320 | SVG | Mã QR vẫn sinh bằng code (`qr.ts`) |
| A8 | `bieu-cam-*` | 6 biểu cảm: cười, ngạc nhiên, giận, vỗ tay, bắt tay, khóc | 96 × 96 | SVG | Thuộc M5 (hàng emoji ở bàn chơi) |

## B. Thẻ game ở trang chủ (mỗi game một ảnh)

Ảnh ngang 640 × 400 (tỉ lệ 8:5), nền trong suốt hoặc đặt trên chất liệu riêng. Khai báo qua `cardArt` / `cardBg` của `GameInfo` hoặc thêm trường ảnh mới (cập nhật `docs/kien-truc-module.md`).

| # | Game | Mô tả |
|---|---|---|
| B1 | Ô ăn quan | Bàn gỗ chụp xiên, sỏi và quan nằm trong ô |
| B2 | Cờ tướng | Bàn cờ giấy hoặc gỗ với vài quân tròn (Xe, Mã, Tướng) |
| B3 | Cờ caro | Giấy ô ly, quân X và O |
| B4 | Cờ vua | Bàn cờ nâu kem, vài quân |
| B5 | Tiến lên | Xoè vài lá bài |
| B6 | Lô tô, Cờ gánh, Cờ cá ngựa, Phỏm | Chỉ cần khi game làm xong; tạm dùng hình hiện có |

## C. Ô ăn quan (riêng game)

| # | Asset | Mô tả | Cỡ gốc | Ghi chú |
|---|---|---|---|---|
| C1 | `ban-go` | Mặt bàn **nhìn thẳng từ trên xuống**, hai đầu bán nguyệt, 10 ô lõm có khắc sâu, bóng đổ trong ô | 2400 × 1000 | Nền trong suốt ngoài rìa bàn. Ô phải thẳng hàng với lưới code (7 cột × 2 hàng, hai đầu rộng bằng ~0.9 ô). Cần bản **đầu lẻ chính xác** để đặt sỏi lên đúng chỗ |
| C2 | `soi-*` | Sỏi (trắng ngà), 3 biến thể hình dạng | 64 × 64 | Bóng, có vệt sáng. Lát được bằng CSS nếu giữ sỏi vẽ bằng code |
| C3 | `quan-*` | Quan (to, nâu đen), 2 biến thể | 96 × 96 | |
| C4 | `vien-vang` | Viền vàng đánh dấu ô của bạn | SVG | Có thể làm bằng CSS, không bắt buộc |

## D. Các game cờ (riêng từng game)

| # | Game | Asset |
|---|---|---|
| D1 | Cờ tướng | Bàn cờ (giấy hoặc gỗ) với sông, cung; 14 quân (7 đỏ, 7 đen) dạng tròn gỗ có chữ khắc. Hiện đã vẽ bằng SVG; chỉ thay khi muốn kiểu ảnh thật |
| D2 | Cờ vua | Bàn 8 × 8 và 12 quân (Trắng, Đen). Hiện đã vẽ bằng SVG |
| D3 | Cờ caro | Quân X, O và khung bàn. Hiện đã vẽ bằng SVG |

## Thứ tự làm đề xuất

1. **A4 (avatar)**, A1, A2, A3: dùng được ngay ở trang chủ và phòng chờ.
2. **B1 đến B4**: thẻ game có hình đẹp.
3. **C1 (bàn gỗ)** kèm số đo ô: làm sau cùng vì phải khớp code.
4. A5 đến A8 và D1 đến D3: khi cần.

## Việc code đi kèm (không thuộc hoạ sĩ)

- Gán avatar theo tên người chơi (băm ra chỉ số), lưu ở `identity.ts`.
- Nạp phông Be Vietnam Pro từ trong dự án thay vì Google Fonts.
- Thêm tối ưu ảnh vào Vite (`vite-imagetools` hoặc `sharp`).
- Một số thành phần trong bản Canva cần backend nên không nằm ở đây: "Phòng của tôi", trạng thái "Sẵn sàng", đồng hồ lượt (M4), hoàn tác nước đi Cờ vua.
