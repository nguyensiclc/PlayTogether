// Khung HTML của bàn chơi Cờ vua (docs/co-vua/02-thiet-ke-ux.md).

import type { Options } from "@playtogether/engine/co-vua";
import { BACK_ICON } from "../icons.ts";

const SHORTCUTS: [keys: string, action: string][] = [
  ["<kbd>Esc</kbd>", "Bỏ chọn quân"],
  ["<kbd>Z</kbd>", "Đề nghị hoà"],
  ["<kbd>R</kbd>", "Đầu hàng"],
];

export function coVuaPageHtml(options: Options): string {
  const timeLabel =
    options.thoiGianLuot === null
      ? "Không giới hạn"
      : options.thoiGianLuot >= 60
        ? `${options.thoiGianLuot / 60} phút`
        : `${options.thoiGianLuot} giây`;

  return `
    <div class="screen game-page chess-page-root">
      <header class="topbar g-top">
        <a class="icon-btn" href="/" aria-label="Về trang chủ">${BACK_ICON}</a>
        <span class="logo-mark desk-only"><i></i></span>
        <div class="title">Cờ vua<small data-sub></small></div>
        <div class="spacer desk-only"></div>
        <span class="chip desk-only">Bàn 8 × 8</span>
        <span class="chip desk-only">${timeLabel}</span>
        <button class="btn sm desk-only" type="button" data-rules>📖 Luật chơi</button>
        <button class="btn sm desk-only" type="button" data-history>📜 Lịch sử</button>
        <a class="btn sm desk-only" href="/">Về trang chủ</a>
        <button class="icon-btn mobile-only" type="button" data-rules aria-label="Luật chơi">?</button>
      </header>

      <div class="g-layout">
        <main class="stage chess-stage">
          <div data-card-top></div>

          <div class="chess-board-wrap" data-board-wrap>
            <div data-board></div>
            <div class="promo-modal-backdrop" data-promo hidden>
              <div class="promo-modal">
                <div class="promo-title">Chọn quân phong cấp</div>
                <div class="promo-pieces" data-promo-options></div>
              </div>
            </div>
            <div class="locked" hidden><span>🔒 Bàn tạm khoá</span></div>
          </div>

          <div class="status-row">
            <div class="status-pill"><span class="pulse"></span><span data-status aria-live="polite"></span></div>
          </div>

          <div class="chess-bottom-bar">
            <button class="chess-sub-btn" type="button" data-offer-draw>Xin hoà</button>
            <button class="chess-sub-btn danger" type="button" data-resign>Đầu hàng</button>
          </div>

          <div data-card-bottom></div>
        </main>

        <aside class="g-side desk-only">
          <div class="tabs"><span>Biên bản ván</span></div>
          <div class="log"><ul data-log></ul></div>
          <div class="block">
            <h3>Phím tắt</h3>
            <div class="keys">${SHORTCUTS.map(([k, a]) => `<span>${k}</span><span>${a}</span>`).join("")}</div>
          </div>
        </aside>
      </div>

      <div class="chess-dialog-scrim" data-dialog-scrim hidden>
        <div class="chess-dialog" data-dialog-box></div>
      </div>

      <div class="scrim" hidden></div>
      <section class="result" hidden role="dialog" aria-modal="true" aria-labelledby="result-title"></section>
    </div>
  `;
}
