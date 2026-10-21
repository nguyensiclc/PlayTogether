// Test lớp phòng (kỹ thuật mục 6, UX mục 2.3, Q22). Chạy với engine Ô ăn quan thật, không cần mạng.

import { createRng, pickRandom } from "@playtogether/engine";
import type { GameEvent, Move, Options, State } from "@playtogether/engine/o-an-quan";
import { oAnQuan } from "@playtogether/engine/o-an-quan";
import { describe, expect, it } from "vitest";
import { Room, RoomError } from "./room.ts";

type OAQRoom = Room<State, Move, Options, GameEvent>;

const HOST = { clientId: "c-host", name: "Cò Trắng 42" };
const GUEST = { clientId: "c-guest", name: "Mèo Mun" };
const VIEWER = { clientId: "c-viewer", name: "Sóc Nâu" };

function makeRoom(): OAQRoom {
  let n = 0;
  return new Room({
    code: "ABCD",
    gameId: "o-an-quan",
    module: oAnQuan,
    host: HOST,
    newMemberId: () => `m${++n}`,
    now: 0,
  });
}

function fullRoom(): OAQRoom {
  const room = makeRoom();
  room.join(GUEST, 1);
  return room;
}

/** Bắt lỗi RoomError và trả về mã lỗi */
function errorCode(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    if (e instanceof RoomError) return e.code;
    throw e;
  }
  throw new Error("không có lỗi");
}

/** Người đang được đi (clientId) */
function moverOf(room: OAQRoom): string {
  const v = room.view();
  const seat = v.game!.controller[v.game!.turn];
  return seat === 0 ? room.clientIdAtSeat(0)! : room.clientIdAtSeat(1)!;
}

/** Chơi ngẫu nhiên tới hết ván */
function playToEnd(room: OAQRoom, seed: number): void {
  const rng = createRng(seed);
  while (room.view().status === "playing") {
    const v = room.view();
    const seat = v.game!.controller[v.game!.turn];
    const sows = oAnQuan.validMoves(v.game!, seat).filter((m) => m.kind === "sow");
    room.move(moverOf(room), pickRandom(sows, rng)!, v.actionNo);
  }
}

describe("vào phòng và ghế", () => {
  it("chủ phòng ngồi ghế 1, người thứ hai tự ngồi ghế trống, người thứ ba thành người xem", () => {
    const room = fullRoom();
    room.join(VIEWER, 2);
    const v = room.view();
    expect(v.seats.map((s) => s?.name)).toEqual(["Cò Trắng 42", "Mèo Mun"]);
    expect(v.spectators.map((s) => s.name)).toEqual(["Sóc Nâu"]);
    expect(v.hostId).toBe(v.seats[0]!.id);
    expect(v.status).toBe("lobby");
    expect(room.you(VIEWER.clientId).seat).toBeNull();
    expect(room.you(GUEST.clientId).seat).toBe(1);
  });

  it("view công khai không lộ clientId", () => {
    const room = fullRoom();
    expect(JSON.stringify(room.view())).not.toContain("c-host");
    expect(JSON.stringify(room.view())).not.toContain("c-guest");
  });

  it("vào lại bằng cùng clientId: giữ nguyên ghế và mã công khai, cập nhật tên", () => {
    const room = fullRoom();
    const id = room.you(GUEST.clientId).memberId;
    room.disconnect(GUEST.clientId, 5);
    expect(room.view().seats[1]!.connected).toBe(false);
    room.join({ ...GUEST, name: "Mèo Đen" }, 6);
    expect(room.you(GUEST.clientId)).toEqual({ memberId: id, seat: 1 });
    expect(room.view().seats[1]).toEqual({ id, name: "Mèo Đen", connected: true });
  });

  it("người xem ngồi vào ghế trống; ghế đã có người thì báo SEAT_TAKEN", () => {
    const room = makeRoom();
    room.join(GUEST, 1);
    room.join(VIEWER, 2);
    expect(errorCode(() => room.takeSeat(VIEWER.clientId, 1))).toBe("SEAT_TAKEN");
    room.leaveSeat(GUEST.clientId);
    room.takeSeat(VIEWER.clientId, 1);
    expect(room.view().seats[1]!.name).toBe("Sóc Nâu");
    expect(room.view().spectators.map((s) => s.name)).toEqual(["Mèo Mun"]);
  });
});

describe("tuỳ chọn và bắt đầu", () => {
  it("chỉ chủ phòng chỉnh tuỳ chọn; giá trị sai bị bỏ qua", () => {
    const room = fullRoom();
    expect(errorCode(() => room.setOptions(GUEST.clientId, { latBan: true }))).toBe("NOT_HOST");
    room.setOptions(HOST.clientId, { latBan: true, giaTriQuan: 7 });
    expect(room.view().options).toMatchObject({ latBan: true, giaTriQuan: 10 });
  });

  it("chưa đủ 2 người thì không bắt đầu được; khách không bắt đầu được", () => {
    const room = makeRoom();
    expect(errorCode(() => room.start(HOST.clientId, createRng(1)))).toBe("NOT_ENOUGH_PLAYERS");
    room.join(GUEST, 1);
    expect(errorCode(() => room.start(GUEST.clientId, createRng(1)))).toBe("NOT_HOST");
  });

  it("bắt đầu: ván đầu chọn ngẫu nhiên người đi trước (bên A), actionNo tăng", () => {
    const firsts = new Set<number>();
    for (let seed = 1; seed <= 20; seed++) {
      const room = fullRoom();
      room.start(HOST.clientId, createRng(seed));
      const v = room.view();
      expect(v.status).toBe("playing");
      expect(v.actionNo).toBe(1);
      expect(v.game!.turn).toBe(0);
      firsts.add(v.game!.controller[0]);
    }
    expect([...firsts].sort()).toEqual([0, 1]);
  });

  it("đang chơi thì không chỉnh tuỳ chọn, không đổi ghế được", () => {
    const room = fullRoom();
    room.start(HOST.clientId, createRng(1));
    expect(errorCode(() => room.setOptions(HOST.clientId, { latBan: true }))).toBe("WRONG_STATUS");
    expect(errorCode(() => room.leaveSeat(GUEST.clientId))).toBe("WRONG_STATUS");
  });
});

describe("nước đi và actionNo (Q22c)", () => {
  it("đi đúng lượt thì actionNo tăng; sai người báo NOT_YOUR_TURN; actionNo cũ báo STALE_MOVE", () => {
    const room = fullRoom();
    room.start(HOST.clientId, createRng(3));
    const mover = moverOf(room);
    const other = mover === HOST.clientId ? GUEST.clientId : HOST.clientId;
    const move: Move = { kind: "sow", square: 3, dir: 1 };
    expect(errorCode(() => room.move(other, move, 1))).toBe("NOT_YOUR_TURN");
    expect(errorCode(() => room.move(mover, move, 0))).toBe("STALE_MOVE");
    const r = room.move(mover, move, 1);
    expect(r.events.some((e) => e.t === "capture")).toBe(true);
    expect(room.view().actionNo).toBe(2);
    // Gửi lại đúng message vừa rồi (gửi trùng) bị chặn
    expect(errorCode(() => room.move(mover, move, 1))).toBe("STALE_MOVE");
  });

  it("Lật bàn: lật rồi người mở đầu đi tiếp đều ở moveNo 1 nhưng khác actionNo", () => {
    const room = fullRoom();
    room.setOptions(HOST.clientId, { latBan: true });
    room.start(HOST.clientId, createRng(3));
    const opener = moverOf(room);
    room.move(opener, { kind: "sow", square: 3, dir: 1 }, 1);
    const second = moverOf(room);
    room.move(second, { kind: "latBan" }, 2);
    expect(room.view().game!.moveNo).toBe(1);
    // Gửi trùng nước lật bàn bị chặn bằng actionNo, không tới được engine
    expect(errorCode(() => room.move(second, { kind: "latBan" }, 2))).toBe("STALE_MOVE");
    expect(moverOf(room)).toBe(opener);
    room.move(opener, { kind: "sow", square: 7, dir: 1 }, 3);
    expect(room.view().actionNo).toBe(4);
  });

  it("nước sai luật báo INVALID_MOVE, state không đổi", () => {
    const room = fullRoom();
    room.start(HOST.clientId, createRng(3));
    const before = JSON.stringify(room.view());
    expect(errorCode(() => room.move(moverOf(room), { kind: "sow", square: 0, dir: 1 }, 1))).toBe("INVALID_MOVE");
    expect(JSON.stringify(room.view())).toBe(before);
  });
});

describe("hết ván, ván nữa", () => {
  it("hết ván: status finished, người thua đi trước ván sau (luật mục 2)", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const room = fullRoom();
      room.start(HOST.clientId, createRng(seed));
      const first = room.view().game!.controller[0];
      playToEnd(room, seed);
      const v = room.view();
      expect(v.status).toBe("finished");
      const winner = v.game!.result!.winner;
      expect(v.nextFirst).toBe(winner === null ? 1 - first : 1 - winner);
    }
  });

  it("Ván nữa: một người bấm thì chờ, đủ cả hai thì bắt đầu ngay với người đi trước đã định", () => {
    const room = fullRoom();
    room.start(HOST.clientId, createRng(5));
    playToEnd(room, 5);
    const next = room.view().nextFirst;
    expect(room.rematch(GUEST.clientId, createRng(1))).toBe(false);
    expect(room.view().rematchVotes).toEqual([room.you(GUEST.clientId).memberId]);
    expect(room.rematch(HOST.clientId, createRng(1))).toBe(true);
    const v = room.view();
    expect(v.status).toBe("playing");
    expect(v.rematchVotes).toEqual([]);
    expect(v.game!.controller[0]).toBe(next);
  });

  it("hết ván rồi chủ phòng chỉnh tuỳ chọn và bắt đầu lại từ phòng chờ được", () => {
    const room = fullRoom();
    room.start(HOST.clientId, createRng(5));
    playToEnd(room, 5);
    room.setOptions(HOST.clientId, { giaTriQuan: 5 });
    room.start(HOST.clientId, createRng(1));
    expect(room.view().game!.options.giaTriQuan).toBe(5);
  });
});

describe("rời phòng và mất kết nối", () => {
  it("rời phòng giữa ván: xử thua bỏ cuộc, ghế trống, quyền chủ phòng chuyển cho người còn lại", () => {
    const room = fullRoom();
    room.start(HOST.clientId, createRng(3));
    const guestId = room.you(GUEST.clientId).memberId;
    const r = room.leave(HOST.clientId, 10);
    expect(r?.events.at(-1)?.t).toBe("gameOver");
    const v = room.view();
    expect(v.status).toBe("finished");
    expect(v.game!.result).toMatchObject({ reason: "bo-cuoc", winner: 1 });
    expect(v.seats[0]).toBeNull();
    expect(v.hostId).toBe(guestId);
    expect(room.hasMember(HOST.clientId)).toBe(false);
  });

  it("mất kết nối không làm mất ghế (M3 giữ ghế không giới hạn — Q22e)", () => {
    const room = fullRoom();
    room.start(HOST.clientId, createRng(3));
    room.disconnect(GUEST.clientId, 100);
    expect(room.view().status).toBe("playing");
    expect(room.you(GUEST.clientId).seat).toBe(1);
    expect(room.connectedCount()).toBe(1);
  });

  it("người cuối cùng rời phòng thì phòng rỗng", () => {
    const room = fullRoom();
    room.leave(GUEST.clientId, 1);
    room.leave(HOST.clientId, 2);
    expect(room.isEmpty()).toBe(true);
  });

  it("thao tác của người không ở trong phòng báo NOT_IN_ROOM", () => {
    const room = fullRoom();
    expect(errorCode(() => room.takeSeat("lạ", 0))).toBe("NOT_IN_ROOM");
  });
});

describe("Đấu trận nhiều ván (targetScore)", () => {
  it("khởi động trận đấu với targetScore thì tạo match với round 1 và điểm 0", () => {
    const room = fullRoom();
    room.setOptions(HOST.clientId, { targetScore: 100 });
    room.start(HOST.clientId, createRng(1));
    const v = room.view();
    expect(v.match).toEqual({
      scores: [0, 0],
      round: 1,
      winner: null,
    });
  });

  it("ván kết thúc cộng dồn điểm vào match, chưa ai chạm mốc thì winner vẫn là null", () => {
    const room = fullRoom();
    room.setOptions(HOST.clientId, { targetScore: 100 });
    room.start(HOST.clientId, createRng(1));
    playToEnd(room, 1);
    const v = room.view();
    expect(v.match).not.toBeNull();
    expect(v.match?.round).toBe(1);
    expect((v.match?.scores[0] ?? 0) + (v.match?.scores[1] ?? 0)).toBe(70);
    expect(v.match?.winner).toBeNull();
  });

  it("rematch bắt đầu ván tiếp theo (round 2) và tích luỹ điểm cho tới khi có người đạt mốc", () => {
    const room = fullRoom();
    room.setOptions(HOST.clientId, { targetScore: 70 });
    room.start(HOST.clientId, createRng(1));
    playToEnd(room, 1);
    const prevMatch = room.view().match!;
    // Với mốc 70, nếu có người thắng ván 1 với score >= 36 và đối thủ < 34... nhưng nếu tổng là 70, có thể một người đạt hoặc chưa
    // Nếu ván 1 kết thúc mà chưa ai đạt 70 (thường điểm phân bổ ~40-30):
    if (prevMatch.winner === null) {
      room.rematch(HOST.clientId, createRng(2));
      room.rematch(GUEST.clientId, createRng(2));
      expect(room.view().match?.round).toBe(2);
      expect(room.view().match?.scores).toEqual(prevMatch.scores);
      playToEnd(room, 2);
      const finalMatch = room.view().match!;
      // Tổng điểm 2 ván là 140, chắc chắn có người >= 70
      expect(finalMatch.winner).not.toBeNull();
    }
  });

  it("chủ phòng đổi tuỳ chọn thì reset match", () => {
    const room = fullRoom();
    room.setOptions(HOST.clientId, { targetScore: 100 });
    room.start(HOST.clientId, createRng(1));
    playToEnd(room, 1);
    expect(room.view().match).not.toBeNull();
    room.setOptions(HOST.clientId, { targetScore: 200 });
    expect(room.view().match).toBeNull();
  });
});
