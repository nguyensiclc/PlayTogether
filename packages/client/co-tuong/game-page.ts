// Khung HTML của bàn chơi Cờ tướng (docs/design/co-tuong/mockup-*.jpg).
// Các chỗ `data-*` là nơi CoTuongGameView gắn bàn, thẻ người chơi và cập nhật nội dung.

import { BACK_ICON } from "../icons.ts";

const SHORTCUTS: [keys: string, action: string][] = [
  ["<kbd>Esc</kbd>", "Bỏ chọn quân"],
  ["<kbd>Enter</kbd>", "Ván nữa (khi hết ván)"],
];

export function coTuongPageHtml(): string {
  return `
    <div class="screen game-page ct-page">
      <header class="topbar g-top">
        <a class="icon-btn" href="/" aria-label="Về trang chủ">${BACK_ICON}</a>
        <span class="logo-mark desk-only"><i></i></span>
        <div class="title">Cờ tướng<small data-sub></small></div>
        <div class="spacer desk-only"></div>
        <button class="btn sm desk-only" type="button" data-rules>📖 Luật chơi</button>
        <button class="btn sm desk-only" type="button" data-history>📜 Lịch sử</button>
        <button class="btn sm" type="button" data-resign hidden>🏳 Xin thua</button>
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
