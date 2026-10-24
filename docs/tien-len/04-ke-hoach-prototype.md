# Tiến lên miền Nam — Kế hoạch prototype

## 1. Mục tiêu

Game thứ năm của PlayTogether và là **game nhiều người đầu tiên (2 đến 4 người)**, có bài giấu theo từng ghế:

> Bốn người ở bốn thiết bị: một người tạo phòng **Tiến lên**, gửi link mời; mọi người vào phòng, chơi hết một ván theo luật miền Nam và xem bảng xếp hạng nhất, nhì, ba, bét.

## 2. Phạm vi

| Có trong prototype | Chưa làm / để sau |
|---|---|
| Engine đủ bộ: lẻ, đôi, ba, tứ quý, sảnh, đôi thông | Tính tiền / cược (**không bao giờ làm**) |
| Chặt heo, chặt chồng theo bảng (bật/tắt) | Thối heo, đền bài |
| Tới trắng (bật/tắt) | Luật khu vực khác (Tiến lên miền Bắc, đếm lá) |
| 2, 3 hoặc 4 người, số người chọn ở phòng chờ | Đồng hồ lượt (thuộc M4 của nền tảng) |
| Bài giấu theo ghế, người xem chỉ thấy số lá | Người xem xem được bài của một người (cờ riêng) |
| Xếp hạng nhất, nhì, ba, bét; điểm theo hạng | Giải đấu, trận nhiều ván tính tổng điểm |
| Người rời giữa ván: loại khỏi ván, ván tiếp tục | Bot thay thế người rời |
| Giao diện điện thoại 360px và desktop; lá bài SVG 3D bóng | Âm thanh, hiệu ứng chia bài nâng cao |
| Bot Dễ/Vừa/Khó (mốc TL-B) | |

## 3. Các mốc

| Mốc | Nội dung | Tiêu chí xong | Trạng thái |
|---|---|---|---|
| **TL0 — Tài liệu** | 4 tài liệu này, câu hỏi `TL1…TL10`, mockup | Mọi câu hỏi đã có trả lời; mockup được duyệt | **Đang chờ trả lời TL1–TL10** |
| **TL-P — Nền tảng nhiều người** | Mục 5 của tài liệu kỹ thuật (a đến f): số ghế theo tuỳ chọn, kết quả nhiều hạng, người đi trước, lobby nhiều ghế, bot nhiều ghế, bài giấu | `npm run check` xanh; e2e hai người chơi cho **cả 4 game hiện có** vẫn chạy y như cũ | Chưa bắt đầu |
| **TL-E — Engine** | `engine/tien-len` + test mục 4, viết test trước, fuzz | Test xanh; fuzz 500 ván ngẫu nhiên đủ 2, 3, 4 người: bất biến mục 4 đúng | Chưa bắt đầu |
| **TL-R — Đăng ký** | `exports`, `GAME_IDS`, `TienLenRoom`, `MODULES`, `registry.ts`, bỏ khỏi `catalog.ts` | `npm run check` xanh (gồm `architecture.test.ts`) | Chưa bắt đầu |
| **TL-U — Giao diện** | Phòng chờ, màn chơi (tay bài quạt, chọn bài), kết quả, luật, lịch sử | Chơi hết ván giữa 4 tab; e2e cho cả 5 game | Chưa bắt đầu |
| **TL-B — Bot** | Bot 3 cấp trên hạ tầng bot chung | Bot lấp ghế trống, ván có bot chạy hết | Chưa bắt đầu |
| **TL-H — Hoàn thiện** | Thử trên điện thoại thật với 4 người | 3 đến 5 nhóm chơi thử, ghi nhận phản hồi | Chưa bắt đầu |

## 4. Test case cho engine

| # | Tình huống | Kỳ vọng |
|---|---|---|
| TL01 | `deal`: 2, 3, 4 người | Mỗi người 13 lá, không trùng, ≤ 52 lá dùng |
| TL02 | Thứ tự lá: 3♠ nhỏ nhất, 2♥ lớn nhất; 2♠ > A♥ | Đúng `giaTri` |
| TL03 | `classify`: lẻ, đôi, ba, tứ quý | Nhận diện đúng; 2 lá khác số không phải đôi |
| TL04 | Sảnh: 5-6-7 hợp lệ; Q-K-A hợp lệ; K-A-2 không hợp lệ; sảnh có 2 không hợp lệ | Đúng luật mục 3 |
| TL05 | Đôi thông: 4-4-5-5-6-6 hợp lệ; có đôi 2 không hợp lệ; đôi không liên tiếp không hợp lệ | Đúng |
| TL06 | Cùng loại, cùng độ dài: so lá cao nhất (số rồi chất) | Đúng; khác độ dài bị từ chối |
| TL07 | Ván đầu: người giữ 3♠ đi trước, bộ đầu chứa 3♠ | Đúng (theo TL6) |
| TL08 | Bỏ lượt: người bỏ không được đánh lại trong vòng | Đúng |
| TL09 | Mọi người khác bỏ: vòng kết thúc, người đánh cuối đi tự do | Đúng |
| TL10 | Người đánh cuối đã hết bài: quyền đi tự do thuộc người kế còn bài | Đúng |
| TL11 | Chặt: 3 đôi thông chặt heo lẻ, không chặt đôi heo | Đúng bảng mục 5 |
| TL12 | Chặt: tứ quý chặt heo lẻ, đôi heo, 3 đôi thông | Đúng |
| TL13 | Chặt: 4 đôi thông chặt heo lẻ, đôi heo, 3 đôi thông, tứ quý | Đúng |
| TL14 | `chatHeo` tắt: mọi bộ chặt bị từ chối | Đúng |
| TL15 | Tới trắng: tứ quý heo, sảnh rồng, sáu đôi; `toiTrang` tắt thì không tính | Ván kết thúc ngay, đúng người thắng |
| TL16 | Nhiều người cùng tới trắng: ưu tiên theo thứ tự, rồi ghế nhỏ | Đúng |
| TL17 | Hết bài: người về nhất; ván tiếp tục cho người còn lại | Đúng; `finished` đúng thứ tự |
| TL18 | Ván kết thúc khi còn một người còn bài | `result` đúng `ranking` |
| TL19 | `forfeit`: người đang đến lượt rời, lượt chuyển; còn một người thì xong | Đúng |
| TL20 | Sai lượt, không có lá trong tay, lá trùng, bộ không hợp lệ | `NOT_YOUR_TURN` hoặc `INVALID_MOVE`, state không đổi |
| TL21 | `parseMove`, `parseOptions` từ chối dữ liệu lạ | `null` hoặc giữ `base` |
| TL22 | `viewFor`: không lộ bài người khác; người xem chỉ thấy số lá | Đúng |
| TL23 | `validMoves` khớp bộ kiểm tra chậm (duyệt mọi tập con) trên 300 tay bài ngẫu nhiên | Hai kết quả bằng nhau |
| TL24 | Fuzz: 500 ván ngẫu nhiên (2, 3, 4 người, seed cố định) | Bất biến mục 4 đúng; mọi ván kết thúc |

## 5. Phối hợp

Làm trên nhánh của phiên làm việc (không tạo nhánh riêng nếu chưa cần). Các file dùng chung chỉ chạm ở bốn điểm đăng ký và ở TL-P (đổi hợp đồng dùng chung, CLAUDE.md quy tắc 8).

## 6. Câu hỏi mở

Đánh số `TL1…` để không lẫn với `Q`, `C`, `T`, `V` của các game khác. **Phải có câu trả lời mới làm tiếp phần liên quan.** TL1 đến TL5 cần trước khi viết engine; TL6, TL7 cần trước khi chốt giao diện; TL9, TL10 cần trước TL-P và TL-U.

| # | Câu hỏi | Đề xuất hiện tại | Trả lời | Trạng thái |
|---|---|---|---|---|
| TL1 | Số người chơi: chỉ 4 người, hay 2 đến 4? Với 2 hoặc 3 người, phần bài thừa xử lý thế nào? | **2 đến 4 người**, chủ phòng chọn ở phòng chờ. Mỗi người 13 lá, bài thừa không dùng | | Chờ |
| TL2 | Thứ tự chất bài? | **Bích < Chuồn < Rô < Cơ** (phổ biến nhất ở miền Nam) | | Chờ |
| TL3 | Luật chặt heo và chặt chồng? | 3 đôi thông chặt heo lẻ; tứ quý chặt heo lẻ, đôi heo, 3 đôi thông; 4 đôi thông chặt heo lẻ, đôi heo, 3 đôi thông, tứ quý (bảng ở mục 5 luật chơi). Không chặt đôi heo bằng 3 đôi thông. Tuỳ chọn tắt hẳn chặt | | Chờ |
| TL4 | Tới trắng gồm những tổ hợp nào, và ưu tiên ra sao? | Tứ quý heo, sảnh rồng (12 lá 3 đến A), sáu đôi bất kỳ; ưu tiên theo thứ tự đó; tuỳ chọn tắt | | Chờ |
| TL5 | Kết thúc ván và tính điểm? | Ván tiếp tục đến khi còn một người còn bài để xếp nhì, ba, bét. Điểm theo hạng (ba người chơi: 2, 1, 0; bốn người: 3, 2, 1, 0); **không** tiền, không thối heo ở bản đầu | | Chờ |
| TL6 | Người đi trước và ràng buộc 3♠? | Ván đầu: người giữ 3♠ đi trước và bộ đầu **phải chứa 3♠**. Ván sau: người về **nhất** ván trước đi trước, đi tự do (không cần 3♠) | | Chờ |
| TL7 | Người rời ván hoặc bỏ cuộc giữa chừng? | Bài bị loại, xếp hạng sau cùng trong những người còn lại, ván tiếp tục; còn một người thì ván xong. (Hết giờ lượt: chờ M4 của nền tảng) | | Chờ |
| TL8 | Ván treo khi một người mất kết nối lâu (nền tảng hiện giữ ghế không giới hạn)? | Chưa xử lý ở bản đầu; chờ đồng hồ lượt (M4): hết giờ tự bỏ lượt, mất kết nối quá 60 giây thì coi như rời ván | | Chờ |
| TL9 | Đồng ý sửa hợp đồng dùng chung cho nhiều người (mục 5 tài liệu kỹ thuật, a đến f), kể cả sửa mọi game hiện có và chạy e2e cho cả 4 game? | **Đồng ý**, làm thành mốc TL-P riêng trước khi viết engine | | Chờ |
| TL10 | Thiết kế giao diện: vẽ mockup bằng cách nào, và cách chọn bài? | Claude tự thiết kế mockup (như Cờ caro) rồi bạn duyệt; lá bài vẽ SVG 3D bóng; chọn bài bằng chạm từng lá + nút Đánh, chạm hai lần chọn nhanh bộ nhỏ nhất thắng được | | Chờ |
