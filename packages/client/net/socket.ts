// Kết nối WebSocket tới server, tự kết nối lại (Q22e): thử lại mỗi 2 giây, và thử ngay khi tab hiện lên lại.
// Mỗi lần nối lại đều gửi lại các message "vào lại" (hello + joinRoom) để server khôi phục đúng ghế.

import type { ClientMessage, ServerMessage } from "@playtogether/protocol";
import { WS_PATH } from "@playtogether/protocol";

/** Thử kết nối lại sau mỗi chừng này (Q22e) */
const RECONNECT_MS = 2000;

export type SocketStatus = "connecting" | "open" | "closed";

export class GameSocket {
  private ws: WebSocket | null = null;
  private retry: number | null = null;
  private status: SocketStatus = "closed";
  private readonly url: string;
  /** Các message gửi ngay mỗi khi (nối lại) thành công */
  private resume: () => ClientMessage[];
  private readonly messageListeners = new Set<(m: ServerMessage) => void>();
  private readonly statusListeners = new Set<(s: SocketStatus) => void>();
  private readonly onVisible = () => {
    if (document.visibilityState === "visible" && this.status === "closed") this.connect();
  };

  constructor(resume: () => ClientMessage[]) {
    this.resume = resume;
    this.url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}${WS_PATH}`;
    document.addEventListener("visibilitychange", this.onVisible);
  }

  /** Đổi danh sách message gửi khi nối lại (vd sau khi tạo phòng xong thì là joinRoom phòng mới) */
  setResume(resume: () => ClientMessage[]): void {
    this.resume = resume;
  }

  connect(): void {
    if (this.status !== "closed") return;
    this.clearRetry();
    this.setStatus("connecting");
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.addEventListener("open", () => {
      this.setStatus("open");
      for (const m of this.resume()) this.send(m);
    });
    ws.addEventListener("message", (e) => {
      const message = JSON.parse(String(e.data)) as ServerMessage;
      for (const fn of this.messageListeners) fn(message);
    });
    ws.addEventListener("close", () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.setStatus("closed");
      this.retry = window.setTimeout(() => this.connect(), RECONNECT_MS);
    });
  }

  /** Gửi nếu đang kết nối. Lúc mất kết nối giao diện đã khoá thao tác, nên không cần xếp hàng. */
  send(message: ClientMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(message));
    return true;
  }

  onMessage(fn: (m: ServerMessage) => void): () => void {
    this.messageListeners.add(fn);
    return () => this.messageListeners.delete(fn);
  }

  onStatus(fn: (s: SocketStatus) => void): () => void {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => this.statusListeners.delete(fn);
  }

  get isOpen(): boolean {
    return this.status === "open";
  }

  private setStatus(s: SocketStatus): void {
    this.status = s;
    for (const fn of this.statusListeners) fn(s);
  }

  private clearRetry(): void {
    if (this.retry !== null) clearTimeout(this.retry);
    this.retry = null;
  }
}
