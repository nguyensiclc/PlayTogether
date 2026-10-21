// Giao diện chung của màn hình chơi và nơi chọn màn hình theo game. room.ts chỉ làm việc qua đây.

import type { ErrorCode, PublicRoom, ServerMessage, You } from "@playtogether/protocol";
import { CaroGameView } from "./caro-game.ts";
import { GameView } from "./game.ts";

/** Message của server có kèm phòng (roomJoined, roomUpdated, gameStarted, moveApplied) */
export type RoomMessage = Extract<ServerMessage, { room: PublicRoom }>;

/** Thao tác gửi lên server, do màn hình phòng cung cấp */
export interface GameActions {
  /** `move` do module game của server kiểm tra. Trả về false nếu chưa gửi được (mất kết nối) */
  move(move: object, actionNo: number): boolean;
  rematch(): void;
  toLobby(): void;
  leave(): void;
}

export interface GameScreen {
  /** Nhận message của phòng từ server */
  receive(msg: RoomMessage): void;
  /** Server từ chối nước đi vừa gửi (vd STALE_MOVE): mở khoá lại bàn */
  rejected(code: ErrorCode): void;
  /** Mất / có lại kết nối: khoá bàn khi mất (UX mục 5) */
  setOnline(online: boolean): void;
  destroy(): void;
}

/** Dựng màn hình chơi theo `room.gameId`. Thêm game mới là thêm một nhánh ở đây. */
export function createGameScreen(root: HTMLElement, room: PublicRoom, you: You, actions: GameActions): GameScreen {
  switch (room.gameId) {
    case "o-an-quan":
      return new GameView(root, room, you, actions);
    case "caro":
      return new CaroGameView(root, room, you, actions);
  }
}
