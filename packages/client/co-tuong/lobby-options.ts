// Tuỳ chọn phòng chờ của Cờ tướng: chưa có tuỳ chọn nào để chỉnh (T1: bên cầm Đỏ do phòng quyết định).
// "Thời gian mỗi lượt" ẩn tới M4 (Q22d). Chỉ hiện một dòng giải thích cách chia bên.

import type { LobbyOptions } from "../games/types.ts";

export const lobbyOptions: LobbyOptions = {
  html: (room) =>
    room.gameId === "co-tuong"
      ? `<p class="small muted">Đỏ đi trước. Ván đầu chọn ngẫu nhiên; ván sau người thua cầm Đỏ.</p>`
      : "",
  read: () => ({}),
};
