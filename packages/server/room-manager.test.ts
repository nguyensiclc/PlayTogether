// Giới hạn số phòng của RoomManager.

import { createRng } from "@playtogether/engine";
import { expect, it } from "vitest";
import { RoomError } from "./room.ts";
import { MAX_ROOMS, RoomManager } from "./room-manager.ts";

it("từ chối tạo phòng khi đã đủ MAX_ROOMS phòng", () => {
  const rooms = new RoomManager(createRng(1));
  for (let i = 0; i < MAX_ROOMS; i++) rooms.create({ clientId: `client-${i}-aaaa`, name: "A" }, "caro", undefined, 0);
  expect(() => rooms.create({ clientId: "client-extra-aaaa", name: "A" }, "caro", undefined, 0)).toThrow(RoomError);
  expect(rooms.size).toBe(MAX_ROOMS);
});
