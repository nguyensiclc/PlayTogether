# Tiến lên miền Nam — Luật chơi

Luật dưới đây là **đề xuất hiện tại**. Chỗ nào còn nhiều biến thể ghi kèm mã câu hỏi `TL1…` ở `04-ke-hoach-prototype.md` mục 6. Engine phải khớp tài liệu này sau khi các câu hỏi được trả lời.

## 1. Bộ bài và số người

- Bộ bài tây 52 lá, không có Joker.
- **2 đến 4 người** (TL1). Mỗi người được chia **13 lá**; với 2 hoặc 3 người, phần bài còn lại **không dùng** và không ai được xem.
- Người chơi ngồi theo ghế `0…n-1`; lượt đi theo chiều tăng của ghế rồi vòng lại.

## 2. Thứ tự lá bài

- **Số**: 3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < **2** (quân 2 gọi là **heo**, lớn nhất).
- **Chất** (TL2): Bích ♠ < Chuồn ♣ < Rô ♦ < Cơ ♥.
- So hai lá: so số trước, bằng số thì so chất.
- Mỗi lá có một giá trị duy nhất: `giaTri = so * 4 + chat` (3♠ nhỏ nhất, 2♥ lớn nhất).

## 3. Các bộ bài hợp lệ

| Bộ | Mô tả | So sánh |
|---|---|---|
| Lẻ | 1 lá | Lá cao hơn |
| Đôi | 2 lá cùng số | Lá cao nhất của đôi (so số rồi chất) |
| Ba | 3 lá cùng số | Số cao hơn |
| Tứ quý | 4 lá cùng số | Số cao hơn |
| Sảnh | từ 3 lá liên tiếp trở lên, khác chất tuỳ ý, **không chứa 2** | Cùng số lá; so lá cao nhất (số rồi chất). Q-K-A hợp lệ, K-A-2 không hợp lệ |
| Đôi thông | từ 3 đôi liên tiếp trở lên, **không chứa đôi 2** | Cùng số đôi; so lá cao nhất |

Một nước đi là **một bộ hợp lệ** hoặc **bỏ lượt**.

## 4. Diễn biến một ván

1. **Chia bài** ngẫu nhiên (RNG truyền vào engine).
2. **Người đi trước**: ván đầu là người giữ **3♠** (với 2 hoặc 3 người mà 3♠ nằm trong phần bài không chia thì là người giữ **lá nhỏ nhất đã chia**); ván sau là người về nhất ván trước (TL6). Người đi trước đánh một bộ hợp lệ bất kỳ; ở ván đầu, bộ đó phải chứa lá nhỏ nhất đó (TL6).
3. Người kế tiếp phải đánh **cùng loại bộ, cùng số lá, lớn hơn** bộ vừa rồi, hoặc **chặt** (mục 5), hoặc **bỏ lượt**.
4. **Bỏ lượt** là mất quyền đánh cho tới hết vòng này.
5. Khi mọi người còn bài (trừ người đánh gần nhất) đã bỏ lượt, **vòng kết thúc** và người đánh bộ cuối cùng được đi tự do: đánh một bộ bất kỳ, mở vòng mới. Nếu người đó đã hết bài thì quyền đi tự do thuộc người kế tiếp còn bài.
6. Ai **hết bài trước** về nhất; ván vẫn tiếp tục cho những người còn lại để xếp hạng nhì, ba (TL5). Ván kết thúc khi chỉ còn một người còn bài (người đó là bét).

## 5. Chặt (TL3)

Chỉ dùng để chặt quân **2 (heo)** hoặc bộ chặt nhỏ hơn:

| Bộ chặt | Chặt được |
|---|---|
| 3 đôi thông | 1 heo lẻ |
| Tứ quý | 1 heo lẻ, đôi heo, 3 đôi thông |
| 4 đôi thông | 1 heo lẻ, đôi heo, 3 đôi thông, tứ quý |

- Một bộ chặt chỉ chặt được bộ **vừa được đánh ra ngay trước đó**.
- **Chặt chồng** (chặt lại bộ vừa chặt, như 4 đôi thông chặt 3 đôi thông hoặc tứ quý) cho phép theo bảng; không có luật chặt nào khác (TL3).
- Người chặt đánh bộ chặt như một nước đi bình thường; người bị chặt không có thêm hình phạt trong bản đầu (TL5).

## 6. Tới trắng (thắng ngay khi chia bài, TL4)

Ngay sau khi chia, người nào có một trong các tổ hợp sau thắng ngay, ván kết thúc và người đó nhất, những người còn lại xếp hạng theo thứ tự ghế sau người thắng (TL4):

- **Tứ quý heo** (4 lá 2).
- **Sảnh rồng**: đủ 12 lá từ 3 đến A.
- **Sáu đôi** (6 đôi bất kỳ trong 13 lá).

Nếu nhiều người cùng đủ điều kiện, người có tổ hợp ưu tiên cao hơn theo thứ tự trên thắng; cùng loại thì ghế nhỏ hơn thắng.

## 7. Kết quả và điểm (TL5)

- Hạng nhất, nhì, ba, bét theo thứ tự hết bài.
- Điểm theo hạng cho bảng xếp hạng trong phòng: nhất 3, nhì 2, ba 1, bét 0 (với 2 người: nhất 1, bét 0; với 3 người: 2, 1, 0).
- Không có tiền thật, không xu đổi thưởng, không "thối heo" bằng tiền. Có thể có điểm phạt ảo "thối heo" ở giai đoạn sau.

## 8. Người chơi rời ván (TL7)

- Người bấm **Bỏ cuộc** hoặc rời phòng giữa ván: bài của họ bị **loại khỏi ván**, họ xếp hạng sau cùng trong những người còn lại, và ván tiếp tục không có họ (lượt đi nhảy qua ghế đó).
- Nếu chỉ còn một người còn bài thì người đó thắng.
- Mất kết nối tạm thời: giữ ghế như các game khác; khi có đồng hồ lượt (M4 của nền tảng) thì hết giờ tự bỏ lượt.

## 9. Ví dụ

- Đối thủ đánh **đôi 7** (7♦ 7♥). Người kế tiếp có thể đánh đôi 8, đôi J… (đôi nào có lá cao nhất lớn hơn 7♥), hoặc bỏ lượt. Đánh đôi 7 (7♠ 7♣) thì không được vì lá cao nhất 7♣ nhỏ hơn 7♥.
- Đối thủ đánh **heo lẻ** (2♠). Người kế tiếp chặt bằng 3 đôi thông (như 4-4-5-5-6-6), tứ quý hoặc 4 đôi thông, hoặc đánh heo cao hơn (2♣, 2♦, 2♥), hoặc bỏ lượt.
- Sảnh 5-6-7 (cao nhất 7♦) chỉ bị đánh bởi sảnh **3 lá** có lá cao nhất lớn hơn 7♦; sảnh 4 lá hay đôi thì không.
