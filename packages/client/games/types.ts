// Hợp đồng giữa nền tảng (trang chủ, phòng chờ, phòng) và từng game ở client.
// Nền tảng chỉ làm việc qua các kiểu này và `registry.ts`; không import thư mục của một game cụ thể.

import type { ErrorCode, GameId, PublicRoom, ServerMessage, You } from "@playtogether/protocol";

/** Message của server có kèm phòng (roomJoined, roomUpdated, gameStarted, moveApplied) */
export type RoomMessage = Extract<ServerMessage, { room: PublicRoom }>;

/** Thao tác màn hình chơi nhờ nền tảng làm hộ; do màn hình phòng cung cấp */
export interface GameActions {
  /** `move` do module game của server kiểm tra. Trả về false nếu chưa gửi được (mất kết nối) */
  move(move: object, actionNo: number): boolean;
  rematch(): void;
  toLobby(): void;
  leave(): void;
  /** Mở hộp Luật chơi / Lịch sử của game đang chơi */
  showRules(): void;
  showHistory(): void;
}

/** Màn hình chơi của một game. Mỗi game tự cài đặt; `room.ts` chỉ gọi các hàm này. */
export interface GameScreen {
  /** Nhận message của phòng từ server */
  receive(msg: RoomMessage): void;
  /** Server từ chối nước đi vừa gửi (vd STALE_MOVE): mở khoá lại bàn */
  rejected(code: ErrorCode): void;
  /** Mất / có lại kết nối: khoá bàn khi mất (UX mục 5) */
  setOnline(online: boolean): void;
  destroy(): void;
}

/** Phần "Tuỳ chọn" trong phòng chờ của một game (docs/design/nen-tang/phong-cho*.html) */
export interface LobbyOptions {
  /** HTML của các tuỳ chọn; `editable` = người xem là chủ phòng */
  html(room: PublicRoom, editable: boolean): string;
  /** Đọc tuỳ chọn từ nút `[data-act="opt"]` vừa bấm; server kiểm tra lại bằng engine (parseOptions) */
  read(el: HTMLElement): object;
}

/** Nhóm game trên trang chủ */
export type Category = "dangian" | "co" | "bai";

/** Thông tin hiển thị của game trên trang chủ, phòng chờ, màn nhập tên */
export interface GameInfo {
  name: string;
  /** "2 người", "2–4 người"… */
  players: string;
  category: Category;
  /** Thời lượng một ván, vd "10–15 phút" */
  duration: string;
  /** SVG 40 × 40 */
  icon: string;
  /** SVG 56 × 56 cho thẻ trong lưới trò chơi */
  cardIcon: string;
  /** SVG rộng cho thẻ "Nổi bật" ở trang chủ; chỉ game được giới thiệu mới có */
  featuredArt?: string;
}

/**
 * Mọi thứ nền tảng cần biết về một game ở phía client. Mỗi game xuất đúng một đối tượng này
 * (file `<game>/client-game.ts`), rồi đăng ký một dòng ở `registry.ts`.
 */
export interface ClientGame {
  id: GameId;
  info: GameInfo;
  lobbyOptions: LobbyOptions;
  /** HTML tab "Luật chơi" */
  rulesHtml(): string;
  /** HTML tab "Lịch sử" */
  historyHtml(): string;
  /** Dựng màn hình chơi; `room.gameId` luôn bằng `id` */
  createScreen(root: HTMLElement, room: PublicRoom, you: You, actions: GameActions): GameScreen;
}
