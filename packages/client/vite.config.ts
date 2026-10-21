// Cấu hình Vite khi dev: chuyển /ws và /api sang server Node (Q22k).

import { defineConfig } from "vite";

const SERVER = `localhost:${process.env.SERVER_PORT ?? 3000}`;

export default defineConfig({
  server: {
    proxy: {
      "/ws": { target: `ws://${SERVER}`, ws: true },
      "/api": { target: `http://${SERVER}` },
    },
  },
});
