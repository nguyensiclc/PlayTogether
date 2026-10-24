# Rà soát bảo mật

Rà soát lần 1 (tay + `npm audit`), phạm vi: server (`packages/server`), giao thức, client (chống XSS), phụ thuộc.

## Đã sửa

| # | Mức | Lỗi | Cách sửa |
|---|-----|-----|----------|
| 1 | Cao | Một request `GET /%E0%A4%A` (percent-encoding hỏng) làm `decodeURIComponent` ném lỗi trong hàm async không có `catch` → process Node chết (DoS không cần đăng nhập) | `safeDecode` trả 400; `index.ts` bắt mọi lỗi của `handleHttp` |
| 2 | Trung bình | `ws` nhận gói tới 100 MiB rồi mới tới bước kiểm tra `MAX_MESSAGE_BYTES` | `maxPayload` ở `WebSocketServer`; thêm `ws.on("error")` để gói quá lớn chỉ ngắt kết nối đó |
| 3 | Trung bình | Không giới hạn tổng số phòng: có thể tạo phòng hàng loạt bằng nhiều `clientId` giả để đầy RAM | `MAX_ROOMS = 1000`, vượt thì lỗi `SERVER_BUSY` |
| 4 | Thấp | Thiếu header bảo mật | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Content-Security-Policy` (chỉ nguồn cùng gốc + Google Fonts) |
| 5 | Thấp | Đường dẫn có byte NUL | Bị từ chối 400 |

Test: `server.test.ts` (URL hỏng, header, gói lớn), `room-manager.test.ts` (trần số phòng).

## Đã kiểm tra, ổn

- `npm audit`: 0 lỗ hổng.
- Chống thoát thư mục khi phục vụ file tĩnh (`/../`): có chặn từ trước.
- Dữ liệu client gửi lên đều qua `parseClientMessage` + `parseMove`/`parseOptions` của engine.
- Tên người chơi: giới hạn 20 ký tự, client luôn `escapeHtml` khi chèn vào `innerHTML`.
- Server không tin client: luật, lượt, bài trên tay (`viewFor`) đều do server quyết định; bài úp của đối thủ không gửi xuống.
- Giới hạn tốc độ 20 message/giây mỗi kết nối; mỗi người chỉ làm chủ một phòng.

## Rủi ro còn lại (chấp nhận ở prototype)

- `clientId` là bí mật duy nhất để giữ ghế, lưu trong `localStorage`; ai lấy được nó (XSS, máy dùng chung) vào lại được ghế. Chưa có đăng nhập.
- Mã phòng 4 ký tự (khoảng 900 nghìn tổ hợp) dò được qua `/api/rooms/:code`, lộ tên chủ phòng và người chơi. Muốn chặt hơn thì tăng độ dài mã hoặc giới hạn tốc độ theo IP.
- Giới hạn tốc độ tính theo kết nối, chưa theo IP: mở nhiều kết nối vẫn vượt được. Sau proxy (Render) cần đọc `X-Forwarded-For`.
- Không kiểm tra `Origin` khi nâng cấp WebSocket. Do không dùng cookie nên rủi ro thấp, nhưng nên thêm danh sách origin cho bản chạy thật.
- Ván trong RAM, restart là mất.
