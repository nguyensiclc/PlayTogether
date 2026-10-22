# Thiết kế màn hình

Thư mục này chứa bản thiết kế (mockup) các màn hình **trước khi** viết code UI. Luồng, hành vi và tương tác vẫn lấy theo tài liệu UX của từng game (vd `docs/o-an-quan/02-thiet-ke-ux.md`). Ở đây chỉ chốt **giao diện trông thế nào**.

## Cấu trúc

```
docs/design/
  README.md        ← file này: quy ước + danh sách màn hình
  canvas.html      ← xem mọi màn hình cạnh nhau trong khung điện thoại
  shared/          ← tokens.css (màu, component), desktop.css (bố cục ≥ 1024px), board.js (vẽ bàn Ô ăn quan cho mockup)
  nen-tang/        ← màn hình dùng chung mọi game: trang chủ, nickname, phòng chờ, mất kết nối
  o-an-quan/       ← màn hình riêng của Ô ăn quan: bàn chơi, kết quả, lật bàn, hướng dẫn luật
  caro/            ← màn hình riêng của Cờ caro; README trong thư mục là bản yêu cầu để nhờ canvas design
  co-tuong/        ← màn hình riêng của Cờ tướng; README trong thư mục là bản yêu cầu để nhờ canvas design
  <game-khac>/     ← thêm khi làm Tiến lên…
```

## Quy ước

- Mỗi màn hình một file, đặt tên tiếng Việt không dấu theo kebab-case: `phong-cho.md`, `ban-choi.png`.
- Định dạng: `.md` (wireframe ASCII + ghi chú), ảnh `.png` / `.svg`, hoặc `.html` tĩnh để mở thử trên điện thoại.
- Thiết kế cho điện thoại trước, khung **360 × 740**. Vùng chạm tối thiểu **44px**.
- Desktop (**≥ 1024px**) có bố cục riêng, khung **1280 × 800**, file đặt tên `<man-hinh>-desktop.html`. Màn hình nào chưa có bản desktop thì dùng bố cục điện thoại, căn giữa, rộng tối đa 420px.
- Từ 420px đến 1023px (máy tính bảng, cửa sổ hẹp): dùng bố cục điện thoại, căn giữa.
- Toàn bộ chữ trên giao diện viết bằng tiếng Việt.
- Mỗi file ghi rõ: màn hình nào, thuộc mốc nào (M2–M5), các trạng thái (rỗng, đang tải, lỗi, đến lượt / chờ lượt…).
- Thiết kế đã chốt thì cập nhật cột **Trạng thái** bên dưới. Nếu thiết kế làm thay đổi luồng hay hành vi thì sửa tài liệu UX trong cùng thay đổi.

## Xem thiết kế

Mở `canvas.html` trong trình duyệt. Mỗi khung là một file HTML tĩnh, có thể mở riêng, kể cả trên điện thoại. Font: **Be Vietnam Pro** (Google Fonts), máy không có mạng thì dùng font hệ thống.

`shared/board.js` chỉ dùng để vẽ mockup, **không** phải code sản phẩm. Code UI chỉ cần lấy lại giao diện (CSS, bố cục), còn hành vi thì làm theo tài liệu UX.

## Hệ màu đang dùng

Lấy từ `packages/client/style.css` (bản M2), cộng thêm vài token mới đánh dấu **mới** bên dưới. Toàn bộ token nằm trong `shared/tokens.css`. Khi làm UI, cần thêm các token mới này vào `style.css`.

| Token | Màu | Dùng cho |
|---|---|---|
| `--bg` | `#f4ead8` | Nền trang |
| `--ink` | `#2b2118` | Chữ chính, nút chọn |
| `--muted` | `#6f5f4f` | Chữ phụ |
| `--board` / `--board-edge` | `#8a5a2e` / `#6b421f` | Bàn gỗ |
| `--cell` / `--cell-shade` | `#b07a45` / `#8e5b2c` | Ô trên bàn |
| `--stone` | `#eee6d4` | Viên dân |
| `--quan` | `#33251b` | Viên quan |
| `--accent` | `#f2b33d` | Ô đang chọn, tay cầm, bốc rải tiếp |
| `--capture` | `#3fa36b` | Ăn quân |
| `--primary` | `#b5462f` | Nút chính, bù dân |
| `--surface` | `#fffaf0` | Thẻ, hộp hỏi, bảng kết quả |
| `--surface-2` (mới) | `#fbf2e2` | Nền phụ trong thẻ, segmented control |
| `--line` (mới) | `#e2d4bb` | Đường kẻ, nút bị khoá |
| `--danger` (mới) | `#c2412d` | Mất kết nối, sắp hết giờ |
| `--cat-co` / `--cat-bai` (mới) | `#2f6b5a` / `#3a4f8f` | Màu nhóm Cờ / Bài trên trang chủ (nhóm Dân gian dùng `--primary`) |
| `--cat-dangian-soft` / `--cat-co-soft` / `--cat-bai-soft` | `#f3d9cf` / `#d3e6dd` / `#d7deef` | Nền biểu tượng trò chơi theo nhóm |
| `--on-dark` | `#fff` | Chữ trên nền tối (nút chính, viên trạng thái) |
| `--count-ink` | `#fff8e8` | Con số trong ô bàn |
| `--board-top` | `#96653b` | Đầu gradient của bàn |
| `--art-from` / `--art-to` / `--art-to-desk` | `#a76c39` / `#7a4b23` / `#74461f` | Gradient hình bàn trên thẻ nổi bật (điện thoại / desktop) |
| `--quan-shine` | `#6b5644` | Vệt sáng trên viên quan |
| `--capture-cell` / `--capture-shade` | `#4c9a6b` / `#2f6b4a` | Ô vừa bị ăn |
| `--live-bg` / `--live-ink` | `#e3f3e9` / `#23704a` | Nhãn "Chơi được ngay" |
| `--gold-soft` | `#fbe9c4` | Nền cúp ở màn kết quả |
| `--accent-soft` | `#fff6df` | Ô "Lật bàn" trong hộp hỏi |
| `--host-ink` | `#7a5410` | Chữ nhãn "Chủ phòng" (nền `--gold-soft`) |
| `--share` | `#0068ff` | Nút "Chia sẻ" ở phòng chờ |
| `--av2` | `#2f6b5a` | Avatar người xem |

Bóng đổ và lớp phủ trong suốt (`rgba`) được viết trực tiếp, không cần token (quy ước code mục 6).

## Danh sách màn hình

| Màn hình | File | Mốc | Tài liệu UX | Trạng thái |
|---|---|---|---|---|
| Trang chủ + danh sách trò chơi | `nen-tang/trang-chu.html` | M3 | Ô ăn quan UX mục 2.1 | **Đã chốt** (Q20), đã làm |
| Vào bằng link mời (nhập nickname) | `nen-tang/nhap-nickname.html` | M3 | mục 2.2 | **Đã chốt** (Q22b), đã làm |
| Phòng chờ (chủ phòng, chờ người thứ 2) | `nen-tang/phong-cho.html` | M3 | mục 2.3 | **Đã chốt** (Q22b), đã làm |
| Mất kết nối / đối thủ rời phòng | `nen-tang/mat-ket-noi.html` | M4 | mục 5 | Bản nháp 1 |
| Bàn chơi: lượt của mình, đang chọn chiều | `o-an-quan/ban-choi.html` | M2 | mục 2.4, 3 | **Đã chốt** (Q20), đã làm |
| Bàn chơi: đối thủ đi, hiệu ứng ăn quân, emoji | `o-an-quan/ban-choi-doi-thu.html` | M2/M5 | mục 4, 6 | **Đã chốt** (Q20), đã làm |
| Hộp hỏi Lật bàn | `o-an-quan/lat-ban.html` | M2 | mục 3 | **Đã chốt** (Q20), đã làm |
| Kết quả ván | `o-an-quan/ket-qua.html` | M2/M5 | mục 2.5 | **Đã chốt** (Q20), đã làm |
| Hướng dẫn luật (thẻ 2/4) | `o-an-quan/huong-dan.html` | M5 | mục 6 | Bản nháp 1, mới có thẻ 2 |
| **Desktop**: Trang chủ | `nen-tang/trang-chu-desktop.html` | M3 | mục 2.1 | **Đã chốt** (Q20), đã làm |
| **Desktop**: Phòng chờ (đã đủ 2 người) | `nen-tang/phong-cho-desktop.html` | M3 | mục 2.3 | **Đã chốt** (Q22b), đã làm |
| **Desktop**: Bàn chơi + cột nhật ký | `o-an-quan/ban-choi-desktop.html` | M2/M3 | mục 2.4, 3, 4 | **Đã chốt** (Q20), đã làm |
| **Desktop**: Hộp hỏi Lật bàn (modal) | `o-an-quan/lat-ban-desktop.html` | M2 | mục 3 | **Đã chốt** (Q20), đã làm |
| **Desktop**: Kết quả (modal) | `o-an-quan/ket-qua-desktop.html` | M2/M5 | mục 2.5 | **Đã chốt** (Q20), đã làm |
| Cờ caro: phòng chờ (tuỳ chọn), bàn chơi (chưa chọn, đang chọn ô, đối thủ vừa đi, chuỗi thắng), kết quả, cả điện thoại lẫn desktop | `caro/` | C3 | `docs/caro/02-thiet-ke-ux.md` | **Đã chốt** (Claude tự thiết kế, bạn duyệt). Yêu cầu gốc ở `caro/README.md` |
| Cờ tướng: phòng chờ (tuỳ chọn), bàn chơi (chọn quân, đối thủ đi, bị chiếu, người cầm Đen), kết quả, xin thua, luật chơi, cả điện thoại lẫn desktop | `co-tuong/` | T0 | `docs/co-tuong/02-thiet-ke-ux.md` | **Đã chốt** (Canva, bạn duyệt): ảnh `co-tuong/mockup-1..4.jpg`; đã làm điện thoại + desktop. Khác mockup: không có điểm Elo, ảnh đại diện và nút "Xin đi lại" (ngoài phạm vi). Yêu cầu gốc ở `co-tuong/README.md` |
| Desktop: nhập nickname, mất kết nối, hướng dẫn | — | — | — | Dùng bố cục điện thoại căn giữa (nickname), modal (hướng dẫn = tab "Luật chơi" ở cột phải bàn chơi) |
| Màn hình bắt đầu `/offline` | — | M2 | mục 2.6 | Chỉ để phát triển, không cần thiết kế |

Trạng thái: **Bản nháp 1** → chờ duyệt. Khi duyệt xong thì đổi thành **Đã chốt**, từ đó code UI phải theo đúng thiết kế.

### Thiết kế v2 (hướng "Quán trà / bàn chơi dân gian") — **Đã chốt**, đã áp vào code

Ba mockup v2 thay cho bản cũ của cùng màn hình: `nen-tang/trang-chu-v2.html`, `nen-tang/phong-cho-v2.html`, `o-an-quan/ban-choi-v2.html` (chung `shared/v2.css`). Mỗi file tự co theo điện thoại và desktop. Các bản cũ (`trang-chu.html`, `phong-cho.html`, `ban-choi.html`…) giữ làm lịch sử. Khác biệt có chủ ý giữa mockup v2 và code:

- **Trang chủ:** mỗi game một chất liệu riêng ở thẻ (`cardBg` + `cardArt` trong `GameInfo`); game "Sắp có" gom thành dải ở cuối. Mockup có dải "Có người đang chờ" nhưng **chưa làm** vì server chưa có API liệt kê phòng mở. Bong bóng "Lan vừa vào phòng", chip link trên hình nổi bật chỉ là minh hoạ.
- **Phòng chờ:** ô hình đầu phòng lấy chất liệu của game thay cho biển gỗ cố định (mỗi game một màu nền, chữ phải đọc được trên mọi nền). Không có nút "Thêm máy" cho game chưa có bot.
- **Bàn chơi:** nền gỗ tối chỉ áp cho Ô ăn quan (class `oaq-page`, CSS trong `o-an-quan.css`). Ba game cờ giữ nền giấy cho tới khi có mockup riêng. Chưa có hàng biểu cảm emoji (M5).

### Bản code tạm khác mockup (đến M4–M5)

Những chỗ dưới đây cố ý khác mockup và sẽ làm đúng mockup khi tới mốc tương ứng (Q20, Q22):

- **Trang chủ:** chưa có nút "Luật chơi" (M5).
- **Phòng chờ:** chưa có "Thời gian mỗi lượt" (M4), nút `?` (M5). Nút "Ngồi đây" ở ghế trống chỉ hiện cho người đang xem.
- **Bàn chơi:** chưa có đồng hồ lượt (M4), âm thanh, nút `?`, biểu cảm, người xem và tab Luật chơi ở cột phải desktop (M5). Thanh trên ghi "Phòng ABCD · Lượt N"; nút "Về phòng chờ" trên desktop thay bằng "Về trang chủ" (vẫn giữ ghế).
- **Lật bàn:** chưa có dòng "Đồng hồ vẫn chạy" (M4).
- **Kết quả:** chưa có "Chia sẻ kết quả" (M5); thay bằng nút **Rời phòng**.

## Điểm mới so với tài liệu UX

Các điểm dưới đây thiết kế thêm vào. Khi chốt thiết kế thì cần cập nhật `02-thiet-ke-ux.md` cho khớp:

- **Trang chủ** có thêm mục "Phòng gần đây" (vào lại phòng cũ) và lưới trò chơi lọc theo nhóm. Game chưa làm có nhãn "Sắp có".
- **Bàn chơi** ghi nhãn "Hàng của …" trên và dưới bàn, hàng đối thủ tối hơn hàng mình. Mỗi thẻ người chơi hiện kho điểm (dân · quan).
- **Đối thủ đi** có dòng mô tả nước vừa đi (vd: "ăn ô 4 của bạn (5 dân)").
- **Kết quả** hiện ai đã bấm Ván nữa và ai sẽ đi trước ván sau.
- **Desktop không còn là "cùng bố cục, chỉ phóng to"** như UX mục 2.4 đang ghi. Trên desktop:
  - Trang chủ có hero chia đôi; lưới trò chơi 4 cột.
  - Phòng chờ chia hai cột, hiện sẵn mã QR (desktop không có Web Share).
  - Bàn chơi có cột phải gồm nhật ký ván, biểu cảm, người xem và phím tắt. Bàn to hơn: mỗi ô cao 124px.
  - Hộp hỏi (Lật bàn, Kết quả) là modal giữa màn hình thay cho bottom sheet.
  - Phím tắt mới: `Esc` chọn lại / giữ bên, `L` lật bàn, `Space` tua nhanh hiệu ứng, `Enter` ván nữa.
- **Nhật ký ván** (chỉ có trên desktop) cần dữ liệu từ `events` của mỗi nước đi. Không cần sửa engine.
