// Hộp "Luật chơi": mở được từ trang chủ (trước khi tạo phòng), phòng chờ và trong lúc đang chơi.

import type { GameId } from "@playtogether/protocol";
import { caroRulesHtml } from "../caro/rules-html.ts";
import { $ } from "../dom.ts";
import { GAME_INFO } from "../games.ts";
import { oAnQuanRulesHtml } from "../o-an-quan/rules-html.ts";
import "./rules.css";

const RULES: Record<GameId, () => string> = {
  "o-an-quan": oAnQuanRulesHtml,
  caro: caroRulesHtml,
};

export function showRules(gameId: GameId): void {
  const previous = document.activeElement as HTMLElement | null;
  const scrim = document.createElement("div");
  scrim.className = "scrim rules-scrim";
  const box = document.createElement("section");
  box.className = "rules-dialog";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-labelledby", "rules-title");
  box.innerHTML = `
    <header>
      <h2 id="rules-title">Luật chơi · ${GAME_INFO[gameId].name}</h2>
      <button class="icon-btn" type="button" data-close aria-label="Đóng">✕</button>
    </header>
    <div class="rules-body">${RULES[gameId]()}</div>
    <footer><button class="btn primary block" type="button" data-close>Đã hiểu</button></footer>`;
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
  // Bắt ở pha capture để Esc đóng hộp chứ không bỏ chọn ô trên bàn phía sau
  document.addEventListener("keydown", onKey, true);
  document.body.append(scrim, box);
  $(box, "footer .btn").focus();
}
