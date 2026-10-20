# Ô ăn quan — Kế hoạch prototype

## 1. Mục tiêu

Kiểm chứng **luồng chính** của cả nền tảng qua một game thật:

> Hai người ở hai máy khác nhau, một người tạo phòng và gửi link. Người kia bấm link, nhập tên, rồi cả hai chơi hết một ván Ô ăn quan và bấm "Ván nữa". **Toàn bộ quá trình không có lỗi và không cần giải thích gì thêm.**

## 2. Phạm vi

| Có trong prototype | Chưa làm |
|---|---|
| Engine Ô ăn quan đầy đủ luật mặc định + 4 tuỳ chọn (giá trị quan, Quan Già, Lật bàn, thời gian lượt) | Đánh với máy (bot) |
| Tạo phòng, link mời, QR, Web Share | Tài khoản, lịch sử ván |
| Phòng chờ: ghế, người xem, chủ phòng, tuỳ chọn | Chat chữ |
| Bàn chơi trên điện thoại, chạm 2 lần để đi | Bảng xếp hạng |
| Hiệu ứng rải/ăn, tua nhanh | Âm thanh (để giai đoạn hoàn thiện, nếu kịp) |
| Đồng hồ lượt, tự đi khi hết giờ | Lưu phòng bền (Redis) |
| Kết nối lại, giữ ghế 60 giây | Deploy chính thức |
| Kết quả + Ván nữa | |
| Biểu cảm emoji | |

## 3. Các mốc

| Mốc | Nội dung | Tiêu chí xong |
|---|---|---|
| **M1 — Engine** | `rules.ts` + toàn bộ test case ở mục 4 | Test xanh, bất biến tổng quân luôn đúng sau 10.000 ván ngẫu nhiên |
| **M1.1 — Luật bổ sung** | Cập nhật engine theo luật bổ sung từ oanquan.online (xem mục 7): bù dân, Quan Già, Lật bàn, lặp nước | Test T1–T20 xanh, fuzz giữ bất biến tổng điểm |
| **M2 — Bàn chơi offline** | Render bàn + tương tác + hiệu ứng, hai người chơi trên cùng một máy | Chơi hết một ván trên điện thoại thật |
| **M3 — Phòng & mạng** | Server WS, phòng chờ, link mời, đồng bộ nước đi | Chơi được giữa hai tab, rồi giữa hai máy qua tunnel |
| **M4 — Chịu lỗi** | Đồng hồ, tự đi khi hết giờ, kết nối lại, rời phòng | Tắt Wi-Fi 20 giây rồi bật lại, ván vẫn tiếp tục |
| **M5 — Hoàn thiện** | Kết quả, Ván nữa, emoji, hướng dẫn luật, âm thanh | Cho 3–5 người chơi thử và ghi nhận phản hồi |

## 4. Test case cho engine

| # | Tình huống | Kỳ vọng |
|---|---|---|
| T1 | Ví dụ chuẩn trong tài liệu luật: bàn khởi đầu, A chọn ô 3, chiều +1 | A ăn 6 dân (ô 4), lượt chuyển sang B |
| T2 | Viên cuối rơi ngay trước ô quan còn quan | Kết thúc lượt, không ăn gì |
| T3 | Viên cuối, sau đó là 1 ô trống, rồi đến ô quan có quan + 3 dân, `camAnQuanNon = tắt` | Ăn 1 quan + 3 dân (13 điểm) |
| T4 | Như T3 nhưng `camAnQuanNon = bật` (Quan Già); ô quan có 4 dân | Không ăn, kết thúc lượt ngay, không bỏ qua để ăn ô phía sau |
| T4b | Quan Già, ô quan có quan + 5 dân | Ăn được 15 điểm |
| T4c | Quan Già, ăn được 1 ô dân rồi ăn liên hoàn tới ô quan non | Giữ ô đã ăn, dừng trước ô quan |
| T4d | Quan Già, ô quan đã mất quan, có 2 dân | Ăn bình thường 2 điểm |
| T5 | Ăn dây 3 ô (trống–có–trống–có–trống–có) | Ăn cả 3 ô |
| T6 | Sau viên cuối là hai ô trống | Kết thúc lượt, không ăn |
| T7 | Ăn dây đi vòng qua ô quan đã trống hẳn | Được ăn tiếp ô phía sau |
| T8 | Ô được chọn có ≥ 12 dân (rải đủ một vòng) | Ô vừa bốc nhận lại 1 dân khi rải vòng tới |
| T9 | Bù dân: đầu lượt, hàng mình trống hết, kho có ≥ 5 dân | Kho trừ 5 dân, mỗi ô của mình có 1 dân, event `buDan(doiQuan=false)` |
| T10 | Bù dân khi kho có 2 dân + 1 quan (v = 10) | Đổi 1 quan thành 10 dân, rồi trừ 5: kho còn 7 dân, 0 quan, event `buDan(doiQuan=true)` |
| T11 | Cần bù dân nhưng kho < 5 điểm | Ván kết thúc `khong-du-bu-dan`, người đó thua dù điểm cao hơn hay thấp hơn |
| T12 | Ô quan cuối cùng bị ăn, hai ô quan đều trống hẳn | Ván kết thúc, mỗi bên thu dân trên hàng mình, điểm cộng đúng |
| T13 | Lặp nước: 6 nước rải gần nhất dạng X Y X Y X Y | Ván kết thúc `lap-nuoc`, mỗi bên thu dân trên hàng mình, quân trong ô quan không tính, so điểm |
| T14 | Đi sai lượt / chọn ô của đối thủ / ô trống / ô quan / chiều không hợp lệ | Trả về lỗi, state không đổi |
| T15 | `giaTriQuan = 5`, ván kết thúc do hết quan | Tổng điểm hai bên cuối ván = 60 |
| T16 | Fuzz: 10.000 ván với nước đi ngẫu nhiên, chạy với cả hai giá trị quan, bật ngẫu nhiên Quan Già và Lật bàn | Không treo, không lỗi, **bất biến tổng điểm** (bàn + kho = 70/60) đúng sau mỗi nước, mọi ván đều kết thúc. Ván kết thúc do hết quan thì tổng điểm cuối = 70/60 |
| T17 | Lật bàn hợp lệ: `latBan` bật, sau nước mở đầu, người đi sau lật | `controller` hoán đổi, `turn` giữ nguyên, người mở đầu phải đi tiếp; người vừa lật đi thì nhận `NOT_YOUR_TURN` |
| T18 | Lật bàn không hợp lệ: tuỳ chọn tắt / trước nước đầu / sau nước thứ 2 / lật lần hai / người mở đầu bấm lật | Trả về lỗi, state không đổi |
| T19 | Ví dụ 11.2 trong tài liệu luật (ô quan 1 quan + 2 dân, sau đó ăn liên hoàn ô 4 dân) | Cơ bản: 16 điểm. Quan Già: 0 điểm |
| T20 | Kết thúc ván khi đã lật bàn | `scores` và `ScoreDetail` tính theo người chơi (SeatId), lấy kho của bên người đó đang điều khiển |

> T16 còn kiểm tra vòng lặp rải có luôn dừng hay không. Theo luật thì luôn dừng, nhưng nên đặt thêm giới hạn an toàn (vd: 10.000 bước rải trong một lượt) để phát hiện lỗi.

## 5. Kịch bản chơi thử với người thật (M5)

1. Gửi link qua Zalo cho người chưa từng vào trang. Đo thời gian từ lúc bấm link đến nước đi đầu tiên (mục tiêu dưới 30 giây).
2. Không giải thích luật. Quan sát xem họ có hiểu từ hiệu ứng và phần hướng dẫn hay không.
3. Hỏi 3 câu sau ván: *Có chỗ nào khó hiểu không? Có muốn chơi ván nữa không? Muốn chơi game nào tiếp theo?*

## 6. Câu hỏi mở

| # | Câu hỏi | Trả lời | Trạng thái |
|---|---|---|---|
| Q1 | Quan = 10 hay 5 dân? | **10** mặc định, có tuỳ chọn 5 | Đã chốt |
| Q2 | Mặc định có cấm ăn quan non không? | **Không cấm** (tắt), có tuỳ chọn bật | Đã chốt |
| Q3 | Ô quan đã trống hẳn được xem như ô trống (cho phép ăn qua nó)? | **Có** | Đã chốt |
| Q4 | Khi vay dân không đủ, có cho đổi quan đã ăn ra dân không? | ~~Không~~. Bỏ luật vay, xem Q13 | Thay thế bởi Q13 |
| Q5 | Bị đi thay mấy lượt liên tiếp thì xử thua? | **3** lượt | Đã chốt |
| Q6 | Tên miền / tên thương hiệu | Tạm dùng **PlayTogether**. Không ảnh hưởng M1–M4, chốt trước khi deploy | Đã chốt (tạm) |
| Q7 | Ván kết thúc theo mục 6.4 luật (hai bên cộng lại không đủ 5 dân để rải) trong khi ô quan vẫn còn quan và/hoặc dân: số quân còn trong 2 ô quan xử lý thế nào? | ~~Phương án C~~. Luật Bù dân mới: không đủ điểm thì thua ngay, nên tình huống này không còn xảy ra | Không còn áp dụng |
| Q8 | M2: hai người chơi chung một máy thì bàn hiển thị theo hướng nào? | **A**: xoay bàn theo người đến lượt | Đã chốt |
| Q9 | M2: có màn hình chọn tuỳ chọn (`giaTriQuan`, `camAnQuanNon`) không? | **A**: có màn hình bắt đầu chọn hai tuỳ chọn | Đã chốt |
| Q10 | M2: ván offline có đồng hồ lượt không? | **A**: không có đồng hồ ở M2 | Đã chốt |
| Q11 | M2: sau khi hết ván có "Ván nữa" theo luật người thua đi trước không? Hai người được gọi tên là gì? | **A**: có bảng điểm + Ván nữa theo luật mục 2; tên "Người chơi A" / "Người chơi B" | Đã chốt |
| Q12 | Chế độ chơi chung một máy chỉ dùng để phát triển, hay là tính năng chính thức của sản phẩm? | **A**: chỉ để phát triển, đường dẫn ẩn `/offline` (sửa bởi Q19: hiện ở trang chủ tạm thời đến M3) | Đã chốt |
| Q13 | Bù dân: kho đủ 5 điểm nhưng không đủ 5 dân (chỉ có quan) thì sao? | Đổi 1 quan thành dân (10 hoặc 5 dân) rồi trừ 5 điểm | Đã chốt (theo đề xuất) |
| Q14 | "Mốc 36/70" có phải luật dừng ván sớm khi một bên đạt 36 điểm? | **Không**, chỉ là ngưỡng quá nửa khi so điểm cuối ván | Đã chốt (theo đề xuất) |
| Q15 | Luật lặp nước áp dụng cho chế độ nào? | **Mọi chế độ** | Đã chốt (theo đề xuất) |
| Q16 | Mặc định của Quan Già và Lật bàn? | Cả hai **tắt** (luật Cơ bản như trang tham chiếu) | Đã chốt (theo đề xuất) |
| Q17 | `setup(options, seats, firstPlayer)`: người đi trước điều khiển bên nào? | **A**: bên A luôn đi trước, `controller[0] = firstPlayer` | Đã chốt |
| Q18 | `validMoves` có trả về nước `latBan` không? | **A**: có. Khi hết giờ, server chỉ chọn trong các nước `sow` | Đã chốt |
| Q19 | Trang chủ có danh sách trò chơi: bấm Ô ăn quan thì vào đâu, khi chế độ online (M3) chưa có? | **A**: bấm Ô ăn quan → `/offline`, tạm thời đến M3 (sửa Q12) | Đã chốt |
| Q20 | Làm UI theo `docs/design/` (Bản nháp 1): làm những màn hình nào lúc này, và xử lý các thành phần của M3–M5 ra sao? | **A**: chốt và làm ngay Trang chủ, Bàn chơi, Lật bàn, Kết quả (điện thoại + desktop); thành phần M3–M5 ẩn đi | Đã chốt |

### Q7 — Quân còn trong ô quan khi ván kết thúc theo mục 6.4

**Bối cảnh:** Mục 7 luật chỉ nói "mỗi người thu toàn bộ dân còn trên hàng của mình". Nếu ván kết thúc do hết quan thì hai ô quan đã trống hẳn nên không có vấn đề. Nhưng nếu ván kết thúc theo mục 6.4 thì ô quan có thể vẫn còn quan và dân, và tài liệu chưa nói số quân này thuộc về ai.

**Ảnh hưởng:** T11 (kết quả ván), T13 (tính điểm), T15 (tổng điểm = 60 có còn đúng cho mọi ván không).

| Phương án | Mô tả | Hệ quả |
|---|---|---|
| A | Không ai được. Chỉ tính quân đã ăn + dân trên hàng mình | Đúng nguyên văn mục 7. Tổng điểm có thể nhỏ hơn 70 (hoặc 60). T15 chỉ áp dụng cho ván kết thúc do hết quan |
| B | Người không rải được bị xử thua ngay, không so điểm | Đơn giản, nhưng điểm hiển thị có thể ngược với kết quả |
| C | Người còn dân thu toàn bộ quân còn trên bàn, kể cả 2 ô quan | Tổng điểm luôn bằng 70 (hoặc 60) |

**Trả lời: Phương án C.** Người còn lại (người không phải rải) thu toàn bộ quân còn trên bàn: dân trên cả hai hàng cùng quan và dân trong hai ô quan. Lý do chọn:
- Giữ được bất biến "tổng điểm cuối ván = 70 (hoặc 60)" cho **mọi** ván, nên test và hiển thị điểm đơn giản hơn.
- Hợp với tinh thần "thu quân": người còn quân trên bàn là người kiểm soát số quân còn lại.
- B làm điểm hiển thị có thể ngược với kết quả. A làm "mất" quân một cách khó giải thích với người chơi.

Đã cập nhật: mục 7 trong `01-luat-choi.md`, `ScoreDetail` trong `03-thiet-ke-ky-thuat.md`, test T11 và T15 ở mục 4.

### Q8 — Hướng bàn khi hai người chơi chung một máy (M2)

**Bối cảnh:** Tài liệu UX mục 2.4 nói "Mình luôn ở hàng dưới, màn hình của B xoay bàn 180°", nhưng chỉ tính trường hợp mỗi người một máy. Ở M2 cả hai dùng chung một máy, nên phải chọn một hướng hiển thị. Theo luật mục 1, "chiều `+1` luôn hiện là sang phải trên hàng của mình" chỉ đúng khi hàng của người đó nằm ở dưới.

**Ảnh hưởng:** cách vẽ bàn, ý nghĩa mũi tên ◀ ▶, hiệu ứng.

| Phương án | Mô tả | Hệ quả |
|---|---|---|
| A | Xoay bàn theo người đến lượt: người đến lượt luôn thấy hàng mình ở dưới. Bàn xoay sau khi hiệu ứng nước đi trước kết thúc | Giống hệt màn hình mỗi người sẽ thấy ở M3, nên code vẽ bàn dùng lại được nguyên vẹn. Hợp với cách chuyền máy cho nhau. Cần một hiệu ứng chuyển cảnh nhẹ để người chơi không bị rối |
| B | Cố định A ở dưới. Mũi tên chỉ đúng hướng sỏi sẽ chạy trên màn hình (với B, ▶ tương ứng chiều `-1`) | Hợp với cách đặt máy nằm giữa hai người. Nhưng B phải nhìn bàn ngược, và code M3 cần thêm phần xoay |
| C | Cố định A ở dưới, hàng B và chữ trên hàng B lật ngược 180° | Hai người ngồi đối diện đều đọc được. Bố cục phức tạp hơn, không dùng lại được cho M3 |

**Đề xuất:** A.

**Trả lời: Phương án A** (theo đề xuất).

### Q9 — Tuỳ chọn ván ở M2

**Bối cảnh:** Phòng chờ, nơi chủ phòng chọn tuỳ chọn, thuộc M3. M2 chưa có phòng chờ.

| Phương án | Mô tả |
|---|---|
| A | Một màn hình bắt đầu đơn giản cho chọn `giaTriQuan` (10/5) và `camAnQuanNon` (bật/tắt) rồi bấm **Bắt đầu**. Giúp thử cả hai luật trên điện thoại thật |
| B | Dùng luôn tuỳ chọn mặc định, chưa có màn hình chọn |

**Đề xuất:** A.

**Trả lời: Phương án A** (theo đề xuất).

### Q10 — Đồng hồ lượt ở M2

**Bối cảnh:** Theo kế hoạch, đồng hồ lượt và tự đi khi hết giờ thuộc M4, và do server quyết định. Khi chơi chung một máy thì không có server.

| Phương án | Mô tả |
|---|---|
| A | Không có đồng hồ ở M2. Chỉ chừa sẵn chỗ hiển thị trên bàn |
| B | Có đồng hồ chạy trên client và tự đi khi hết giờ (dùng `pickRandom` của engine) |

**Đề xuất:** A.

**Trả lời: Phương án A** (theo đề xuất).

### Q11 — Ván nữa và tên người chơi ở M2

**Bối cảnh:** Luật mục 2 quy định: ván đầu chọn ngẫu nhiên người đi trước, các ván sau người thua đi trước, hoà thì đổi lượt. Màn kết quả đầy đủ thuộc M5. Nickname thuộc M3.

| Phương án | Mô tả |
|---|---|
| A | Màn kết quả có bảng điểm (dân, quan, nợ, dân thu cuối ván) và nút **Ván nữa** theo đúng luật mục 2. Tên cố định là "Người chơi A" / "Người chơi B" |
| B | Như A nhưng cho nhập tên hai người ở màn hình bắt đầu |
| C | Chỉ hiện điểm và nút chơi lại từ đầu, người đi trước luôn chọn ngẫu nhiên |

**Đề xuất:** A.

**Trả lời: Phương án A** (theo đề xuất).

### Q12 — Chế độ chơi chung một máy có phải tính năng chính thức không?

**Bối cảnh:** README chỉ mô tả luồng tạo phòng và gửi link. M2 tạo ra chế độ chơi chung một máy, cần quyết định số phận của nó sau M3.

**Ảnh hưởng:** URL của chế độ này (ví dụ `/offline`), có hiện ở trang chủ hay không, và mức độ trau chuốt UI ở M2.

| Phương án | Mô tả |
|---|---|
| A | Chỉ để phát triển và thử: đường dẫn ẩn `/offline`, không hiện ở trang chủ. Xem xét lại sau M5 |
| B | Tính năng chính thức: trang chủ có thêm nút "Chơi trên một máy" |

**Đề xuất:** A.

**Trả lời: Phương án A** (theo đề xuất).

### Q17 — Người đi trước điều khiển bên nào khi bắt đầu ván?

**Bối cảnh:** Từ khi có Lật bàn, bên bàn (`Seat`: A = ô 1..5, B = ô 7..11) tách khỏi người chơi (`SeatId`) qua `controller`. Luật mục 1 ghi "**A** (đi trước)", còn `setup` nhận `firstPlayer: SeatId`. Tài liệu chưa nói `controller` và `turn` ban đầu được gán thế nào.

**Ảnh hưởng:** `setup`, test T1 và T17, cách hiển thị tên ở M2/M3. Không ảnh hưởng tới luật đi quân.

| Phương án | Mô tả | Hệ quả |
|---|---|---|
| A | Bên A luôn đi trước: `turn = 0`, `controller[0] = firstPlayer`, `controller[1]` là ghế còn lại | Khớp nguyên văn luật mục 1. Ai đi trước thì luôn ngồi bên A |
| B | Giữ ghế cố định theo phòng: `controller = [seats[0], seats[1]]`, `turn` = bên mà `firstPlayer` đang điều khiển | Mỗi người giữ nguyên một bên qua các ván. Bên B có thể đi trước, trái với chữ "A (đi trước)" ở luật mục 1 |

**Đề xuất:** A.

**Trả lời: Phương án A** (theo đề xuất). Bên A luôn đi trước và nằm ở hàng 1..5, nên luật, hiển thị và test đều dùng chung một quy ước. Nhờ có `controller`, việc người thua ván trước được đi trước chỉ là đổi người ngồi bên A. Đã cập nhật kỹ thuật mục 4.

### Q18 — `validMoves` có gồm nước Lật bàn không?

**Bối cảnh:** `Move` giờ là union `sow` / `latBan`. Tài liệu kỹ thuật mục 8 nói khi hết giờ, server chọn ngẫu nhiên trong `validMoves`. Luật mục 10 lại nói nước tự đi **không bao giờ** là Lật bàn. Nếu `validMoves` có trả về `latBan` thì server phải tự lọc nó ra.

**Ảnh hưởng:** `validMoves`, cách server chọn nước khi hết giờ (M4), cách client biết lúc nào hiện hộp hỏi Lật bàn, test T16–T18.

| Phương án | Mô tả | Hệ quả |
|---|---|---|
| A | `validMoves` trả về **mọi** nước hợp lệ, gồm cả `{ kind: "latBan" }` khi được phép. Khi hết giờ, server chỉ chọn trong các nước `kind = "sow"`. Cập nhật kỹ thuật mục 8 | Đúng nghĩa "nước hợp lệ" của `GameModule`. Client dựa vào `validMoves` để biết khi nào hiện hộp hỏi. Fuzz tự thử được Lật bàn |
| B | `validMoves` chỉ trả về nước rải. Thêm hàm riêng `canLatBan(state, seatId)` | Server khỏi phải lọc, nhưng có hai nơi để hỏi "đi được gì" |

**Đề xuất:** A.

**Trả lời: Phương án A** (theo đề xuất). Như vậy chỉ có một nơi duy nhất trả lời câu hỏi "đi được gì". Đã cập nhật kỹ thuật mục 4 và mục 8.

### Q19 — Trang chủ danh sách trò chơi trước khi có M3

**Bối cảnh:** Có yêu cầu làm trang chủ chứa danh sách trò chơi, bấm vào thì vào Ô ăn quan. UX mục 2.1 dự kiến trang chủ có nút **Tạo phòng Ô ăn quan** ("sau này sẽ thành lưới chọn game"), nhưng tạo phòng thuộc M3 và chưa có. Hiện chỉ chơi được ở `/offline`, mà Q12 đã chốt chế độ này là **đường dẫn ẩn, không hiện ở trang chủ**.

**Ảnh hưởng:** Q12, UX mục 2.1, `main.ts` (định tuyến), thiết kế `docs/design/nen-tang/trang-chu`.

| Phương án | Mô tả | Hệ quả |
|---|---|---|
| A | Trang chủ là lưới trò chơi: Ô ăn quan bấm được, Tiến lên / Cờ tướng / Caro hiện nhãn **Sắp có** và không bấm được. Bấm Ô ăn quan → `/offline` (chơi trên một máy). Sửa Q12: chế độ một máy được hiện ở trang chủ **tạm thời đến M3**. Khi có M3, bấm Ô ăn quan sẽ ra màn hình tạo phòng, còn "Chơi trên một máy" thành lựa chọn phụ | Chơi thử được ngay từ trang chủ. Phải sửa Q12 |
| B | Như A, nhưng bấm Ô ăn quan → trang giới thiệu trò chơi có hai nút: **Tạo phòng** (mờ, "Sắp có — M3") và **Chơi trên một máy** | Đúng hình dạng luồng sau M3 hơn, thêm một màn hình. Vẫn phải sửa Q12 |
| C | Giữ nguyên Q12: trang chủ có lưới trò chơi nhưng Ô ăn quan cũng chưa bấm được cho tới M3 | Không đổi quyết định cũ, nhưng không thoả yêu cầu "bấm vào thì vào trò Ô ăn quan" |

**Đề xuất:** A. Trang chủ ở bước này **chưa** có ô nhập nickname và mã phòng (UX mục 2.1); hai phần đó làm cùng M3.

**Trả lời: Phương án A** (theo đề xuất). Chi tiết thêm:
- Trên thẻ Ô ăn quan nổi bật, nút chính tạm ghi **"Chơi ngay"** (dẫn tới `/offline`), nút phụ "Luật chơi" tạm ẩn cho tới M5. Ô ăn quan trong lưới trò chơi cũng dẫn tới `/offline`.
- Trên màn hình bắt đầu `/offline` ghi một dòng nhỏ: "Chơi hai người trên cùng một máy. Chơi qua link mời: sắp có."
- Khi làm M3: nút chính đổi thành **Tạo phòng**, còn "Chơi trên một máy" thành lựa chọn phụ (link nhỏ dưới nút). Lúc đó xem lại Q12.
- Q12 được sửa: chế độ một máy **hiện ở trang chủ tạm thời đến M3**.

### Q20 — Phạm vi làm UI theo thiết kế `docs/design/`

**Bối cảnh:** `docs/design/` có 14 mockup ở trạng thái **Bản nháp 1 — chờ duyệt**. Theo README thiết kế, chỉ khi **Đã chốt** thì code UI mới phải theo đúng. Hiện mới chạy được chế độ chơi chung một máy (`/offline`, M2). Nhiều thành phần trong mockup cần server (M3–M4) hoặc thuộc M5:

| Thành phần trong mockup | Mốc |
|---|---|
| Ô "Có mã phòng", "Phòng gần đây", chip nickname, nút "Tạo phòng" | M3 |
| Nhập nickname, phòng chờ, mã QR, "Về phòng chờ", người xem, "Phòng ABCD" trên thanh trên cùng | M3 |
| Đồng hồ lượt (thanh thời gian, "20 giây"), "Đồng hồ vẫn chạy" trong hộp Lật bàn | M4 |
| Mất kết nối | M4 |
| Biểu cảm emoji, âm thanh, "Chia sẻ kết quả", nút "?" + hướng dẫn luật, "X muốn chơi ván nữa" | M5 |

Ngoài ra thiết kế được vẽ theo góc nhìn "bạn" (mỗi người một máy). Ở `/offline`, "bạn" là người đang đến lượt (Q8).

**Ảnh hưởng:** phạm vi việc làm ngay, `02-thiet-ke-ux.md` (README thiết kế ghi rằng khi chốt thì phải cập nhật UX: desktop có bố cục riêng, nhật ký ván, phím tắt `L` / `Space` / `Enter`…), trạng thái thiết kế trong `docs/design/README.md`.

| Phương án | Mô tả |
|---|---|
| A | Coi yêu cầu làm UI là **chốt** các màn hình sẽ làm. Làm ngay, cả điện thoại lẫn desktop: **Trang chủ**, **Bàn chơi**, **Hộp hỏi Lật bàn**, **Kết quả**, áp dụng cho `/offline`. Thành phần của M3–M5 **ẩn đi** (không hiện dạng "sắp có"), riêng game chưa làm vẫn có nhãn "Sắp có" như mockup. Nhật ký ván trên desktop làm luôn (chỉ cần `events`). Nhập nickname, phòng chờ, mất kết nối, hướng dẫn luật làm cùng mốc của chúng. Cập nhật UX và README thiết kế cho khớp |
| B | Như A, nhưng thành phần của M3–M5 vẫn hiện, ở dạng mờ / "Sắp có", để nhìn giống mockup |
| C | Làm **tất cả** mockup thành màn hình tĩnh (chưa có hành vi), nối dần khi tới mốc |
| D | Chưa làm. Duyệt lại thiết kế trước (đổi trạng thái sang Đã chốt) rồi mới làm |

**Đề xuất:** A.

**Trả lời: Phương án A** (theo đề xuất). Chi tiết thêm:
- Đổi trạng thái 4 màn hình (và bản desktop tương ứng) trong `docs/design/README.md` thành **Đã chốt**: Trang chủ, Bàn chơi (cả `ban-choi-doi-thu`), Lật bàn, Kết quả. Các màn hình khác giữ **Bản nháp 1**.
- Ẩn hẳn thành phần M3–M5, không để mờ. Riêng trò chưa làm thì giữ nhãn "Sắp có". Thanh trên của bàn chơi ở `/offline` ghi "Chơi trên một máy" thay cho "Phòng ABCD".
- Ở `/offline`, "bạn" là người đang đến lượt (Q8). Kết quả ghi "Người chơi A thắng" thay cho "Bạn thắng".
- Desktop làm theo bố cục riêng (≥ 1024px). Cột phải của bàn chơi chỉ gồm **Nhật ký ván** và **Phím tắt**; biểu cảm, người xem, tab Luật chơi để tới M5/M3.
- Phím tắt làm ngay: `1–5`, `←` `→`, `Esc`, `L`, `Space`, `Enter`.
- Cập nhật `02-thiet-ke-ux.md` cho khớp thiết kế đã chốt (bố cục desktop riêng, nhật ký ván, phím tắt) trong cùng thay đổi.

## 7. Luật bổ sung từ oanquan.online (ngày 2026-10-20)

Luật được đối chiếu và bổ sung theo [oanquan.online — Hướng dẫn chơi](https://oanquan.online/huong-dan-choi-o-an-quan). Engine M1 đã viết theo luật cũ, nên **cần sửa code** (mốc M1.1):

| Thay đổi | Trước | Sau | Tài liệu |
|---|---|---|---|
| Hết dân trên hàng | Rải quân, thiếu thì vay đối phương (`debt`) | **Bù dân**: trừ 5 điểm; kho < 5 điểm thì **thua ngay**; đổi quan nếu thiếu dân. Bỏ `debt` | Luật mục 6 |
| Quan non | Cấm ăn khi ô quan còn quan và có < 5 dân | Giữ nguyên cơ chế, đổi tên hiển thị thành **Quan Già**, làm rõ các trường hợp | Luật mục 5 |
| Kết thúc ván | Hết quan; không rải được (Q7) | Hết quan; không đủ bù dân; **lặp nước 3 lần**; hết giờ/bỏ cuộc | Luật mục 7–8 |
| Lật bàn | Không có | Tuỳ chọn mới `latBan`: người đi sau được đổi bên một lần sau nước mở đầu | Luật mục 9 |
| Mô hình dữ liệu | `debt`, `Move = { square, dir }` | `controller`, `latBanUsed`, `recentSows`, `buDanCount`; `Move` là union `sow` / `latBan` | Kỹ thuật mục 4–5 |
| Events | `spread` | `buDan`, `latBan` | Kỹ thuật mục 5 |
| Bất biến | Tổng dân = 50, tổng quan = 2 | **Tổng điểm** (bàn + kho) = 70/60 | Kỹ thuật mục 4 |

M2 đang làm cũng bị ảnh hưởng: màn chọn tuỳ chọn (Q9) cần thêm Lật bàn; bảng điểm (Q11) bỏ cột nợ, thêm số lần bù dân và lý do kết thúc.
