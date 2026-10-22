// Mô tả Cờ caro cho nền tảng (client). Đăng ký ở games/registry.ts.

import type { ClientGame } from "../games/types.ts";
import { ICON_CARD, ICON_SMALL } from "./art.ts";
import cardImage from "./assets/card.webp";
import { CaroGameView } from "./game-view.ts";
import { caroHistoryHtml } from "./history-html.ts";
import { lobbyOptions } from "./lobby-options.ts";
import { caroRulesHtml } from "./rules-html.ts";

export const caroGame: ClientGame = {
  id: "caro",
  info: {
    name: "Cờ caro",
    players: "2 người",
    category: "co",
    duration: "5–10 phút",
    icon: ICON_SMALL,
    cardIcon: ICON_CARD,
    cardImage,
  },
  lobbyOptions,
  rulesHtml: caroRulesHtml,
  historyHtml: caroHistoryHtml,
  createScreen: (root, room, you, actions) => new CaroGameView(root, room, you, actions),
};
