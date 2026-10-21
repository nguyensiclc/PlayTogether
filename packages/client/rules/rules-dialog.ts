// Hộp thông tin game: tab "Luật chơi" và tab "Lịch sử". Mở được từ trang chủ (trước khi tạo phòng),
// phòng chờ và trong lúc đang chơi.

import type { GameId } from "@playtogether/protocol";
import { caroHistoryHtml } from "../caro/history-html.ts";
import { caroRulesHtml } from "../caro/rules-html.ts";
import { $ } from "../dom.ts";
import { GAME_INFO } from "../games.ts";
import { oAnQuanHistoryHtml } from "../o-an-quan/history-html.ts";
import { oAnQuanRulesHtml } from "../o-an-quan/rules-html.ts";
import "./rules.css";

export type InfoTab = "rules" | "history";

const TAB_TITLE: Record<InfoTab, string> = { rules: "Luật chơi", history: "Lịch sử" };

const CONTENT: Record<GameId, Record<InfoTab, () => string>> = {
  "o-an-quan": { rules: oAnQuanRulesHtml, history: oAnQuanHistoryHtml },
  caro: { rules: caroRulesHtml, history: caroHistoryHtml },
};

export const showRules = (gameId: GameId): void => showGameInfo(gameId, "rules");
export const showHistory = (gameId: GameId): void => showGameInfo(gameId, "history");

export function showGameInfo(gameId: GameId, initial: InfoTab): void {
  const previous = document.activeElement as HTMLElement | null;
  const scrim = document.createElement("div");
  scrim.className = "scrim rules-scrim";
  const box = document.createElement("section");
  box.className = "rules-dialog";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-labelledby", "rules-title");
  const tabs = (Object.keys(TAB_TITLE) as InfoTab[])
    .map((t) => `<button type="button" role="tab" data-tab="${t}">${TAB_TITLE[t]}</button>`)
    .join("");
  box.innerHTML = `
    <header>
      <h2 id="rules-title">${GAME_INFO[gameId].name}</h2>
      <button class="icon-btn" type="button" data-close aria-label="Đóng">✕</button>
    </header>
    <div class="rules-tabs" role="tablist">${tabs}</div>
    <div class="rules-body"></div>
    <footer><button class="btn primary block" type="button" data-close>Đã hiểu</button></footer>`;
  const body = $(box, ".rules-body");
  const select = (tab: InfoTab) => {
    body.innerHTML = CONTENT[gameId][tab]();
    body.scrollTop = 0;
    for (const b of box.querySelectorAll<HTMLElement>("[data-tab]")) {
      b.setAttribute("aria-selected", String(b.dataset.tab === tab));
    }
  };
  const close = () => {
    document.removeEventListener("keydown", onKey, true);
    scrim.remove();
    box.remove();
    previous?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    close();
  };
  scrim.addEventListener("click", close);
  for (const b of box.querySelectorAll("[data-close]")) b.addEventListener("click", close);
  for (const b of box.querySelectorAll<HTMLElement>("[data-tab]")) {
    b.addEventListener("click", () => select(b.dataset.tab as InfoTab));
  }
  // Bắt ở pha capture để Esc đóng hộp chứ không bỏ chọn ô trên bàn phía sau
  document.addEventListener("keydown", onKey, true);
  select(initial);
  document.body.append(scrim, box);
  $(box, "footer .btn").focus();
}
