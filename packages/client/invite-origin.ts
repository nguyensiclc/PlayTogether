// Địa chỉ gốc dùng trong link mời. Chủ phòng mở bằng localhost thì bạn bè không vào được,
// nên đổi localhost thành IP mạng LAN của máy chạy server (server báo qua /api/lan).

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const LAN_TIMEOUT_MS = 1500;

let lanOrigin: string | null = null;

/** Gọi một lần khi khởi động: nếu đang mở bằng localhost thì hỏi server IP LAN. Lỗi thì giữ nguyên origin. */
export async function loadInviteOrigin(): Promise<void> {
  if (!LOCAL_HOSTS.has(location.hostname)) return;
  try {
    const res = await fetch("/api/lan", { signal: AbortSignal.timeout(LAN_TIMEOUT_MS) });
    const body = (await res.json()) as { ip?: unknown };
    if (typeof body.ip === "string" && body.ip !== "") {
      const url = new URL(location.origin);
      url.hostname = body.ip;
      lanOrigin = url.origin;
    }
  } catch {
    // Không có mạng LAN hoặc server cũ: dùng origin hiện tại
  }
}

export function inviteOrigin(): string {
  return lanOrigin ?? location.origin;
}
