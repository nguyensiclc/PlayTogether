// Một phòng chơi (kỹ thuật mục 6): thành viên, ghế, chủ phòng, tuỳ chọn, vòng đời ván, Ván nữa.
// Không chứa luật game: mọi câu hỏi về luật đều hỏi GameModule. Không I/O: thời gian và RNG truyền vào.

import type { GameModule, Rng, SeatId } from "@playtogether/engine";
import type {
  ErrorCode,
  GameId,
  MatchScore,
  PublicMember,
  PublicRoomOf,
  RoomStatus,
  You,
} from "@playtogether/protocol";

/** Lỗi do thao tác không hợp lệ của người dùng; gateway gửi lại cho client dưới dạng message `error`. */
export class RoomError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string = code) {
    super(message);
    this.name = "RoomError";
    this.code = code;
  }
}

export interface Joiner {
  /** Định danh bí mật do client tự sinh, dùng để vào lại đúng ghế (kỹ thuật mục 6) */
  clientId: string;
  name: string;
}

interface Member {
  clientId: string;
  /** Mã công khai, thay cho clientId khi gửi cho người khác */
  id: string;
  name: string;
  connected: boolean;
}

export interface RoomInit<S, M, O, E> {
  code: string;
  gameId: GameId;
  module: GameModule<S, M, O, E>;
  host: Joiner;
  newMemberId: () => string;
  now: number;
  /** Tuỳ chọn chủ phòng gửi khi tạo phòng (chưa kiểm tra) */
  options?: unknown;
}

export class Room<S, M, O, E> {
  readonly code: string;
  readonly gameId: GameId;
  /** Lần cuối có người vào, thao tác hoặc mất kết nối; dùng để dọn phòng */
  lastActivity: number;
  private readonly module: GameModule<S, M, O, E>;
  private readonly newMemberId: () => string;
  /** Theo clientId, giữ thứ tự vào phòng */
  private readonly members = new Map<string, Member>();
  /** clientId người ngồi từng ghế */
  private readonly seats: (string | null)[];
  private hostClientId: string;
  private status: RoomStatus = "lobby";
  private options: O;
  private game: S | null = null;
  private actionNo = 0;
  private readonly rematchVotes = new Set<string>();
  /** Ghế đi trước của ván gần nhất, để đổi lượt khi hoà (luật mục 2) */
  private lastFirst: SeatId | null = null;
  /** Điểm tích luỹ nhiều ván khi options.targetScore !== null */
  private match: MatchScore | null = null;

  constructor(init: RoomInit<S, M, O, E>) {
    this.code = init.code;
    this.gameId = init.gameId;
    this.module = init.module;
    this.newMemberId = init.newMemberId;
    this.seats = Array.from({ length: init.module.maxPlayers }, () => null);
    this.options = init.module.parseOptions(init.options, init.module.defaultOptions);
    this.hostClientId = init.host.clientId;
    this.lastActivity = init.now;
    this.join(init.host, init.now);
  }

  // ---------- Thành viên ----------

  /** Vào phòng, hoặc vào lại (giữ ghế, cập nhật tên). Người mới tự ngồi ghế trống nếu chưa vào ván (UX mục 2.3). */
  join(who: Joiner, now: number): void {
    this.lastActivity = now;
    const existing = this.members.get(who.clientId);
    if (existing) {
      existing.name = who.name;
      existing.connected = true;
      return;
    }
    this.members.set(who.clientId, { clientId: who.clientId, id: this.newMemberId(), name: who.name, connected: true });
    const free = this.seats.indexOf(null);
    if (this.status !== "playing" && free >= 0) this.seats[free] = who.clientId;
  }

  /** Mất kết nối: M3 giữ ghế không giới hạn thời gian (Q22e) */
  disconnect(clientId: string, now: number): void {
    const m = this.members.get(clientId);
    if (m) m.connected = false;
    this.lastActivity = now;
  }

  /** Rời phòng. Đang trong ván thì bị xử thua bỏ cuộc (Q22f); trả về events của nước xử thua nếu có. */
  leave(clientId: string, now: number): { events: E[] } | null {
    this.member(clientId);
    this.lastActivity = now;
    const seat = this.seatOf(clientId);
    let forfeited: { events: E[] } | null = null;
    if (this.status === "playing" && seat !== null && this.game) {
      const r = this.module.forfeit(this.game, seat, "bo-cuoc");
      if (!("error" in r)) {
        this.game = r.state;
        this.status = "finished";
        this.onGameFinished();
        forfeited = { events: r.events };
      }
    }
    if (seat !== null) {
      this.seats[seat] = null;
      this.match = null;
    }
    this.members.delete(clientId);
    this.rematchVotes.delete(clientId);
    // Chủ phòng rời đi thì người ngồi ghế còn lại làm chủ phòng (UX mục 2.3)
    if (this.hostClientId === clientId) this.hostClientId = this.pickNewHost();
    return forfeited;
  }

  takeSeat(clientId: string, seat: SeatId): void {
    this.member(clientId);
    this.requireNotPlaying();
    if (!Number.isInteger(seat) || seat < 0 || seat >= this.seats.length) throw new RoomError("BAD_MESSAGE");
    const holder = this.seats[seat];
    if (holder && holder !== clientId) throw new RoomError("SEAT_TAKEN");
    const current = this.seatOf(clientId);
    if (current !== null) this.seats[current] = null;
    if (current !== seat) this.match = null;
    this.seats[seat] = clientId;
    this.rematchVotes.clear();
  }

  leaveSeat(clientId: string): void {
    this.member(clientId);
    this.requireNotPlaying();
    const seat = this.seatOf(clientId);
    if (seat === null) throw new RoomError("NOT_SEATED");
    this.seats[seat] = null;
    this.match = null;
    this.rematchVotes.clear();
  }

  // ---------- Ván chơi ----------

  setOptions(clientId: string, raw: unknown): void {
    this.requireHost(clientId);
    this.requireNotPlaying();
    this.options = this.module.parseOptions(raw, this.options);
    this.match = null;
  }

  start(clientId: string, rng: Rng): void {
    this.requireHost(clientId);
    this.requireNotPlaying();
    this.startGame(rng);
  }

  move(clientId: string, move: M, actionNo: number): { seat: SeatId; events: E[] } {
    this.member(clientId);
    if (this.status !== "playing" || !this.game) throw new RoomError("WRONG_STATUS");
    const seat = this.seatOf(clientId);
    if (seat === null) throw new RoomError("NOT_SEATED");
    if (actionNo !== this.actionNo) throw new RoomError("STALE_MOVE");
    const r = this.module.applyMove(this.game, seat, move);
    if ("error" in r) throw new RoomError(r.error === "NOT_YOUR_TURN" ? "NOT_YOUR_TURN" : "INVALID_MOVE");
    this.game = r.state;
    this.actionNo++;
    if (this.module.result(this.game)) {
      this.status = "finished";
      this.onGameFinished();
    }
    return { seat, events: r.events };
  }

  /** Bỏ phiếu Ván nữa; mọi người ngồi ghế đều bấm thì bắt đầu ngay. Trả về true nếu đã bắt đầu. */
  rematch(clientId: string, rng: Rng): boolean {
    this.member(clientId);
    if (this.status !== "finished") throw new RoomError("WRONG_STATUS");
    if (this.seatOf(clientId) === null) throw new RoomError("NOT_SEATED");
    this.rematchVotes.add(clientId);
    const everyone = this.seats.every((c) => c !== null && this.rematchVotes.has(c));
    if (!everyone) return false;
    this.startGame(rng);
    return true;
  }

  private startGame(rng: Rng): void {
    const seated = this.seats.flatMap((c, seat) => (c ? [seat] : []));
    if (seated.length < this.module.minPlayers || seated.length < this.seats.length) {
      throw new RoomError("NOT_ENOUGH_PLAYERS");
    }
    const target = this.getTargetScore();
    if (target !== null) {
      if (!this.match || this.match.winner !== null) {
        this.match = {
          scores: Array.from({ length: this.seats.length }, () => 0),
          round: 1,
          winner: null,
        };
      } else {
        this.match.round++;
      }
    } else {
      this.match = null;
    }
    // Ván đầu chọn ngẫu nhiên; các ván sau người thua đi trước (luật mục 2)
    const first = this.nextFirst() ?? Math.floor(rng() * seated.length);
    this.game = this.module.setup(this.options, seated, first);
    this.lastFirst = first;
    this.status = "playing";
    this.actionNo++;
    this.rematchVotes.clear();
  }

  private getTargetScore(): number | null {
    if (typeof this.options !== "object" || this.options === null) return null;
    const t = (this.options as { targetScore?: unknown }).targetScore;
    return typeof t === "number" && t > 0 ? t : null;
  }

  private onGameFinished(): void {
    if (!this.game) return;
    const res = this.module.result(this.game);
    const target = this.getTargetScore();
    if (!res || target === null || !this.match) return;
    for (const [seat, score] of res.scores.entries()) {
      this.match.scores[seat] = (this.match.scores[seat] ?? 0) + score;
    }
    this.match.winner = decideMatchWinner(this.match.scores, target);
  }

  /** Ghế đi trước ở ván sau: người thua; hoà thì đổi lượt so với ván trước. null nếu chưa có ván nào xong. */
  private nextFirst(): SeatId | null {
    const result = this.game ? this.module.result(this.game) : null;
    if (!result || this.lastFirst === null) return null;
    const n = this.seats.length;
    if (result.winner === null) return (this.lastFirst + 1) % n;
    // Hai người chơi: người thua là ghế còn lại
    return (result.winner + 1) % n;
  }

  // ---------- Xem ----------

  /** Phòng ở dạng công khai cho người ngồi `forSeat` (null = người xem) */
  view(forSeat: SeatId | null = null): PublicRoomOf<S, O> {
    const pub = (clientId: string): PublicMember | null => {
      const m = this.members.get(clientId);
      return m ? { id: m.id, name: m.name, connected: m.connected } : null;
    };
    const seated = new Set(this.seats);
    return {
      code: this.code,
      gameId: this.gameId,
      hostId: this.members.get(this.hostClientId)?.id ?? "",
      seats: this.seats.map((c) => (c ? pub(c) : null)),
      spectators: [...this.members.values()]
        .filter((m) => !seated.has(m.clientId))
        .map((m) => pub(m.clientId) as PublicMember),
      status: this.status,
      options: this.options,
      // viewFor che thông tin ẩn theo người xem; Ô ăn quan không có thông tin ẩn
      game: this.game ? (this.module.viewFor(this.game, forSeat) as S) : null,
      actionNo: this.actionNo,
      rematchVotes: [...this.rematchVotes].flatMap((c) => this.members.get(c)?.id ?? []),
      nextFirst: this.status === "finished" ? this.nextFirst() : null,
      match: this.match ? { ...this.match, scores: [...this.match.scores] } : null,
    };
  }

  you(clientId: string): You {
    return { memberId: this.member(clientId).id, seat: this.seatOf(clientId) };
  }

  hasMember(clientId: string): boolean {
    return this.members.has(clientId);
  }

  isEmpty(): boolean {
    return this.members.size === 0;
  }

  connectedCount(): number {
    return [...this.members.values()].filter((m) => m.connected).length;
  }

  clientIdAtSeat(seat: SeatId): string | null {
    return this.seats[seat] ?? null;
  }

  /** Tên chủ phòng và người ngồi ghế, cho màn xem trước khi vào bằng link */
  hostName(): string {
    return this.members.get(this.hostClientId)?.name ?? "";
  }

  // ---------- Kiểm tra ----------

  private member(clientId: string): Member {
    const m = this.members.get(clientId);
    if (!m) throw new RoomError("NOT_IN_ROOM");
    return m;
  }

  private seatOf(clientId: string): SeatId | null {
    const seat = this.seats.indexOf(clientId);
    return seat >= 0 ? seat : null;
  }

  private requireHost(clientId: string): void {
    this.member(clientId);
    if (clientId !== this.hostClientId) throw new RoomError("NOT_HOST");
  }

  private requireNotPlaying(): void {
    if (this.status === "playing") throw new RoomError("WRONG_STATUS");
  }

  private pickNewHost(): string {
    const seated = this.seats.find((c) => c !== null);
    return seated ?? [...this.members.keys()][0] ?? "";
  }
}

function decideMatchWinner(scores: readonly number[], target: number): SeatId | null {
  const [s0, s1] = scores;
  if (s0 === undefined || s1 === undefined || (s0 < target && s1 < target)) return null;
  if (s0 === s1) return null;
  return s0 > s1 ? 0 : 1;
}
