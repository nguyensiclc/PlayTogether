// Mã QR cho link mời (Q22j), vẽ thành SVG bằng thư viện qrcode-generator.

import qrcode from "qrcode-generator";

/** SVG mã QR của `text`, các ô vuông màu `--ink` trên nền trắng */
export function qrSvg(text: string): string {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let path = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`;
  }
  return `<svg class="qr-code" viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges" role="img" aria-label="Mã QR vào phòng"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${path}" fill="var(--ink)"/></svg>`;
}
