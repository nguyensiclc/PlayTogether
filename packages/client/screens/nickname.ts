// Vào phòng bằng link mời lần đầu, khi máy chưa có nickname (docs/design/nen-tang/nhap-nickname.html, UX mục 2.2).

import type { RoomPreview } from "@playtogether/protocol";
import { MAX_NAME_LENGTH, normalizeName } from "@playtogether/protocol";
import { $, escapeHtml } from "../dom.ts";
import { GAME_INFO } from "../games.ts";
import { randomName } from "../identity.ts";
import { avatarClassOf, initialsOf } from "./room-players.ts";

/** Hỏi tên rồi gọi `onSubmit` với tên đã chuẩn hoá */
export function showNickname(root: HTMLElement, preview: RoomPreview, onSubmit: (name: string) => void): void {
  const suggestions = [randomName(), randomName()];
  const avatars = preview.players
    .map((name, seat) => `<span class="avatar ${avatarClassOf(seat)}">${escapeHtml(initialsOf(name))}</span>`)
    .join("");
  const seatsText = preview.freeSeats > 0 ? `Còn ${preview.freeSeats} ghế trống` : "Phòng đã đủ người, bạn sẽ vào xem";
  root.innerHTML = `
    <div class="screen nickname">
      <header class="topbar"><a class="logo" href="/"><span class="logo-mark"><i></i></span>PlayTogether</a></header>
      <section class="invite-head">
        <div class="avatar ${avatarClassOf(0)} host-av">${escapeHtml(initialsOf(preview.hostName))}</div>
        <h1>${escapeHtml(preview.hostName)} mời bạn<br>chơi ${GAME_INFO[preview.gameId].name}</h1>
        <div class="card room-card">
          <span class="mini">${GAME_INFO[preview.gameId].icon}</span>
          <div>
            <div>Phòng <span class="code">${preview.code}</span></div>
            <div class="seat-dots">${avatars}${preview.freeSeats > 0 ? '<span class="avatar empty">+</span>' : ""}<span class="small muted">${seatsText}</span></div>
          </div>
        </div>
      </section>
      <form class="name-form" novalidate>
        <label class="lbl" for="nick">Tên của bạn trong phòng</label>
        <div class="field"><input id="nick" name="nick" maxlength="${MAX_NAME_LENGTH}" autocomplete="nickname" enterkeyhint="go"><span class="tiny muted counter"></span></div>
        <div class="names"><span class="small muted">Gợi ý:</span>
          <button type="button" class="chip" data-random>🎲 Ngẫu nhiên</button>
          ${suggestions.map((s) => `<button type="button" class="chip" data-name="${escapeHtml(s)}">${escapeHtml(s)}</button>`).join("")}
        </div>
        <button class="btn primary block" type="submit">Vào phòng</button>
        <p class="tiny muted note">Không cần đăng ký. Tên được lưu trên máy này.</p>
      </form>
    </div>`;

  const input = $<HTMLInputElement>(root, "#nick");
  const counter = $(root, ".counter");
  const update = () => {
    counter.textContent = `${input.value.length}/${MAX_NAME_LENGTH}`;
  };
  input.value = suggestions[0] ?? "";
  update();
  input.addEventListener("input", update);
  $(root, "[data-random]").addEventListener("click", () => {
    input.value = randomName();
    update();
  });
  for (const chip of root.querySelectorAll<HTMLElement>("[data-name]")) {
    chip.addEventListener("click", () => {
      input.value = chip.dataset.name ?? "";
      update();
    });
  }
  $<HTMLFormElement>(root, ".name-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = normalizeName(input.value);
    if (name) onSubmit(name);
    else input.focus();
  });
  input.select();
}
