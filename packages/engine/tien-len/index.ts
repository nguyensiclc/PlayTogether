import { tienLenBot } from "./bot.ts";
import { tienLen as baseTienLen } from "./rules.ts";

export * from "./bot.ts";
export * from "./combos.ts";
export * from "./rules.ts";
export type * from "./types.ts";

export const tienLen = {
  ...baseTienLen,
  bot: tienLenBot,
};
