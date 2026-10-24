// Test lớp phòng với game nhiều người (số ghế theo tuỳ chọn, nhiều hạng, người rời giữa ván) bằng một game giả.

import type { GameModule, SeatId } from "@playtogether/engine";
import { describe, expect, it } from "vitest";
import { Room, RoomError } from "./room.ts";

interface Opts {
  n: number;
}
interface St {
  alive: SeatId[];
  turn: SeatId;
  order: SeatId[];
}
type Mv = { type: "out" };

/** Mỗi lượt người đi chọn "out" để thoát; người cuối cùng còn lại thắng. Có 2 đến 4 người. */
const multi: GameModule<St, Mv, Opts, never> = {
  id: "multi",
  minPlayers: 2,
  maxPlayers: 4,
  defaultOptions: { n: 4 },
  seatCount: (o) => o.n,
  nextFirst: (result) => result.winner,
  setup: (_o, seats, first) => ({ alive: [...seats], turn: first, order: [] }),
  validMoves: (s, seat) => (s.turn === seat ? [{ type: "out" }] : []),
  applyMove: (s, seat) => {
    if (s.turn !== seat) return { error: "NOT_YOUR_TURN" };
    return { state: leave(s, seat), events: [] };
  },
  viewFor: (s) => s,
  result: (s) =>
    s.alive.length > 1
      ? null
      : {
          winner: s.alive[0] ?? null,
          scores: [],
          reason: "het-nguoi",
          ranking: [...s.alive, ...[...s.order].reverse()],
        },
  forfeit: (s, seat) => ({ state: leave(s, seat), events: [] }),
  parseOptions: (raw, base) => {
    const n = (raw as { n?: unknown } | null)?.n;
    return typeof n === "number" && n >= 2 && n <= 4 ? { n } : base;
  },
  parseMove: (raw) => ((raw as { type?: unknown } | null)?.type === "out" ? { type: "out" } : null),
};

function leave(s: St, seat: SeatId): St {
  const alive = s.alive.filter((x) => x !== seat);
  const turn = alive.includes(s.turn) ? s.turn : (alive[0] ?? s.turn);
  return { alive, turn, order: [...s.order, seat] };
}

const people = ["a", "b", "c", "d"].map((x) => ({ clientId: `c-${x}`, name: `Người ${x}` }));

function makeRoom(n: number): Room<St, Mv, Opts, never> {
  let k = 0;
  return new Room({
    code: "ABCD",
    gameId: "o-an-quan",
    module: multi,
    host: people[0] as (typeof people)[number],
    options: { n },
    newMemberId: () => `m${++k}`,
    now: 0,
  });
}

function seatedRoom(n: number, joined: number): Room<St, Mv, Opts, never> {
  const room = makeRoom(n);
  for (const p of people.slice(1, joined)) room.join(p, 1);
  return room;
}

function errorCode(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    if (e instanceof RoomError) return e.code;
    throw e;
  }
  throw new Error("không có lỗi");
}

const rng = () => 0;

describe("số ghế theo tuỳ chọn", () => {
  it("phòng dựng đúng số ghế theo tuỳ chọn lúc tạo", () => {
    expect(makeRoom(3).view().seats).toHaveLength(3);
    expect(makeRoom(2).view().seats).toHaveLength(2);
  });

  it("chủ phòng đổi số người: thêm ghế trống hoặc bớt ghế cuối", () => {
    const room = seatedRoom(4, 2);
    room.setOptions("c-a", { n: 3 });
    expect(room.view().seats).toHaveLength(3);
    room.setOptions("c-a", { n: 4 });
    expect(room.view().seats).toHaveLength(4);
  });

  it("bớt ghế thì người ngồi ghế cuối dồn sang ghế trống phía trước", () => {
    const room = seatedRoom(4, 2);
    room.takeSeat("c-b", 3);
    room.setOptions("c-a", { n: 2 });
    const names = room.view().seats.map((m) => m?.name);
    expect(names).toEqual(["Người a", "Người b"]);
  });

  it("đang có nhiều người hơn số ghế mới thì báo SEATS_IN_USE và giữ nguyên", () => {
    const room = seatedRoom(4, 3);
    expect(errorCode(() => room.setOptions("c-a", { n: 2 }))).toBe("SEATS_IN_USE");
    expect(room.view().seats).toHaveLength(4);
    expect((room.view().options as Opts).n).toBe(4);
  });

  it("chỉ bắt đầu khi đủ số ghế đã chọn", () => {
    const room = seatedRoom(3, 2);
    expect(errorCode(() => room.start("c-a", rng))).toBe("NOT_ENOUGH_PLAYERS");
    room.join(people[2] as (typeof people)[number], 2);
    room.start("c-a", rng);
    expect(room.view().status).toBe("playing");
  });
});

describe("người rời hoặc xin thua giữa ván nhiều người", () => {
  it("ba người: một người xin thua thì ván vẫn tiếp tục; còn một người thì ván xong", () => {
    const room = seatedRoom(3, 3);
    room.start("c-a", rng);
    const before = room.view().actionNo;
    room.resign("c-b");
    expect(room.view().status).toBe("playing");
    expect(room.view().actionNo).toBe(before + 1);
    room.resign("c-c");
    expect(room.view().status).toBe("finished");
  });

  it("rời phòng giữa ván nhiều người: ván tiếp tục, ghế của người đó trống", () => {
    const room = seatedRoom(3, 3);
    room.start("c-a", rng);
    room.leave("c-b", 5);
    expect(room.view().status).toBe("playing");
    expect(room.view().seats[1]).toBeNull();
  });

  it("hai người: xin thua vẫn kết thúc ván ngay (như các game hai người)", () => {
    const room = seatedRoom(2, 2);
    room.start("c-a", rng);
    room.resign("c-b");
    expect(room.view().status).toBe("finished");
  });
});

describe("người đi trước ván sau do game quyết định", () => {
  it("dùng nextFirst của module (người thắng đi trước) thay cho người thua", () => {
    const room = seatedRoom(3, 3);
    room.start("c-a", rng);
    room.resign("c-b");
    room.resign("c-c");
    const v = room.view();
    const winner = (v.game as St).alive[0];
    expect(v.nextFirst).toBe(winner);
  });
});
