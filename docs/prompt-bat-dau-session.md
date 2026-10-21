# Prompt bắt đầu session mới

Copy prompt bên dưới dán vào đầu mỗi session mới (hoặc cho Claude đọc file này). Claude đã tự đọc `CLAUDE.md` mỗi lần mở; prompt này bắt đầu bằng việc **nắm tình hình hiện tại** và nhắc những quy tắc hay bị quên.

## 1. Prompt chuẩn (dùng cho hầu hết mọi việc)

```
Đây là session mới của dự án PlayTogether (website chơi game nhiều người: tạo phòng → chọn game → gửi link → chơi, không cần đăng ký).

Trước khi làm gì, hãy nắm tình hình:
1. Đọc CLAUDE.md, docs/kien-truc-module.md (cái gì dùng chung, cái gì riêng từng game) và docs/quy-uoc-code.md.
2. Chạy `git status`, `git log --oneline -15`, `git branch -a` để biết nhánh hiện tại, việc đang làm dở, và có thay đổi chưa commit của người/công cụ khác không (đừng đụng vào).
3. Đọc phần "Tiến độ" và bảng "Câu hỏi mở" của game liên quan (docs/<game>/04-ke-hoach-prototype.md) để biết mốc hiện tại và câu hỏi chưa trả lời.
4. Chạy `npm run check` để biết nền có xanh không trước khi sửa.

Rồi tóm tắt cho tôi trong vài dòng: mốc hiện tại, trạng thái nhánh, có gì dang dở, và đề xuất bước tiếp theo. Chưa viết code khi tôi chưa xác nhận.

Quy tắc luôn áp dụng:
- Tài liệu là nguồn sự thật. Code khác tài liệu thì cập nhật tài liệu trong cùng thay đổi. Chỗ tài liệu mơ hồ thì ghi câu hỏi vào bảng "Câu hỏi mở" và hỏi tôi, không tự đoán.
- Tách module: nền tảng không biết từng game, game không biết game khác, không sao chép code giữa các game (xem mục "Quy tắc tách module" trong CLAUDE.md).
- Server quyết định mọi thứ; engine là hàm thuần; dữ liệu từ client không tin.
- Làm cho điện thoại trước (360px, vùng chạm ≥ 44px). Giao diện tiếng Việt.
- Engine viết test trước. Sửa xong chạy `npm run check` (phải xanh) rồi mới commit; commit nhỏ, đúng chủ đề.
- Làm việc trên nhánh riêng nếu có người/công cụ khác đang sửa cùng thư mục; không commit hay push khi tôi chưa yêu cầu.
- Kiểm tra thật bằng trình duyệt (Playwright, hai người chơi) cho mọi thay đổi giao diện hoặc luồng phòng, cho mọi game chứ không chỉ game đang làm.

Việc hôm nay: <ghi việc cần làm ở đây>
```

## 2. Biến thể

**Thêm game mới**

```
Thêm game mới: <tên game>. Làm theo docs/kien-truc-module.md mục 3 (danh sách 7 bước). Bắt đầu bằng docs/<game>/ (luật, UX, kỹ thuật, kế hoạch, câu hỏi mở) và dừng để tôi trả lời câu hỏi mở trước khi viết engine.
```

**Sửa lỗi**

```
Lỗi: <mô tả, các bước tái hiện, game nào, điện thoại hay máy tính>. Hãy tái hiện bằng test hoặc Playwright trước, tìm nguyên nhân gốc, sửa, thêm test chặn lỗi quay lại, rồi chạy `npm run check`.
```

**Tiếp tục việc dang dở**

```
Tiếp tục việc dang dở ở nhánh <tên nhánh>. Đọc `git log` và `git diff main...HEAD --stat` để biết đã làm gì, đối chiếu với kế hoạch, rồi nói tôi còn lại gì trước khi làm tiếp.
```

**Rà soát trước khi gộp**

```
Rà soát nhánh <tên nhánh> trước khi gộp vào main: xung đột với main, `npm run check`, e2e hai người chơi cho mọi game, tài liệu đã cập nhật chưa, có vi phạm quy tắc tách module không. Báo kết quả, chưa gộp khi tôi chưa đồng ý.
```

**Hoàn toàn tự quyết (khi bạn muốn Claude tự làm hết)**

```
Việc: <...>. Hãy tự quyết định các chi tiết còn thiếu theo đề xuất hợp lý, ghi các quyết định đó vào tài liệu (cột "Trả lời" của bảng câu hỏi mở, đánh dấu "tự quyết"), làm xong, kiểm tra, rồi báo tôi những chỗ bạn đã tự quyết để tôi duyệt lại.
```

## 3. Thông tin môi trường hay cần

- Cổng: `npm run dev` (server 3000 + Vite 5173), `npm start` chạy bản build (PORT, mặc định 3000). Dùng cổng khác (vd 3200) khi chạy thêm bản thứ hai.
- Thử trên điện thoại cùng Wi-Fi: mở `http://<IP máy>:<cổng>`; link mời tự dùng IP LAN. Windows Firewall cần cho Node.js nhận kết nối.
- Playwright: dùng `playwright-core` với `channel: "msedge"`; viết script trong thư mục tạm, không đặt vào repo.
- Windows + `autocrlf`: git hay báo nhiễu CRLF/LF. Biome ép LF; chạy `npx biome check --write .` rồi xem thay đổi thật bằng `git diff --ignore-cr-at-eol`.
- Nhiều người/công cụ cùng sửa repo: dùng `git worktree` cho nhánh riêng, không sửa file đang có thay đổi chưa commit của người khác.
