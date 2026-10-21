// Khung HTML của bàn chơi online (docs/design/o-an-quan/ban-choi.html và ban-choi-desktop.html).
// Các chỗ `data-*` là nơi GameView gắn bàn, thẻ người chơi và cập nhật nội dung.

import type { Options } from "@playtogether/engine/o-an-quan";
import { BACK_ICON } from "../icons.ts";

const onOff = (b: boolean): string => (b ? "bật" : "tắt");

const SHORTCUTS: [keys: string, action: string][] = [
  ["<kbd>1</kbd>–<kbd>5</kbd>", "Chọn ô (trái → phải)"],
  ["<kbd>←</kbd> <kbd>→</kbd>", "Rải sang trái / phải"],
  ["<kbd>Esc</kbd>", "Chọn lại / giữ bên"],
  ["<kbd>L</kbd>", "Lật bàn"],
  ["<kbd>Space</kbd>", "Tua nhanh hiệu ứng"],
  ["<kbd>Enter</kbd>", "Ván nữa"],
];

export function gamePageHtml(options: Options): string {
  return `
    <div class="screen game-page">
      <header class="topbar g-top">
        <a class="icon-btn" href="/" aria-label="Về trang chủ">${BACK_ICON}</a>
        <span class="logo-mark desk-only"><i></i></span>
        <div class="title">Ô ăn quan<small data-sub></small></div>
        <div class="spacer desk-only"></div>
        <span class="chip desk-only">Quan = ${options.giaTriQuan}</span>
        <span class="chip desk-only">Quan Già: ${onOff(options.camAnQuanNon)}</span>
        <span class="chip desk-only">Lật bàn: ${onOff(options.latBan)}</span>
        ${options.targetScore ? `<span class="chip desk-only">Trận ${options.targetScore} điểm</span>` : ""}
        <a class="btn sm desk-only" href="/">Về trang chủ</a>
        <span class="icon-btn mobile-only" aria-hidden="true"></span>
      </header>
      <div class="g-layout">
        <main class="stage">
          <div data-card-top></div>
          <div class="spacer"></div>
          <div class="board-wrap">
            <span class="row-label top" data-label-top></span>
            <div data-board></div>
            <span class="row-label bottom" data-label-bottom></span>
            <span class="row-label bottom right mobile-only" data-pick-hint hidden>◀ ▶ chọn chiều rải</span>
            <span class="row-label bottom right desk-only"><kbd>1</kbd>–<kbd>5</kbd> chọn ô · <kbd>←</kbd><kbd>→</kbd> chọn chiều</span>
            <div class="locked" hidden><span>🔒 Bàn tạm khoá</span></div>
          </div>
          <div class="spacer"></div>
          <p class="log-line mobile-only" aria-live="polite"></p>
          <div class="status-row">
            <div class="status-pill"><span class="pulse"></span><span data-status aria-live="polite"></span></div>
            <span class="small muted desk-only" data-esc hidden><kbd>Esc</kbd> chọn lại</span>
          </div>
          <p class="hint mobile-only" data-hint hidden>Chạm ra ngoài bàn để chọn lại ô khác</p>
          <div class="playback" hidden>
            <button class="btn sm" type="button" data-fast aria-pressed="false">⏩ Tua nhanh ×4</button>
            <button class="btn sm ghost" type="button" data-skip>Bỏ qua hiệu ứng</button>
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
      <section class="sheet latban" hidden role="dialog" aria-modal="true" aria-labelledby="latban-title"></section>
      <section class="result" hidden role="dialog" aria-modal="true" aria-labelledby="result-title"></section>
    </div>`;
}
