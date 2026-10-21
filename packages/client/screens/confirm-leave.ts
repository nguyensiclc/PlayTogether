// Hộp hỏi khi người cuối cùng rời phòng: rời đi thì phòng bị xoá khỏi server (không còn ai để giữ phòng).

import type { PublicRoom } from "@playtogether/protocol";
import { $ } from "../dom.ts";

/** Số người đang là thành viên của phòng (ngồi ghế hoặc xem) */
export function memberCount(room: PublicRoom): number {
  return room.seats.filter((m) => m !== null).length + room.spectators.length;
}

/** Hiện hộp xác nhận; resolve true nếu người dùng chọn rời và xoá phòng */
export function confirmDeleteRoom(): Promise<boolean> {
  return new Promise((resolve) => {
    const scrim = document.createElement("div");
    scrim.className = "scrim";
    const box = document.createElement("section");
    box.className = "sheet";
    box.setAttribute("role", "alertdialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", "leave-title");
    box.innerHTML = `
      <div class="grab"></div>
      <h2 id="leave-title" style="font-size:20px">Bạn là người cuối cùng trong phòng</h2>
      <p class="small muted" style="margin:8px 0 18px">Rời đi thì phòng sẽ bị xoá và link mời không còn dùng được nữa.</p>
      <div class="acts">
        <button class="btn" type="button" data-stay>Ở lại</button>
        <button class="btn primary" type="button" data-leave-delete>Rời và xoá phòng</button>
      </div>`;
    const close = (answer: boolean) => {
      document.removeEventListener("keydown", onKey);
      scrim.remove();
      box.remove();
      resolve(answer);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    scrim.addEventListener("click", () => close(false));
    $(box, "[data-stay]").addEventListener("click", () => close(false));
    $(box, "[data-leave-delete]").addEventListener("click", () => close(true));
    document.addEventListener("keydown", onKey);
    document.body.append(scrim, box);
    $(box, "[data-stay]").focus();
  });
}
