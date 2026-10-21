// Khung HTML của bàn chơi Cờ caro (docs/design/caro/ban-choi*.html).
// Các chỗ `data-*` là nơi CaroGameView gắn bàn, thẻ người chơi và cập nhật nội dung.

import type { Options } from "@playtogether/engine/caro";
import { BACK_ICON } from "../icons.ts";

const SHORTCUTS: [keys: string, action: string][] = [
  ["<kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd>", "Di chuyển ô đang chọn"],
  ["<kbd>Enter</kbd> <kbd>Space</kbd>", "Đặt quân"],
  ["<kbd>Esc</kbd>", "Bỏ chọn"],
];

export function caroPageHtml(options: Options): string {
  const n = options.kichThuoc;
  return `
    <div class="screen game-page caro-page">
      <header class="topbar g-top">
        <a class="icon-btn" href="/" aria-label="Về trang chủ">${BACK_ICON}</a>
        <span class="logo-mark desk-only"><i></i></span>
        <div class="title">Cờ caro<small data-sub></small></div>
        <div class="spacer desk-only"></div>
        <span class="chip desk-only">Bàn ${n} × ${n}</span>
        <span class="chip desk-only">Chặn 2 đầu: ${options.chanHaiDau ? "bật" : "tắt"}</span>
        <button class="btn sm desk-only" type="button" data-rules>📖 Luật chơi</button>
        <a class="btn sm desk-only" href="/">Về trang chủ</a>
        <button class="icon-btn mobile-only" type="button" data-rules aria-label="Luật chơi">?</button>
      </header>
      <div class="g-layout">
        <main class="stage">
          <div data-card-top></div>
          <div class="board-wrap">
            <div data-board></div>
            <div class="locked" hidden><span>🔒 Bàn tạm khoá</span></div>
          </div>
          <div class="status-row">
            <div class="status-pill"><span class="pulse"></span><span data-status aria-live="polite"></span></div>
            <p class="notice" data-notice hidden></p>
          </div>
          <p class="hint mobile-only" data-hint>Chạm một ô để chọn, chạm lại để đặt quân</p>
          <div class="yield-row" data-yield-row hidden>
            <button class="btn sm" type="button" data-yield>Nhường lượt đi trước</button>
          </div>
          <div class="pick-acts mobile-only" data-pick hidden>
            <button class="btn" type="button" data-unpick>Bỏ chọn</button>
            <button class="btn primary place-btn" type="button" data-place>Đặt quân</button>
          </div>
          <div data-card-bottom></div>
        </main>
        <aside class="g-side desk-only">
          <div class="tabs"><span>Nhật ký ván</span></div>
          <div class="log"><ul data-log></ul></div>
          <div class="block">
            <h3>Phím tắt</h3>
            <div class="keys">${SHORTCUTS.map(([k, a]) => `<span>${k}</span><span>${a}</span>`).join("")}</div>
          </div>
        </aside>
      </div>
      <div class="scrim" hidden></div>
      <section class="result" hidden role="dialog" aria-modal="true" aria-labelledby="result-title"></section>
    </div>`;
}
