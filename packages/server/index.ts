// Điểm vào của server (kỹ thuật mục 2): HTTP + WebSocket tại /ws, lưu phòng trong RAM.
// Chạy trực tiếp bằng Node 24 (tự bỏ kiểu TypeScript): `node index.ts`.

import { existsSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { MAX_MESSAGE_BYTES, WS_PATH } from "@playtogether/protocol";
import { WebSocketServer } from "ws";
import { Gateway } from "./gateway.ts";
import { handleHttp } from "./http.ts";
import { clientIp, IpLimiter, isOriginAllowed } from "./ip-guard.ts";
import { getLanIp } from "./lan-ip.ts";
import { RoomManager } from "./room-manager.ts";

/** Chu kỳ dọn phòng bỏ trống */
const SWEEP_INTERVAL_MS = 60 * 1000;

export interface ServerOptions {
  port: number;
  /** Thư mục build của client để phục vụ file tĩnh; null khi dev (Vite lo) */
  staticDir: string | null;
  /** Tin `X-Forwarded-For` làm IP người gọi; chỉ bật khi chạy sau proxy (Render) */
  trustProxy?: boolean;
  /** Origin ngoài tên miền của chính server được phép mở WebSocket */
  allowedOrigins?: string[];
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
  const limiter = new IpLimiter();
  const trustProxy = opts.trustProxy ?? false;
  const allowedOrigins = opts.allowedOrigins ?? [];
  const server = createServer((req, res) => {
    // Dò mã phòng qua API xem trước bị giới hạn theo IP
    if (req.url?.startsWith("/api/rooms/") && !limiter.allowHit(clientIp(req, trustProxy), Date.now())) {
      res.writeHead(429);
      res.end();
      return;
    }
    // Lỗi bất ngờ ở một request chỉ làm hỏng request đó, không được làm sập cả server
    handleHttp(req, res, rooms, opts.staticDir).catch(() => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });
  // maxPayload chặn ngay ở tầng ws các gói lớn quá (mặc định ws nhận tới 100 MiB trước khi Gateway kiểm tra)
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES * 4 });

  server.on("upgrade", (req, socket, head) => {
    if (new URL(req.url ?? "/", "http://localhost").pathname !== WS_PATH) {
      socket.destroy();
      return;
    }
    const ip = clientIp(req, trustProxy);
    if (!isOriginAllowed(req.headers.origin, req.headers.host, allowedOrigins)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }
    if (!limiter.allowHit(ip, Date.now()) || !limiter.tryOpen(ip)) {
      socket.write("HTTP/1.1 429 Too Many Requests\r\n\r\n");
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
      // Gói quá lớn hoặc sai khung làm ws báo lỗi: ngắt kết nối đó, không để lỗi lan ra làm sập server
      ws.on("error", () => ws.terminate());
      ws.on("close", () => {
        limiter.release(ip);
        gateway.close(conn);
      });
    });
  });

  const sweep = setInterval(() => {
    rooms.sweep(Date.now());
    limiter.sweep(Date.now());
  }, SWEEP_INTERVAL_MS);
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
  const running = await startServer({
    port,
    staticDir: existsSync(dist) ? dist : null,
    // Render đặt biến RENDER; ở nơi khác đặt TRUST_PROXY=1 khi có proxy phía trước
    trustProxy: Boolean(process.env.RENDER) || process.env.TRUST_PROXY === "1",
    allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean),
  });
  const lanIp = getLanIp();
  console.log(`PlayTogether server: http://localhost:${running.port} (WebSocket ${WS_PATH})`);
  if (lanIp) console.log(`  LAN IP: http://${lanIp}:${running.port}`);
}
