// Tab "Luật chơi" của Cờ tướng. Nội dung khớp docs/co-tuong/01-luat-choi.md.

export function coTuongRulesHtml(): string {
  return `
    <h3>Mục tiêu</h3>
    <p>Mỗi bên có 16 quân. <b>Chiếu bí</b> Tướng đối phương để thắng: Tướng bị tấn công mà không có nước nào thoát. <b>Đỏ đi trước</b>.</p>

    <h3>Bàn cờ</h3>
    <p>Bàn 9 cột × 10 hàng, quân đặt trên <b>giao điểm</b>. Giữa bàn là <b>sông</b>. Mỗi bên có một <b>cung</b> 3 × 3 có hai đường chéo, là nơi Tướng và Sĩ ở.</p>

    <h3>Quân cờ</h3>
    <p>Quân ghi chữ Hán. Bên Đỏ: <b>帥</b> Tướng, <b>仕</b> Sĩ, <b>相</b> Tượng, <b>俥</b> Xe, <b>炮</b> Pháo, <b>傌</b> Mã, <b>兵</b> Tốt. Bên Đen: <b>將</b> Tướng, <b>士</b> Sĩ, <b>象</b> Tượng, <b>車</b> Xe, <b>砲</b> Pháo, <b>馬</b> Mã, <b>卒</b> Tốt.</p>

    <h3>Cách đi từng quân</h3>
    <ul>
      <li><b>Tướng</b>: 1 bước ngang hoặc dọc, chỉ trong cung.</li>
      <li><b>Sĩ</b>: 1 bước chéo, chỉ trong cung.</li>
      <li><b>Tượng</b>: đi chéo 2 ô, không qua sông. Bị <b>cản mắt tượng</b> nếu ô chéo ở giữa có quân.</li>
      <li><b>Mã</b>: 1 ô thẳng rồi 1 ô chéo. Bị <b>cản chân</b> nếu ô thẳng đầu tiên có quân.</li>
      <li><b>Xe</b>: đi ngang hoặc dọc bao nhiêu ô cũng được, không nhảy qua quân nào.</li>
      <li><b>Pháo</b>: đi như Xe khi không ăn. Muốn ăn phải <b>nhảy qua đúng một quân</b> (của bên nào cũng được) rồi ăn quân đối phương ngay sau đó.</li>
      <li><b>Tốt</b>: chưa qua sông chỉ tiến 1 bước. Qua sông rồi thì được đi thêm 1 bước ngang. Không bao giờ đi lùi.</li>
    </ul>
    <p>Quân đi vào ô có quân đối phương thì <b>ăn</b> quân đó. Không được đi vào ô có quân mình.</p>

    <h3>Chiếu và Tướng đối mặt</h3>
    <ul>
      <li><b>Chiếu</b>: có quân sắp ăn được Tướng. Người bị chiếu phải hoá giải ngay: đi Tướng, ăn quân đang chiếu, hoặc chặn đường.</li>
      <li>Không được đi nước làm Tướng của mình bị chiếu.</li>
      <li><b>Hai Tướng không được đối mặt</b> trên cùng một cột mà không có quân nào ở giữa. Nước đi gây ra điều này là sai luật.</li>
    </ul>

    <h3>Kết thúc ván</h3>
    <ul>
      <li><b>Chiếu bí</b>: Tướng bị chiếu và không còn nước nào thoát: bên kia thắng.</li>
      <li><b>Hết nước đi</b>: đến lượt mà không còn nước hợp lệ nào, kể cả khi Tướng chưa bị chiếu, thì bên đó <b>thua</b> (khác cờ vua).</li>
      <li><b>Xin thua</b> hoặc rời phòng giữa ván: bên kia thắng.</li>
      <li><b>Hoà</b>: cùng một thế cờ lặp lại 3 lần.</li>
    </ul>

    <h3>Cách chơi trên máy</h3>
    <p>Chạm một quân của bạn để chọn: ô đi được hiện <b>chấm tròn</b>, quân ăn được có <b>vòng</b> quanh. Chạm ô đích để đi ngay. Chạm chỗ khác để bỏ chọn.</p>
  `;
}
