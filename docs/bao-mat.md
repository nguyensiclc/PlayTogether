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

| 6 | Thấp | Dò mã phòng và mở nhiều kết nối không bị giới hạn theo IP | `ip-guard.ts`: tối đa 20 kết nối đồng thời và 120 lượt mở WebSocket/hỏi xem trước phòng mỗi phút cho mỗi IP (HTTP 429). Sau proxy tin `X-Forwarded-For` khi có biến `RENDER` hoặc `TRUST_PROXY=1` |
| 7 | Thấp | Không kiểm tra Origin khi mở WebSocket (trang web lạ dùng trình duyệt của người chơi để mở kết nối) | Origin phải cùng tên miền với `Host`, là máy cục bộ/mạng LAN, hoặc nằm trong biến `ALLOWED_ORIGINS` (cách nhau dấu phẩy). Không có Origin (công cụ, test) thì cho qua |

| 8 | Thấp | Mã phòng 4 ký tự (khoảng 900 nghìn tổ hợp) dò được, lộ tên người chơi | Mã 6 ký tự (khoảng 887 triệu tổ hợp); cộng giới hạn 120 lần/phút/IP thì dò gần như không khả thi |

Test: `ip-guard.test.ts`, `server.test.ts` (URL hỏng, header, gói lớn), `room-manager.test.ts` (trần số phòng).

## Đã kiểm tra, ổn

- `npm audit`: 0 lỗ hổng.
- Chống thoát thư mục khi phục vụ file tĩnh (`/../`): có chặn từ trước.
- Dữ liệu client gửi lên đều qua `parseClientMessage` + `parseMove`/`parseOptions` của engine.
- Tên người chơi: giới hạn 20 ký tự, client luôn `escapeHtml` khi chèn vào `innerHTML`.
- Server không tin client: luật, lượt, bài trên tay (`viewFor`) đều do server quyết định; bài úp của đối thủ không gửi xuống.
- Giới hạn tốc độ 20 message/giây mỗi kết nối; mỗi người chỉ làm chủ một phòng.

## Rủi ro còn lại (chấp nhận ở prototype)

- `clientId` là bí mật duy nhất để giữ ghế, lưu trong `localStorage`; ai lấy được nó (XSS, máy dùng chung) vào lại được ghế. Chưa có đăng nhập.
- Kẻ có nhiều IP vẫn vượt được giới hạn theo IP; cần dịch vụ chặn ở tầng ngoài nếu bị tấn công thật.
- Ván trong RAM, restart là mất.
