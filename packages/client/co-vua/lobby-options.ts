// Tuỳ chọn phòng chờ của Cờ vua.

import { segButton, segRow } from "../games/option-controls.ts";
import type { LobbyOptions } from "../games/types.ts";

export const lobbyOptions: LobbyOptions = {
  html(room, editable) {
    if (room.gameId !== "co-vua") return "";
    const o = room.options;
    const off = !editable;
    const times = [
      { val: 60, label: "60 giây" },
      { val: 180, label: "3 phút" },
      { val: null, label: "Không giới hạn" },
    ].map(({ val, label }) => segButton("thoiGianLuot", String(val), label, o.thoiGianLuot === val, off));

    return [segRow("Thời gian mỗi lượt", times)].join("");
  },
  read(el) {
    const { key, value } = el.dataset;
    if (key === "thoiGianLuot") {
      const v = value === "null" ? null : Number.parseInt(value ?? "60", 10);
      return { thoiGianLuot: v };
    }
    return {};
  },
};

