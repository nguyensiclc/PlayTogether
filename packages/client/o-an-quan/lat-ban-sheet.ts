// Nội dung hộp hỏi Lật bàn (docs/design/o-an-quan/lat-ban*.html; UX mục 3, luật mục 9).
// Điện thoại hiển thị dạng bottom sheet, desktop dạng modal; khác biệt nằm ở CSS.

import { escapeHtml } from "../dom.ts";

export interface LatBanSheetData {
  /** Tên người vừa đi nước mở đầu */
  opener: string;
  /** Điểm bên mình nếu giữ bên */
  keepPoints: number;
  /** Điểm bên đối thủ, sẽ thành của mình nếu lật bàn */
  flipPoints: number;
}

const SWAP_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>';

/** Có hai nút `[data-keep]` (Giữ bên) và `[data-flip]` (Lật bàn) để người gọi gắn sự kiện. */
export function latBanSheetHtml({ opener, keepPoints, flipPoints }: LatBanSheetData): string {
  const name = escapeHtml(opener);
  return `
    <div class="grab"></div>
    <h2 id="latban-title">Đổi bên với đối thủ?</h2>
    <p class="small muted" style="margin-top:4px">Bạn được Lật bàn một lần, ngay bây giờ. Bàn giữ nguyên: bạn nhận bên của ${name} cùng kho điểm của bên đó, còn ${name} sẽ đi tiếp ở bên của bạn.</p>
    <div class="compare">
      <div class="side"><span class="tiny muted">Giữ bên</span><b>${keepPoints}</b><span class="tiny">điểm<br>bạn đi tiếp</span></div>
      <span class="swap">${SWAP_ICON}</span>
      <div class="side after"><span class="tiny muted">Lật bàn</span><b>${flipPoints}</b><span class="tiny">điểm<br>đối thủ đi tiếp</span></div>
    </div>
    <div class="acts">
      <button class="btn" type="button" data-keep>Giữ bên <kbd class="desk-only">Esc</kbd></button>
      <button class="btn primary" type="button" data-flip>Lật bàn <kbd class="desk-only">L</kbd></button>
    </div>`;
}
