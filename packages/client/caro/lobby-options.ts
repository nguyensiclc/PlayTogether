// Tuỳ chọn phòng chờ của Cờ caro. "Thời gian mỗi lượt" ẩn tới M4 (Q22d).

import { segButton, segRow, toggleRow } from "../games/option-controls.ts";
import type { LobbyOptions } from "../games/types.ts";

export const lobbyOptions: LobbyOptions = {
  html(room, editable) {
    if (room.gameId !== "caro") return "";
    const o = room.options;
    const off = !editable;
    const sizes = [15, 19].map((v) => segButton("kichThuoc", String(v), `${v} × ${v}`, o.kichThuoc === v, off));
    return [
      segRow("Cỡ bàn", sizes),
      toggleRow("chanHaiDau", "Chặn 2 đầu", "5 quân bị chặn cả hai đầu thì chưa thắng", o.chanHaiDau, off),
    ].join("");
  },
  read(el) {
    const { key, value } = el.dataset;
    if (key === "kichThuoc") return { kichThuoc: value === "19" ? 19 : 15 };
    if (key === "chanHaiDau") return { chanHaiDau: value === "true" };
    return {};
  },
};
