// Điểm vào của client: chọn màn hình theo đường dẫn.

import { $ } from "./dom.ts";
import { mountHome } from "./screens/home.ts";
import { mountOffline } from "./screens/offline.ts";

const root = $(document, "#app");

// Phòng chờ, nhập nickname thuộc M3. Ô ăn quan tạm chơi ở /offline cho tới M3 (Q19).
const path = location.pathname.replace(/\/+$/, "") || "/";
if (path === "/offline") {
  document.title = "Ô ăn quan · PlayTogether";
  mountOffline(root);
} else {
  mountHome(root);
}
