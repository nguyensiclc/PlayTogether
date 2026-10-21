// Giao thức giữa client và server (tài liệu kỹ thuật mục 6–7). Dùng chung cho cả hai phía.
// Chỉ có kiểu dữ liệu và vài hàm thuần chuẩn hoá đầu vào, không I/O.

import type { SeatId } from "@playtogether/engine";
import type {
  GameEvent as CaroEvent,
  Move as CaroMove,
  Options as CaroOptions,
  State as CaroState,
} from "@playtogether/engine/caro";
import type {
  GameEvent as CoVuaEvent,
  Move as CoVuaMove,
  Options as CoVuaOptions,
  State as CoVuaState,
} from "@playtogether/engine/co-vua";
import type {
  GameEvent as OAnQuanEvent,
  Move as OAnQuanMove,
  Options as OAnQuanOptions,
  State as OAnQuanState,
} from "@playtogether/engine/o-an-quan";

/** Các game đã có. Thêm game mới = thêm một giá trị ở đây, một module engine và một màn hình client. */
export const GAME_IDS = ["o-an-quan", "caro", "co-vua"] as const;
export type GameId = (typeof GAME_IDS)[number];

export function isGameId(value: unknown): value is GameId {
  return (GAME_IDS as readonly unknown[]).includes(value);
}

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
export interface PublicRoomOf<S, O, G extends GameId = GameId> {
  code: string;
  gameId: G;
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
  /** Số ván thắng của từng ghế trong phòng (theo thứ tự ghế); hoà không tính */
  wins: number[];
  /** Thông tin trận đấu nhiều ván khi options.targetScore !== null; null khi options.targetScore === null */
  match: MatchScore | null;
}

export type OAnQuanRoom = PublicRoomOf<OAnQuanState, OAnQuanOptions, "o-an-quan">;
export type CaroRoom = PublicRoomOf<CaroState, CaroOptions, "caro">;
export type CoVuaRoom = PublicRoomOf<CoVuaState, CoVuaOptions, "co-vua">;

/** Phòng của một trong các game; client thu hẹp kiểu bằng `room.gameId` */
export type PublicRoom = OAnQuanRoom | CaroRoom | CoVuaRoom;

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
  // Tuỳ chọn và nước đi là dữ liệu của từng game: server kiểm tra bằng parseOptions / parseMove của module game
  | { type: "createRoom"; gameId: GameId; options?: object }
  | { type: "joinRoom"; code: string }
  | { type: "takeSeat"; seat: SeatId }
  | { type: "leaveSeat" }
  | { type: "setOptions"; options: object }
  | { type: "start" }
  | { type: "move"; move: object; actionNo: number }
  | { type: "rematch" }
  | { type: "leaveRoom" };

export type ServerMessage =
  | { type: "roomJoined"; room: PublicRoom; you: You }
  | { type: "roomUpdated"; room: PublicRoom; you: You }
  | { type: "gameStarted"; room: PublicRoom; you: You }
  | MoveApplied<"o-an-quan", OAnQuanMove, OAnQuanEvent, OAnQuanRoom>
  | MoveApplied<"caro", CaroMove, CaroEvent, CaroRoom>
  | MoveApplied<"co-vua", CoVuaMove, CoVuaEvent, CoVuaRoom>
  | { type: "leftRoom" }
  | { type: "error"; code: ErrorCode; message: string };

/** Nước đi đã được áp dụng. `gameId` ở ngoài cùng để client thu hẹp kiểu của `move`, `events` và `room` cùng lúc. */
export interface MoveApplied<G extends GameId, M, E, R> {
  type: "moveApplied";
  gameId: G;
  seat: SeatId;
  move: M;
  events: E[];
  room: R;
  you: You;
}

export type ErrorCode =
  | "BAD_MESSAGE"
  | "HELLO_FIRST"
  | "ROOM_NOT_FOUND"
  | "NOT_IN_ROOM"
  | "NOT_HOST"
  /** Đã là chủ của một phòng khác; `message` là mã phòng đó */
  | "ALREADY_HOSTING"
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
