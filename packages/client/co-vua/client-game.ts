// Mô tả Cờ vua cho nền tảng (client). Đăng ký ở games/registry.ts.

import type { ClientGame } from "../games/types.ts";
import { ICON_CARD, ICON_SMALL } from "./art.ts";
import { CoVuaGameView } from "./game-view.ts";
import { coVuaHistoryHtml } from "./history-html.ts";
import { lobbyOptions } from "./lobby-options.ts";
import { coVuaRulesHtml } from "./rules-html.ts";

export const coVuaGame: ClientGame = {
  id: "co-vua",
  info: {
    name: "Cờ vua",
    players: "2 người",
    category: "co",
    duration: "10–20 phút",
    icon: ICON_SMALL,
    cardIcon: ICON_CARD,
  },
  lobbyOptions,
  rulesHtml: coVuaRulesHtml,
  historyHtml: coVuaHistoryHtml,
  createScreen: (root, room, you, actions) => new CoVuaGameView(root, room, you, actions),
};
