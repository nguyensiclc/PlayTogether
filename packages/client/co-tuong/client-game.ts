// Mô tả Cờ tướng cho nền tảng (client). Đăng ký ở games/registry.ts.

import type { ClientGame } from "../games/types.ts";
import { ICON_CARD, ICON_SMALL } from "./art.ts";
import { CoTuongGameView } from "./game-view.ts";
import { coTuongHistoryHtml } from "./history-html.ts";
import { lobbyOptions } from "./lobby-options.ts";
import { coTuongRulesHtml } from "./rules-html.ts";

export const coTuongGame: ClientGame = {
  id: "co-tuong",
  info: {
    name: "Cờ tướng",
    players: "2 người",
    category: "co",
    duration: "15–30 phút",
    icon: ICON_SMALL,
    cardIcon: ICON_CARD,
  },
  lobbyOptions,
  rulesHtml: coTuongRulesHtml,
  historyHtml: coTuongHistoryHtml,
  createScreen: (root, room, you, actions) => new CoTuongGameView(root, room, you, actions),
  botSupported: true,
};
