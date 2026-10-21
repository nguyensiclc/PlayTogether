// Điểm vào của server (kỹ thuật mục 2): HTTP + WebSocket tại /ws, lưu phòng trong RAM.
// Chạy trực tiếp bằng Node 24 (tự bỏ kiểu TypeScript): `node index.ts`.

import { existsSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { WS_PATH } from "@playtogether/protocol";
import { WebSocketServer } from "ws";
import { Gateway } from "./gateway.ts";
import { handleHttp } from "./http.ts";
import { RoomManager } from "./room-manager.ts";

/** Chu kỳ dọn phòng bỏ trống */
const SWEEP_INTERVAL_MS = 60 * 1000;

export interface ServerOptions {
  port: number;
  /** Thư mục build của client để phục vụ file tĩnh; null khi dev (Vite lo) */
  staticDir: string | null;
}

export interface RunningServer {
  server: Server;
  port: number;
  stop(): Promise<void>;
}

export function startServer(opts: ServerOptions): Promise<RunningServer> {
  // Server không phải engine nên được dùng Math.random trực tiếp (người đi trước ván đầu, mã phòng)
  const rooms = new RoomManager(Math.random);
  const gateway = new Gateway({ rooms, rng: Math.random, now: Date.now });
  const server = createServer((req, res) => void handleHttp(req, res, rooms, opts.staticDir));
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    if (new URL(req.url ?? "/", "http://localhost").pathname !== WS_PATH) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const conn = {
        send: (m: unknown) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(m)),
        close: (reason: string) => ws.close(1008, reason),
      };
      gateway.open(conn);
      ws.on("message", (data) => gateway.message(conn, data.toString()));
      ws.on("close", () => gateway.close(conn));
    });
  });

  const sweep = setInterval(() => rooms.sweep(Date.now()), SWEEP_INTERVAL_MS);
  return new Promise((resolve) => {
    server.listen(opts.port, () => {
      resolve({
        server,
        port: (server.address() as AddressInfo).port,
        stop: () =>
          new Promise<void>((done) => {
            clearInterval(sweep);
            for (const client of wss.clients) client.terminate();
            wss.close();
            server.close(() => done());
          }),
      });
    });
  });
}

// Chạy trực tiếp (không phải được import trong test)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dist = fileURLToPath(new URL("../client/dist", import.meta.url));
  const port = Number(process.env.PORT) || 3000;
  const running = await startServer({ port, staticDir: existsSync(dist) ? dist : null });
  console.log(`PlayTogether server: http://localhost:${running.port} (WebSocket ${WS_PATH})`);
}
