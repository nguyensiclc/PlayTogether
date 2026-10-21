// Một phòng chơi (kỹ thuật mục 6): thành viên, ghế, chủ phòng, tuỳ chọn, vòng đời ván, Ván nữa.
// Không chứa luật game: mọi câu hỏi về luật đều hỏi GameModule. Không I/O: thời gian và RNG truyền vào.

import type { BotLevelId, GameModule, Rng, SeatId } from "@playtogether/engine";
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
  isBot?: boolean;
  botLevel?: string;
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
  /** Số ván thắng của từng ghế từ khi phòng có đủ người; hoà không tính. Về 0 khi có ghế đổi người. */
  private wins: number[];
  /** Điểm tích luỹ nhiều ván khi options.targetScore !== null */
  private match: MatchScore | null = null;

  constructor(init: RoomInit<S, M, O, E>) {
    this.code = init.code;
    this.gameId = init.gameId;
    this.module = init.module;
    this.newMemberId = init.newMemberId;
    this.seats = Array.from({ length: init.module.maxPlayers }, () => null);
    this.wins = this.seats.map(() => 0);
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
        this.recordResult();
        this.onGameFinished();
        forfeited = { events: r.events };
      }
    }
    if (seat !== null) {
      this.seats[seat] = null;
      this.resetWins();
      this.match = null;
    }
    this.members.delete(clientId);
    this.rematchVotes.delete(clientId);
    // Chủ phòng rời đi thì người ngồi ghế còn lại làm chủ phòng (UX mục 2.3)
    if (this.hostClientId === clientId) this.hostClientId = this.pickNewHost();
    return forfeited;
  }

  /** Xin thua: xử thua bỏ cuộc người đang chơi, họ vẫn giữ ghế và ở lại phòng */
  resign(clientId: string): void {
    this.member(clientId);
    if (this.status !== "playing" || !this.game) throw new RoomError("WRONG_STATUS");
    const seat = this.seatOf(clientId);
    if (seat === null) throw new RoomError("NOT_SEATED");
    const r = this.module.forfeit(this.game, seat, "bo-cuoc");
    if ("error" in r) throw new RoomError("WRONG_STATUS");
    this.game = r.state;
    this.actionNo++;
    this.status = "finished";
    this.recordResult();
    this.onGameFinished();
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
    this.resetWins();
    this.rematchVotes.clear();
  }

  leaveSeat(clientId: string): void {
    this.member(clientId);
    this.requireNotPlaying();
    const seat = this.seatOf(clientId);
    if (seat === null) throw new RoomError("NOT_SEATED");
    this.seats[seat] = null;
    this.resetWins();
    this.match = null;
    this.rematchVotes.clear();
  }

  addBot(hostClientId: string, seat: SeatId, level: string): void {
    this.requireHost(hostClientId);
    this.requireNotPlaying();
    if (!this.module.bot) throw new RoomError("BOT_NOT_SUPPORTED");
    if (!Number.isInteger(seat) || seat < 0 || seat >= this.seats.length) throw new RoomError("BAD_MESSAGE");
    const holder = this.seats[seat];
    if (holder) throw new RoomError("SEAT_TAKEN");
    const botOption = this.module.bot.levels.find((l) => l.id === level);
    if (!botOption) throw new RoomError("BAD_MESSAGE");

    const botClientId = `__bot_${seat}`;
    const botId = `bot_${seat}`;
    this.members.set(botClientId, {
      clientId: botClientId,
      id: botId,
      name: `Máy (${botOption.name})`,
      connected: true,
      isBot: true,
      botLevel: level,
    });
    this.seats[seat] = botClientId;
    this.resetWins();
    this.match = null;
    this.rematchVotes.clear();
  }

  forfeit(clientId: string): { events: E[] } | null {
    this.member(clientId);
    if (this.status !== "playing" || !this.game) throw new RoomError("WRONG_STATUS");
    const seat = this.seatOf(clientId);
    if (seat === null) throw new RoomError("NOT_SEATED");
    const r = this.module.forfeit(this.game, seat, "bo-cuoc");
    if ("error" in r) throw new RoomError("INVALID_MOVE");
    this.game = r.state;
    this.status = "finished";
    this.actionNo++;
    this.recordResult();
    this.onGameFinished();
    return { events: r.events };
  }

  removeBot(hostClientId: string, seat: SeatId): void {
    this.requireHost(hostClientId);
    this.requireNotPlaying();
    if (!Number.isInteger(seat) || seat < 0 || seat >= this.seats.length) throw new RoomError("BAD_MESSAGE");
    const holder = this.seats[seat];
    if (!holder || !this.members.get(holder)?.isBot) throw new RoomError("BAD_MESSAGE");
    this.members.delete(holder);
    this.seats[seat] = null;
    this.resetWins();
    this.match = null;
    this.rematchVotes.clear();
  }

  isBotSeat(seat: SeatId): boolean {
    const c = this.seats[seat];
    return c ? this.members.get(c)?.isBot === true : false;
  }

  pendingBotSeat(): SeatId | null {
    if (this.status !== "playing" || !this.game || !this.module.bot) return null;
    for (let seat = 0; seat < this.seats.length; seat++) {
      if (this.isBotSeat(seat)) {
        const moves = this.module.validMoves(this.game, seat);
        if (moves.length > 0) return seat;
      }
    }
    return null;
  }

  botMove(seat: SeatId, rng: Rng): { seat: SeatId; move: M; events: E[] } | null {
    if (this.status !== "playing" || !this.game || !this.module.bot) return null;
    const clientId = this.seats[seat];
    if (!clientId) return null;
    const m = this.members.get(clientId);
    if (!m?.isBot) return null;
    const level = (m.botLevel ?? "medium") as BotLevelId;
    const move = this.module.bot.chooseMove(this.game, seat, level, rng);
    if (!move) return null;
    return this.move(clientId, move, this.actionNo);
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

  /** `rawMove` là dữ liệu client gửi lên: module game kiểm tra hình dạng, rồi luật quyết định có hợp lệ không */
  move(clientId: string, rawMove: unknown, actionNo: number): { seat: SeatId; move: M; events: E[] } {
    this.member(clientId);
    if (this.status !== "playing" || !this.game) throw new RoomError("WRONG_STATUS");
    const seat = this.seatOf(clientId);
    if (seat === null) throw new RoomError("NOT_SEATED");
    if (actionNo !== this.actionNo) throw new RoomError("STALE_MOVE");
    const move = this.module.parseMove(rawMove);
    if (move === null) throw new RoomError("INVALID_MOVE");
    const r = this.module.applyMove(this.game, seat, move);
    if ("error" in r) throw new RoomError(r.error === "NOT_YOUR_TURN" ? "NOT_YOUR_TURN" : "INVALID_MOVE");
    this.game = r.state;
    this.actionNo++;
    if (this.module.result(this.game)) {
      this.status = "finished";
      this.recordResult();
      this.onGameFinished();
    }
    return { seat, move, events: r.events };
  }

  /** Bỏ phiếu Ván nữa; mọi người ngồi ghế đều bấm thì bắt đầu ngay. Trả về true nếu đã bắt đầu. */
  rematch(clientId: string, rng: Rng): boolean {
    this.member(clientId);
    if (this.status !== "finished") throw new RoomError("WRONG_STATUS");
    if (this.seatOf(clientId) === null) throw new RoomError("NOT_SEATED");
    this.rematchVotes.add(clientId);
    for (const [seat, c] of this.seats.entries()) {
      if (c && this.isBotSeat(seat)) {
        this.rematchVotes.add(c);
      }
    }
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

  private recordResult(): void {
    const winner = this.game ? this.module.result(this.game)?.winner : null;
    if (winner !== null && winner !== undefined) this.wins[winner] = (this.wins[winner] ?? 0) + 1;
  }

  private resetWins(): void {
    this.wins = this.seats.map(() => 0);
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
      if (!m) return null;
      return {
        id: m.id,
        name: m.name,
        connected: m.connected,
        ...(m.isBot ? { isBot: true, botLevel: m.botLevel } : {}),
      };
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
      wins: [...this.wins],
      match: this.match ? { ...this.match, scores: [...this.match.scores] } : null,
      ...(this.module.bot
        ? {
            botSupported: true,
            botLevels: this.module.bot.levels,
          }
        : {}),
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

  isHostedBy(clientId: string): boolean {
    return this.hostClientId === clientId;
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
