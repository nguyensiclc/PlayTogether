// Phần HTTP của server (kỹ thuật mục 2): xem trước phòng cho màn nhập nickname, phục vụ file tĩnh của client.

import { readFile, stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import type { RoomPreview } from "@playtogether/protocol";
import { normalizeRoomCode } from "@playtogether/protocol";
import { lanAddress } from "./lan.ts";
import type { RoomManager } from "./room-manager.ts";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
};

const ROOM_API = /^\/api\/rooms\/([^/]+)$/;

/** Xử lý một request HTTP. `staticDir` là thư mục build của client; null khi chạy dev (Vite lo phần tĩnh). */
export async function handleHttp(
  req: IncomingMessage,
  res: ServerResponse,
  rooms: RoomManager,
  staticDir: string | null,
): Promise<void> {
  const path = new URL(req.url ?? "/", "http://localhost").pathname;
  const api = ROOM_API.exec(path);
  if (api) return sendPreview(res, rooms, decodeURIComponent(api[1] ?? ""));
  if (path === "/api/lan")
    return send(res, 200, "application/json; charset=utf-8", JSON.stringify({ ip: lanAddress() }));
  if (path === "/healthz") return send(res, 200, "text/plain; charset=utf-8", "ok");
  if (!staticDir)
    return send(res, 404, "text/plain; charset=utf-8", "Chạy client bằng npm run dev, hoặc npm run build trước.");
  return serveStatic(res, staticDir, path);
}

function sendPreview(res: ServerResponse, rooms: RoomManager, rawCode: string): void {
  const code = normalizeRoomCode(rawCode);
  const room = code ? rooms.get(code) : undefined;
  if (!room) {
    send(res, 404, "application/json; charset=utf-8", JSON.stringify({ error: "ROOM_NOT_FOUND" }));
    return;
  }
  const view = room.view();
  const preview: RoomPreview = {
    code: room.code,
    gameId: room.gameId,
    hostName: room.hostName(),
    players: view.seats.flatMap((m) => (m ? [m.name] : [])),
    freeSeats: view.seats.filter((m) => m === null).length,
    status: view.status,
  };
  send(res, 200, "application/json; charset=utf-8", JSON.stringify(preview));
}

/** File tĩnh; đường dẫn không có đuôi (vd /r/ABCD) thì trả về index.html để client tự định tuyến */
async function serveStatic(res: ServerResponse, root: string, path: string): Promise<void> {
  const file = normalize(join(root, decodeURIComponent(path)));
  // Chặn đường dẫn thoát ra ngoài thư mục build (vd /../../)
  if (file !== root && !file.startsWith(root + sep)) return send(res, 403, "text/plain; charset=utf-8", "Forbidden");
  const target = extname(file) && (await isFile(file)) ? file : join(root, "index.html");
  try {
    const body = await readFile(target);
    res.writeHead(200, { "content-type": MIME[extname(target)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    send(res, 404, "text/plain; charset=utf-8", "Not found");
  }
}

async function isFile(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

function send(res: ServerResponse, status: number, type: string, body: string): void {
  res.writeHead(status, { "content-type": type });
  res.end(body);
}
