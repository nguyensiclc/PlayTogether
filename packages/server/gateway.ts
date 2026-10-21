// Điều phối message WebSocket (kỹ thuật mục 7): kiểm tra, gọi phòng, gửi kết quả cho từng người trong phòng.
// Làm việc qua interface `Connection` nên test được mà không cần mạng thật.

import type { Rng } from "@playtogether/engine";
import type { ClientMessage, ServerMessage } from "@playtogether/protocol";
import { MAX_MESSAGE_BYTES, normalizeName, normalizeRoomCode } from "@playtogether/protocol";
import { parseClientMessage } from "./parse.ts";
import { RoomError } from "./room.ts";
import type { GameRoom, RoomManager } from "./room-manager.ts";

export interface Connection {
  send(message: ServerMessage): void;
  close(reason: string): void;
}

/** Tối đa 20 message / giây mỗi kết nối, vượt quá thì ngắt (kỹ thuật mục 10) */
export const RATE_LIMIT_PER_SECOND = 20;

interface ConnState {
  clientId: string | null;
  name: string;
  roomCode: string | null;
  windowStart: number;
  count: number;
}

export interface GatewayDeps {
  rooms: RoomManager;
  rng: Rng;
  now: () => number;
}

type Handlers = {
  [K in ClientMessage["type"]]: (conn: Connection, s: ConnState, m: Extract<ClientMessage, { type: K }>) => void;
};

export class Gateway {
  private readonly conns = new Map<Connection, ConnState>();
  private readonly deps: GatewayDeps;

  constructor(deps: GatewayDeps) {
    this.deps = deps;
  }

  open(conn: Connection): void {
    this.conns.set(conn, { clientId: null, name: "", roomCode: null, windowStart: this.deps.now(), count: 0 });
  }

  /** Kết nối đóng: người đó mất kết nối nhưng vẫn giữ ghế (Q22e) */
  close(conn: Connection): void {
    const s = this.conns.get(conn);
    this.conns.delete(conn);
    if (s) this.detach(s);
  }

  message(conn: Connection, text: string): void {
    const s = this.conns.get(conn);
    if (!s) return;
    if (text.length > MAX_MESSAGE_BYTES || this.overLimit(s)) {
      conn.send({ type: "error", code: "RATE_LIMITED", message: "Gửi quá nhiều hoặc quá lớn" });
      conn.close("rate-limited");
      return;
    }
    const msg = parseClientMessage(text);
    if (!msg) {
      this.fail(conn, "BAD_MESSAGE");
      return;
    }
    if (msg.type !== "hello" && !s.clientId) {
      this.fail(conn, "HELLO_FIRST");
      return;
    }
    try {
      (this.handlers[msg.type] as (c: Connection, s: ConnState, m: ClientMessage) => void)(conn, s, msg);
    } catch (e) {
      if (!(e instanceof RoomError)) throw e;
      this.fail(conn, e.code, e.message);
    }
  }

  private readonly handlers: Handlers = {
    hello: (conn, s, m) => {
      const name = normalizeName(m.name);
      if (!name) return this.fail(conn, "BAD_MESSAGE", "Tên không hợp lệ");
      s.clientId = m.clientId;
      s.name = name;
      // Đổi tên khi đang ở trong phòng thì cập nhật cho mọi người
      const room = this.roomOf(s);
      if (room?.hasMember(m.clientId)) {
        room.join({ clientId: m.clientId, name }, this.deps.now());
        this.broadcast(room);
      }
    },
    createRoom: (conn, s, m) => {
      this.detach(s);
      const room = this.deps.rooms.create(this.joiner(s), m.gameId, m.options, this.deps.now());
      s.roomCode = room.code;
      this.sendTo(conn, s, room, "roomJoined");
    },
    joinRoom: (conn, s, m) => {
      const code = normalizeRoomCode(m.code);
      const room = code ? this.deps.rooms.get(code) : undefined;
      if (!room) return this.fail(conn, "ROOM_NOT_FOUND", "Không tìm thấy phòng");
      if (s.roomCode !== room.code) this.detach(s);
      room.join(this.joiner(s), this.deps.now());
      s.roomCode = room.code;
      this.sendTo(conn, s, room, "roomJoined");
      this.broadcast(room, conn);
    },
    takeSeat: (_conn, s, m) => this.act(s, (room, id) => room.takeSeat(id, m.seat)),
    leaveSeat: (_conn, s) => this.act(s, (room, id) => room.leaveSeat(id)),
    setOptions: (_conn, s, m) => this.act(s, (room, id) => room.setOptions(id, m.options)),
    start: (_conn, s) => this.act(s, (room, id) => room.start(id, this.deps.rng), "gameStarted"),
    rematch: (_conn, s) => {
      const room = this.requireRoom(s);
      const started = room.rematch(this.idOf(s), this.deps.rng);
      this.broadcast(room, null, started ? "gameStarted" : "roomUpdated");
    },
    move: (_conn, s, m) => {
      const room = this.requireRoom(s);
      const { seat, events } = room.move(this.idOf(s), m.move, m.actionNo);
      for (const [c, cs] of this.inRoom(room)) {
        c.send({ type: "moveApplied", seat, move: m.move, events, room: room.view(), you: room.you(this.idOf(cs)) });
      }
    },
    leaveRoom: (_conn, s) => {
      const room = this.requireRoom(s);
      // Lấy các tab của người rời trước khi rời, vì sau đó họ không còn là thành viên
      const leaverTabs = [...this.inRoom(room)].filter(([, cs]) => cs.clientId === s.clientId);
      room.leave(this.idOf(s), this.deps.now());
      for (const [c, cs] of leaverTabs) {
        cs.roomCode = null;
        c.send({ type: "leftRoom" });
      }
      if (room.isEmpty()) this.deps.rooms.delete(room.code);
      else this.broadcast(room);
    },
  };

  /** Thao tác trên phòng rồi gửi phòng mới cho mọi người */
  private act(
    s: ConnState,
    fn: (room: GameRoom, clientId: string) => void,
    type: "roomUpdated" | "gameStarted" = "roomUpdated",
  ): void {
    const room = this.requireRoom(s);
    fn(room, this.idOf(s));
    this.broadcast(room, null, type);
  }

  /** Rời phòng hiện tại về mặt kết nối: nếu người đó không còn tab nào trong phòng thì đánh dấu mất kết nối */
  private detach(s: ConnState): void {
    const room = this.roomOf(s);
    s.roomCode = null;
    if (!room || !s.clientId || !room.hasMember(s.clientId)) return;
    const stillHere = [...this.inRoom(room)].some(([, cs]) => cs.clientId === s.clientId);
    if (stillHere) return;
    room.disconnect(s.clientId, this.deps.now());
    this.broadcast(room);
  }

  private broadcast(
    room: GameRoom,
    except: Connection | null = null,
    type: "roomUpdated" | "gameStarted" = "roomUpdated",
  ): void {
    for (const [c, cs] of this.inRoom(room)) if (c !== except) this.sendTo(c, cs, room, type);
  }

  private sendTo(
    conn: Connection,
    s: ConnState,
    room: GameRoom,
    type: "roomJoined" | "roomUpdated" | "gameStarted",
  ): void {
    const you = room.you(this.idOf(s));
    conn.send({ type, room: room.view(you.seat), you });
  }

  private *inRoom(room: GameRoom): Generator<[Connection, ConnState]> {
    for (const entry of this.conns) {
      if (entry[1].roomCode === room.code && entry[1].clientId && room.hasMember(entry[1].clientId)) yield entry;
    }
  }

  private roomOf(s: ConnState): GameRoom | undefined {
    return s.roomCode ? this.deps.rooms.get(s.roomCode) : undefined;
  }

  private requireRoom(s: ConnState): GameRoom {
    const room = this.roomOf(s);
    if (!room) throw new RoomError("NOT_IN_ROOM");
    return room;
  }

  private idOf(s: ConnState): string {
    if (!s.clientId) throw new RoomError("HELLO_FIRST");
    return s.clientId;
  }

  private joiner(s: ConnState) {
    return { clientId: this.idOf(s), name: s.name };
  }

  private overLimit(s: ConnState): boolean {
    const now = this.deps.now();
    if (now - s.windowStart >= 1000) {
      s.windowStart = now;
      s.count = 0;
    }
    s.count++;
    return s.count > RATE_LIMIT_PER_SECOND;
  }

  private fail(
    conn: Connection,
    code: Extract<ServerMessage, { type: "error" }>["code"],
    message: string = code,
  ): void {
    conn.send({ type: "error", code, message });
  }
}
