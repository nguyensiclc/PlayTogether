// Quân cờ vua dạng 3D bóng, vẽ bằng SVG (hộp 48 × 48, đế ở y ≈ 41).
// Mỗi quân là một hình bóng đen trắng được tô ba lớp: màu khối (gradient ngang cho cảm giác hình trụ),
// lớp bóng (vệt sáng bên trái, tối dần sang phải) và chấm phản chiếu. Gradient khai báo một lần ở `PIECE_DEFS`
// và dùng chung cho mọi quân, nên chỉ cần chèn `PIECE_DEFS` vào mỗi SVG có quân.

import type { Color, Piece, PieceType } from "@playtogether/engine/co-vua";

/** Gradient dùng chung (toạ độ theo hộp 48 × 48 của từng quân) */
export const PIECE_DEFS = `<defs>
  <linearGradient id="cv-body-w" gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="38" y2="0">
    <stop offset="0" stop-color="#fffdf5"/><stop offset="0.45" stop-color="#eadcc0"/><stop offset="1" stop-color="#b09a72"/>
  </linearGradient>
  <linearGradient id="cv-body-b" gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="38" y2="0">
    <stop offset="0" stop-color="#6b5f57"/><stop offset="0.45" stop-color="#2e241d"/><stop offset="1" stop-color="#0d0805"/>
  </linearGradient>
  <linearGradient id="cv-gloss" gradientUnits="userSpaceOnUse" x1="10" y1="0" x2="38" y2="0">
    <stop offset="0" stop-color="#fff" stop-opacity="0.65"/><stop offset="0.3" stop-color="#fff" stop-opacity="0"/>
    <stop offset="0.75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/>
  </linearGradient>
</defs>`;

/** Đế chung của mọi quân: hai tầng bo tròn */
const FOOT = `M12.5 35h23a1.8 1.8 0 0 1 1.8 1.8v0.7H10.7v-0.7A1.8 1.8 0 0 1 12.5 35zM10.5 37.5h27a1.6 1.6 0 0 1 1.6 1.6v0.6a1.6 1.6 0 0 1-1.6 1.6h-27a1.6 1.6 0 0 1-1.6-1.6v-0.6a1.6 1.6 0 0 1 1.6-1.6z`;

/** Hình bóng từng loại quân (không gồm đế) và vị trí chấm phản chiếu */
const SHAPES: Record<
  PieceType,
  {
    d: string;
    shine: [cx: number, cy: number, rx: number, ry: number];
    extra?: string;
    balls?: [x: number, y: number][];
  }
> = {
  p: {
    d: "M24 7.8a5.2 5.2 0 1 0 0 10.4a5.2 5.2 0 1 0 0-10.4zM17.6 19.6h12.8a1.5 1.5 0 0 1 0 3H29.3c0.6 5 3.4 8 4.4 12.4H14.3c1-4.4 3.8-7.4 4.4-12.4h-1.1a1.5 1.5 0 0 1 0-3z",
    shine: [21.8, 11.6, 1.7, 2.2],
  },
  r: {
    d: "M14 9h4.2v3.2h3.2V9h5.2v3.2h3.2V9H34v9H14zM15.5 18.6h17a1.4 1.4 0 0 1 0 2.8H31.2l1.6 13.6H15.2l1.6-13.6h-1.3a1.4 1.4 0 0 1 0-2.8z",
    shine: [17.4, 14, 1.2, 2.6],
  },
  b: {
    d: "M24 5.4a2.3 2.3 0 1 1 0 4.6a2.3 2.3 0 0 1 0-4.6zM24 9.4c4.6 3.6 6.6 7.2 6.2 10.4c-0.2 1.6-1.4 2.7-2.9 3.3h2.1a1.5 1.5 0 0 1 0 3h-1c0.6 3.6 2.7 6.4 3.6 8.9H14c0.9-2.5 3-5.3 3.6-8.9h-1a1.5 1.5 0 0 1 0-3h2.1c-1.5-0.6-2.7-1.7-2.9-3.3C17.4 16.6 19.4 13 24 9.4z",
    shine: [21.2, 15.8, 1.6, 3.2],
    extra: `<path d="M21.6 15.6l4.6-4.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/>`,
  },
  n: {
    d: "M33.6 35c0-4.4-1.4-6.6-1.4-11.2c0-6-3.6-11.6-10.6-12.6L19.2 7.4l-1.6 4.6c-3.2 1.8-6.8 5.6-8 9.8c-0.5 1.8 0.8 3.2 2.5 2.7L18 22.6c-1.6 2.2-3.4 4-4.8 6.2c-1.4 2.2-1.4 4.2-0.4 6.2z",
    shine: [22.6, 15.2, 2.2, 1.6],
    extra: `<circle cx="20.4" cy="16.4" r="1.2" fill="currentColor"/>`,
  },
  q: {
    d: "M12.6 15.6l4.4 10.2h14l4.4-10.2l-5.2 4.4l-1.8-9l-4.4 8.4l-4.4-8.4l-1.8 9zM16.4 26.4h15.2a1.5 1.5 0 0 1 0 3h-1.2c0.4 2.4 2.2 4 3.1 5.6H14.5c0.9-1.6 2.7-3.2 3.1-5.6h-1.2a1.5 1.5 0 0 1 0-3z",
    shine: [19.6, 22.6, 1.4, 2.4],
    balls: [
      [12.2, 13.2],
      [18.2, 9.4],
      [24, 7.8],
      [29.8, 9.4],
      [35.8, 13.2],
    ],
  },
  k: {
    d: "M22.4 3.6h3.2v3h3a0.8 0.8 0 0 1 0 1.6H25.6v3.4h-3.2V8.2h-3a0.8 0.8 0 0 1 0-1.6h3zM24 13.2c6.6 0 9.6 3.6 8.6 8.2l-0.4 1.4h1.3a1.5 1.5 0 0 1 0 3H30c0.4 3 2.6 5.2 3.7 7.2H14.3c1.1-2 3.3-4.2 3.7-7.2h-4.8a1.5 1.5 0 0 1 0-3h1.3l-0.4-1.4C14.4 16.8 17.4 13.2 24 13.2z",
    shine: [19.6, 17.8, 1.7, 2.6],
  },
};

const OUTLINE: Record<Color, string> = { w: "#7a6542", b: "#050302" };

/** SVG của một quân trong hộp 48 × 48; cần `PIECE_DEFS` có mặt trong tài liệu */
export function pieceSvg(piece: Piece): string {
  const shape = SHAPES[piece.type];
  const [cx, cy, rx, ry] = shape.shine;
  const body = piece.color === "w" ? "url(#cv-body-w)" : "url(#cv-body-b)";
  const detail = piece.color === "w" ? "#7a6542" : "#d9cdbb";
  const path = `${shape.d}${FOOT}`;
  const balls = (shape.balls ?? [])
    .map(
      ([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="2.3" fill="${body}" stroke="${OUTLINE[piece.color]}" stroke-width="1"/><circle cx="${x}" cy="${y}" r="2.3" fill="url(#cv-gloss)"/>`,
    )
    .join("");
  return `<ellipse cx="24" cy="41.6" rx="14.5" ry="2.6" fill="rgba(0,0,0,0.3)"/>
${balls}<path d="${path}" fill="${body}" stroke="${OUTLINE[piece.color]}" stroke-width="1" stroke-linejoin="round" fill-rule="nonzero"/>
<path d="${path}" fill="url(#cv-gloss)"/>
<g color="${detail}">${shape.extra ?? ""}</g>
<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${piece.color === "w" ? 0.85 : 0.5}" transform="rotate(-20 ${cx} ${cy})"/>`;
}
