// Hình minh hoạ của Ô ăn quan: biểu tượng nhỏ (phòng chờ, màn nhập tên), biểu tượng thẻ trang chủ và hình thẻ nổi bật.

/** SVG 40 × 40 */
export const ICON_SMALL =
  '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="3" y="12" width="34" height="16" rx="8" fill="#8a5a2e"/><g fill="#eee6d4"><circle cx="13" cy="17" r="2"/><circle cx="20" cy="17" r="2"/><circle cx="27" cy="17" r="2"/><circle cx="13" cy="23" r="2"/><circle cx="20" cy="23" r="2"/><circle cx="27" cy="23" r="2"/></g></svg>';

/** SVG 56 × 56 cho thẻ trong lưới trò chơi */
export const ICON_CARD = `<svg viewBox="0 0 56 56" aria-hidden="true"><rect x="3" y="18" width="50" height="20" rx="10" fill="#8a5a2e"/><g fill="#eee6d4"><circle cx="17" cy="24" r="2.4"/><circle cx="24" cy="24" r="2.4"/><circle cx="31" cy="24" r="2.4"/><circle cx="38" cy="24" r="2.4"/><circle cx="17" cy="32" r="2.4"/><circle cx="24" cy="32" r="2.4"/><circle cx="31" cy="32" r="2.4"/><circle cx="38" cy="32" r="2.4"/></g><circle cx="9" cy="28" r="3.5" fill="#33251b"/><circle cx="47" cy="28" r="3.5" fill="#33251b"/></svg>`;

/** Các ô dân: x, y, rộng, cao (khớp với các hình chữ nhật vẽ bên dưới) */
const CELLS = [50, 81, 112, 143, 174].flatMap((x) => [
  { x, y: 14, w: 27, h: 31 },
  { x, y: 48, w: 27, h: 30 },
]);

/** Hai sắc sỏi xen kẽ cho tự nhiên */
const STONE_FILLS = ["#eee6d4", "#e3d9c3"] as const;

/**
 * Sỏi rải tự nhiên trong từng ô: vị trí và cỡ lệch nhau, không đè lên nhau, không xếp thành mặt xúc xắc.
 * Dùng bộ sinh số cố định (không Math.random) nên hình giống nhau ở mọi lần tải.
 */
function scatterStones(): string {
  let seed = 20260721;
  const rand = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const stones: string[] = [];
  for (const cell of CELLS) {
    const placed: { x: number; y: number; r: number }[] = [];
    const target = 6 + Math.floor(rand() * 3);
    for (let tries = 0; tries < 80 && placed.length < target; tries++) {
      const r = 2.5 + rand() * 1;
      const x = cell.x + r + 1.5 + rand() * (cell.w - 2 * r - 3);
      const y = cell.y + r + 1.5 + rand() * (cell.h - 2 * r - 3);
      if (placed.every((s) => Math.hypot(s.x - x, s.y - y) >= s.r + r + 0.6)) placed.push({ x, y, r });
    }
    for (const [i, s] of placed.entries()) {
      const fill = STONE_FILLS[i % STONE_FILLS.length];
      stones.push(`<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r.toFixed(1)}" fill="${fill}"/>`);
    }
  }
  return `<g>${stones.join("")}</g>`;
}

/** Hình bàn trên thẻ nổi bật của trang chủ */
export const FEATURED_ART = `<svg viewBox="0 0 250 92" aria-hidden="true">
  <rect x="4" y="6" width="242" height="80" rx="40" fill="#6b421f"/>
  <rect x="8" y="10" width="234" height="72" rx="36" fill="#8a5a2e"/>
  <path d="M44 14 A32 32 0 0 0 44 78 Z" fill="#b07a45"/><path d="M206 14 A32 32 0 0 1 206 78 Z" fill="#b07a45"/>
  <g fill="#b07a45">${[50, 81, 112, 143, 174]
    .map(
      (x) =>
        `<rect x="${x}" y="14" width="27" height="31" rx="6"/><rect x="${x}" y="48" width="27" height="30" rx="6"/>`,
    )
    .join("")}</g>
  <circle cx="30" cy="46" r="8" fill="#33251b"/><circle cx="220" cy="46" r="8" fill="#33251b"/>
  ${scatterStones()}
</svg>`;
