// Test tích hợp: bật server thật trên cổng ngẫu nhiên, hai client WebSocket chơi hết một ván (tiêu chí M3).

import { createRng, pickRandom } from "@playtogether/engine";
import { caro } from "@playtogether/engine/caro";
import { oAnQuan } from "@playtogether/engine/o-an-quan";
import type { ClientMessage, PublicRoom, RoomPreview, ServerMessage } from "@playtogether/protocol";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { type RunningServer, startServer } from "./index.ts";
import { asCaro, asOAnQuan } from "./test-utils.ts";

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

  it("đường dẫn WebSocket khác /ws bị từ chối; phòng không có thì HTTP 404", async () => {
    const res = await fetch(`http://localhost:${srv.port}/api/rooms/ZZZZ`);
    expect(res.status).toBe(404);
    const bad = new WebSocket(`ws://localhost:${srv.port}/khac`);
    await expect(new Promise((resolve, reject) => bad.on("error", reject).on("open", resolve))).rejects.toBeDefined();
  });
});
