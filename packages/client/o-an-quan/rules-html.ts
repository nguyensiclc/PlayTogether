// Nội dung "Luật chơi" của Ô ăn quan, tóm tắt từ docs/o-an-quan/01-luat-choi.md (tài liệu đó là nguồn sự thật).

export function oAnQuanRulesHtml(): string {
  return `
    <h3>Bàn và quân</h3>
    <p>Hai người chơi. Bàn có <b>12 ô</b>: mỗi người một hàng <b>5 ô dân</b>, và <b>2 ô quan</b> bán nguyệt ở hai đầu. Lúc đầu mỗi ô dân có <b>5 dân</b>, mỗi ô quan có <b>1 quan</b>. <b>1 dân = 1 điểm</b>, <b>1 quan = 10 điểm</b> (chủ phòng có thể đổi thành 5). Mỗi người luôn thấy hàng của mình ở dưới.</p>
    <img class="rules-img" src="/images/01-ban-choi-khoi-dau.svg" alt="Bàn chơi lúc khởi đầu" loading="lazy">

    <h3>Một lượt đi</h3>
    <ol>
      <li>Chọn <b>một ô dân trên hàng của mình</b> đang có dân (không chọn ô quan, không chọn ô trống).</li>
      <li>Chọn <b>chiều rải</b>: sang trái hoặc sang phải.</li>
      <li>Bốc hết dân trong ô và <b>rải mỗi ô kế tiếp một dân</b> theo chiều đã chọn. Rải cả ô quan và hàng của đối thủ.</li>
      <li>Xét ô kế tiếp sau viên cuối cùng:
        <ul>
          <li>Là <b>ô dân có quân</b>: bốc hết rồi <b>rải tiếp</b> cùng chiều.</li>
          <li>Là <b>ô quan còn quân</b>: hết lượt (không bao giờ bốc ô quan).</li>
          <li>Là <b>ô trống</b> và ô sau nó có quân: <b>ăn</b> toàn bộ ô sau đó (kể cả quan).</li>
          <li>Là <b>ô trống</b> và ô sau cũng trống: hết lượt.</li>
        </ul>
      </li>
    </ol>


    <img class="rules-img" src="/images/02-rai-quan.svg" alt="Cách rải quân" loading="lazy">
    <img class="rules-img" src="/images/03-bon-tinh-huong-vien-cuoi.svg" alt="Bốn tình huống của viên cuối cùng" loading="lazy">

    <h3>Ăn liên hoàn</h3>
    <p>Sau khi ăn một ô, nếu ô kế tiếp trống và ô sau nữa có quân thì ăn tiếp, cứ thế cho tới khi không ăn được nữa.</p>
    <img class="rules-img" src="/images/04-an-lien-hoan.svg" alt="Ăn liên hoàn" loading="lazy">

    <h3>Hết dân thì bù dân</h3>
    <p>Đầu lượt, nếu cả 5 ô của bạn đều trống: hệ thống <b>trừ 5 điểm</b> từ kho điểm của bạn và đặt mỗi ô 1 dân. Nếu kho dưới 5 điểm thì bạn <b>thua ngay</b>.</p>
    <img class="rules-img" src="/images/05-bu-dan.svg" alt="Bù dân" loading="lazy">

    <h3>Kết thúc ván</h3>
    <ul>
      <li><b>Hết quan:</b> cả hai ô quan trống hẳn. Mỗi người thu số dân còn trên hàng mình, rồi so điểm. Tổng điểm là 70 nên ai từ 36 điểm trở lên thắng; 35–35 là hoà.</li>
      <li><b>Không đủ bù dân:</b> người không bù được thua.</li>
      <li><b>Lặp nước:</b> cùng một cặp nước lặp lại 3 lần liên tiếp thì dừng ván và so điểm (quân còn trong ô quan không tính).</li>
      <li><b>Bỏ cuộc hoặc hết giờ:</b> người đó thua.</li>
    </ul>

    <h3>Tuỳ chọn của chủ phòng</h3>
    <ul>
      <li><b>Giá trị quan:</b> 10 hoặc 5 điểm.</li>
      <li><b>Quan Già:</b> ô quan còn quan mà có dưới 5 dân thì không ăn được, lượt kết thúc ngay.</li>
      <li><b>Mốc điểm (Đấu trận):</b> cộng dồn điểm qua nhiều ván; ai chạm mốc trước là thắng chung cuộc.</li>
      <li><b>Lật bàn:</b> sau nước mở đầu, người đi sau được đổi bên một lần.</li>
    </ul>

    <h3>Ai đi trước</h3>
    <p>Ván đầu ngẫu nhiên. Ván sau người thua đi trước, hoà thì đổi lượt.</p>`;
}
