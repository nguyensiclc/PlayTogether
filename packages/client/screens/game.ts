// Bàn chơi online (M3): hiển thị state server gửi, gửi ý định đi quân, phát hiệu ứng theo events.
// Server quyết định mọi thứ; client chỉ hỏi engine để biết ô nào sáng và lúc nào được Lật bàn.
// Mỗi người luôn thấy hàng của mình ở dưới; người xem thấy người ngồi ghế 1 ở dưới (UX mục 2.4, Q22h).

import type { SeatId } from "@playtogether/engine";
import type { GameEvent, Move, Seat, State } from "@playtogether/engine/o-an-quan";
import { oAnQuan, owner } from "@playtogether/engine/o-an-quan";
import type { ErrorCode, OAnQuanRoom, PublicRoom, You } from "@playtogether/protocol";
import { $ } from "../dom.ts";
import { BoardDom } from "../o-an-quan/board-dom.ts";
import { latBanSheetHtml } from "../o-an-quan/lat-ban-sheet.ts";
import { dirForArrow, layoutFor } from "../o-an-quan/layout.ts";
import { logLineHtml, logListHtml } from "../o-an-quan/log-view.ts";
import { playEffect } from "../o-an-quan/move-effects.ts";
import { describeMove, keepSideEntry, type LogEntry } from "../o-an-quan/move-log.ts";
import { FAST_SPEED, Playback } from "../o-an-quan/playback.ts";
import { PlayerCard } from "../o-an-quan/player-card.ts";
import { resultHtml } from "../o-an-quan/result-view.ts";
import { type BoardView, points, viewFromState } from "../o-an-quan/view-model.ts";
import { handleGameKey, type KeyActions } from "./game-keys.ts";
import { gamePageHtml } from "./game-page.ts";
import type { GameActions, GameScreen, RoomMessage } from "./game-screen.ts";
import { identityInRoom, seatOfMember } from "./room-players.ts";

/** Người xem thấy người ngồi ghế này ở dưới (Q22h: ghế 1 trên giao diện, chỉ số 0) */
const SPECTATOR_BOTTOM_SEAT: SeatId = 0;

export class GameView implements GameScreen {
  private room: OAnQuanRoom;
  private you: You;
  /** State đang hiển thị (đã chạy xong hiệu ứng) và actionNo tương ứng */
  private state: State;
  private actionNo: number;
  /** Các message từ server xử lý lần lượt, để hiệu ứng nước trước chạy xong mới tới nước sau */
  private queue: Promise<void> = Promise.resolve();
  private selected: number | null = null;
  /** Đang chạy hiệu ứng */
  private busy = false;
  /** Đã gửi nước đi, đang chờ server */
  private pending = false;
  private online = true;
  /** Mình đã chọn giữ bên (đóng hộp hỏi Lật bàn) trong ván này */
  private latBanDeclined = false;
  private playback: Playback | null = null;
  private log: LogEntry[] = [];
  private lastMove: LogEntry[] = [];
  private readonly board: BoardDom;
  private readonly page: HTMLElement;
  private readonly cards = { top: new PlayerCard(), bottom: new PlayerCard() };
  private readonly actions: GameActions;
  private readonly onKey = (e: KeyboardEvent) => {
    if (handleGameKey(e, this.keyActions)) e.preventDefault();
  };
  private readonly onOutside = (e: PointerEvent) => {
    const target = e.target as HTMLElement;
    if (this.selected !== null && !target.closest(".cell, .dir-pick")) this.select(null);
  };

  constructor(root: HTMLElement, room: PublicRoom, you: You, actions: GameActions) {
    if (room.gameId !== "o-an-quan") throw new Error(`Cần phòng Ô ăn quan, nhận ${room.gameId}`);
    if (!room.game) throw new Error("Phòng chưa có ván");
    this.room = room;
    this.you = you;
    this.state = room.game;
    this.actionNo = room.actionNo;
    this.actions = actions;
    this.board = new BoardDom({
      onSquare: (i) => this.tapSquare(i),
      onArrow: (arrow) => this.sendSow(arrow),
    });
    root.innerHTML = gamePageHtml(room.options);
    this.page = $(root, ".game-page");
    this.q("[data-card-top]").replaceWith(this.cards.top.el);
    this.q("[data-card-bottom]").replaceWith(this.cards.bottom.el);
    this.q("[data-board]").replaceWith(this.board.el);
    this.q("[data-fast]").addEventListener("click", () => this.toggleFast());
    this.q("[data-skip]").addEventListener("click", () => this.playback?.skip());
    this.q(".scrim").addEventListener("click", () => {
      if (!this.q(".latban").hidden) this.declineLatBan();
    });
    document.addEventListener("keydown", this.onKey);
    document.addEventListener("pointerdown", this.onOutside);
    this.showSnapshot();
  }

  destroy(): void {
    document.removeEventListener("keydown", this.onKey);
    document.removeEventListener("pointerdown", this.onOutside);
    this.playback?.skip();
  }

  /** Nhận message của phòng từ server; xử lý lần lượt sau hiệu ứng đang chạy */
  receive(msg: RoomMessage): void {
    this.queue = this.queue.then(() => this.apply(msg));
  }

  /** Server từ chối nước đi vừa gửi (vd STALE_MOVE): mở khoá lại bàn */
  rejected(code: ErrorCode): void {
    if (!this.pending) return;
    this.pending = false;
    if (code !== "STALE_MOVE" && this.selected !== null) this.board.shake(this.selected);
    this.idle();
  }

  /** Mất / có lại kết nối: khoá bàn khi mất (UX mục 5) */
  setOnline(online: boolean): void {
    this.online = online;
    this.q(".locked").hidden = online;
    if (!online) this.pending = false;
    if (!this.busy) this.idle();
  }

  // ---------- Nhận state ----------

  private async apply(msg: RoomMessage): Promise<void> {
    const prev = this.state;
    const prevActionNo = this.actionNo;
    // Phòng của game khác không tới đây: room.ts chọn màn hình theo gameId
    if (msg.room.gameId !== "o-an-quan") return;
    this.room = msg.room;
    this.you = msg.you;
    const next = msg.room.game;
    if (!next) return;
    this.state = next;
    this.actionNo = msg.room.actionNo;
    if (msg.type === "moveApplied" && msg.gameId === "o-an-quan" && msg.room.actionNo === prevActionNo + 1) {
      this.pending = false;
      await this.animate(msg.seat, msg.move, msg.events, prev);
    } else if (msg.type === "gameStarted" || msg.room.actionNo !== prevActionNo) {
      // Ván mới, hoặc lỡ mất message (vừa nối lại): vẽ thẳng state mới, không chạy hiệu ứng
      this.showSnapshot(msg.type === "gameStarted");
      return;
    }
    this.afterUpdate();
  }

  /** Vẽ thẳng state hiện tại; ván mới thì xoá nhật ký và quyết định Lật bàn */
  private showSnapshot(newGame = true): void {
    if (newGame) {
      this.log = [];
      this.lastMove = [];
      this.latBanDeclined = false;
      this.renderLog();
    }
    this.pending = false;
    this.afterUpdate();
  }

  private afterUpdate(): void {
    this.renderView(viewFromState(this.state));
    if (this.state.status === "finished") this.showResult();
    else {
      this.closeResult();
      this.idle();
    }
  }

  private async animate(seat: SeatId, move: Move, events: GameEvent[], before: State): Promise<void> {
    const after = this.state;
    const v = this.room.options.giaTriQuan;
    this.addLog(
      describeMove(before.moveNo + 1, this.nameOf(seat), move, events, v, (side) =>
        this.nameOf(after.controller[side]),
      ),
    );
    this.busy = true;
    this.select(null);
    this.setStatus(move.kind === "latBan" ? `${this.nameOf(seat)} lật bàn…` : `${this.nameOf(seat)} đang rải…`, true);
    this.q(".playback").hidden = move.kind !== "sow";
    const pb = new Playback();
    pb.speed = this.q("[data-fast]").getAttribute("aria-pressed") === "true" ? FAST_SPEED : 1;
    this.playback = pb;
    await pb.run(events, viewFromState(before), v, {
      render: (view, ms) => this.renderView(view, ms),
      effect: (e, ctx) =>
        playEffect(e, ctx, {
          board: this.board,
          cardOf: (side) => this.cardOf(side),
          giaTriQuan: v,
          nameOf: (s) => this.nameOf(s),
          turnAfter: after.turn,
        }),
    });
    this.playback = null;
    this.busy = false;
    this.q(".playback").hidden = true;
  }

  // ---------- Truy vấn ----------

  private q<T extends HTMLElement = HTMLElement>(selector: string): T {
    return $<T>(this.page, selector);
  }

  private nameOf(seat: SeatId): string {
    return seat === this.you.seat ? "Bạn" : identityInRoom(this.room, seat).name;
  }

  private isMyTurn(): boolean {
    const s = this.state;
    return s.status === "playing" && this.you.seat !== null && s.controller[s.turn] === this.you.seat;
  }

  private canAct(): boolean {
    return this.isMyTurn() && !this.busy && !this.pending && this.online;
  }

  private myMoves(): Move[] {
    return this.you.seat === null ? [] : oAnQuan.validMoves(this.state, this.you.seat);
  }

  private validSquares(): Set<number> {
    return new Set(this.myMoves().flatMap((m) => (m.kind === "sow" ? [m.square] : [])));
  }

  private canLatBan(): boolean {
    return this.canAct() && !this.latBanDeclined && this.myMoves().some((m) => m.kind === "latBan");
  }

  /** Bên bàn vẽ ở dưới: bên mình đang điều khiển; người xem thì bên của ghế 1 */
  private bottomSide(view: BoardView): Seat {
    const seat = this.you.seat ?? SPECTATOR_BOTTOM_SEAT;
    return view.controller[0] === seat ? 0 : 1;
  }

  // ---------- Vẽ ----------

  private renderView(view: BoardView, handMs = 0): void {
    const bottom = this.bottomSide(view);
    const top: Seat = bottom === 0 ? 1 : 0;
    // Mình đổi sang bên kia (Lật bàn, ván mới) thì vẽ lại hai hàng ngay, không có hiệu ứng xoay (Q22h)
    if (bottom !== this.board.bottomSeat) this.board.setPerspective(bottom);
    this.board.render(view, handMs);
    this.renderCard(this.cards.bottom, view, bottom);
    this.renderCard(this.cards.top, view, top);
    const label = (side: Seat) => {
      const seat = view.controller[side];
      return seat === this.you.seat ? "Hàng của bạn" : `Hàng của ${identityInRoom(this.room, seat).name}`;
    };
    this.q("[data-label-top]").textContent = label(top);
    this.q("[data-label-bottom]").textContent = label(bottom);
    const playing = this.state.status === "playing";
    this.q("[data-sub]").textContent = `Phòng ${this.room.code} · Lượt ${this.state.moveNo + (playing ? 1 : 0)}`;
  }

  private renderCard(card: PlayerCard, view: BoardView, side: Seat): void {
    const seat = view.controller[side];
    const pile = view.captured[side];
    card.render(identityInRoom(this.room, seat), {
      pile,
      points: points(pile, this.room.options.giaTriQuan),
      you: seat === this.you.seat,
      active: this.state.status === "playing" && this.state.turn === side,
      offline: this.room.seats[seat]?.connected === false,
    });
  }

  private cardOf(side: Seat): PlayerCard {
    return side === this.board.bottomSeat ? this.cards.bottom : this.cards.top;
  }

  private setStatus(text: string, waiting: boolean): void {
    this.q("[data-status]").textContent = text;
    this.q(".status-pill").classList.toggle("wait", waiting);
  }

  // ---------- Thao tác ----------

  /** Cập nhật trạng thái chờ / đến lượt sau mỗi thay đổi */
  private idle(): void {
    if (this.busy || this.state.status !== "playing") return;
    this.select(this.canAct() ? this.selected : null);
    if (!this.online) this.setStatus("Mất kết nối, đang thử lại…", true);
    else if (this.pending) this.setStatus("Đang gửi nước đi…", true);
    else if (!this.isMyTurn()) this.setStatus(`Lượt của ${this.nameOf(this.state.controller[this.state.turn])}`, true);
    if (this.canLatBan()) this.openLatBan();
  }

  private select(square: number | null): void {
    this.selected = square;
    const active = this.canAct();
    const valid = active ? this.validSquares() : new Set<number>();
    this.board.setInteraction({ active, turnSide: this.state.turn, valid, selected: square });
    const picking = active && square !== null;
    this.q("[data-pick-hint]").hidden = !picking;
    this.q("[data-hint]").hidden = !picking;
    this.q("[data-esc]").hidden = !picking;
    if (active) this.setStatus(picking ? "Lượt của bạn · chọn chiều rải" : "Lượt của bạn · chọn một ô", false);
  }

  private tapSquare(i: number): void {
    if (!this.canAct()) return;
    if (owner(i) !== this.state.turn || !this.validSquares().has(i)) {
      this.board.shake(i);
      return;
    }
    this.select(this.selected === i ? null : i);
  }

  /** Mũi tên chỉ hướng sỏi chạy trên màn hình, nên chiều rải tuỳ ô đang chọn nằm hàng nào (Q21) */
  private sendSow(arrow: "left" | "right"): void {
    if (this.selected === null) return;
    this.send({ kind: "sow", square: this.selected, dir: dirForArrow(arrow, this.board.rowOf(this.selected)) });
  }

  private send(move: Move): void {
    if (!this.canAct()) return;
    if (!this.actions.move(move, this.actionNo)) return;
    this.pending = true;
    this.closeLatBan();
    this.idle();
  }

  // ---------- Lật bàn (UX mục 3) ----------

  private openLatBan(): void {
    const side = this.state.turn;
    const other: Seat = side === 0 ? 1 : 0;
    const v = this.room.options.giaTriQuan;
    const box = this.q(".latban");
    if (!box.hidden) return;
    box.innerHTML = latBanSheetHtml({
      opener: this.nameOf(this.state.controller[other]),
      keepPoints: points(this.state.captured[side], v),
      flipPoints: points(this.state.captured[other], v),
    });
    $(box, "[data-keep]").addEventListener("click", () => this.declineLatBan());
    $(box, "[data-flip]").addEventListener("click", () => this.send({ kind: "latBan" }));
    box.hidden = false;
    this.q(".scrim").hidden = false;
    $(box, "[data-flip]").focus();
  }

  private closeLatBan(): void {
    this.q(".latban").hidden = true;
    if (this.q(".result").hidden) this.q(".scrim").hidden = true;
  }

  /** Đóng hộp hỏi nghĩa là giữ bên (UX mục 3) */
  private declineLatBan(): void {
    if (this.latBanDeclined) return;
    this.latBanDeclined = true;
    this.closeLatBan();
    this.addLog([keepSideEntry(this.state.moveNo + 1, "Bạn")]);
  }

  // ---------- Nhật ký ván ----------

  private addLog(entries: LogEntry[]): void {
    this.log.push(...entries);
    this.lastMove = entries;
    this.renderLog();
  }

  private renderLog(): void {
    this.q("[data-log]").innerHTML = logListHtml(this.log);
    this.q(".log-line").innerHTML = logLineHtml(this.lastMove[0]);
  }

  // ---------- Phím tắt ----------

  private toggleFast(): void {
    const b = this.q("[data-fast]");
    const on = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", String(on));
    if (this.playback) this.playback.speed = on ? FAST_SPEED : 1;
  }

  private readonly keyActions: KeyActions = {
    context: () => (!this.q(".result").hidden ? "result" : !this.q(".latban").hidden ? "latBan" : "board"),
    isBusy: () => this.busy,
    canAct: () => this.canAct(),
    hasSelection: () => this.selected !== null,
    canLatBan: () => this.canLatBan(),
    playAgain: () => this.actions.rematch(),
    keepSide: () => this.declineLatBan(),
    latBan: () => this.send({ kind: "latBan" }),
    toggleFast: () => this.toggleFast(),
    selectNth: (n) => {
      // Ô thứ n từ trái sang trên màn hình, ở hàng của mình (luôn ở dưới)
      const square = layoutFor(this.board.bottomSeat).bottom[n - 1];
      if (square !== undefined) this.tapSquare(square);
    },
    sow: (arrow) => this.sendSow(arrow),
    deselect: () => this.select(null),
  };

  // ---------- Kết quả (UX mục 2.5) ----------

  private showResult(): void {
    const result = this.state.result;
    if (!result) return;
    const box = this.q(".result");
    box.innerHTML = resultHtml({
      result,
      giaTriQuan: this.room.options.giaTriQuan,
      identityOf: (seat) => identityInRoom(this.room, seat),
      mySeat: this.you.seat,
      nextFirst: this.room.nextFirst,
      rematchSeats: this.room.rematchVotes.flatMap((id) => seatOfMember(this.room, id) ?? []),
    });
    // Người xem không có nút Ván nữa
    box.querySelector("[data-again]")?.addEventListener("click", () => this.actions.rematch());
    $(box, "[data-lobby]").addEventListener("click", () => this.actions.toLobby());
    $(box, "[data-leave]").addEventListener("click", () => this.actions.leave());
    const wasHidden = box.hidden;
    box.hidden = false;
    this.q(".scrim").hidden = false;
    this.q(".latban").hidden = true;
    const winner = result.winner;
    this.setStatus(winner === null ? "Hoà!" : `${this.nameOf(winner)} thắng!`, true);
    if (wasHidden) box.querySelector<HTMLElement>("[data-again]:not([disabled])")?.focus();
  }

  private closeResult(): void {
    this.q(".result").hidden = true;
    if (this.q(".latban").hidden) this.q(".scrim").hidden = true;
  }
}
