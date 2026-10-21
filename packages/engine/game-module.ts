// Giao diện chung cho mọi game (xem mục 3 tài liệu kỹ thuật).
// Lớp phòng chỉ làm việc qua interface này, không biết luật của game cụ thể.

/** Chỉ số ghế trong phòng: 0, 1, ... */
export type SeatId = number;

export interface GameResult {
  /** null = hoà */
  winner: SeatId | null;
  /** Điểm cuối, theo SeatId */
  scores: number[];
  /** vd "het-quan", "khong-du-dan" */
  reason: string;
  /** Chi tiết riêng của từng game */
  detail?: unknown;
}

export interface GameModule<S, M, O, E> {
  id: string;
  minPlayers: number;
  maxPlayers: number;
  defaultOptions: O;
  setup(options: O, seats: SeatId[], firstPlayer: SeatId): S;
  validMoves(state: S, seat: SeatId): M[];
  applyMove(state: S, seat: SeatId, move: M): { state: S; events: E[] } | { error: string };
  viewFor(state: S, seat: SeatId | null): unknown;
  result(state: S): GameResult | null;
  /** Xử thua `seat` (hết giờ hoặc bỏ cuộc). Lớp phòng gọi khi người chơi rời ván. */
  forfeit(state: S, seat: SeatId, reason: ForfeitReason): { state: S; events: E[] } | { error: string };
  /** Đọc tuỳ chọn từ dữ liệu ngoài: chỉ nhận giá trị hợp lệ, còn lại giữ theo `base`. Lớp phòng không tự kiểm tra luật. */
  parseOptions(raw: unknown, base: O): O;
  /** Đọc nước đi từ dữ liệu ngoài: chỉ kiểm tra hình dạng (đúng luật hay không do `applyMove` quyết định). null nếu sai hình dạng */
  parseMove(raw: unknown): M | null;
}

export type ForfeitReason = "het-gio" | "bo-cuoc";

/** Nguồn ngẫu nhiên trả về số trong [0, 1). Engine luôn nhận RNG qua tham số. */
export type Rng = () => number;

/** RNG có seed (mulberry32), dùng cho test và replay. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Chọn ngẫu nhiên một nước trong danh sách (vd khi hết giờ). Trả về null nếu danh sách rỗng. */
export function pickRandom<T>(items: readonly T[], rng: Rng): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(rng() * items.length)] ?? null;
}
