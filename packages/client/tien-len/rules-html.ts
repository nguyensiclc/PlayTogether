// Nội dung "Luật chơi" của Tiến lên miền Nam (khớp docs/tien-len/01-luat-choi.md).

export function tienLenRulesHtml(): string {
  return `
<section class="rules-sec">
  <h3>1. Bộ bài và số người</h3>
  <p>Dùng bộ bài tây <strong>52 lá</strong>, chơi <strong>2 đến 4 người</strong>. Mỗi người được chia <strong>13 lá</strong>; với 2 hoặc 3 người, phần bài còn lại không dùng. Ai <strong>hết bài trước</strong> thì về nhất.</p>
  <ul>
    <li><strong>Thứ tự số</strong>: 3 &lt; 4 &lt; … &lt; 10 &lt; J &lt; Q &lt; K &lt; A &lt; <strong>2</strong> (quân 2 gọi là <strong>heo</strong>, lớn nhất).</li>
    <li><strong>Thứ tự chất</strong>: Bích ♠ &lt; Chuồn ♣ &lt; Rô ♦ &lt; Cơ ♥. Bằng số thì so chất.</li>
  </ul>
</section>

<section class="rules-sec">
  <h3>2. Các bộ bài</h3>
  <ul>
    <li><strong>Lẻ</strong>: 1 lá. <strong>Đôi</strong>: 2 lá cùng số. <strong>Ba</strong>: 3 lá cùng số. <strong>Tứ quý</strong>: 4 lá cùng số.</li>
    <li><strong>Sảnh</strong>: từ 3 lá liên tiếp trở lên, không có quân 2. Q-K-A hợp lệ, K-A-2 thì không.</li>
    <li><strong>Đôi thông</strong>: từ 3 đôi liên tiếp trở lên, không có đôi 2.</li>
  </ul>
  <p>Đánh đè phải <strong>cùng loại, cùng số lá, lá cao nhất lớn hơn</strong>. Ví dụ đôi 7♦ 7♥ chỉ bị đôi có lá cao nhất lớn hơn 7♥ đè được.</p>
</section>

<section class="rules-sec">
  <h3>3. Diễn biến</h3>
  <ul>
    <li><strong>Ván đầu</strong>: người giữ lá nhỏ nhất (thường là 3♠) đi trước và bộ đầu phải chứa lá đó. Ván sau người về nhất đi trước.</li>
    <li>Người đi tự do đánh bộ nào cũng được. Người kế tiếp đánh <strong>đè</strong> bộ vừa rồi hoặc <strong>bỏ lượt</strong>.</li>
    <li><strong>Bỏ lượt</strong> là mất quyền đánh cho tới hết vòng.</li>
    <li>Khi mọi người khác đã bỏ lượt, vòng kết thúc và người đánh bộ cuối cùng đi tự do.</li>
    <li>Ván tiếp tục cho tới khi chỉ còn một người còn bài (người đó về bét).</li>
  </ul>
</section>

<section class="rules-sec">
  <h3>4. Chặt heo</h3>
  <ul>
    <li><strong>3 đôi thông</strong> chặt 1 heo.</li>
    <li><strong>Tứ quý</strong> chặt 1 heo, đôi heo và 3 đôi thông.</li>
    <li><strong>4 đôi thông</strong> chặt 1 heo, đôi heo, 3 đôi thông và tứ quý.</li>
  </ul>
  <p>Chủ phòng có thể tắt chặt heo ở phòng chờ.</p>
</section>

<section class="rules-sec">
  <h3>5. Tới trắng</h3>
  <p>Ai có một trong các tổ hợp sau ngay khi chia bài thắng luôn: <strong>tứ quý heo</strong>, <strong>sảnh rồng</strong> (đủ 12 lá từ 3 đến A), hoặc <strong>sáu đôi</strong>. Chủ phòng có thể tắt luật này.</p>
</section>

<section class="rules-sec">
  <h3>6. Điểm và rời ván</h3>
  <ul>
    <li>Xếp hạng nhất, nhì, ba, bét. Điểm: 4 người được 3, 2, 1, 0; 3 người được 2, 1, 0; 2 người được 1, 0.</li>
    <li>Người bỏ cuộc hoặc rời phòng giữa ván bị loại, xếp sau cùng; ván vẫn tiếp tục.</li>
    <li>Chơi giải trí, không tiền thật.</li>
  </ul>
</section>
`;
}
