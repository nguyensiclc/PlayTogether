// "Lịch sử" của Cờ caro: vài điều thú vị để biết thêm. Các mốc xa xưa thường chỉ có giả thuyết, nên viết dè dặt.

export function caroHistoryHtml(): string {
  return `
    <h3>Một trò chơi rất cũ</h3>
    <p>Xếp 5 quân liền nhau trên bàn kẻ ô là ý tưởng quen thuộc ở nhiều nước Đông Á. Người Trung Quốc gọi là <b>ngũ tử kỳ</b> (五子棋, "cờ năm quân"), người Nhật gọi là <b>gomoku</b> (五目並べ, "xếp năm điểm"). Nhiều tài liệu cho rằng trò này đã có từ rất lâu, thường chơi trên bàn cờ vây bằng chính quân cờ vây. Mốc ra đời cụ thể thì chưa ai khẳng định chắc chắn.</p>

    <h3>Vì sao gọi là "ca-rô"?</h3>
    <p>Ở Việt Nam trò này gọi là <b>cờ ca-rô</b>. Cách giải thích phổ biến là từ <i>carreau</i> trong tiếng Pháp, nghĩa là "ô vuông", vì ai cũng có thể chơi trên giấy vở kẻ ô: chỉ cần một cây bút, một người vẽ ✕ và người kia vẽ ◯. Có lẽ vì vậy mà ca-rô là trò quen thuộc của học sinh ngay trong giờ ra chơi.</p>

    <h3>Đi trước có lợi, nên mới có nhiều luật</h3>
    <p>Người đi trước có lợi thế rất lớn. Các nhà nghiên cứu trí tuệ nhân tạo đã chứng minh, vào đầu thập niên 1990 (công trình của Victor Allis), rằng với luật tự do trên bàn 15 × 15 thì người đi trước <b>luôn có cách thắng</b> nếu chơi hoàn hảo. Vì thế người ta nghĩ ra nhiều cách cân bằng:</p>
    <ul>
      <li><b>Renju</b>: biến thể thi đấu của Nhật, cấm người đi trước một số thế (như 3-3, 4-4, hay chuỗi dài hơn 5).</li>
      <li><b>Chặn 2 đầu</b>: luật quen thuộc ở Việt Nam. 5 quân bị chặn cả hai đầu thì chưa thắng, nên phải biết mở đường thoát.</li>
      <li><b>Đổi quân sau nước đầu</b> (swap): người kia được chọn bên sau khi thấy nước đi. <b>Nhường lượt</b> trong game này cùng tinh thần đó: đi trước không còn là đặc quyền nếu bạn không muốn.</li>
    </ul>

    <h3>Vài con số</h3>
    <ul>
      <li>Bàn <b>15 × 15</b> là cỡ phổ biến khi thi đấu gomoku và renju. Bàn <b>19 × 19</b> chính là bàn cờ vây.</li>
      <li>Bàn 15 × 15 có 225 ô; ván đầy bàn rất hiếm, hầu hết ván kết thúc khi ai đó nối đủ 5 quân.</li>
      <li>Ngày nay máy tính chơi gomoku giỏi hơn người, nhưng ván giữa hai người vẫn rất thú vị vì cách chặn và bẫy "hai hướng cùng lúc".</li>
    </ul>

    <h3>Mẹo nhỏ để chơi hay hơn</h3>
    <ul>
      <li>Tạo <b>"bốn hở hai đầu"</b> (4 quân liền, hai đầu trống) là thế gần như chắc thắng, vì đối thủ chỉ chặn được một đầu.</li>
      <li>Tìm nước đi tạo <b>hai chuỗi cùng lúc</b> (ví dụ một "3 hở" và một "4"), đối thủ không kịp chặn cả hai.</li>
      <li>Đừng chỉ tấn công: nhớ nhìn xem đối thủ đang có chuỗi 3 hở nào.</li>
    </ul>`;
}
