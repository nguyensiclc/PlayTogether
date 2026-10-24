// Mô tả Tiến lên miền Nam cho nền tảng (client). Đăng ký ở games/registry.ts.

import type { ClientGame } from "../games/types.ts";
import { ICON_CARD, ICON_SMALL } from "./art.ts";
import cardImage from "./assets/card.webp";
import { TienLenGameView } from "./game-view.ts";
import { tienLenHistoryHtml } from "./history-html.ts";
import { lobbyOptions } from "./lobby-options.ts";
import { tienLenRulesHtml } from "./rules-html.ts";

export const tienLenGame: ClientGame = {
  id: "tien-len",
  info: {
    name: "Tiến lên miền Nam",
    players: "2–4 người",
    category: "bai",
    duration: "10–20 phút",
    icon: ICON_SMALL,
    cardIcon: ICON_CARD,
    cardImage,
  },
  lobbyOptions,
  rulesHtml: tienLenRulesHtml,
  historyHtml: tienLenHistoryHtml,
  createScreen: (root, room, you, actions) => new TienLenGameView(root, room, you, actions),
};
