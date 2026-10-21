// Bàn chơi Cờ caro online: hiển thị state server gửi, gửi ý định đặt quân (UX mục 3).
// Server quyết định mọi thứ; client chỉ biết ô nào còn trống và có phải lượt mình không.
// Bàn không xoay: mình luôn ở dưới, đối thủ ở trên; người xem thấy người ngồi ghế 1 ở dưới.

import type { SeatId } from "@playtogether/engine";
import type { GameEvent, Mark, Move, PlaceMove, State } from "@playtogether/engine/caro";
import { hasBlockedLine, isYield } from "@playtogether/engine/caro";
import type { CaroRoom, ErrorCode, PublicRoom, You } from "@playtogether/protocol";
import "./caro.css";
import { $, escapeHtml } from "../dom.ts";
import { confirmBox } from "../game-ui/confirm-box.ts";
import { type LogEntry, logListHtml } from "../game-ui/log-view.ts";
import type { GameActions, GameScreen, RoomMessage } from "../games/types.ts";
import { identityInRoom, seatOfMember } from "../screens/room-players.ts";
import { CaroBoard } from "./board-dom.ts";
import { xOf, yOf } from "./board-svg.ts";
import { caroPageHtml } from "./game-page.ts";
import { describePlace, describeYield } from "./move-log.ts";
import { type CaroCardState, CaroPlayerCard, MARK_CHAR } from "./player-card.ts";
import { resultHtml } from "./result-view.ts";

/** Người xem thấy người ngồi ghế này ở dưới (ghế 1 trên giao diện, chỉ số 0) */
const SPECTATOR_BOTTOM_SEAT: SeatId = 0;

const TURN_HINT = '<span class="mobile-only">chạm</span><span class="desk-only">click</span> một ô trống';

export class CaroGameView implements GameScreen {
  private room: CaroRoom;
  private you: You;
  private state: State;
  private actionNo: number;
  /** Đã gửi nước đi, đang chờ server */
  private pending = false;
  private online = true;
  private log: LogEntry[] = [];
  private readonly board: CaroBoard;
  private readonly page: HTMLElement;
  private readonly cards = { top: new CaroPlayerCard(), bottom: new CaroPlayerCard() };
  private readonly actions: GameActions;
  private readonly onKey = (e: KeyboardEvent) => {
    if (this.handleKey(e)) e.preventDefault();
  };
  private readonly onOutside = (e: PointerEvent) => {
    // composedPath: bàn vẽ lại khi chọn ô nên `e.target` có thể đã rời khỏi DOM lúc sự kiện tới đây
    const inside = e.composedPath().some((n) => n instanceof Element && n.matches(".caro-board, .pick-acts"));
    if (this.board.selection !== null && !inside) this.board.clearSelection();
  };

  constructor(root: HTMLElement, room: PublicRoom, you: You, actions: GameActions) {
    if (room.gameId !== "caro") throw new Error(`Cần phòng Cờ caro, nhận ${room.gameId}`);
    if (!room.game) throw new Error("Phòng chưa có ván");
    this.room = room;
    this.you = you;
    this.state = room.game;
    this.actionNo = room.actionNo;
    this.actions = actions;
    this.board = new CaroBoard(
      {
        onSelect: () => this.updateUi(),
        onPlace: (i) => this.place(i),
        onOccupied: () => this.board.shake(),
      },
      room.game.size,
    );
    root.innerHTML = caroPageHtml(room.options);
    this.page = $(root, ".game-page");
    this.q("[data-card-top]").replaceWith(this.cards.top.el);
    this.q("[data-card-bottom]").replaceWith(this.cards.bottom.el);
    this.q("[data-board]").replaceWith(this.board.el);
    for (const b of this.page.querySelectorAll("[data-rules]"))
      b.addEventListener("click", () => this.actions.showRules());
    for (const b of this.page.querySelectorAll("[data-history]"))
      b.addEventListener("click", () => this.actions.showHistory());
    this.q("[data-yield]").addEventListener("click", () => void this.askYield());
    this.q("[data-unpick]").addEventListener("click", () => this.board.clearSelection());
    this.q("[data-place]").addEventListener("click", () => this.board.confirm());
    document.addEventListener("keydown", this.onKey);
    document.addEventListener("pointerdown", this.onOutside);
    this.refresh();
  }

  destroy(): void {
    document.removeEventListener("keydown", this.onKey);
    document.removeEventListener("pointerdown", this.onOutside);
  }

  /** Nhận message của phòng từ server */
  receive(msg: RoomMessage): void {
    const prevActionNo = this.actionNo;
    const prev = this.state;
    // Phòng của game khác không tới đây: room.ts chọn màn hình theo gameId
    if (msg.room.gameId !== "caro" || !msg.room.game) return;
    this.room = msg.room;
    this.you = msg.you;
    this.state = msg.room.game;
    this.actionNo = msg.room.actionNo;
    const next = msg.room.actionNo;
    if (msg.type === "moveApplied" && msg.gameId === "caro" && next === prevActionNo + 1) {
      this.pending = false;
      this.afterMove(msg.seat, msg.move, msg.events, prev);
    } else if (msg.type === "gameStarted" || next !== prevActionNo) {
      // Ván mới, hoặc lỡ mất message (vừa nối lại): vẽ thẳng state mới
      if (msg.type === "gameStarted") this.log = [];
      this.pending = false;
      this.refresh();
    } else {
      this.refresh();
    }
  }

  /** Server từ chối nước đi vừa gửi (vd STALE_MOVE): mở khoá lại bàn */
  rejected(code: ErrorCode): void {
    if (!this.pending) return;
    this.pending = false;
    if (code !== "STALE_MOVE") this.board.shake();
    this.refresh();
  }

  /** Mất / có lại kết nối: khoá bàn khi mất (UX mục 5) */
  setOnline(online: boolean): void {
    this.online = online;
    this.q(".locked").hidden = online;
    if (!online) this.pending = false;
    this.refresh();
  }

  // ---------- Truy vấn ----------

  private q<T extends HTMLElement = HTMLElement>(selector: string): T {
    return $<T>(this.page, selector);
  }

  private nameOf(seat: SeatId): string {
    return seat === this.you.seat ? "Bạn" : identityInRoom(this.room, seat).name;
  }

  /** Quân của mình; null nếu đang xem */
  private myMark(): Mark | null {
    const i = this.you.seat === null ? -1 : this.state.players.indexOf(this.you.seat);
    return i === 0 || i === 1 ? i : null;
  }

  private isMyTurn(): boolean {
    return this.state.status === "playing" && this.myMark() === this.state.turn;
  }

  private canAct(): boolean {
    return this.isMyTurn() && !this.pending && this.online;
  }

  // ---------- Nhận state ----------

  private afterMove(seat: SeatId, move: Move, events: GameEvent[], before: State): void {
    const mark = this.state.players.indexOf(seat) === 1 ? 1 : 0;
    if (isYield(move)) {
      this.afterYield(seat);
      return;
    }
    this.log.push(describePlace(before.moveNo + 1, this.nameOf(seat), mark, move.x, move.y));
    this.setNotice(this.blockedNotice(move, events));
    this.refresh(true);
  }

  /** Chuỗi 5 bị chặn hai đầu thì ván vẫn tiếp tục: nói rõ để người chơi không thắc mắc (UX mục 6) */
  private blockedNotice(move: PlaceMove, events: GameEvent[]): string | null {
    const won = events.some((e) => e.t === "win");
    return !won && hasBlockedLine(this.state, move.x, move.y) ? "Chuỗi 5 bị chặn 2 đầu — chưa thắng" : null;
  }

  /** Người đi trước nhường: đối thủ cầm ✕ và đi trước */
  private afterYield(seat: SeatId): void {
    const to = this.state.players[0];
    this.log.push(describeYield(this.nameOf(seat), this.nameOf(to)));
    const who = to === this.you.seat ? "Bạn cầm ✕ và đi trước" : `${this.nameOf(to)} cầm ✕ và đi trước`;
    this.setNotice(`${this.nameOf(seat)} đã nhường lượt. ${who}`);
    this.refresh();
  }

  private setNotice(text: string | null): void {
    const el = this.q("[data-notice]");
    el.hidden = text === null;
    el.textContent = text ?? "";
  }

  // ---------- Vẽ ----------

  private refresh(fresh = false): void {
    const s = this.state;
    // Bật thao tác trước khi đặt thế cờ: lần vẽ sau cùng mới chạy hiệu ứng quân mới
    this.board.setInteractive(this.canAct(), this.myMark() ?? 0);
    this.board.setPosition({ size: s.size, cells: s.cells, last: s.last, winLine: s.winLine ?? [] }, fresh);
    const bottomSeat = this.you.seat ?? SPECTATOR_BOTTOM_SEAT;
    const topSeat: SeatId = bottomSeat === 0 ? 1 : 0;
    this.renderCard(this.cards.bottom, bottomSeat);
    this.renderCard(this.cards.top, topSeat);
    const playing = s.status === "playing";
    this.q("[data-sub]").textContent = `Phòng ${this.room.code} · Lượt ${s.moveNo + (playing ? 1 : 0)}`;
    this.q("[data-log]").innerHTML = logListHtml(this.log);
    if (!playing) this.setNotice(null);
    if (s.status === "finished") this.showResult();
    else this.closeResult();
    this.updateUi();
  }

  private renderCard(card: CaroPlayerCard, seat: SeatId): void {
    const s = this.state;
    const mark: Mark = s.players[0] === seat ? 0 : 1;
    const state: CaroCardState = {
      mark,
      wins: this.room.wins[seat] ?? 0,
      placed: s.cells.filter((c) => c === mark).length,
      fresh: s.moveNo === 0,
      you: seat === this.you.seat,
      active: s.status === "playing" && s.turn === mark,
      offline: this.room.seats[seat]?.connected === false,
    };
    card.render(identityInRoom(this.room, seat), state);
  }

  /** Nút Đặt quân, dòng gợi ý và viên trạng thái theo ô đang chọn */
  private updateUi(): void {
    const picking = this.canAct() && this.board.selection !== null;
    const mark = this.myMark() ?? 0;
    this.q("[data-pick]").hidden = !picking;
    this.q("[data-hint]").hidden = picking || !this.isMyTurn();
    this.q("[data-yield-row]").hidden = !(this.canAct() && this.canYield());
    this.q("[data-place]").textContent = `Đặt quân ${MARK_CHAR[mark]}`;
    this.setStatus(this.statusText(picking), !this.canAct());
  }

  private statusText(picking: boolean): string {
    if (this.state.status === "finished") return this.finishedText();
    if (!this.online) return "Mất kết nối, đang thử lại…";
    if (this.pending) return "Đang gửi nước đi…";
    if (!this.isMyTurn()) return `Lượt của ${escapeHtml(this.nameOf(this.state.players[this.state.turn]))}…`;
    return picking ? "Chạm lại ô đó hoặc bấm Đặt quân" : `Lượt của bạn · ${TURN_HINT}`;
  }

  private finishedText(): string {
    const winner = this.state.result?.winner ?? null;
    return winner === null ? "Hoà!" : `${escapeHtml(this.nameOf(winner))} thắng!`;
  }

  /** `html` chỉ gồm chuỗi cố định và tên đã escape */
  private setStatus(html: string, waiting: boolean): void {
    this.q("[data-status]").innerHTML = html;
    this.q(".status-pill").classList.toggle("wait", waiting);
  }

  // ---------- Thao tác ----------

  /** Còn quyền nhường: chưa có quân nào và chưa ai nhường (luật mục 3.1) */
  private canYield(): boolean {
    return this.state.moveNo === 0 && !this.state.nhuong;
  }

  private async askYield(): Promise<void> {
    if (!this.canAct() || !this.canYield()) return;
    const ok = await confirmBox({
      title: "Nhường lượt đi trước?",
      body: "Đối thủ sẽ cầm ✕ và đi nước đầu tiên, bạn cầm ◯. Chỉ nhường được một lần trước khi có quân nào được đặt.",
      cancel: "Không nhường",
      ok: "Nhường lượt",
    });
    if (!ok || !this.canAct() || !this.canYield()) return;
    if (!this.actions.move({ nhuong: true }, this.actionNo)) return;
    this.pending = true;
    this.board.setInteractive(false, this.myMark() ?? 0);
    this.updateUi();
  }

  private place(index: number): void {
    if (!this.canAct() || this.state.cells[index] !== null) return;
    const size = this.state.size;
    const move: PlaceMove = { x: xOf(size, index), y: yOf(size, index) };
    if (!this.actions.move(move, this.actionNo)) return;
    this.pending = true;
    this.board.setInteractive(false, this.myMark() ?? 0);
    this.updateUi();
  }

  /** Phím tắt (UX mục 3.3). Trả về true nếu phím đã được dùng */
  private handleKey(e: KeyboardEvent): boolean {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (!this.q(".result").hidden) return this.keyOnResult(e);
    if (!this.canAct()) return false;
    // Nút đang được focus tự xử lý Enter / Space
    const onButton = (e.target as HTMLElement).closest("button, a") !== null;
    const arrows: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const step = arrows[e.key];
    if (step) this.board.moveCursor(step[0], step[1]);
    else if ((e.key === "Enter" || e.key === " ") && !onButton) this.board.confirm();
    else if (e.key === "Escape") this.board.clearSelection();
    else return false;
    return true;
  }

  private keyOnResult(e: KeyboardEvent): boolean {
    if (e.key !== "Enter" || this.you.seat === null) return false;
    this.actions.rematch();
    return true;
  }

  // ---------- Kết quả (UX mục 5) ----------

  private showResult(): void {
    const result = this.state.result;
    if (!result) return;
    const box = this.q(".result");
    box.innerHTML = resultHtml({
      result,
      size: this.state.size,
      cells: this.state.cells,
      identityOf: (seat) => identityInRoom(this.room, seat),
      mySeat: this.you.seat,
      nextFirst: this.room.nextFirst,
      wins: this.room.wins,
      rematchSeats: this.room.rematchVotes.flatMap((id) => seatOfMember(this.room, id) ?? []),
    });
    // Người xem không có nút Ván nữa
    box.querySelector("[data-again]")?.addEventListener("click", () => this.actions.rematch());
    $(box, "[data-lobby]").addEventListener("click", () => this.actions.toLobby());
    $(box, "[data-leave]").addEventListener("click", () => this.actions.leave());
    const wasHidden = box.hidden;
    box.hidden = false;
    this.q(".scrim").hidden = false;
    if (wasHidden) box.querySelector<HTMLElement>("[data-again]:not([disabled])")?.focus();
  }

  private closeResult(): void {
    this.q(".result").hidden = true;
    this.q(".scrim").hidden = true;
  }
}
