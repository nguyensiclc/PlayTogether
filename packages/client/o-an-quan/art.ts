// Hình minh hoạ của Ô ăn quan: biểu tượng nhỏ (phòng chờ, màn nhập tên), biểu tượng thẻ trang chủ và hình thẻ nổi bật.

/** SVG 40 × 40 */
export const ICON_SMALL =
  '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="3" y="12" width="34" height="16" rx="8" fill="#8a5a2e"/><g fill="#eee6d4"><circle cx="13" cy="17" r="2"/><circle cx="20" cy="17" r="2"/><circle cx="27" cy="17" r="2"/><circle cx="13" cy="23" r="2"/><circle cx="20" cy="23" r="2"/><circle cx="27" cy="23" r="2"/></g></svg>';

/** SVG 56 × 56 cho thẻ trong lưới trò chơi */
export const ICON_CARD = `<svg viewBox="0 0 56 56" aria-hidden="true"><rect x="3" y="18" width="50" height="20" rx="10" fill="#8a5a2e"/><g fill="#eee6d4"><circle cx="17" cy="24" r="2.4"/><circle cx="24" cy="24" r="2.4"/><circle cx="31" cy="24" r="2.4"/><circle cx="38" cy="24" r="2.4"/><circle cx="17" cy="32" r="2.4"/><circle cx="24" cy="32" r="2.4"/><circle cx="31" cy="32" r="2.4"/><circle cx="38" cy="32" r="2.4"/></g><circle cx="9" cy="28" r="3.5" fill="#33251b"/><circle cx="47" cy="28" r="3.5" fill="#33251b"/></svg>`;

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
  <g fill="#eee6d4"><circle cx="58" cy="24" r="3"/><circle cx="66" cy="30" r="3"/><circle cx="60" cy="36" r="3"/><circle cx="70" cy="22" r="3"/><circle cx="68" cy="38" r="3"/><circle cx="90" cy="25" r="3"/><circle cx="99" cy="31" r="3"/><circle cx="92" cy="37" r="3"/><circle cx="100" cy="22" r="3"/><circle cx="96" cy="38" r="3"/><circle cx="120" cy="26" r="3"/><circle cx="130" cy="30" r="3"/><circle cx="124" cy="37" r="3"/><circle cx="131" cy="21" r="3"/><circle cx="120" cy="20" r="3"/><circle cx="152" cy="24" r="3"/><circle cx="160" cy="31" r="3"/><circle cx="151" cy="36" r="3"/><circle cx="163" cy="22" r="3"/><circle cx="162" cy="38" r="3"/><circle cx="182" cy="25" r="3"/><circle cx="192" cy="29" r="3"/><circle cx="185" cy="37" r="3"/><circle cx="193" cy="21" r="3"/><circle cx="192" cy="38" r="3"/><circle cx="58" cy="57" r="3"/><circle cx="68" cy="62" r="3"/><circle cx="60" cy="70" r="3"/><circle cx="70" cy="54" r="3"/><circle cx="69" cy="71" r="3"/><circle cx="90" cy="58" r="3"/><circle cx="99" cy="63" r="3"/><circle cx="91" cy="70" r="3"/><circle cx="100" cy="54" r="3"/><circle cx="99" cy="71" r="3"/><circle cx="121" cy="57" r="3"/><circle cx="131" cy="62" r="3"/><circle cx="122" cy="70" r="3"/><circle cx="130" cy="54" r="3"/><circle cx="131" cy="71" r="3"/><circle cx="152" cy="57" r="3"/><circle cx="162" cy="62" r="3"/><circle cx="153" cy="70" r="3"/><circle cx="161" cy="54" r="3"/><circle cx="162" cy="71" r="3"/><circle cx="183" cy="57" r="3"/><circle cx="193" cy="62" r="3"/><circle cx="184" cy="70" r="3"/><circle cx="192" cy="54" r="3"/><circle cx="193" cy="71" r="3"/></g>
</svg>`;
