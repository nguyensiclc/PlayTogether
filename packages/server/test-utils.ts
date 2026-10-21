// Tiện ích dùng chung cho test server: thu hẹp phòng theo game (PublicRoom là union theo gameId).

import type { CaroRoom, OAnQuanRoom, PublicRoom } from "@playtogether/protocol";

export function asOAnQuan(room: PublicRoom): OAnQuanRoom {
  if (room.gameId !== "o-an-quan") throw new Error(`Cần phòng Ô ăn quan, nhận ${room.gameId}`);
  return room;
}

export function asCaro(room: PublicRoom): CaroRoom {
  if (room.gameId !== "caro") throw new Error(`Cần phòng Cờ caro, nhận ${room.gameId}`);
  return room;
}
