// Vẽ bàn Cờ caro thành SVG (hình học khớp docs/design/shared/caro-board.js: 1 đơn vị = 1 ô).
// Thuần chuỗi, không đụng DOM: dễ kiểm thử, dùng cho cả bàn chính, kính lúp và bàn thu nhỏ ở kết quả.

import type { Mark } from "@playtogether/engine/caro";

export interface BoardPaint {
  size: number;
  /** cells[i] với i = y * size + x */
  cells: readonly (Mark | null)[];
  /** Ô nước vừa đi */
  last: number | null;
  /** Ô của chuỗi thắng, tăng dần; rỗng = chưa có */
  winLine: readonly number[];
  /** Ô đang chọn (hoặc đang rê chuột) cùng quân xem trước; `band` = tô dải hàng và cột */
  preview: { index: number; mark: Mark; band: boolean } | null;
  /** Quân vừa đặt chạy hiệu ứng xuất hiện (chỉ lần vẽ ngay sau nước đi, để rê chuột không chạy lại) */
  fresh?: boolean;
  /** Vùng hiển thị "x y w h"; mặc định cả bàn */
  viewBox?: string;
}

/** Ô (x, y) ↔ chỉ số */
export const indexOf = (size: number, x: number, y: number): number => y * size + x;
export const xOf = (size: number, i: number): number => i % size;
export const yOf = (size: number, i: number): number => Math.floor(i / size);

/** Điểm sao: 5 điểm với bàn 15, 9 điểm với bàn 19 */
function starPoints(size: number): [number, number][] {
  const pts = size === 19 ? [3, 9, 15] : [3, 7, 11];
  const all = pts.flatMap((y) => pts.map((x): [number, number] => [x, y]));
  return size === 19 ? all : all.filter(([x, y]) => (x === 7) === (y === 7));
}

/** Quân 3D bóng: bóng đổ, viền tối, thân gradient, vệt phản chiếu; gradient ở `MARK_DEFS` */
function markSvg(mark: Mark, x: number, y: number): string {
  if (mark === 0) {
    const d = `M${x + 0.27} ${y + 0.27}L${x + 0.73} ${y + 0.73}M${x + 0.73} ${y + 0.27}L${x + 0.27} ${y + 0.73}`;
    const shine = `M${x + 0.27} ${y + 0.25}L${x + 0.46} ${y + 0.44}M${x + 0.73} ${y + 0.25}L${x + 0.58} ${y + 0.4}`;
    return `<g class="mx"><path class="sh" d="${d}"/><path class="bd" d="${d}"/><path class="bo" d="${d}"/><path class="hl" d="${shine}"/></g>`;
  }
  const [cx, cy] = [x + 0.5, y + 0.5];
  const arc = `M${cx - 0.21} ${cy - 0.06}A0.22 0.22 0 0 1 ${cx - 0.04} ${cy - 0.21}`;
  return `<g class="mo"><circle class="sh" cx="${cx}" cy="${cy}" r="0.27"/><circle class="bd" cx="${cx}" cy="${cy}" r="0.27"/><circle class="bo" cx="${cx}" cy="${cy}" r="0.27"/><path class="hl" d="${arc}"/></g>`;
}

/** Gradient của hai loại quân, dùng chung cho mọi quân trong một SVG bàn */
const MARK_DEFS = `<defs>
  <linearGradient id="cr-x" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7a62"/><stop offset="1" stop-color="#c22d1b"/></linearGradient>
  <linearGradient id="cr-o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b95ff"/><stop offset="1" stop-color="#2a4cae"/></linearGradient>
</defs>`;

function cellRect(cls: string, x: number, y: number): string {
  return `<rect class="${cls}" x="${x + 0.07}" y="${y + 0.07}" width="0.86" height="0.86" rx="0.16"/>`;
}

function gridPath(size: number): string {
  let d = "";
  for (let i = 1; i < size; i++) d += `M${i} 0V${size}M0 ${i}H${size}`;
  return d;
}

function stonesSvg(p: BoardPaint, skip: ReadonlySet<number>): string {
  return p.cells
    .map((m, i) => {
      if (m === null || skip.has(i)) return "";
      const svg = markSvg(m, xOf(p.size, i), yOf(p.size, i));
      return p.fresh && i === p.last ? `<g class="fresh">${svg}</g>` : svg;
    })
    .join("");
}

function winSvg(p: BoardPaint): string {
  if (p.winLine.length === 0) return "";
  const n = p.size;
  const cellsSvg = p.winLine.map((i) => cellRect("win", xOf(n, i), yOf(n, i))).join("");
  const stones = p.winLine
    .map((i, k) => {
      const m = p.cells[i];
      return m === null || m === undefined
        ? ""
        : `<g class="wstone" style="--i:${k}">${markSvg(m, xOf(n, i), yOf(n, i))}</g>`;
    })
    .join("");
  // winLine tăng dần theo chỉ số nên phần tử đầu và cuối là hai đầu của chuỗi
  const a = p.winLine[0] ?? 0;
  const b = p.winLine[p.winLine.length - 1] ?? 0;
  const line = `<line class="winline" x1="${xOf(n, a) + 0.5}" y1="${yOf(n, a) + 0.5}" x2="${xOf(n, b) + 0.5}" y2="${yOf(n, b) + 0.5}"/>`;
  return cellsSvg + stones + line;
}

export function boardSvg(p: BoardPaint): string {
  const n = p.size;
  const win = new Set(p.winLine);
  const parts: string[] = [
    `<svg class="caro-svg" viewBox="${p.viewBox ?? `0 0 ${n} ${n}`}" role="img" aria-label="Bàn cờ caro ${n} × ${n}">`,
    MARK_DEFS,
    `<path class="grid" d="${gridPath(n)}"/>`,
    starPoints(n)
      .map(([x, y]) => `<circle class="star" cx="${x + 0.5}" cy="${y + 0.5}" r="0.1"/>`)
      .join(""),
  ];
  const pv = p.preview;
  if (pv?.band) {
    const [px, py] = [xOf(n, pv.index), yOf(n, pv.index)];
    parts.push(
      `<rect class="band" x="0" y="${py}" width="${n}" height="1"/><rect class="band" x="${px}" y="0" width="1" height="${n}"/>`,
    );
  }
  if (p.last !== null) parts.push(cellRect("last", xOf(n, p.last), yOf(n, p.last)));
  parts.push(`<g${win.size > 0 ? ' class="dim"' : ""}>${stonesSvg(p, win)}</g>`);
  parts.push(winSvg(p));
  if (pv) {
    const [px, py] = [xOf(n, pv.index), yOf(n, pv.index)];
    parts.push(cellRect("sel", px, py), `<g class="ghost">${markSvg(pv.mark, px, py)}</g>`);
  }
  parts.push("</svg>");
  return parts.join("");
}

/** Vùng 5 × 5 ô quanh ô `index` cho kính lúp, kẹp trong bàn */
export function loupeViewBox(size: number, index: number): string {
  const clamp = (v: number) => Math.min(Math.max(v, 0), size - 5);
  return `${clamp(xOf(size, index) - 2)} ${clamp(yOf(size, index) - 2)} 5 5`;
}

/**
 * Ô nằm dưới điểm (clientX, clientY) của bàn có khung `rect`; null nếu ngoài bàn.
 * Thuần số để kiểm thử, không cần DOM.
 */
export function cellAt(
  size: number,
  rect: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): number | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = Math.floor(((clientX - rect.left) / rect.width) * size);
  const y = Math.floor(((clientY - rect.top) / rect.height) * size);
  if (x < 0 || y < 0 || x >= size || y >= size) return null;
  return indexOf(size, x, y);
}

/** Đi một ô theo hướng (dx, dy); đứng yên khi chạm mép */
export function stepCell(size: number, index: number, dx: number, dy: number): number {
  const x = Math.min(Math.max(xOf(size, index) + dx, 0), size - 1);
  const y = Math.min(Math.max(yOf(size, index) + dy, 0), size - 1);
  return indexOf(size, x, y);
}
