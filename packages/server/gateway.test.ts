// Test gateway, đọc message và quản lý phòng với kết nối giả (không cần mạng).

import { createRng } from "@playtogether/engine";
import { oAnQuan } from "@playtogether/engine/o-an-quan";
import type { ClientMessage, ServerMessage } from "@playtogether/protocol";
import { ROOM_CODE_ALPHABET } from "@playtogether/protocol";
import { describe, expect, it } from "vitest";
import { type Connection, Gateway, RATE_LIMIT_PER_SECOND } from "./gateway.ts";
import { parseClientMessage } from "./parse.ts";
import { EMPTY_ROOM_TTL_MS, RoomManager } from "./room-manager.ts";
import { asCaro, asOAnQuan } from "./test-utils.ts";

class FakeConn implements Connection {
  readonly inbox: ServerMessage[] = [];
  closed: string | null = null;
  send(message: ServerMessage): void {
    this.inbox.push(message);
  }
  close(reason: string): void {
    this.closed = reason;
  }
  last<T extends ServerMessage["type"]>(type: T): Extract<ServerMessage, { type: T }> {
    const found = [...this.inbox].reverse().find((m) => m.type === type);
    if (!found) throw new Error(`chưa nhận ${type}`);
    return found as Extract<ServerMessage, { type: T }>;
  }
}

function setup() {
  let t = 1_000;
  const rooms = new RoomManager(createRng(7));
  const gw = new Gateway({ rooms, rng: createRng(9), now: () => t });
  const connect = (clientId: string, name: string) => {
    const c = new FakeConn();
    gw.open(c);
    send(c, { type: "hello", clientId, name });
    return c;
  };
  const send = (c: FakeConn, m: ClientMessage) => gw.message(c, JSON.stringify(m));
  const tick = (ms: number) => {
    t += ms;
  };
  return { gw, rooms, connect, send, tick };
}

describe("parseClientMessage", () => {
  it("nhận message đúng định dạng", () => {
    expect(parseClientMessage('{"type":"move","move":{"kind":"sow","square":3,"dir":1},"actionNo":2}')).toEqual({
      type: "move",
      move: { kind: "sow", square: 3, dir: 1 },
      actionNo: 2,
    });
    expect(parseClientMessage('{"type":"hello","clientId":"abcd-1234-efgh","name":"Mèo"}')?.type).toBe("hello");
    expect(parseClientMessage('{"type":"createRoom","gameId":"caro"}')).toEqual({ type: "createRoom", gameId: "caro" });
    expect(parseClientMessage('{"type":"move","move":{"x":1,"y":2},"actionNo":4}')).toEqual({
      type: "move",
      move: { x: 1, y: 2 },
      actionNo: 4,
    });
  });

  it("từ chối JSON hỏng, loại lạ, thiếu trường, sai kiểu", () => {
    for (const bad of [
      "không phải json",
      "[]",
      '{"type":"xoaPhong"}',
      '{"type":"__proto__"}',
      '{"type":"hello","clientId":"ngắn","name":"A"}',
      '{"type":"move","move":{"kind":"sow","square":3,"dir":1}}',
      '{"type":"takeSeat","seat":"0"}',
      '{"type":"createRoom","gameId":"co-tuong"}',
      '{"type":"move","move":"3,4","actionNo":1}',
      '{"type":"move","move":{"x":1,"y":2}}',
    ]) {
      expect(parseClientMessage(bad), bad).toBeNull();
    }
  });
});

describe("mỗi người chỉ làm chủ một phòng", () => {
  it("tạo phòng thứ hai khi đang là chủ phòng khác: ALREADY_HOSTING kèm mã phòng cũ, không tạo thêm", () => {
    const { connect, send, rooms } = setup();
    const a = connect("host-aaaa-1111", "A");
    send(a, { type: "createRoom", gameId: "caro" });
    const code = a.last("roomJoined").room.code;
    const again = connect("host-aaaa-1111", "A");
    send(again, { type: "createRoom", gameId: "o-an-quan" });
    expect(again.last("error")).toMatchObject({ code: "ALREADY_HOSTING", message: code });
    expect(rooms.size).toBe(1);
  });

  it("người khác vẫn tạo được; chủ phòng rời đi (phòng bị xoá) thì tạo lại được", () => {
    const { connect, send, rooms } = setup();
    const a = connect("host-aaaa-1111", "A");
    send(a, { type: "createRoom", gameId: "caro" });
    const b = connect("host-bbbb-2222", "B");
    send(b, { type: "createRoom", gameId: "caro" });
    expect(rooms.size).toBe(2);
    send(a, { type: "leaveRoom" });
    send(a, { type: "createRoom", gameId: "caro" });
    expect(a.last("roomJoined").room.code).toBeTruthy();
    expect(rooms.size).toBe(2);
  });

  it("chủ phòng nhường chủ cho người khác rồi (rời phòng còn người) thì tạo phòng mới được", () => {
    const { connect, send } = setup();
    const a = connect("host-aaaa-1111", "A");
    send(a, { type: "createRoom", gameId: "caro" });
    const code = a.last("roomJoined").room.code;
    const b = connect("guest-bbb-2222", "B");
    send(b, { type: "joinRoom", code });
    send(a, { type: "leaveRoom" });
    send(a, { type: "createRoom", gameId: "o-an-quan" });
    expect(a.last("roomJoined").room.gameId).toBe("o-an-quan");
  });
});

describe("RoomManager", () => {
  it("mã phòng 4 ký tự trong bảng 31 ký tự, không trùng", () => {
    const rooms = new RoomManager(createRng(1));
    const codes = new Set<string>();
    for (let k = 0; k < 500; k++)
      codes.add(rooms.create({ clientId: `host-${k}-xxxx`, name: "A" }, "o-an-quan", {}, 0).code);
    expect(codes.size).toBe(500);
    for (const code of codes)
      expect([...code].every((c) => ROOM_CODE_ALPHABET.includes(c)) && code.length === 4).toBe(true);
  });

  it("dọn phòng không còn ai kết nối quá 10 phút", () => {
    const rooms = new RoomManager(createRng(1));
    const room = rooms.create({ clientId: "host-xxxx-1", name: "A" }, "o-an-quan", {}, 0);
    room.disconnect("host-xxxx-1", 0);
    expect(rooms.sweep(EMPTY_ROOM_TTL_MS - 1)).toEqual([]);
    expect(rooms.sweep(EMPTY_ROOM_TTL_MS)).toEqual([room.code]);
    expect(rooms.get(room.code)).toBeUndefined();
  });
});

describe("Gateway", () => {
  it("phải hello trước; tên rỗng bị từ chối", () => {
    const { gw, send } = setup();
    const c = new FakeConn();
    gw.open(c);
    send(c, { type: "createRoom", gameId: "o-an-quan" });
    expect(c.last("error").code).toBe("HELLO_FIRST");
    send(c, { type: "hello", clientId: "client-0001", name: "   " });
    expect(c.last("error").code).toBe("BAD_MESSAGE");
  });

  it("tạo phòng, người thứ hai vào bằng mã (không phân biệt hoa thường), cả hai thấy nhau", () => {
    const { connect, send } = setup();
    const host = connect("client-host-1", "Cò Trắng 42");
    send(host, { type: "createRoom", gameId: "o-an-quan", options: { latBan: true } });
    const code = host.last("roomJoined").room.code;
    expect(host.last("roomJoined").you.seat).toBe(0);
    expect(asOAnQuan(host.last("roomJoined").room).options.latBan).toBe(true);

    const guest = connect("client-guest-1", "  Mèo   Mun  ");
    send(guest, { type: "joinRoom", code: code.toLowerCase() });
    expect(guest.last("roomJoined").you.seat).toBe(1);
    expect(host.last("roomUpdated").room.seats.map((m) => m?.name)).toEqual(["Cò Trắng 42", "Mèo Mun"]);
  });

  it("mã phòng sai báo ROOM_NOT_FOUND", () => {
    const { connect, send } = setup();
    const c = connect("client-0001", "A");
    send(c, { type: "joinRoom", code: "ZZZZ" });
    expect(c.last("error").code).toBe("ROOM_NOT_FOUND");
  });

  it("chơi qua gateway: nước đi gửi cho cả hai, actionNo cũ bị STALE_MOVE", () => {
    const { connect, send } = setup();
    const host = connect("client-host-1", "A");
    send(host, { type: "createRoom", gameId: "o-an-quan" });
    const guest = connect("client-guest-1", "B");
    send(guest, { type: "joinRoom", code: host.last("roomJoined").room.code });
    send(host, { type: "start" });
    const started = host.last("gameStarted");
    expect(guest.last("gameStarted").room.actionNo).toBe(started.room.actionNo);
    const game = asOAnQuan(started.room).game!;
    const moverSeat = game.controller[game.turn];
    const mover = moverSeat === host.last("gameStarted").you.seat ? host : guest;
    const move = oAnQuan.validMoves(game, moverSeat).find((m) => m.kind === "sow")!;
    send(mover, { type: "move", move, actionNo: started.room.actionNo });
    expect(host.last("moveApplied").events.length).toBeGreaterThan(0);
    expect(guest.last("moveApplied").room.actionNo).toBe(started.room.actionNo + 1);
    send(mover, { type: "move", move, actionNo: started.room.actionNo });
    expect(mover.last("error").code).toBe("STALE_MOVE");
  });

  it("đóng kết nối: người đó mất kết nối nhưng giữ ghế; vào lại thì nối tiếp", () => {
    const { gw, connect, send } = setup();
    const host = connect("client-host-1", "A");
    send(host, { type: "createRoom", gameId: "o-an-quan" });
    const code = host.last("roomJoined").room.code;
    const guest = connect("client-guest-1", "B");
    send(guest, { type: "joinRoom", code });
    gw.close(guest);
    expect(host.last("roomUpdated").room.seats[1]).toMatchObject({ name: "B", connected: false });
    const again = connect("client-guest-1", "B");
    send(again, { type: "joinRoom", code });
    expect(again.last("roomJoined").you.seat).toBe(1);
    expect(host.last("roomUpdated").room.seats[1]?.connected).toBe(true);
  });

  it("rời phòng: người rời nhận leftRoom, người còn lại thành chủ phòng; phòng rỗng thì xoá", () => {
    const { connect, send, rooms } = setup();
    const host = connect("client-host-1", "A");
    send(host, { type: "createRoom", gameId: "o-an-quan" });
    const code = host.last("roomJoined").room.code;
    const guest = connect("client-guest-1", "B");
    send(guest, { type: "joinRoom", code });
    send(host, { type: "leaveRoom" });
    expect(host.last("leftRoom")).toEqual({ type: "leftRoom" });
    const v = guest.last("roomUpdated");
    expect(v.room.hostId).toBe(v.you.memberId);
    send(guest, { type: "leaveRoom" });
    expect(rooms.get(code)).toBeUndefined();
  });

  it("quá 20 message trong 1 giây thì bị ngắt", () => {
    const { connect, send, tick } = setup();
    const c = connect("client-0001", "A");
    for (let k = 0; k < RATE_LIMIT_PER_SECOND - 1; k++) send(c, { type: "leaveSeat" });
    expect(c.closed).toBeNull();
    send(c, { type: "leaveSeat" });
    expect(c.closed).toBe("rate-limited");
    tick(1000);
  });

  it("hai game cùng chạy trong một server: phòng Caro và phòng Ô ăn quan độc lập", () => {
    const { connect, send } = setup();
    const a = connect("client-host-aaa", "A");
    const b = connect("client-host-bbb", "B");
    send(a, { type: "createRoom", gameId: "caro", options: { kichThuoc: 19, chanHaiDau: true } });
    send(b, { type: "createRoom", gameId: "o-an-quan" });
    const caroRoom = asCaro(a.last("roomJoined").room);
    const oaqRoom = asOAnQuan(b.last("roomJoined").room);
    expect(caroRoom.code).not.toBe(oaqRoom.code);
    expect(caroRoom.options).toMatchObject({ kichThuoc: 19, chanHaiDau: true });
    expect(oaqRoom.options.giaTriQuan).toBe(10);
  });

  it("chơi Cờ caro qua gateway tới khi thắng; nước sai hình dạng và sai luật bị từ chối", () => {
    const { connect, send } = setup();
    const host = connect("client-host-1", "A");
    send(host, { type: "createRoom", gameId: "caro" });
    const guest = connect("client-guest-1", "B");
    send(guest, { type: "joinRoom", code: host.last("roomJoined").room.code });
    send(host, { type: "start" });
    const started = asCaro(host.last("gameStarted").room);
    const game = started.game!;
    const [xSeat, oSeat] = game.players;
    const byConn = (seat: number) => (seat === host.last("gameStarted").you.seat ? host : guest);
    let actionNo = started.actionNo;
    const step = (seat: number, x: number, y: number) => {
      send(byConn(seat), { type: "move", move: { x, y }, actionNo });
      actionNo++;
    };
    // Nước của Ô ăn quan gửi vào phòng Caro: sai hình dạng
    send(byConn(xSeat), { type: "move", move: { kind: "sow", square: 3, dir: 1 }, actionNo });
    expect(byConn(xSeat).last("error").code).toBe("INVALID_MOVE");
    // Ngoài bàn: đúng hình dạng nhưng sai luật
    send(byConn(xSeat), { type: "move", move: { x: 99, y: 0 }, actionNo });
    expect(byConn(xSeat).last("error").code).toBe("INVALID_MOVE");
    // Sai lượt
    send(byConn(oSeat), { type: "move", move: { x: 0, y: 0 }, actionNo });
    expect(byConn(oSeat).last("error").code).toBe("NOT_YOUR_TURN");

    for (let k = 0; k < 4; k++) {
      step(xSeat, 3 + k, 3);
      step(oSeat, 3 + k, 5);
    }
    step(xSeat, 7, 3);
    const last = host.last("moveApplied");
    expect(last.gameId).toBe("caro");
    if (last.gameId !== "caro") return;
    expect(last.events.map((e) => e.t)).toEqual(["place", "win", "gameOver"]);
    expect(last.room.status).toBe("finished");
    expect(last.room.game?.result).toMatchObject({ winner: xSeat, reason: "nam-quan" });
    expect(guest.last("moveApplied").room.actionNo).toBe(last.room.actionNo);
    // Ván đã kết thúc
    send(byConn(oSeat), { type: "move", move: { x: 0, y: 0 }, actionNo });
    expect(byConn(oSeat).last("error").code).toBe("WRONG_STATUS");
  });

  it("message quá 4KB bị ngắt", () => {
    const { gw, connect } = setup();
    const c = connect("client-0001", "A");
    gw.message(c, JSON.stringify({ type: "hello", clientId: "client-0001", name: "x".repeat(5000) }));
    expect(c.closed).toBe("rate-limited");
  });
});
