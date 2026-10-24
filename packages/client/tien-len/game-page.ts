// Khung HTML của bàn chơi Tiến lên (docs/tien-len/02-thiet-ke-ux.md).

import type { Options } from "@playtogether/engine/tien-len";
import { BACK_ICON } from "../icons.ts";

const SHORTCUTS: [keys: string, action: string][] = [
  ["<kbd>←</kbd> <kbd>→</kbd>", "Di chuyển giữa các lá"],
  ["<kbd>Space</kbd>", "Chọn / bỏ chọn lá"],
  ["<kbd>Enter</kbd>", "Đánh bộ đang chọn"],
  ["<kbd>P</kbd>", "Bỏ lượt"],
  ["<kbd>Esc</kbd>", "Bỏ chọn"],
  ["<kbd>S</kbd>", "Sắp xếp bài"],
];

const onOff = (b: boolean): string => (b ? "bật" : "tắt");

export function tienLenPageHtml(options: Options): string {
  return `
    <div class="screen game-page tl-page table-page">
      <header class="topbar g-top">
        <a class="icon-btn" href="/" aria-label="Về trang chủ">${BACK_ICON}</a>
        <span class="logo-mark desk-only"><i></i></span>
        <div class="title">Tiến lên<small data-sub></small></div>
        <div class="spacer desk-only"></div>
        <span class="chip desk-only">${options.soNguoi} người</span>
        <span class="chip desk-only">Chặt heo: ${onOff(options.chatHeo)}</span>
        <span class="chip desk-only">Tới trắng: ${onOff(options.toiTrang)}</span>
        <button class="btn sm" type="button" data-resign hidden>🏳 Bỏ cuộc</button>
        <button class="btn sm desk-only" type="button" data-rules>📖 Luật chơi</button>
        <button class="btn sm desk-only" type="button" data-history>📜 Lịch sử</button>
        <a class="btn sm desk-only" href="/">Về trang chủ</a>
        <button class="icon-btn mobile-only" type="button" data-rules aria-label="Luật chơi">?</button>
      </header>

      <div class="g-layout">
        <main class="stage tl-stage">
          <div class="tl-board">
            <div class="tl-opps" data-opps></div>
            <div class="tl-table" data-table>
              <div class="tl-table-cards" data-table-cards></div>
              <div class="tl-table-label" data-table-label></div>
              <div class="locked" hidden><span>🔒 Bàn tạm khoá</span></div>
            </div>
          </div>

          <div class="status-row">
            <div class="status-pill"><span class="pulse"></span><span data-status aria-live="polite"></span></div>
          </div>
          <p class="tl-hint small" data-hint aria-live="polite"></p>

          <div class="tl-hand" data-hand role="group" aria-label="Bài của bạn"></div>

          <div class="tl-actions">
            <button class="btn" type="button" data-sort>⇅ Xếp bài</button>
            <button class="btn" type="button" data-clear>Bỏ chọn</button>
            <button class="btn" type="button" data-pass>Bỏ lượt</button>
            <button class="btn primary" type="button" data-play>Đánh</button>
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
    </div>
  `;
}
