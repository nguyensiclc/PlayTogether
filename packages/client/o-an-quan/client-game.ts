// Mô tả Ô ăn quan cho nền tảng (client). Đăng ký ở games/registry.ts.

import type { ClientGame } from "../games/types.ts";
import { FEATURED_ART, ICON_CARD, ICON_SMALL } from "./art.ts";
import cardImage from "./assets/card.webp";
import { GameView } from "./game-view.ts";
import { oAnQuanHistoryHtml } from "./history-html.ts";
import { lobbyOptions } from "./lobby-options.ts";
import { oAnQuanRulesHtml } from "./rules-html.ts";

export const oAnQuanGame: ClientGame = {
  id: "o-an-quan",
  info: {
    name: "Ô ăn quan",
    players: "2 người",
    category: "dangian",
    duration: "10–15 phút",
    icon: ICON_SMALL,
    cardIcon: ICON_CARD,
    cardImage,
    featuredArt: FEATURED_ART,
  },
  lobbyOptions,
  rulesHtml: oAnQuanRulesHtml,
  historyHtml: oAnQuanHistoryHtml,
  createScreen: (root, room, you, actions) => new GameView(root, room, you, actions),
};
