// Giới hạn theo địa chỉ IP và kiểm tra Origin cho WebSocket (docs/bao-mat.md).
// Hàm thuần và lớp nhỏ, không đụng mạng, nên test được; nối vào server ở index.ts.

import type { IncomingMessage } from "node:http";

/** Số kết nối WebSocket cùng lúc tối đa từ một IP */
export const MAX_CONNECTIONS_PER_IP = 20;
/** Số lần mở WebSocket hoặc hỏi xem trước phòng tối đa mỗi phút từ một IP */
export const MAX_HITS_PER_MINUTE = 120;

const WINDOW_MS = 60 * 1000;

/**
 * IP của người gọi. Sau proxy (Render) địa chỉ thật nằm ở phần tử đầu `X-Forwarded-For`;
 * chỉ tin header này khi `trustProxy` bật, vì ngoài proxy ai cũng giả được.
 */
export function clientIp(req: Pick<IncomingMessage, "headers" | "socket">, trustProxy: boolean): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return (trustProxy && first) || req.socket.remoteAddress || "unknown";
}

const PRIVATE_HOST =
  /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/;

/**
 * Origin có được mở WebSocket không. Không có Origin (công cụ, test) thì cho qua vì không phải trình duyệt.
 * Có Origin thì phải cùng tên miền với `Host`, nằm trong `allowed`, hoặc là máy cục bộ/mạng LAN (dev, thử bằng điện thoại).
 */
export function isOriginAllowed(origin: string | undefined, host: string | undefined, allowed: string[]): boolean {
  if (!origin) return true;
  if (allowed.includes(origin)) return true;
  let originHost: string;
  try {
    originHost = new URL(origin).hostname;
  } catch {
    return false;
  }
  const requestHost = host?.replace(/:\d+$/, "");
  return originHost === requestHost || PRIVATE_HOST.test(originHost);
}

/** Đếm kết nối đang mở và số lần gọi trong phút vừa qua của từng IP */
export class IpLimiter {
  private readonly open = new Map<string, number>();
  private readonly hits = new Map<string, { start: number; count: number }>();

  /** Ghi một lần gọi; false nếu IP này gọi quá nhiều trong phút hiện tại */
  allowHit(ip: string, now: number): boolean {
    const h = this.hits.get(ip);
    if (!h || now - h.start >= WINDOW_MS) {
      this.hits.set(ip, { start: now, count: 1 });
      return true;
    }
    h.count++;
    return h.count <= MAX_HITS_PER_MINUTE;
  }

  /** Xin mở thêm một kết nối; false nếu IP đã đủ `MAX_CONNECTIONS_PER_IP` */
  tryOpen(ip: string): boolean {
    const n = this.open.get(ip) ?? 0;
    if (n >= MAX_CONNECTIONS_PER_IP) return false;
    this.open.set(ip, n + 1);
    return true;
  }

  release(ip: string): void {
    const n = (this.open.get(ip) ?? 1) - 1;
    if (n <= 0) this.open.delete(ip);
    else this.open.set(ip, n);
  }

  /** Dọn các cửa sổ đã hết hạn để Map không phình mãi */
  sweep(now: number): void {
    for (const [ip, h] of this.hits) if (now - h.start >= WINDOW_MS) this.hits.delete(ip);
  }
}
