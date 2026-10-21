# Cờ tướng — Kế hoạch prototype

## 1. Mục tiêu

> Hai người ở hai máy khác nhau: một người tạo phòng **Cờ tướng**, gửi link, người kia vào, cả hai chơi hết một ván (kể cả chiếu và chiếu bí) rồi bấm "Ván nữa". **Không có lỗi và không cần giải thích gì thêm.**

Đây là game thứ ba, nên kiểm chứng luôn rằng **thêm game chỉ là thêm thư mục + vài dòng đăng ký** (`docs/kien-truc-module.md` mục 3).

## 2. Phạm vi

| Có trong prototype | Chưa làm |
|---|---|
| Engine đủ 7 loại quân, chiếu, lộ mặt tướng, chiếu bí, hết nước đi | Đánh với máy (bot), gợi ý nước |
| Lặp thế cờ / đuổi bắt: theo phương án chốt ở T5, T6 | Xem lại ván, xuất ghi chép ván |
| Phòng chờ chọn ai cầm Đỏ, link mời, QR, người xem (dùng chung) | Đồng hồ cờ chính thức (M4 của nền tảng) |
| Bàn dọc, đi quân bằng chạm, xoay bàn cho người cầm Đen | Âm thanh, chat, xếp hạng |
| Xin thua, hoà (theo T4), Ván nữa, rời phòng | Cờ úp, cờ thế, biến thể khác |

## 3. Các mốc

| Mốc | Nội dung | Tiêu chí xong |
|---|---|---|
| **T0 — Tài liệu & thiết kế** | 4 tài liệu này; bản yêu cầu thiết kế `docs/design/co-tuong/README.md`; mockup từ canvas design; trả lời T1–T9 | Mockup được duyệt; mọi câu hỏi đã chốt |
| **T-E — Engine** | `engine/co-tuong` + test mục 4, viết test trước | Test xanh; fuzz ván ngẫu nhiên: bất biến đúng (giới hạn 300 nước mỗi ván vì chơi ngẫu nhiên hiếm khi kết thúc) |
| **T-P — Đăng ký** | `exports`, `GAME_IDS`, `CoTuongRoom`, `MODULES` | `npm run check` xanh (gồm `architecture.test.ts`); Ô ăn quan và Caro chạy y như cũ |
| **T-U — Giao diện** | Phòng chờ, bàn chơi, kết quả, luật, lịch sử theo mockup | Chơi hết một ván giữa hai tab; e2e hai người chơi cho **cả ba game** |
| **T-H — Hoàn thiện** | Phím tắt, thử trên điện thoại thật | 3–5 người chơi thử, ghi nhận phản hồi |

**Tiến độ:** **T0 xong** (tài liệu, mockup Canva được duyệt, T1–T10 đã chốt). **T-E xong** (engine + 34 test, gồm fuzz 120 ván ngẫu nhiên giới hạn 300 nước, đối chiếu nước hợp lệ với bộ kiểm tra chậm). **T-P xong** (đăng ký ở `exports`, `GAME_IDS`, `CoTuongRoom`, `MODULES`, `registry.ts`; thêm message dùng chung `resign`). **T-U xong** (phòng chờ, bàn chơi, kết quả, luật, lịch sử; đã thử bằng trình duyệt: đi quân, Xin thua, Ván nữa trên desktop và khung 360px). **T-H** còn thử trên điện thoại thật với 3–5 người.

## 4. Test case cho engine

Thế cờ trong test được dựng thẳng. Chú thích tính tay và mục luật.

| # | Tình huống | Kỳ vọng |
|---|---|---|
| E1 | `setup`: 32 quân đúng vị trí luật mục 3, Đỏ đi trước | Đúng; `players[0]` cầm Đỏ |
| E2 | Tướng và Sĩ: đi trong cung, không ra ngoài, Sĩ chỉ chéo | Nước ngoài cung bị từ chối |
| E3 | Tượng: đi chéo 2, bị cản mắt, không qua sông | Đúng luật mục 4 |
| E4 | Mã: bị cản chân (ô thẳng có quân) | Không có nước qua ô bị cản |
| E5 | Xe: đi ngang dọc, dừng trước quân mình, ăn quân địch đầu tiên | Đúng |
| E6 | Pháo: đi không ăn như Xe; ăn phải qua đúng một ngòi (0 và 2 ngòi: không ăn được) | Đúng |
| E7 | Tốt: chưa qua sông chỉ tiến; qua sông thêm đi ngang; không lùi; Tốt ở hàng cuối không đi tiếp | Đúng cho cả Đỏ và Đen |
| E8 | Tướng đối mặt: nước làm lộ mặt tướng bị từ chối; quân đứng giữa hai tướng bị ghim | Đúng luật mục 5 |
| E9 | Đang bị chiếu: chỉ nước hoá giải (đi tướng, ăn quân chiếu, chặn đường) là hợp lệ | Đúng |
| E10 | Chiếu bí: một thế cờ dựng sẵn (ví dụ "hai xe chiếu bí") | Kết thúc `chieu-bi`, đúng người thắng |
| E11 | Hết nước đi mà không bị chiếu | Bên đó thua `het-nuoc` (theo T3) |
| E12 | Đi sai lượt, `from` rỗng / quân đối phương, `to` ngoài `[0,90)`, ván đã kết thúc | `NOT_YOUR_TURN` hoặc `INVALID_MOVE`, state không đổi |
| E13 | Ăn quân: `captured` đúng, tổng quân + `captured` = 32 | Đúng |
| E14 | `forfeit`, hoà theo T4–T6 | Kết quả và điểm đúng |
| E15 | `parseMove`, `parseOptions` từ chối dữ liệu lạ | `null` hoặc giữ `base` |
| E16 | Fuzz: 120 ván ngẫu nhiên seed cố định, giới hạn 300 nước; kiểm bất biến mục 4 kỹ thuật và đối chiếu nước hợp lệ với bộ kiểm tra chậm | Không vi phạm bất biến; có ván kết thúc |

## 5. Phối hợp

Nhánh `feature/co-tuong`, tách từ `main`. Các file dùng chung chỉ chạm ở bốn điểm đăng ký. Đổi hợp đồng dùng chung (nếu cần) phải theo CLAUDE.md quy tắc 8.

## 6. Câu hỏi mở

Đánh số `T1…`. **Phải có câu trả lời mới làm tiếp phần liên quan.** Câu T1–T6 cần trước khi viết engine; T7–T9 cần trước khi làm giao diện.

| # | Câu hỏi | Đề xuất hiện tại | Trả lời | Trạng thái |
|---|---|---|---|---|
| T1 | Ai cầm Đỏ (đi trước) ở ván đầu và các ván sau? | Ván đầu **ngẫu nhiên** (RNG của server); "Ván nữa": **đổi bên** (người cầm Đen ván trước cầm Đỏ) | **Theo đề xuất**, điều chỉnh: ván đầu ngẫu nhiên; ván sau **người thua cầm Đỏ** (hoà thì đổi bên) theo quy tắc chung của lớp phòng (`nextFirst`), nên không có tuỳ chọn riêng và bỏ `firstRed` khỏi `Options` | Đã chốt |
| T2 | Có luật hạn chế nào ngoài những gì mục 5 luật chơi? (ví dụ cấm Tướng "bay" qua cung là đã nằm trong luật) | **Không** thêm | **Theo đề xuất** | Đã chốt |
| T3 | Hết nước đi mà tướng không bị chiếu ("bí"): thua (luật cờ tướng) hay hoà (như cờ vua)? | **Thua** (luật cờ tướng chuẩn) | **Theo đề xuất** | Đã chốt |
| T4 | Cách kết thúc hoà và xin thua: có nút **Xin thua**, **Cầu hoà** (đối phương đồng ý/từ chối) không? | Có **Xin thua** (xác nhận) và **Cầu hoà** (một lời mời mỗi lượt, đối phương trả lời). Cầu hoà cần thêm message vào giao thức (sửa hợp đồng dùng chung), nên **để sau**: prototype chỉ có Xin thua; hoà chỉ qua luật tự động | **Theo đề xuất**: có Xin thua (xác nhận), chưa có Cầu hoà. Xin thua cũng cần một message dùng chung nên đã thêm `resign` (protocol, `Room.resign`, `GameActions.resign`); game nào cũng dùng được | Đã chốt |
| T5 | **Lặp thế cờ** (cùng thế lặp lại): xử lý thế nào? | Prototype: thế cờ lặp **3 lần** (cùng thế, cùng bên đi) thì **hoà** tự động. Chưa phân xử chiếu/đuổi bắt liên tục | **Theo đề xuất** | Đã chốt |
| T6 | **Chiếu liên tục / đuổi bắt liên tục** (luật chính thức xử bên gây ra thua hoặc bắt đổi nước)? | **Chưa làm** ở prototype (quá phức tạp và hay tranh cãi); ghi vào mục "Chưa làm". Bên chiếu liên tục vẫn bị chặn bởi T5 (lặp 3 lần = hoà) | **Theo đề xuất** | Đã chốt |
| T7 | Đi quân: chạm quân rồi chạm ô đích là **đi ngay**, hay có nút **Xác nhận** (tránh đi nhầm trên điện thoại)? | **Đi ngay**. Ô giao điểm đủ lớn (~36px). Thêm "Hoàn nước" thì làm sau | **Theo đề xuất** | Đã chốt |
| T8 | Cách ghi nhật ký nước đi? | Dạng dễ đọc theo toạ độ: "Xe (1,9) → (1,6)". Lối ghi chính thức ("Pháo 2 bình 5") là phức tạp, **để sau** | **Theo đề xuất**: ghi "Xe (1,1) → (1,4) ăn Tốt"; cột và hàng đếm từ 1, hàng 1 là hàng sau của Đỏ | Đã chốt |
| T9 | Chữ trên quân: **chữ Hán** (帥仕相車炮馬兵 / 將士象車砲馬卒) hay **chữ Việt** (Tướng, Sĩ, Tượng, Xe, Pháo, Mã, Tốt)? | **Chữ Việt**, có tuỳ chọn chữ Hán là việc sau (người chơi Việt đọc quen hơn, dễ phân biệt Tướng/Tượng) | **Đổi theo yêu cầu của bạn (sau khi làm xong): dùng chữ Hán**, như mockup Canva. Chữ Việt vẫn dùng ở nhật ký, chú thích và luật | Đã chốt |
| T10 | Mockup do ai làm? | Theo yêu cầu của bạn: **nhờ canvas design**. Bản yêu cầu ở `docs/design/co-tuong/README.md`; bạn đưa cho canvas design và đặt mockup vào thư mục đó | Làm bằng **Canva** (design `DAHYoDDHajo`), bạn đã duyệt. Ảnh tham chiếu `docs/design/co-tuong/mockup-1..4.jpg` | Đã chốt |
