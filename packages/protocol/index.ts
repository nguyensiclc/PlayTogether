// Giao thức giữa client và server (tài liệu kỹ thuật mục 6–7). Dùng chung cho cả hai phía.
// Chỉ có kiểu dữ liệu và vài hàm thuần chuẩn hoá đầu vào, không I/O.

import type { SeatId } from "@playtogether/engine";
import type { GameEvent, Move, Options, State } from "@playtogether/engine/o-an-quan";

export type GameId = "o-an-quan";
/** "finished" cũng được coi là phòng chờ: chủ phòng chỉnh tuỳ chọn và bắt đầu ván mới được */
export type RoomStatus = "lobby" | "playing" | "finished";

/**
 * Thành viên ở dạng công khai. Không có `clientId`: đó là "chìa khoá" bí mật để vào lại đúng ghế,
 * nên chỉ chủ của nó và server biết. Mọi người khác chỉ thấy `id` công khai do server cấp.
 */
export interface PublicMember {
  id: string;
  name: string;
  connected: boolean;
}

export interface MatchScore {
  /** Tổng điểm tích lũy của từng ghế trong trận: [score0, score1] */
  scores: number[];
  /** Số ván đã chơi xong trong trận */
  round: number;
  /** Người thắng chung cuộc (đạt >= targetScore); null nếu trận chưa kết thúc */
  winner: SeatId | null;
}

/** Phòng ở dạng công khai, gửi cho mọi người trong phòng. `S`, `O` là state và tuỳ chọn của game. */
export interface PublicRoomOf<S, O> {
  code: string;
  gameId: GameId;
  /** `id` công khai của chủ phòng */
  hostId: string;
  /** Độ dài = số người chơi tối đa; null là ghế trống */
  seats: (PublicMember | null)[];
  spectators: PublicMember[];
  status: RoomStatus;
  options: O;
  game: S | null;
  /** Tăng sau mỗi thao tác được chấp nhận, kể cả Lật bàn. Client gửi kèm để chống gửi trùng (Q22c). */
  actionNo: number;
  /** `id` công khai của những người đã bấm Ván nữa */
  rematchVotes: string[];
  /** Ghế đi trước ở ván sau (người thua ván trước, hoà thì đổi lượt — luật mục 2). null khi chưa có ván nào */
  nextFirst: SeatId | null;
  /** Thông tin trận đấu nhiều ván khi options.targetScore !== null; null khi options.targetScore === null */
  match: MatchScore | null;
}

/** Phòng Ô ăn quan, game duy nhất hiện có */
export type PublicRoom = PublicRoomOf<State, Options>;

/** Người nhận message là ai trong phòng */
export interface You {
  memberId: string;
  /** null = đang xem */
  seat: SeatId | null;
}

/** Thông tin xem trước phòng cho màn nhập nickname (GET /api/rooms/:code) */
export interface RoomPreview {
  code: string;
  gameId: GameId;
  hostName: string;
  players: string[];
  freeSeats: number;
  status: RoomStatus;
}

export type ClientMessage =
  | { type: "hello"; clientId: string; name: string }
  | { type: "createRoom"; gameId: GameId; options?: Partial<Options> }
  | { type: "joinRoom"; code: string }
  | { type: "takeSeat"; seat: SeatId }
  | { type: "leaveSeat" }
  | { type: "setOptions"; options: Partial<Options> }
  | { type: "start" }
  | { type: "move"; move: Move; actionNo: number }
  | { type: "rematch" }
  | { type: "leaveRoom" };

export type ServerMessage =
  | { type: "roomJoined"; room: PublicRoom; you: You }
  | { type: "roomUpdated"; room: PublicRoom; you: You }
  | { type: "gameStarted"; room: PublicRoom; you: You }
  | { type: "moveApplied"; seat: SeatId; move: Move; events: GameEvent[]; room: PublicRoom; you: You }
  | { type: "leftRoom" }
  | { type: "error"; code: ErrorCode; message: string };

export type ErrorCode =
  | "BAD_MESSAGE"
  | "HELLO_FIRST"
  | "ROOM_NOT_FOUND"
  | "NOT_IN_ROOM"
  | "NOT_HOST"
  | "SEAT_TAKEN"
  | "NOT_SEATED"
  | "NOT_ENOUGH_PLAYERS"
  | "WRONG_STATUS"
  | "NOT_YOUR_TURN"
  | "INVALID_MOVE"
  | "STALE_MOVE"
  | "RATE_LIMITED";

/** Mã phòng: 4 ký tự, bỏ các ký tự dễ nhầm 0 O 1 I L (kỹ thuật mục 6) */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 4;
/** Nickname tối đa 20 ký tự (kỹ thuật mục 10) */
export const MAX_NAME_LENGTH = 20;
/** Message tối đa 4KB (kỹ thuật mục 10) */
export const MAX_MESSAGE_BYTES = 4096;
/** Đường dẫn WebSocket */
export const WS_PATH = "/ws";

/** Viết hoa, bỏ khoảng trắng. Trả về null nếu không phải mã phòng hợp lệ. */
export function normalizeRoomCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  if (code.length !== ROOM_CODE_LENGTH) return null;
  return [...code].every((c) => ROOM_CODE_ALPHABET.includes(c)) ? code : null;
}

/** Cắt khoảng trắng thừa, gộp khoảng trắng giữa, tối đa 20 ký tự. Rỗng thì trả về null. */
export function normalizeName(raw: string): string | null {
  const name = raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH).trim();
  return name ? name : null;
}

/** Đường dẫn mời vào phòng */
export const roomPath = (code: string): string => `/r/${code}`;
