// Hộp hỏi xác nhận dùng chung (giữ nguyên / đồng ý), và hộp hỏi khi người cuối cùng rời phòng.

import type { PublicRoom } from "@playtogether/protocol";
import { $ } from "../dom.ts";

/** Số người đang là thành viên của phòng (ngồi ghế hoặc xem) */
export function memberCount(room: PublicRoom): number {
  return room.seats.filter((m) => m !== null).length + room.spectators.length;
}

export interface ConfirmText {
  title: string;
  body: string;
  /** Nút giữ nguyên, mặc định được focus */
  cancel: string;
  /** Nút đồng ý */
  ok: string;
}

/** Hiện hộp xác nhận; resolve true nếu người dùng chọn nút đồng ý. Chỉ truyền chuỗi cố định (không escape). */
export function confirmBox(text: ConfirmText): Promise<boolean> {
  return new Promise((resolve) => {
    const scrim = document.createElement("div");
    scrim.className = "scrim";
    const box = document.createElement("section");
    box.className = "sheet";
    box.setAttribute("role", "alertdialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", "confirm-title");
    box.innerHTML = `
      <div class="grab"></div>
      <h2 id="confirm-title" style="font-size:20px">${text.title}</h2>
      <p class="small muted" style="margin:8px 0 18px">${text.body}</p>
      <div class="acts">
        <button class="btn" type="button" data-cancel>${text.cancel}</button>
        <button class="btn primary" type="button" data-ok>${text.ok}</button>
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
    $(box, "[data-cancel]").addEventListener("click", () => close(false));
    $(box, "[data-ok]").addEventListener("click", () => close(true));
    document.addEventListener("keydown", onKey);
    document.body.append(scrim, box);
    $(box, "[data-cancel]").focus();
  });
}

/** Người cuối cùng rời thì phòng bị xoá (UX mục 6): phải xác nhận */
export function confirmDeleteRoom(): Promise<boolean> {
  return confirmBox({
    title: "Bạn là người cuối cùng trong phòng",
    body: "Rời đi thì phòng sẽ bị xoá và link mời không còn dùng được nữa.",
    cancel: "Ở lại",
    ok: "Rời và xoá phòng",
  });
}
