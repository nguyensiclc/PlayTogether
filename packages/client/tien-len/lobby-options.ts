// Tuỳ chọn phòng chờ của Tiến lên: số người, chặt heo, tới trắng.

import { segButton, segRow, toggleRow } from "../games/option-controls.ts";
import type { LobbyOptions } from "../games/types.ts";

export const lobbyOptions: LobbyOptions = {
  html(room, editable) {
    if (room.gameId !== "tien-len") return "";
    const o = room.options;
    const off = !editable;
    const people = [2, 3, 4].map((n) => segButton("soNguoi", String(n), `${n} người`, o.soNguoi === n, off));
    return [
      segRow("Số người chơi", people),
      toggleRow("chatHeo", "Chặt heo", "3 đôi thông, tứ quý, 4 đôi thông chặt được heo", o.chatHeo, off),
      toggleRow("toiTrang", "Tới trắng", "Tứ quý heo, sảnh rồng, sáu đôi thắng ngay khi chia bài", o.toiTrang, off),
    ].join("");
  },
  read(el) {
    const { key, value } = el.dataset;
    if (key === "soNguoi") return { soNguoi: Number.parseInt(value ?? "4", 10) };
    if (key === "chatHeo" || key === "toiTrang") return { [key]: value === "true" };
    return {};
  },
};
