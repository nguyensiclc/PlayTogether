// Nội dung "Luật chơi" của Cờ caro (khớp docs/caro/01-luat-choi.md), kèm hình minh hoạ vẽ bằng chính bàn trong game.

import type { Mark } from "@playtogether/engine/caro";
import { boardSvg, indexOf } from "./board-svg.ts";

const SIZE = 15;

type Pos = [x: number, y: number];

/** Hình minh hoạ: cắt một vùng của bàn 15 × 15. `win` = các ô của chuỗi thắng (nếu có) */
function diagram(view: string, xs: Pos[], os: Pos[], win: Pos[] = []): string {
  const cells: (Mark | null)[] = new Array(SIZE * SIZE).fill(null);
  for (const [x, y] of xs) cells[indexOf(SIZE, x, y)] = 0;
  for (const [x, y] of os) cells[indexOf(SIZE, x, y)] = 1;
  const winLine = win.map(([x, y]) => indexOf(SIZE, x, y)).sort((a, b) => a - b);
  const svg = boardSvg({ size: SIZE, cells, last: null, winLine, preview: null, viewBox: view });
  return `<div class="rules-fig caro-board">${svg}</div>`;
}

const row = (x0: number, y: number, n: number): Pos[] => Array.from({ length: n }, (_, k) => [x0 + k, y]);
const diag = (x0: number, y0: number, n: number): Pos[] => Array.from({ length: n }, (_, k) => [x0 + k, y0 + k]);

const HORIZONTAL = diagram(
  "2 5 11 5",
  row(4, 7, 5),
  [
    [4, 8],
    [6, 8],
    [3, 6],
    [8, 6],
  ],
  row(4, 7, 5),
);
const DIAGONAL = diagram(
  "3 4 9 7",
  diag(5, 5, 5),
  [
    [6, 5],
    [7, 6],
    [8, 7],
    [5, 6],
  ],
  diag(5, 5, 5),
);
const BLOCKED = diagram("2 5 11 5", row(4, 7, 5), [
  [3, 7],
  [9, 7],
  [6, 8],
  [5, 6],
]);

export function caroRulesHtml(): string {
  return `
    <h3>Mục tiêu</h3>
    <p>Hai người chơi: <b>✕</b> đi trước, <b>◯</b> đi sau. Mỗi lượt đặt <b>một quân</b> vào một ô trống. Ai nối được <b>5 quân liền nhau</b> theo hàng ngang, hàng dọc hoặc đường chéo trước thì thắng.</p>

    <h3>Cách thắng</h3>
    ${HORIZONTAL}
    <p class="cap">5 quân liền theo hàng ngang.</p>
    ${DIAGONAL}
    <p class="cap">Đường chéo cũng được. 6, 7 quân liền cũng tính là thắng.</p>

    <h3>Đặt quân</h3>
    <ul>
      <li><b>Điện thoại:</b> chạm một ô để chọn, kính lúp hiện phía trên ngón tay giúp bạn thấy rõ ô. Kéo ngón tay để đổi ô. Chạm lại đúng ô đó hoặc bấm <b>Đặt quân</b> để đặt. Chạm ra ngoài bàn để bỏ chọn.</li>
      <li><b>Máy tính:</b> rê chuột để xem trước, click để đặt. Hoặc dùng phím mũi tên để chọn ô, <kbd>Enter</kbd> / <kbd>Space</kbd> để đặt, <kbd>Esc</kbd> để bỏ chọn.</li>
      <li>Quân đã đặt không được đổi hay lấy lại. Không có nước bỏ lượt.</li>
    </ul>

    <h3>Chặn 2 đầu (tuỳ chọn của chủ phòng)</h3>
    <p>Khi bật, chuỗi 5 quân mà <b>cả hai đầu</b> đều bị chặn (bằng quân đối thủ hoặc mép bàn) thì <b>chưa thắng</b>, ván tiếp tục. Chỉ cần một đầu còn trống là vẫn thắng. Mặc định tắt.</p>
    ${BLOCKED}
    <p class="cap">Bật Chặn 2 đầu: 5 quân ✕ này bị ◯ chặn hai đầu nên chưa thắng.</p>

    <h3>Hoà</h3>
    <p>Bàn đầy mà chưa ai có 5 quân liền thì hoà.</p>

    <h3>Ai đi trước, tỉ số</h3>
    <ul>
      <li>Ván đầu: hệ thống chọn ngẫu nhiên người đi trước (cầm ✕).</li>
      <li>Ván sau: người thua đi trước. Nếu hoà thì đổi lượt.</li>
      <li>Tỉ số là số ván mỗi người đã thắng trong phòng này.</li>
      <li>Rời phòng giữa ván thì bị xử thua ván đó.</li>
    </ul>

    <h3>Tuỳ chọn khác</h3>
    <p>Cỡ bàn <b>15 × 15</b> (mặc định) hoặc <b>19 × 19</b>.</p>`;
}
