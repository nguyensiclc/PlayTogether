import { coVuaBot } from "./bot.ts";
import { coVua as baseCoVua } from "./rules.ts";

export * from "./bot.ts";
export * from "./fen.ts";
export * from "./rules.ts";
export type * from "./types.ts";

export const coVua = {
  ...baseCoVua,
  bot: coVuaBot,
};
