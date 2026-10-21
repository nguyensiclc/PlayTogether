// Điểm vào của client: chọn màn hình theo đường dẫn. Chuyển trang bằng tải lại trang, đủ cho prototype.

import { normalizeRoomCode } from "@playtogether/protocol";
import { $ } from "./dom.ts";
import { loadInviteOrigin } from "./invite-origin.ts";
import { mountHome } from "./screens/home.ts";
import { mountRoom } from "./screens/room.ts";

const root = $(document, "#app");

// /r/:code là link mời vào phòng (UX mục 2.3)
const match = /^\/r\/([^/]+)\/?$/.exec(location.pathname);
const code = match ? normalizeRoomCode(decodeURIComponent(match[1] ?? "")) : null;

if (code) {
  document.title = `Phòng ${code} · PlayTogether`;
  void loadInviteOrigin().then(() => mountRoom(root, code));
} else {
  // Mọi đường dẫn khác (kể cả /offline cũ, Q22a) về trang chủ
  if (location.pathname !== "/") history.replaceState(null, "", "/");
  mountHome(root);
}
