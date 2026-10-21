// Danh sách game chơi được ở client. THÊM GAME MỚI = thêm một dòng ở đây (và đăng ký ở protocol, server).
// Đây là nơi DUY NHẤT của nền tảng được import thư mục của từng game (có test kiểm tra).

import type { GameId } from "@playtogether/protocol";
import { GAME_IDS } from "@playtogether/protocol";
import { caroGame } from "../caro/client-game.ts";
import { oAnQuanGame } from "../o-an-quan/client-game.ts";
import type { Category, ClientGame } from "./types.ts";

export const CLIENT_GAMES: Record<GameId, ClientGame> = {
  "o-an-quan": oAnQuanGame,
  caro: caroGame,
};

/** Game theo thứ tự hiển thị trên trang chủ */
export const PLAYABLE_GAMES: ClientGame[] = GAME_IDS.map((id) => CLIENT_GAMES[id]);

export const gameOf = (id: GameId): ClientGame => CLIENT_GAMES[id];

export const CATEGORY_NAME: Record<Category, string> = { dangian: "Dân gian", co: "Cờ", bai: "Bài" };
/** Class màu nền theo nhóm trong style.css: c-dg (dân gian), c-co (cờ), c-bai (bài) */
export const CATEGORY_BG: Record<Category, string> = { dangian: "c-dg", co: "c-co", bai: "c-bai" };
