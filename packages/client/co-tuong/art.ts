// Biểu tượng của Cờ tướng: nhỏ (phòng chờ, màn nhập tên) và thẻ trang chủ. Hai quân Tướng đỏ và đen.

/** SVG 40 × 40 */
export const ICON_SMALL =
  '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="16" fill="#fffaf0" stroke="#b5462f" stroke-width="2.4"/><circle cx="20" cy="20" r="12.2" fill="none" stroke="#b5462f" stroke-width="1"/><text x="20" y="24.5" text-anchor="middle" font-size="11" font-weight="700" fill="#b5462f" font-family="sans-serif">Tướng</text></svg>';

/** SVG 56 × 56 cho thẻ trong lưới trò chơi */
export const ICON_CARD =
  '<svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="21" cy="21" r="15" fill="#fffaf0" stroke="#33251b" stroke-width="2.6"/><circle cx="21" cy="21" r="11.5" fill="none" stroke="#33251b" stroke-width="1"/><text x="21" y="25" text-anchor="middle" font-size="10" font-weight="700" fill="#33251b" font-family="sans-serif">Xe</text><circle cx="36" cy="36" r="15" fill="#fffaf0" stroke="#b5462f" stroke-width="2.6"/><circle cx="36" cy="36" r="11.5" fill="none" stroke="#b5462f" stroke-width="1"/><text x="36" y="40" text-anchor="middle" font-size="10" font-weight="700" fill="#b5462f" font-family="sans-serif">Mã</text></svg>';

/** Hình trên thẻ game ở trang chủ (SVG 160 × 80) và nền của vùng hình */
export const CARD_ART = `<svg viewBox="0 0 160 80" aria-hidden="true"><g stroke="#6f5f4f" stroke-width="1.4" fill="none"><rect x="14" y="10" width="132" height="60"/><path d="M14 30h132M14 50h132M44 10v60M74 10v60M104 10v60"/><path d="M60 10l20 20M80 10L60 30M60 70l20-20M80 70L60 50" stroke-width="1"/></g><rect x="14" y="36" width="132" height="8" fill="#efe2c6"/><text x="80" y="43" text-anchor="middle" font-size="7" fill="#6f5f4f" letter-spacing="6">SÔNG</text><circle cx="44" cy="30" r="11" fill="#fffaf0" stroke="#b5462f" stroke-width="2"/><text x="44" y="35" text-anchor="middle" font-size="12" font-weight="800" fill="#b5462f">Xe</text><circle cx="104" cy="50" r="11" fill="#fffaf0" stroke="#2b2118" stroke-width="2"/><text x="104" y="55" text-anchor="middle" font-size="12" font-weight="800" fill="#2b2118">Mã</text></svg>`;

export const CARD_BG = "radial-gradient(rgba(111, 95, 79, 0.18) 1px, transparent 1.2px) 0 0 / 9px 9px, #efe2c6";
