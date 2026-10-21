// Nội dung "Luật chơi" của Cờ vua (khớp docs/co-vua/01-luat-choi.md).

export function coVuaRulesHtml(): string {
  return `
<section class="rules-sec">
  <h3>1. Bàn cờ và Quân cờ</h3>
  <p>Cờ vua chơi trên bàn cờ <strong>8 × 8</strong> gồm 64 ô màu sáng và tối xen kẽ. Mỗi bên bắt đầu với <strong>16 quân</strong>:</p>
  <ul>
    <li><strong>1 Vua (King)</strong>: Vô giá — đi và ăn 1 ô mọi hướng. Không được đi vào ô bị tấn công.</li>
    <li><strong>1 Hậu (Queen)</strong>: Sức mạnh lớn nhất — đi và ăn tự do theo hàng ngang, dọc và chéo.</li>
    <li><strong>2 Xe (Rook)</strong>: Đi và ăn theo hàng ngang hoặc cột dọc.</li>
    <li><strong>2 Tượng (Bishop)</strong>: Đi và ăn theo đường chéo (1 Tượng ô sáng, 1 Tượng ô tối).</li>
    <li><strong>2 Mã (Knight)</strong>: Đi và ăn hình chữ L (2×1). Là quân duy nhất có thể <em>nhảy qua</em> các quân khác.</li>
    <li><strong>8 Tốt (Pawn)</strong>: Đi thẳng 1 ô (hoặc 2 ô ở nước đầu), ăn chéo 1 ô phía trước.</li>
  </ul>
</section>

<section class="rules-sec">
  <h3>2. Các nước đi đặc biệt</h3>
  <ul>
    <li><strong>Nhập thành (Castling)</strong>: Đưa Vua vào vị trí an toàn và Xe ra tham chiến. Vua nhảy 2 ô về phía Xe, Xe nhảy qua Vua. Điều kiện: Vua và Xe chưa từng đi, đường đi trống, Vua không bị chiếu và không đi qua ô bị chiếu.</li>
    <li><strong>Bắt tốt qua đường (En passant)</strong>: Khi Tốt đối phương nhảy 2 ô vượt qua ô bị Tốt mình kiểm soát, Tốt mình có thể ăn chéo vào ô nó vừa đi qua ngay ở lượt tiếp theo.</li>
    <li><strong>Phong cấp (Promotion)</strong>: Khi Tốt chạm hàng cuối cùng (hàng 8 với Trắng, hàng 1 với Đen), người chơi bắt buộc phải phong cấp thành Hậu, Xe, Tượng hoặc Mã.</li>
  </ul>
</section>

<section class="rules-sec">
  <h3>3. Chiếu và Chiếu bí (Thắng cuộc)</h3>
  <ul>
    <li><strong>Chiếu (Check)</strong>: Khi Vua bị quân đối phương đe dọa tấn công. Người chơi bắt buộc phải hoá giải thế chiếu (chạy vua, ăn quân chiếu, hoặc chắn đường).</li>
    <li><strong>Chiếu bí (Checkmate)</strong>: Vua đang bị chiếu và không còn bất kỳ nước đi hợp lệ nào để thoát. Người tạo ra thế chiếu bí thắng ván cờ.</li>
    <li><strong>Đầu hàng</strong>: Người chơi có thể bấm nút "Đầu hàng" bất kỳ lúc nào để nhận thua văn minh.</li>
  </ul>
</section>

<section class="rules-sec">
  <h3>4. Các trường hợp Hoà</h3>
  <ul>
    <li><strong>Thế bí (Stalemate)</strong>: Đến lượt đi, Vua không bị chiếu nhưng không còn nước đi hợp lệ nào → Hoà ngay lập tức.</li>
    <li><strong>Lặp lại thế cờ 3 lần</strong>: Cùng một thế cờ xuất hiện 3 lần trong ván → Tự động hoà.</li>
    <li><strong>Quy tắc 50 nước</strong>: 50 nước trôi qua mà không có Tốt nào di chuyển và không quân nào bị ăn → Tự động hoà.</li>
    <li><strong>Không đủ lực lượng</strong>: Chỉ còn 2 Vua, hoặc Vua + Tượng/Mã vs Vua → Tự động hoà.</li>
    <li><strong>Đề nghị hoà</strong>: Hai người chơi có thể thoả thuận bấm "Xin hoà" và chấp nhận hoà ván đấu.</li>
  </ul>
</section>
`;
}

