// Bàn chơi Cờ tướng online: hiển thị state server gửi, gửi ý định đi quân (UX mục 3).
// Server quyết định mọi thứ; client chỉ hỏi engine nước nào đi được để vẽ chấm gợi ý.
// Mình luôn ở dưới (người cầm Đen thấy bàn xoay); người xem thấy người cầm Đỏ ở dưới.

import type { SeatId } from "@playtogether/engine";
import type { GameEvent, Move, Piece, Side, State } from "@playtogether/engine/co-tuong";
import { findGeneral, validMoves } from "@playtogether/engine/co-tuong";
import type { CoTuongRoom, ErrorCode, PublicRoom, You } from "@playtogether/protocol";
import "./co-tuong.css";
import { $, escapeHtml } from "../dom.ts";
import { confirmBox } from "../game-ui/confirm-box.ts";
import { type LogEntry, logListHtml } from "../game-ui/log-view.ts";
import type { GameActions, GameScreen, RoomMessage } from "../games/types.ts";
import { identityInRoom, seatOfMember } from "../screens/room-players.ts";
import { CoTuongBoard } from "./board-dom.ts";
import { coTuongPageHtml } from "./game-page.ts";
import { describeMove } from "./move-log.ts";
import { type CoTuongCardState, CoTuongPlayerCard } from "./player-card.ts";
import { resultHtml } from "./result-view.ts";

/** Người xem thấy người ngồi ghế này ở dưới (ghế 1 trên giao diện, chỉ số 0) */
const SPECTATOR_BOTTOM_SEAT: SeatId = 0;

export class CoTuongGameView implements GameScreen {
  private room: CoTuongRoom;
  private you: You;
  private state: State;
  private actionNo: number;
  /** Đã gửi nước đi, đang chờ server */
  private pending = false;
  private online = true;
  private log: LogEntry[] = [];
  private readonly board: CoTuongBoard;
  private readonly page: HTMLElement;
  private readonly cards = { top: new CoTuongPlayerCard(), bottom: new CoTuongPlayerCard() };
  private readonly actions: GameActions;
  private readonly onKey = (e: KeyboardEvent) => {
    if (this.handleKey(e)) e.preventDefault();
  };
  private readonly onOutside = (e: PointerEvent) => {
    // composedPath: bàn vẽ lại khi chọn quân nên `e.target` có thể đã rời khỏi DOM lúc sự kiện tới đây
    const inside = e.composedPath().some((n) => n instanceof Element && n.matches(".ct-board"));
    if (this.board.selection !== null && !inside) this.board.clearSelection();
  };

  constructor(root: HTMLElement, room: PublicRoom, you: You, actions: GameActions) {
    if (room.gameId !== "co-tuong") throw new Error(`Cần phòng Cờ tướng, nhận ${room.gameId}`);
    if (!room.game) throw new Error("Phòng chưa có ván");
    this.room = room;
    this.you = you;
    this.state = room.game;
    this.actionNo = room.actionNo;
    this.actions = actions;
    this.board = new CoTuongBoard({
      onSelect: () => this.updateUi(),
      onMove: (move) => this.sendMove(move),
      onStuck: () => {
        this.board.shake();
        this.setNotice("Đi quân này sẽ để tướng bị chiếu, hoặc quân không có nước đi");
      },
    });
    root.innerHTML = coTuongPageHtml();
    this.page = $(root, ".game-page");
    this.q("[data-card-top]").replaceWith(this.cards.top.el);
    this.q("[data-card-bottom]").replaceWith(this.cards.bottom.el);
    this.q("[data-board]").replaceWith(this.board.el);
    for (const b of this.page.querySelectorAll("[data-rules]"))
      b.addEventListener("click", () => this.actions.showRules());
    for (const b of this.page.querySelectorAll("[data-history]"))
      b.addEventListener("click", () => this.actions.showHistory());
    this.q("[data-resign]").addEventListener("click", () => void this.askResign());
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
    // Phòng của game khác không tới đây: room.ts chọn màn hình theo gameId
    if (msg.room.gameId !== "co-tuong" || !msg.room.game) return;
    this.room = msg.room;
    this.you = msg.you;
    this.state = msg.room.game;
    this.actionNo = msg.room.actionNo;
    const next = msg.room.actionNo;
    if (msg.type === "moveApplied" && msg.gameId === "co-tuong" && next === prevActionNo + 1) {
      this.pending = false;
      this.afterMove(msg.seat, msg.events);
    } else {
      // Ván mới, xin thua, hoặc lỡ mất message (vừa nối lại): vẽ thẳng state mới
      if (msg.type === "gameStarted") this.log = [];
      if (next !== prevActionNo || msg.type === "gameStarted") this.pending = false;
      this.setNotice(null);
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

  /** Bên của mình; null nếu đang xem */
  private mySide(): Side | null {
    const i = this.you.seat === null ? -1 : this.state.players.indexOf(this.you.seat);
    return i === 0 || i === 1 ? i : null;
  }

  private isMyTurn(): boolean {
    return this.state.status === "playing" && this.mySide() === this.state.turn;
  }

  private canAct(): boolean {
    return this.isMyTurn() && !this.pending && this.online;
  }

  // ---------- Nhận state ----------

  private afterMove(seat: SeatId, events: GameEvent[]): void {
    const played = events.find((e) => e.t === "move");
    if (played?.t === "move") {
      const n = this.state.moveNo;
      this.log.push(describeMove(n, this.nameOf(seat), played.piece, played.from, played.to, played.captured));
    }
    this.setNotice(null);
    this.refresh(true);
  }

  private setNotice(text: string | null): void {
    const el = this.q("[data-notice]");
    el.hidden = text === null;
    el.textContent = text ?? "";
  }

  // ---------- Vẽ ----------

  private refresh(fresh = false): void {
    const s = this.state;
    const mySide = this.mySide();
    // Bật thao tác và nước hợp lệ trước khi đặt thế cờ, để vẽ một lần
    this.board.setInteractive(this.canAct(), mySide);
    this.board.setLegalMoves(this.canAct() && this.you.seat !== null ? validMoves(s, this.you.seat) : []);
    this.board.setPosition({ cells: s.cells, last: s.last, checkCell: this.checkCell() }, fresh);
    const bottomSeat = this.you.seat ?? SPECTATOR_BOTTOM_SEAT;
    const topSeat: SeatId = bottomSeat === 0 ? 1 : 0;
    this.renderCard(this.cards.bottom, bottomSeat);
    this.renderCard(this.cards.top, topSeat);
    const playing = s.status === "playing";
    this.q("[data-sub]").textContent = `Phòng ${this.room.code} · Nước ${s.moveNo + (playing ? 1 : 0)}`;
    this.q("[data-log]").innerHTML = logListHtml(this.log);
    this.q("[data-resign]").hidden = !(playing && mySide !== null);
    if (!playing) this.setNotice(null);
    if (s.status === "finished") this.showResult();
    else this.closeResult();
    this.updateUi();
  }

  /** Ô Tướng đang bị chiếu (bên đến lượt); null nếu không có chiếu */
  private checkCell(): number | null {
    const s = this.state;
    if (!s.inCheck) return null;
    const cell = findGeneral(s.cells, s.turn);
    return cell >= 0 ? cell : null;
  }

  private renderCard(card: CoTuongPlayerCard, seat: SeatId): void {
    const s = this.state;
    const side: Side = s.players[0] === seat ? 0 : 1;
    const state: CoTuongCardState = {
      side,
      captured: s.captured.filter((p: Piece) => p.side !== side),
      wins: this.room.wins[seat] ?? 0,
      fresh: s.moveNo === 0,
      you: seat === this.you.seat,
      active: s.status === "playing" && s.turn === side,
      offline: this.room.seats[seat]?.connected === false,
    };
    card.render(identityInRoom(this.room, seat), state);
  }

  /** Viên trạng thái theo ván và quân đang chọn */
  private updateUi(): void {
    this.setStatus(this.statusText(), !this.canAct());
  }

  private statusText(): string {
    if (this.state.status === "finished") return this.finishedText();
    if (!this.online) return "Mất kết nối, đang thử lại…";
    if (this.pending) return "Đang gửi nước đi…";
    const inCheck = this.state.inCheck;
    if (!this.isMyTurn()) {
      const who = escapeHtml(this.nameOf(this.state.players[this.state.turn]));
      return inCheck ? `Chiếu tướng! Lượt của ${who}…` : `Lượt của ${who}…`;
    }
    if (inCheck) return "Bạn đang bị chiếu!";
    return this.board.selection === null ? "Lượt của bạn · chạm một quân" : "Chạm ô đích để đi";
  }

  private finishedText(): string {
    const winner = this.state.result?.winner ?? null;
    return winner === null ? "Hoà!" : `${escapeHtml(this.nameOf(winner))} thắng!`;
  }

  /** `html` chỉ gồm chuỗi cố định và tên đã escape */
  private setStatus(html: string, waiting: boolean): void {
    const pill = this.q(".status-pill");
    this.q("[data-status]").innerHTML = html;
    pill.classList.toggle("wait", waiting);
    pill.classList.toggle("danger", this.state.status === "playing" && this.state.inCheck && this.isMyTurn());
  }

  // ---------- Thao tác ----------

  private async askResign(): Promise<void> {
    if (this.state.status !== "playing" || this.mySide() === null) return;
    const ok = await confirmBox({
      title: "Xin thua ván này?",
      body: "Đối thủ sẽ thắng ván này. Bạn vẫn ở lại phòng và có thể chơi ván nữa.",
      cancel: "Chơi tiếp",
      ok: "Xin thua",
    });
    if (ok && this.state.status === "playing") this.actions.resign();
  }

  private sendMove(move: Move): void {
    if (!this.canAct()) return;
    if (!this.actions.move(move, this.actionNo)) return;
    this.pending = true;
    this.board.setInteractive(false, this.mySide());
    this.updateUi();
  }

  /** Phím tắt (UX mục 6). Trả về true nếu phím đã được dùng */
  private handleKey(e: KeyboardEvent): boolean {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (!this.q(".result").hidden) return this.keyOnResult(e);
    if (e.key !== "Escape" || this.board.selection === null) return false;
    this.board.clearSelection();
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
      cells: this.state.cells,
      last: this.state.last,
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
