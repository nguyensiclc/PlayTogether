// Test tích hợp: bật server thật trên cổng ngẫu nhiên, hai client WebSocket chơi hết một ván (tiêu chí M3).

import { createRng, pickRandom } from "@playtogether/engine";
import { caro } from "@playtogether/engine/caro";
import { oAnQuan } from "@playtogether/engine/o-an-quan";
import type { ClientMessage, PublicRoom, RoomPreview, ServerMessage } from "@playtogether/protocol";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { type RunningServer, startServer } from "./index.ts";
import { asCaro, asCoVua, asOAnQuan } from "./test-utils.ts";

let srv: RunningServer;

beforeAll(async () => {
  srv = await startServer({ port: 0, staticDir: null });
});
afterAll(async () => {
  await srv.stop();
});

/** Client thử: gửi message, chờ message theo điều kiện */
class TestClient {
  private readonly ws: WebSocket;
  private readonly inbox: ServerMessage[] = [];
  private waiters: (() => void)[] = [];

  constructor(port: number) {
    this.ws = new WebSocket(`ws://localhost:${port}/ws`);
    this.ws.on("message", (data) => {
      this.inbox.push(JSON.parse(data.toString()) as ServerMessage);
      for (const w of this.waiters) w();
    });
  }

  ready(): Promise<void> {
    return new Promise((resolve) => this.ws.once("open", () => resolve()));
  }

  send(m: ClientMessage): void {
    this.ws.send(JSON.stringify(m));
  }

  /** Chờ message đầu tiên (kể từ chỉ số `from`) thoả điều kiện */
  async waitFor(pred: (m: ServerMessage) => boolean, from = 0): Promise<ServerMessage> {
    for (;;) {
      const found = this.inbox.slice(from).find(pred);
      if (found) return found;
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () =>
            reject(
              new Error(
                `hết thời gian chờ message; vừa nhận: ${JSON.stringify(this.inbox.slice(-2).map((m) => (m.type === "error" ? m : m.type)))}`,
              ),
            ),
          5000,
        );
        this.waiters.push(() => {
          clearTimeout(timer);
          resolve();
        });
      });
      this.waiters = [];
    }
  }

  get count(): number {
    return this.inbox.length;
  }

  close(): void {
    this.ws.close();
  }
}

const roomOf = (m: ServerMessage): PublicRoom => {
  if (!("room" in m)) throw new Error(`message không có room: ${m.type}`);
  return m.room;
};

describe("server thật qua WebSocket", () => {
  it("tạo phòng, xem trước bằng HTTP, vào bằng mã, chơi hết ván, ván nữa", async () => {
    const host = new TestClient(srv.port);
    const guest = new TestClient(srv.port);
    await Promise.all([host.ready(), guest.ready()]);
    host.send({ type: "hello", clientId: "it-host-0001", name: "Cò Trắng 42" });
    guest.send({ type: "hello", clientId: "it-guest-0001", name: "Mèo Mun" });

    host.send({ type: "createRoom", gameId: "o-an-quan" });
    const code = roomOf(await host.waitFor((m) => m.type === "roomJoined")).code;

    const preview = (await (await fetch(`http://localhost:${srv.port}/api/rooms/${code}`)).json()) as RoomPreview;
    expect(preview).toMatchObject({ code, hostName: "Cò Trắng 42", players: ["Cò Trắng 42"], freeSeats: 1 });

    guest.send({ type: "joinRoom", code });
    await guest.waitFor((m) => m.type === "roomJoined");
    host.send({ type: "start" });
    let room = asOAnQuan(roomOf(await host.waitFor((m) => m.type === "gameStarted")));

    // Hai bên luân phiên đi nước ngẫu nhiên tới hết ván; state hai bên luôn giống nhau
    const rng = createRng(11);
    const seatOf = new Map([
      [0, host],
      [1, guest],
    ]);
    const hostSeat = (await host.waitFor((m) => m.type === "gameStarted")) as Extract<
      ServerMessage,
      { type: "gameStarted" }
    >;
    if (hostSeat.you.seat === 1) seatOf.set(0, guest).set(1, host);
    while (room.status === "playing") {
      const game = room.game!;
      const seat = game.controller[game.turn];
      const player = seatOf.get(seat)!;
      const sows = oAnQuan.validMoves(game, seat).filter((m) => m.kind === "sow");
      const fromHost = host.count;
      const fromGuest = guest.count;
      player.send({ type: "move", move: pickRandom(sows, rng)!, actionNo: room.actionNo });
      const a = asOAnQuan(roomOf(await host.waitFor((m) => m.type === "moveApplied", fromHost)));
      const b = asOAnQuan(roomOf(await guest.waitFor((m) => m.type === "moveApplied", fromGuest)));
      expect(b.game).toEqual(a.game);
      room = a;
    }
    expect(room.status).toBe("finished");

    const fromHost = host.count;
    host.send({ type: "rematch" });
    guest.send({ type: "rematch" });
    const again = asOAnQuan(roomOf(await host.waitFor((m) => m.type === "gameStarted", fromHost)));
    expect(again.game!.controller[0]).toBe(room.nextFirst);
    host.close();
    guest.close();
  });

  it("Cờ caro: tạo phòng, xem trước bằng HTTP có gameId, chơi tới hết ván, ván nữa (người thua đi trước)", async () => {
    const host = new TestClient(srv.port);
    const guest = new TestClient(srv.port);
    await Promise.all([host.ready(), guest.ready()]);
    host.send({ type: "hello", clientId: "caro-host-0001", name: "Cò Trắng 42" });
    guest.send({ type: "hello", clientId: "caro-guest-0001", name: "Mèo Mun" });
    host.send({ type: "createRoom", gameId: "caro", options: { chanHaiDau: true } });
    const code = roomOf(await host.waitFor((m) => m.type === "roomJoined")).code;
    const preview = (await (await fetch(`http://localhost:${srv.port}/api/rooms/${code}`)).json()) as RoomPreview;
    expect(preview).toMatchObject({ code, gameId: "caro", players: ["Cò Trắng 42"], freeSeats: 1 });

    guest.send({ type: "joinRoom", code });
    await guest.waitFor((m) => m.type === "roomJoined");
    host.send({ type: "start" });
    const started = (await host.waitFor((m) => m.type === "gameStarted")) as Extract<
      ServerMessage,
      { type: "gameStarted" }
    >;
    let room = asCaro(started.room);
    expect(room.options.chanHaiDau).toBe(true);
    const clients = new Map<number, TestClient>([
      [started.you.seat ?? 0, host],
      [1 - (started.you.seat ?? 0), guest],
    ]);

    const rng = createRng(23);
    while (room.status === "playing") {
      // Đi nhịp như người chơi: server ngắt kết nối gửi quá 20 message mỗi giây
      await new Promise((r) => setTimeout(r, 40));
      const game = room.game!;
      const seat = game.players[game.turn];
      const fromHost = host.count;
      const fromGuest = guest.count;
      clients
        .get(seat)!
        .send({ type: "move", move: pickRandom(caro.validMoves(game, seat), rng)!, actionNo: room.actionNo });
      const a = asCaro(roomOf(await host.waitFor((m) => m.type === "moveApplied", fromHost)));
      const b = asCaro(roomOf(await guest.waitFor((m) => m.type === "moveApplied", fromGuest)));
      expect(b.game).toEqual(a.game);
      room = a;
    }
    expect(room.game?.result?.reason).toMatch(/nam-quan|het-ban/);

    const fromHost = host.count;
    host.send({ type: "rematch" });
    guest.send({ type: "rematch" });
    const again = asCaro(roomOf(await host.waitFor((m) => m.type === "gameStarted", fromHost)));
    expect(again.game?.players[0]).toBe(room.nextFirst);
    host.close();
    guest.close();
  }, 30_000);

  it("Cờ vua: tạo phòng, đi quân qua WebSocket, đồng bộ trạng thái, xin thua và ván nữa", async () => {
    const host = new TestClient(srv.port);
    const guest = new TestClient(srv.port);
    await Promise.all([host.ready(), guest.ready()]);

    host.send({ type: "hello", clientId: "co-vua-host-0001", name: "Trắng" });
    guest.send({ type: "hello", clientId: "co-vua-guest-0001", name: "Đen" });

    host.send({ type: "createRoom", gameId: "co-vua" });
    const code = roomOf(await host.waitFor((m) => m.type === "roomJoined")).code;

    guest.send({ type: "joinRoom", code });
    await guest.waitFor((m) => m.type === "roomJoined");

    const fromHostStart = host.count;
    const fromGuestStart = guest.count;
    host.send({ type: "start" });
    const started = (await host.waitFor((m) => m.type === "gameStarted", fromHostStart)) as Extract<
      ServerMessage,
      { type: "gameStarted" }
    >;
    await guest.waitFor((m) => m.type === "gameStarted", fromGuestStart);

    let room = asCoVua(started.room);
    expect(room.gameId).toBe("co-vua");
    expect(room.game?.turn).toBe("w");

    const whiteClient = room.game!.players[0] === 0 ? host : guest;
    const blackClient = room.game!.players[0] === 0 ? guest : host;

    // Nước 1: Trắng đi e2 -> e4 (12 -> 28)
    const fromHostMove1 = host.count;
    const fromGuestMove1 = guest.count;
    whiteClient.send({ type: "move", move: { from: 12, to: 28 }, actionNo: room.actionNo });

    const move1Host = (await host.waitFor((m) => m.type === "moveApplied", fromHostMove1)) as Extract<
      ServerMessage,
      { type: "moveApplied" }
    >;
    const move1Guest = (await guest.waitFor((m) => m.type === "moveApplied", fromGuestMove1)) as Extract<
      ServerMessage,
      { type: "moveApplied" }
    >;
    expect(move1Host.gameId).toBe("co-vua");
    expect(move1Guest.gameId).toBe("co-vua");

    room = asCoVua(move1Host.room);
    expect(room.game?.turn).toBe("b");
    expect(room.game?.board[28]?.type).toBe("p");

    // Nước 2: Đen đi e7 -> e5 (52 -> 36)
    const fromHostMove2 = host.count;
    const fromGuestMove2 = guest.count;
    blackClient.send({ type: "move", move: { from: 52, to: 36 }, actionNo: room.actionNo });

    const move2Host = (await host.waitFor((m) => m.type === "moveApplied", fromHostMove2)) as Extract<
      ServerMessage,
      { type: "moveApplied" }
    >;
    await guest.waitFor((m) => m.type === "moveApplied", fromGuestMove2);
    room = asCoVua(move2Host.room);
    expect(room.game?.turn).toBe("w");

    // Guest (ghế 1) rời phòng -> Host (ghế 0) thắng
    const fromHostLeave = host.count;
    guest.send({ type: "leaveRoom" });
    const finishedRoom = asCoVua(roomOf(await host.waitFor((m) => m.type === "roomUpdated", fromHostLeave)));
    expect(finishedRoom.status).toBe("finished");
    expect(finishedRoom.game?.result?.winner).toBe(0);

    host.close();
    guest.close();
  }, 30_000);

  it("đường dẫn WebSocket khác /ws bị từ chối; phòng không có thì HTTP 404", async () => {
    const res = await fetch(`http://localhost:${srv.port}/api/rooms/ZZZZ`);
    expect(res.status).toBe(404);
    const bad = new WebSocket(`ws://localhost:${srv.port}/khac`);
    await expect(new Promise((resolve, reject) => bad.on("error", reject).on("open", resolve))).rejects.toBeDefined();
  });

  it("GET /api/lan-ip trả về IP nội bộ của server", async () => {
    const res = await fetch(`http://localhost:${srv.port}/api/lan-ip`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { lanIp: string | null };
    expect(data).toHaveProperty("lanIp");
  });
});
