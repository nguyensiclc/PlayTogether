// Các game sắp có (chưa chơi được): chỉ để hiện trong lưới "Sắp có" ở trang chủ.
// Game chơi được đăng ký ở registry.ts, KHÔNG thêm vào đây.

import type { Category } from "./types.ts";

export interface UpcomingGame {
  name: string;
  players: string;
  category: Category;
  /** SVG 56 × 56 */
  icon: string;
}

export const UPCOMING_GAMES: UpcomingGame[] = [
  {
    name: "Cờ tướng",
    players: "2 người",
    category: "co",
    icon: `<svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="20" fill="#fffaf0" stroke="#b5462f" stroke-width="3"/><circle cx="28" cy="28" r="15" fill="none" stroke="#b5462f" stroke-width="1.2"/><text x="28" y="35" text-anchor="middle" font-size="19" font-weight="700" fill="#b5462f" font-family="serif">帥</text></svg>`,
  },
  {
    name: "Tiến lên miền Nam",
    players: "2–4 người",
    category: "bai",
    icon: `<svg viewBox="0 0 56 56" aria-hidden="true"><rect x="10" y="12" width="24" height="34" rx="4" fill="#fffaf0" stroke="#3a4f8f" stroke-width="1.5" transform="rotate(-12 22 29)"/><rect x="22" y="10" width="24" height="34" rx="4" fill="#fffaf0" stroke="#3a4f8f" stroke-width="1.5" transform="rotate(10 34 27)"/><text x="35" y="33" text-anchor="middle" font-size="16" fill="#2b2118" font-weight="700" transform="rotate(10 34 27)">♠2</text></svg>`,
  },
  {
    name: "Lô tô",
    players: "2–10 người",
    category: "dangian",
    icon: `<svg viewBox="0 0 56 56" aria-hidden="true"><rect x="8" y="12" width="40" height="32" rx="4" fill="#fffaf0" stroke="#b5462f" stroke-width="1.5"/><g font-size="9" font-weight="700" fill="#2b2118" text-anchor="middle"><text x="16" y="25">7</text><text x="28" y="25">23</text><text x="40" y="25">41</text><text x="16" y="38">12</text><text x="28" y="38">55</text><text x="40" y="38">86</text></g><circle cx="28" cy="35" r="7" fill="#b5462f" opacity=".3"/></svg>`,
  },
  {
    name: "Cờ gánh",
    players: "2 người",
    category: "dangian",
    icon: `<svg viewBox="0 0 56 56" aria-hidden="true"><g stroke="#6b421f" stroke-width="1.6" fill="none"><path d="M10 10h36v36H10zM10 28h36M28 10v36M10 10l36 36M46 10L10 46"/></g><circle cx="10" cy="10" r="3.6" fill="#b5462f"/><circle cx="28" cy="10" r="3.6" fill="#b5462f"/><circle cx="46" cy="10" r="3.6" fill="#b5462f"/><circle cx="10" cy="46" r="3.6" fill="#2b2118"/><circle cx="28" cy="46" r="3.6" fill="#2b2118"/><circle cx="46" cy="46" r="3.6" fill="#2b2118"/></svg>`,
  },
  {
    name: "Cờ cá ngựa",
    players: "2–4 người",
    category: "co",
    icon: `<svg viewBox="0 0 56 56" aria-hidden="true"><rect x="8" y="8" width="18" height="18" rx="3" fill="#b5462f"/><rect x="30" y="8" width="18" height="18" rx="3" fill="#2f6b5a"/><rect x="8" y="30" width="18" height="18" rx="3" fill="#3a4f8f"/><rect x="30" y="30" width="18" height="18" rx="3" fill="#f2b33d"/><rect x="21" y="21" width="14" height="14" rx="3" fill="#fffaf0" stroke="#2b2118" stroke-width="1.4"/><circle cx="25" cy="25" r="1.4" fill="#2b2118"/><circle cx="31" cy="31" r="1.4" fill="#2b2118"/></svg>`,
  },
  {
    name: "Phỏm",
    players: "2–4 người",
    category: "bai",
    icon: `<svg viewBox="0 0 56 56" aria-hidden="true"><rect x="16" y="11" width="24" height="34" rx="4" fill="#fffaf0" stroke="#3a4f8f" stroke-width="1.5"/><text x="28" y="34" text-anchor="middle" font-size="18" fill="#b5462f">♥</text></svg>`,
  },
];
