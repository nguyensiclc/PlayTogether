# Cờ vua — Kế hoạch prototype

## 1. Mục tiêu

Mở rộng nền tảng PlayTogether với trò chơi thứ ba: **Cờ vua (Chess)**:

> Hai người chơi ở hai thiết bị khác nhau: một người tạo phòng **Cờ vua**, gửi link mời. Người kia bấm link, vào phòng, cả hai chơi hết một ván cờ vua theo luật chuẩn quốc tế và bấm "Ván nữa". **Toàn bộ quá trình mượt mà, không có lỗi, giao diện chuẩn đẹp cho cả điện thoại và máy tính.**

## 2. Phạm vi tính năng

| Có trong prototype | Chưa làm / Để giai đoạn sau |
|---|---|
| Engine Cờ vua đầy đủ luật chuẩn FIDE: 6 loại quân, đi và ăn | Đánh với máy (bot cờ vua Stockfish) |
| Các nước đặc biệt: Nhập thành, Bắt tốt qua đường, Phong cấp | Đấu giải (Tournament / Swiss) |
| Chiếu, Chiếu bí, Thế bí (Stalemate), Hoà 50 nước, Lặp 3 lần | Phân tích ván cờ (Eval bar, phân tích sai lầm) |
| Thiếu lực lượng chiếu bí (Insufficient material) | Chế độ tính giờ Fischer (+giây mỗi nước) |
| Đầu hàng (Resign) và Đề nghị hoà | Lưu trữ PGN lịch sử vào tài khoản cá nhân |
| Bàn cờ SVG sắc nét, lật bàn theo góc nhìn người chơi | Âm thanh gõ cờ khi đi/ăn quân |
| Chọn quân, highlight ô hợp lệ, popup phong cấp trên di động | |
| Kết quả ván, Ván nữa (người thua cầm Trắng đi trước) | |

---

## 3. Các mốc triển khai

| Mốc | Nội dung | Tiêu chí hoàn thành | Trạng thái |
|---|---|---|---|
| **V1 — Engine** | `engine/co-vua`: types, rules, fen, kiểm tra chiếu, test cases V01–V25 | Mọi test xanh 100%, fuzz 200 ván bất biến luôn đúng | **Đã xong** |
| **V2 — Tích hợp Protocol & Server** | Khai báo GameId `co-vua`, Protocol, Server registry, test WS | Server tạo phòng, nhận move cờ vua, test server qua ws xanh | **Đã xong** |
| **V3 — Giao diện Cờ vua** | Bàn cờ SVG, tap-to-move, phong cấp, highlight, di động 360px & desktop | Chơi hết ván mượt mà giữa 2 tab trình duyệt | **Đã xong** |
| **V4 — Hoàn thiện** | Thử nghiệm thực tế 2 người chơi trên nhiều thiết bị | Chơi thử mượt mà không có lỗi | Đang tiến hành |

---

## 4. Danh sách Test Case cho Engine (`rules.test.ts`)

| Mã test | Tình huống kiểm tra | Kết quả kỳ vọng |
|---|---|---|
| **V01** | `setup`: thế cờ ban đầu 32 quân | Đủ 32 quân đúng vị trí, Trắng đi trước, quyền nhập thành đầy đủ, `turn = 'w'` |
| **V02** | Tốt: tiến 1 ô, tiến 2 ô từ vị trí ban đầu | Hợp lệ khi đường đi trống; không nhảy qua quân cản |
| **V03** | Tốt: ăn chéo | Ăn được quân đối phương ở 2 ô chéo phía trước; không ăn thẳng |
| **V04** | Tốt: Bắt tốt qua đường (En passant) | Bắt được ngay ở lượt kế tiếp; Tốt đối phương bị loại khỏi bàn; mất quyền nếu không bắt ngay |
| **V05** | Tốt: Phong cấp | Tốt đến hàng cuối bắt buộc kèm `promotion`; phong được Q, R, B, N |
| **V06** | Mã: nhảy hình chữ L qua quân khác | Đi được 8 hướng hợp lệ, nhảy qua quân chắn, ăn quân đối phương |
| **V07** | Tượng: đi chéo | Đi chéo không giới hạn, bị chặn bởi quân cản |
| **V08** | Xe: đi thẳng/ngang | Đi dọc và ngang không giới hạn, bị chặn bởi quân cản |
| **V09** | Hậu: kết hợp Xe và Tượng | Đi 8 hướng tự do, bị chặn bởi quân cản |
| **V10** | Vua: đi 1 ô mọi hướng | Đi 1 ô, không được đi vào ô bị quân đối phương đe dọa |
| **V11** | Nhập thành cánh Vua (ngắn) | Vua nhảy 2 ô sang phải, Xe nhảy sang ô f; quyền nhập thành bị huỷ sau đó |
| **V12** | Nhập thành cánh Hậu (dài) | Vua nhảy 2 ô sang trái, Xe nhảy sang ô d; quyền nhập thành bị huỷ sau đó |
| **V13** | Nhập thành không hợp lệ | Bị từ chối khi Vua đang bị chiếu, hoặc đi qua ô bị chiếu, hoặc có quân chắn giữa |
| **V14** | Mất quyền nhập thành | Khi Vua đã di chuyển hoặc Xe đã di chuyển |
| **V15** | Phát hiện chiếu (`isCheck`) | Phát hiện chính xác khi Vua bị bất kỳ quân nào đe dọa |
| **V16** | Nước đi khi bị chiếu | Chỉ chấp nhận nước hoá giải thế chiếu (chạy vua, ăn quân chiếu, chắn đường) |
| **V17** | Chiếu bí (Checkmate) | Vua bị chiếu và không còn nước hợp lệ nào → kết thúc ván, bên chiếu thắng |
| **V18** | Thế bí (Stalemate) | Vua không bị chiếu nhưng không còn nước đi hợp lệ nào → kết thúc hoà (0.5 - 0.5) |
| **V19** | Quy tắc 50 nước | 50 nước không ăn quân và không đi tốt → tự động xử hoà |
| **V20** | Lặp lại thế cờ 3 lần | Cùng một thế cờ xuất hiện 3 lần → tự động xử hoà |
| **V21** | Thiếu lực lượng chiếu bí | K vs K, K+B vs K, K+N vs K, K+B vs K+B cùng màu ô → tự động hoà |
| **V22** | Đầu hàng (`resign`) | Ghế đầu hàng nhận thua ngay lập tức, đối thủ thắng |
| **V23** | `parseMove` & `parseOptions` | Kiểm tra tính hợp lệ dữ liệu từ client, từ chối dữ liệu sai định dạng |
| **V24** | **Fuzz testing**: 5.000 ván ngẫu nhiên | Không văng lỗi, không treo, bất biến 1 vua mỗi bên luôn đúng sau mọi nước |

---

## 5. Câu hỏi mở

| # | Câu hỏi | Đề xuất | Trả lời | Trạng thái |
|---|---|---|---|---|
| **V1** | **Bộ quân cờ hiển thị trên giao diện bàn cờ**: Dùng ký tự Unicode cờ vua (♔♕♖♗♘♙) hay bộ vector SVG chuẩn cờ quốc tế (kiểu cờ chuẩn Lichess/Chess.com)? | **Bộ vector SVG chuẩn**, vì hiển thị sắc nét đồng nhất trên mọi màn hình di động, không bị phụ thuộc vào font chữ hệ thống của từng hãng điện thoại. | **Theo đề xuất** | Đã chốt |
| **V2** | **Quy tắc đổi bên khi chơi "Ván nữa"**: Sau ván đầu tiên, ai sẽ là người cầm Trắng (đi trước)? | **Người thua ván trước được cầm Trắng** (đi trước). Nếu ván trước hoà thì đổi màu quân so với ván trước (giống Ô ăn quan và Caro). | **Theo đề xuất** | Đã chốt |
| **V3** | **Xử lý luật Hoà (Lặp 3 lần & 50 nước)**: Tự động kết thúc ván và xử hoà ngay khi thoả mãn, hay yêu cầu người chơi phải bấm nút khiếu nại? | **Tự động xử hoà ngay trong Engine**, giúp trải nghiệm đơn giản, không cần thêm giao diện khiếu nại phức tạp cho bản prototype. | **Theo đề xuất** | Đã chốt |
| **V4** | **Giao diện phong cấp Tốt trên điện thoại**: Khi Tốt xuống hàng cuối, xử lý chọn quân thế nào? | **Hiện popup nhỏ gồm 4 quân (Hậu, Xe, Tượng, Mã) ngay trên ô phong cấp** với kích thước chạm ≥ 48px; mặc định highlight quân Hậu. | **Theo đề xuất** | Đã chốt |
| **V5** | **Tính năng Đề nghị hoà (Draw offer)**: Có đưa vào prototype ngay không? | **Có**: Nút "Xin hoà" đơn giản, đối thủ nhận popup xác nhận Đồng ý / Từ chối. | **Theo đề xuất** | Đã chốt |

