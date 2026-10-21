// Thông tin hiển thị của từng game (tên, biểu tượng nhỏ, màu nền theo nhóm).
// Nhẹ và không import màn hình chơi, để trang chủ, phòng chờ, màn nhập nickname dùng chung.

import type { GameId } from "@playtogether/protocol";

export interface GameInfo {
  name: string;
  /** SVG 40 × 40 */
  icon: string;
  /** Class màu nền theo nhóm game trong style.css: c-dg (dân gian), c-co (cờ), c-bai (bài) */
  tile: string;
}

const OAN_QUAN_ICON =
  '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="3" y="12" width="34" height="16" rx="8" fill="#8a5a2e"/><g fill="#eee6d4"><circle cx="13" cy="17" r="2"/><circle cx="20" cy="17" r="2"/><circle cx="27" cy="17" r="2"/><circle cx="13" cy="23" r="2"/><circle cx="20" cy="23" r="2"/><circle cx="27" cy="23" r="2"/></g></svg>';

const CARO_ICON =
  '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="4" y="4" width="32" height="32" rx="6" fill="#fffaf0"/><path d="M4 14.7h32M4 25.3h32M14.7 4v32M25.3 4v32" stroke="#b9ad94" stroke-width="1"/><path d="M7.5 7.5l5 5M12.5 7.5l-5 5" stroke="#b5462f" stroke-width="2.4" stroke-linecap="round"/><circle cx="20" cy="20" r="3.4" fill="none" stroke="#3a4f8f" stroke-width="2.4"/><path d="M27.5 27.5l5 5M32.5 27.5l-5 5" stroke="#b5462f" stroke-width="2.4" stroke-linecap="round"/></svg>';

export const GAME_INFO: Record<GameId, GameInfo> = {
  "o-an-quan": { name: "Ô ăn quan", icon: OAN_QUAN_ICON, tile: "c-dg" },
  caro: { name: "Cờ caro", icon: CARO_ICON, tile: "c-co" },
};
