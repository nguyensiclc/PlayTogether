# Cờ caro — Kế hoạch prototype

## 1. Mục tiêu

Kiểm chứng rằng **nền tảng phòng chơi chạy được game thứ hai** mà không phải sao chép:

> Hai người ở hai máy khác nhau: một người tạo phòng **Cờ caro** rồi gửi link, người kia bấm link, nhập tên, cả hai chơi hết một ván và bấm "Ván nữa". **Không có lỗi và không cần giải thích gì thêm.**

Cờ caro luật đơn giản, nên các phát hiện đều là về **nền tảng** (tổng quát hoá server, protocol, giao diện phòng chờ), không phải về luật.

## 2. Phạm vi

| Có trong prototype | Chưa làm |
|---|---|
| Engine Cờ caro: 5 quân liên tiếp, 2 tuỳ chọn (cỡ bàn, chặn 2 đầu) | Luật cấm tay (Renju), đổi bên, hoàn nước |
| Nền tảng đa game: thêm game chỉ là thêm module + màn hình | Đánh với máy (bot) |
| Phòng chờ có tuỳ chọn Caro, link mời, QR, người xem | Chat chữ, bảng xếp hạng, tài khoản |
| Bàn chơi điện thoại: chạm 2 lần (chọn ô rồi xác nhận), kính lúp | Âm thanh, xem lại ván |
| Hiệu ứng đặt quân, chuỗi thắng; nhật ký ván trên desktop | |
| Kết quả, Ván nữa (người thua đi trước), rời phòng giữa ván | |
| Tự kết nối lại (dùng chung nền tảng) | Giữ ghế 60 giây và xử thua do mất kết nối (M4 của nền tảng) |

## 3. Các mốc

| Mốc | Nội dung | Tiêu chí xong |
|---|---|---|
| **C1 — Engine** | `engine/caro` + test mục 4, viết test trước | Test xanh; fuzz 10.000 ván: bất biến đúng, mọi ván kết thúc |
| **C2 — Nền tảng đa game** | Tổng quát hoá `GameModule`, protocol, server, client theo `03-thiet-ke-ky-thuat.md` mục 4. Ô ăn quan phải **chạy y như cũ** | Mọi test cũ xanh; tạo phòng được cả hai game từ trang chủ |
| **C3 — Giao diện Caro** | Phòng chờ (tuỳ chọn), bàn chơi, kết quả, theo mockup đã chốt | Chơi hết một ván giữa hai tab, rồi giữa hai máy |
| **C4 — Hoàn thiện** | Chuỗi thắng, Ván nữa, phím tắt, thử trên điện thoại thật | Cho 3–5 người chơi thử và ghi nhận phản hồi |

**Tiến độ:** **C1 xong** (engine + 53 test, gồm fuzz 10.000 ván). **C2 xong** (nền tảng đa game; Ô ăn quan chạy y như cũ, đã kiểm lại bằng e2e). **C3 xong** (mockup do Claude tự thiết kế và đã được duyệt theo lời bạn "tự quyết định, tôi duyệt hết", thay cho canvas design; giao diện bàn chơi, kính lúp, kết quả, Ván nữa; e2e Playwright hai người chơi trên điện thoại và desktop). **C4** còn phần thử trên điện thoại thật với 3–5 người.

C1 **không phụ thuộc** thiết kế giao diện, nên làm song song với việc nhờ canvas design vẽ mockup. C3 chỉ bắt đầu khi mockup được duyệt.

Đồng hồ lượt, giữ ghế 60 giây, xử thua do mất kết nối là việc **M4 của nền tảng**, làm một lần cho cả hai game, không tính riêng cho Caro.

## 4. Test case cho engine

Thế cờ trong test được dựng thẳng (không đi từng nước), trừ các test hành vi theo lượt.

| # | Tình huống | Kỳ vọng |
|---|---|---|
| K1 | `setup`: bàn 15 × 15 rỗng, `players = [firstPlayer, người còn lại]`, `turn = 0`, đủ trường | Đúng; tổng quân = 0 |
| K2 | Đặt quân vào ô trống, đúng lượt | Quân vào đúng ô, `last`, `moveNo`, event `place`, đổi lượt |
| K3 | Đặt vào ô đã có quân / ngoài bàn (`-1`, `size`) / số lẻ / sai lượt / ván đã kết thúc / ghế lạ | Trả về lỗi (`NOT_YOUR_TURN` hoặc `INVALID_MOVE`), state không đổi |
| K4 | 5 quân liền theo **hàng ngang** (đặt quân cuối ở đầu, ở giữa, ở cuối chuỗi) | Thắng; `winLine` đúng 5 ô |
| K5 | 5 quân liền theo **hàng dọc** | Thắng |
| K6 | 5 quân liền theo **chéo `\`** và **chéo `/`** | Thắng |
| K7 | Chỉ 4 quân liền (hở 2 đầu) | Chưa thắng, ván tiếp tục |
| K8 | 5 quân bị ngắt bởi một ô trống hoặc một quân đối thủ ở giữa | Chưa thắng |
| K9 | Chuỗi 6 quân và 7 quân, `chanHaiDau` tắt | Thắng; `winLine` có đủ cả 6 hoặc 7 ô |
| K10 | Nước đặt tạo **hai chuỗi 5** cùng lúc (ngang và dọc) | Thắng; `winLine` gồm cả hai chuỗi |
| K11 | Chuỗi sát mép bàn (x = 0, y = 0, x = size − 1, y = size − 1), cả bàn 15 và 19 | Thắng đúng; không lỗi chỉ số |
| K12 | `chanHaiDau` bật: 5 quân bị chặn cả hai đầu bằng quân đối thủ | Chưa thắng |
| K13 | `chanHaiDau` bật: 5 quân, một đầu bị chặn, một đầu trống | Thắng |
| K24–K27 | Nhường lượt: đổi quân và lượt, chỉ một lần, hết quyền khi đã có quân, người đi sau không nhường được, kết quả ghi đúng ghế | Đúng như luật mục 3.1 |
| K14 | `chanHaiDau` bật: 5 quân sát mép bàn, đầu kia bị đối thủ chặn (C3) | Chưa thắng |
| K15 | `chanHaiDau` bật: chuỗi 6 quân bị chặn một đầu (C4) | Thắng |
| K16 | Bàn đầy, không ai thắng | Hoà; `scores = [0,5; 0,5]`; event `draw` |
| K17 | Thắng ở **nước cuối** khi bàn vừa đầy | Thắng, không phải hoà |
| K18 | Sau khi kết thúc | `validMoves` rỗng; đặt tiếp báo lỗi |
| K19 | `forfeit`: rời giữa ván / hết giờ | Đối thủ thắng, `reason` đúng; ván đã kết thúc hoặc ghế lạ báo lỗi |
| K20 | `parseOptions`: giá trị lạ, sai kiểu, khoá lạ | Bỏ qua, giữ giá trị cũ |
| K21 | `parseMove`: thiếu `x` hoặc `y`, sai kiểu, số thập phân | Trả về `null` |
| K22 | Điểm theo `SeatId`: thắng 1 / thua 0, kể cả khi ghế của người đi trước là 1 | `scores` đúng thứ tự ghế |
| K23 | **Fuzz**: 10.000 ván nước ngẫu nhiên, cả hai cỡ bàn, `chanHaiDau` bật tắt ngẫu nhiên | Không lỗi; bất biến mục 3.2 luôn đúng; mọi ván kết thúc; kết quả khớp bộ kiểm tra chậm quét toàn bàn |

Ngoài engine: test server/protocol cho C2 (tạo phòng Caro qua gateway, nước đi sai hình dạng bị từ chối, hai game cùng chạy trong một server), test hiển thị của client.

## 5. Phối hợp với việc đang làm ở Ô ăn quan

Ô ăn quan đang được một công cụ khác (Antigravity) sửa **trong cùng thư mục làm việc**. Để không giẫm lên nhau:

- Cờ caro làm trên **nhánh `caro`** trong một **worktree riêng** (`../PlayTogether-caro`). Không sửa thư mục `PlayTogether` đang có thay đổi chưa commit của Ô ăn quan.
- Code riêng của Caro nằm trong thư mục riêng (`engine/caro`, `client/caro`, `docs/caro`) nên không đụng nhau.
- Những **file dùng chung** mà C2 phải sửa: `engine/game-module.ts`, `protocol/index.ts`, `server/{parse,room-manager,gateway,http}.ts`, `client/screens/{home,room,lobby,nickname}.ts`, `client/style.css`. Cần thống nhất ai sửa và khi nào gộp (câu C10).
- Caro **không sửa** gì trong `o-an-quan/`. Hành vi Ô ăn quan không đổi, được bảo vệ bằng các test hiện có.

## 6. Câu hỏi mở (cần chốt trước khi code)

Đánh số `C1…` để không lẫn với câu hỏi `Q1…` của Ô ăn quan. Câu **C1–C4, C6, C8** cần có trước khi viết engine (C1 trong kế hoạch). Câu **C5, C9, C13** cần trước khi làm giao diện. Câu **C10** cần trước C2.

| # | Câu hỏi | Đề xuất hiện tại | Trả lời | Trạng thái |
|---|---|---|---|---|
| C1 | Cỡ bàn: chỉ 15 × 15, hay có thêm 19 × 19? | Mặc định **15 × 15**, tuỳ chọn **19 × 19** | **Theo đề xuất** | Đã chốt |
| C2 | Luật thắng mặc định? | **Từ 5 quân liền trở lên thắng**, bất kể đầu bị chặn; "Chặn 2 đầu" là tuỳ chọn, **tắt** mặc định | **Theo đề xuất** | Đã chốt |
| C3 | Khi bật Chặn 2 đầu: mép bàn có tính là bị chặn không? | **Có** (không đi tiếp được nên coi như bị chặn) | **Theo đề xuất** | Đã chốt |
| C4 | Khi bật Chặn 2 đầu: chuỗi 6 quân trở lên thì sao? | Vẫn thắng nếu **ít nhất một đầu** không bị chặn | **Theo đề xuất** | Đã chốt |
| C5 | Cách đặt quân trên điện thoại (ô khoảng 22px, nhỏ hơn 44px)? | **Chạm 2 lần**: chạm chọn ô (kính lúp phía trên ngón tay) rồi chạm lại hoặc bấm nút **Đặt quân**. Phương án khác: cho phóng to bàn bằng hai ngón; hoặc tự phóng to khi chạm | **Theo đề xuất** | Đã chốt |
| C6 | Ai đi trước, ai cầm X? | Ván đầu **ngẫu nhiên**; người đi trước cầm **X**; ván sau **người thua đi trước**, hoà thì đổi lượt (như Ô ăn quan) | **Theo đề xuất** | Đã chốt |
| C7 | Có luật hạn chế lợi thế người đi trước (đổi bên sau nước đầu, như Lật bàn ở Ô ăn quan)? | **Không** làm ở prototype | **Theo đề xuất** | Đã chốt |
| C8 | Cách tính điểm ván và kết quả hoà | Thắng 1, thua 0, **hoà 0,5 mỗi người**. Bàn đầy mà chưa ai thắng là hoà | **Theo đề xuất** | Đã chốt |
| C9 | Màu và ký hiệu quân X / O (và biểu tượng game trên trang chủ) | Để **canvas design** quyết, dùng token màu đã có của nền tảng (`--primary` cho X, `--cat-bai` cho O là gợi ý). Ký hiệu cần phân biệt được kể cả khi người xem **mù màu** (hình dạng khác nhau, không chỉ khác màu) | **Theo đề xuất** | Đã chốt |
| C10 | Phối hợp sửa **file dùng chung** với Antigravity (Ô ăn quan) | Caro sửa file chung **trên nhánh `caro`**, gộp thành vài commit nhỏ, gộp vào `main` **sau khi** Antigravity commit xong phần Ô ăn quan. Hoặc: bạn chọn người sửa file chung trước | **Theo đề xuất** | Đã chốt |
| C11 | Đồng hồ lượt và giữ ghế 60 giây | Làm **chung ở M4 của nền tảng**, không riêng cho Caro. Tuỳ chọn "Thời gian mỗi lượt" **ẩn** tới khi có | **Theo đề xuất** | Đã chốt |
| C12 | Hết giờ ở Caro tự đặt quân ngẫu nhiên có hợp lý không? | Dùng chung cơ chế: tự đặt vào ô trống ngẫu nhiên, 3 lần liên tiếp thì xử thua (M4). Phương án khác: hết giờ là **thua ngay** | **Theo đề xuất** | Đã chốt |
| C14 | Người đi trước có quyền **nhường lượt** (yêu cầu của chủ dự án) | Chỉ trước khi đặt quân đầu tiên, một lần mỗi ván; hai người **đổi quân** (đối thủ cầm X và đi trước); người nhận không nhường lại | **Theo yêu cầu**; chi tiết do Claude tự quyết theo lời "tự quyết định, tôi duyệt hết" | Đã chốt |
| C13 | **Thiết kế mockup do ai làm và theo quy trình nào?** (đã đổi: xem ghi chú bên dưới) | Như Ô ăn quan: mình viết **bản yêu cầu thiết kế** (`docs/design/caro/README.md`), bạn nhờ **canvas design** tạo mockup HTML vào `docs/design/caro/`, báo lại thì mình làm giao diện. Mockup ở "Bản nháp 1", **Đã chốt** khi bạn duyệt | **Theo đề xuất** | Đã chốt |

### Ghi chú cho các câu trả lời

- **C1–C4:** luật mặc định là freestyle (từ 5 quân liền trở lên thắng). Chặn 2 đầu là tuỳ chọn tắt; khi bật, mép bàn cũng tính là chặn và chuỗi 6+ quân thắng nếu còn một đầu mở. Đã khớp `01-luat-choi.md`, không cần sửa.
- **C5:** đặt quân trên điện thoại bằng chạm 2 lần với kính lúp. Đã khớp `02-thiet-ke-ux.md` mục 3.2.
- **C10:** Caro sửa file dùng chung **trên nhánh `caro`** (worktree riêng), chia thành vài commit nhỏ. Chỉ gộp vào `main` sau khi Antigravity commit xong phần Ô ăn quan. Hạ tầng dùng chung (`GameModule.parseMove`, protocol, server) chỉ đụng tới ở mốc C2, **không** ở C1.
- **C13:** ban đầu định nhờ canvas design. Sau đó bạn nói "tự làm và tự quyết định hết, tôi duyệt hết", nên Claude tự vẽ mockup (HTML tĩnh dùng `docs/design/shared/caro.css` và `caro-board.js`) vào `docs/design/caro/` và coi là **Đã chốt**. Nếu sau này muốn canvas design vẽ lại, `docs/design/caro/README.md` vẫn là bản yêu cầu; code UI ở `packages/client/caro/` sẽ chỉnh theo.

Khi có câu hỏi mới thì ghi vào cột "Trả lời" (hoặc nhắn trực tiếp, mình sẽ ghi vào đây), và cập nhật tài liệu luật / kỹ thuật liên quan trong cùng thay đổi.
