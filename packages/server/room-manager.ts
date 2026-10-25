// Quản lý các phòng (kỹ thuật mục 6): tạo phòng với mã không trùng, tìm phòng, dọn phòng bỏ trống.

import type { GameModule, Rng } from "@playtogether/engine";
import { caro } from "@playtogether/engine/caro";
import { coTuong } from "@playtogether/engine/co-tuong";
import { coVua } from "@playtogether/engine/co-vua";
import { oAnQuan } from "@playtogether/engine/o-an-quan";
import { tienLen } from "@playtogether/engine/tien-len";
import type { GameId } from "@playtogether/protocol";
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "@playtogether/protocol";
import { type Joiner, Room, RoomError } from "./room.ts";

/** Phòng không còn ai kết nối trong chừng này thì bị xoá (kỹ thuật mục 6) */
export const EMPTY_ROOM_TTL_MS = 10 * 60 * 1000;

/** Số phòng tối đa cùng lúc, chặn tạo phòng hàng loạt làm đầy RAM */
export const MAX_ROOMS = 1000;

/** Game nào cũng dùng qua `GameModule`: lớp phòng không biết kiểu state, nước đi, tuỳ chọn của từng game */
type AnyGameModule = GameModule<unknown, unknown, unknown, unknown>;

/** Các game server chạy được. Thêm game mới là thêm một dòng ở đây. */
const MODULES: Record<GameId, AnyGameModule> = {
  "o-an-quan": oAnQuan,
  caro,
  "co-tuong": coTuong,
  "co-vua": coVua,
  "tien-len": tienLen,
};

export type GameRoom = Room<unknown, unknown, unknown, unknown>;

export class RoomManager {
  private readonly rooms = new Map<string, GameRoom>();
  private readonly rng: Rng;
  private memberSeq = 0;

  /** `rng` dùng để sinh mã phòng và mã thành viên công khai */
  constructor(rng: Rng) {
    this.rng = rng;
  }

  create(host: Joiner, gameId: GameId, options: unknown, now: number): GameRoom {
    if (this.rooms.size >= MAX_ROOMS) throw new RoomError("SERVER_BUSY", "Server đang đầy, thử lại sau");
    const room = new Room({
      code: this.newCode(),
      gameId,
      module: MODULES[gameId],
      host,
      options,
      now,
      newMemberId: () => this.newMemberId(),
    });
    this.rooms.set(room.code, room);
    return room;
  }

  /** Phòng đang còn mà `clientId` là chủ (mỗi người chỉ làm chủ một phòng để tránh tạo phòng hàng loạt) */
  hostedBy(clientId: string): GameRoom | undefined {
    return [...this.rooms.values()].find((r) => r.isHostedBy(clientId));
  }

  get(code: string): GameRoom | undefined {
    return this.rooms.get(code);
  }

  delete(code: string): void {
    this.rooms.delete(code);
  }

  get size(): number {
    return this.rooms.size;
  }

  /** Xoá phòng rỗng, hoặc không còn ai kết nối quá 10 phút. Trả về mã các phòng đã xoá. */
  sweep(now: number): string[] {
    const removed: string[] = [];
    for (const [code, room] of this.rooms) {
      const abandoned = room.connectedCount() === 0 && now - room.lastActivity >= EMPTY_ROOM_TTL_MS;
      if (room.isEmpty() || abandoned) {
        this.rooms.delete(code);
        removed.push(code);
      }
    }
    return removed;
  }

  /** Mã 6 ký tự từ bảng 31 ký tự; sinh lại tới khi không trùng phòng nào đang có */
  private newCode(): string {
    for (;;) {
      let code = "";
      for (let k = 0; k < ROOM_CODE_LENGTH; k++) {
        code += ROOM_CODE_ALPHABET[Math.floor(this.rng() * ROOM_CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
  }

  private newMemberId(): string {
    this.memberSeq++;
    return `${this.memberSeq.toString(36)}${Math.floor(this.rng() * 36 ** 4).toString(36)}`;
  }
}
