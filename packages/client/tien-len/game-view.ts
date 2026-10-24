// Bàn chơi Tiến lên online: hiển thị ván từ server (chỉ thấy bài của mình), chọn bài và gửi ý định đánh hoặc bỏ lượt.

import type { SeatId } from "@playtogether/engine";
import type { Card, View } from "@playtogether/engine/tien-len";
import type { ErrorCode, PublicRoom, TienLenRoom, You } from "@playtogether/protocol";
import "./tien-len.css";
import { $, escapeHtml } from "../dom.ts";
import { confirmBox } from "../game-ui/confirm-box.ts";
import { type LogEntry, logListHtml } from "../game-ui/log-view.ts";
import { avatarHtml } from "../game-ui/result-parts.ts";
import type { GameActions, GameScreen, RoomMessage } from "../games/types.ts";
import { identityInRoom } from "../screens/room-players.ts";
import { backHtml, cardHtml } from "./card-view.ts";
import { tienLenPageHtml } from "./game-page.ts";
import { kindLabel, logEntries } from "./move-log.ts";
import { TienLenPlayerCard } from "./player-card.ts";
import { judge, smallestPlayWith, sortHand, usableCards } from "./plays.ts";
import { resultHtml } from "./result-view.ts";

export class TienLenGameView implements GameScreen {
  private room: TienLenRoom;
  private you: You;
  private view: View;
  private actionNo: number;
  private pending = false;
  private online = true;
  private selected = new Set<Card>();
  private sortMode: "value" | "group" = "value";
  /** Vị trí lá đang được con trỏ bàn phím trỏ tới */
  private cursor = 0;
  private fresh = false;
  private log: LogEntry[] = [];

  private readonly page: HTMLElement;
  private readonly handEl: HTMLElement;
  private readonly card = new TienLenPlayerCard();
  private readonly actions: GameActions;
  private readonly onKey = (e: KeyboardEvent): void => this.handleKey(e);
  private readonly resizeObserver: ResizeObserver | null;

  constructor(root: HTMLElement, room: PublicRoom, you: You, actions: GameActions) {
    if (room.gameId !== "tien-len") throw new Error(`Cần phòng Tiến lên, nhận ${room.gameId}`);
    if (!room.game) throw new Error("Phòng chưa có ván");
    this.room = room;
    this.you = you;
    this.view = room.game;
    this.actionNo = room.actionNo;
    this.actions = actions;

    root.innerHTML = tienLenPageHtml(room.options);
    this.page = $(root, ".tl-page");
    this.q("[data-card-bottom]").replaceWith(this.card.el);
    this.handEl = this.q("[data-hand]");
    this.resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => this.layoutHand());
    this.resizeObserver?.observe(this.handEl);

    this.initEvents();
    this.refresh();
  }

  private q<T extends HTMLElement = HTMLElement>(sel: string): T {
    return $(this.page, sel);
  }

  private get mySeat(): SeatId | null {
    return this.you.seat;
  }

  private nameOf = (seat: SeatId): string => identityInRoom(this.room, seat).name;

  /** Tới lượt mình và bàn đang mở khoá */
  private get canAct(): boolean {
    return this.online && !this.pending && this.view.status === "playing" && this.mySeat === this.view.turn;
  }

  // ---------- Sự kiện ----------

  private initEvents(): void {
    for (const b of this.page.querySelectorAll("[data-rules]"))
      b.addEventListener("click", () => this.actions.showRules());
    for (const b of this.page.querySelectorAll("[data-history]")) {
      b.addEventListener("click", () => this.actions.showHistory());
    }
    this.q("[data-resign]").addEventListener("click", () => void this.askResign());
    this.q("[data-play]").addEventListener("click", () => this.play());
    this.q("[data-pass]").addEventListener("click", () => this.pass());
    this.q("[data-clear]").addEventListener("click", () => this.clearSelection());
    this.q("[data-sort]").addEventListener("click", () => this.toggleSort());
    this.handEl.addEventListener("click", (e) => this.onHandClick(e));
    this.handEl.addEventListener("dblclick", (e) => this.onHandDoubleClick(e));
    document.addEventListener("keydown", this.onKey);
  }

  private cardOf(e: Event): Card | null {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-card]");
    return el ? Number(el.dataset.card) : null;
  }

  private onHandClick(e: MouseEvent): void {
    const c = this.cardOf(e);
    if (c === null || e.detail > 1) return;
    this.toggle(c);
  }

  /** Chạm hai lần: chọn nhanh bộ nhỏ nhất đè được bộ trên bàn mà có lá này (UX mục 3) */
  private onHandDoubleClick(e: MouseEvent): void {
    const c = this.cardOf(e);
    if (c === null || !this.canAct) return;
    const combo = smallestPlayWith(this.view, c);
    if (!combo) return;
    this.selected = new Set(combo.cards);
    this.renderHand();
    this.renderButtons();
  }

  private toggle(c: Card): void {
    if (this.selected.has(c)) this.selected.delete(c);
    else this.selected.add(c);
    this.renderHand();
    this.renderButtons();
  }

  private clearSelection(): void {
    if (this.selected.size === 0) return;
    this.selected.clear();
    this.renderHand();
    this.renderButtons();
  }

  private toggleSort(): void {
    this.sortMode = this.sortMode === "value" ? "group" : "value";
    this.renderHand();
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
    const cards = this.sortedHand();
    const moveCursor = (d: number): void => {
      this.cursor = Math.min(Math.max(this.cursor + d, 0), Math.max(cards.length - 1, 0));
      this.renderHand();
      this.handEl.querySelector<HTMLElement>(`[data-card="${cards[this.cursor]}"]`)?.focus();
    };
    const actions: Record<string, () => void> = {
      ArrowLeft: () => moveCursor(-1),
      ArrowRight: () => moveCursor(1),
      Escape: () => this.clearSelection(),
      Enter: () => this.play(),
      p: () => this.pass(),
      s: () => this.toggleSort(),
    };
    const act = actions[e.key];
    if (act) {
      e.preventDefault();
      act();
    } else if (e.key === " ") {
      const c = cards[this.cursor];
      if (c !== undefined) {
        e.preventDefault();
        this.toggle(c);
      }
    }
  }

  private play(): void {
    if (!this.canAct) return;
    const j = judge(this.view, [...this.selected]);
    if (!j.ok) return;
    this.send({ type: "play", cards: j.combo.cards });
  }

  private pass(): void {
    if (!this.canAct || this.view.table === null) return;
    this.send({ type: "pass" });
  }

  private send(move: object): void {
    this.pending = true;
    this.selected.clear();
    if (!this.actions.move(move, this.actionNo)) this.pending = false;
    this.refresh();
  }

  private async askResign(): Promise<void> {
    const ok = await confirmBox({
      title: "Bỏ cuộc ván này?",
      body: "Bài của bạn bị loại và bạn xếp sau cùng. Bạn vẫn ở lại phòng và chơi được ván sau.",
      cancel: "Chơi tiếp",
      ok: "Bỏ cuộc",
    });
    if (ok && this.view.status === "playing") this.actions.resign();
  }

  // ---------- Hiển thị ----------

  private sortedHand(): Card[] {
    return sortHand(this.view.hand ?? [], this.sortMode);
  }

  private refresh(): void {
    this.renderOpponents();
    this.renderTable();
    this.renderStatus();
    this.renderHand();
    this.renderButtons();
    this.renderMe();
    this.q("[data-log]").innerHTML = logListHtml(this.log);
    this.q("[data-sub]").textContent = ` · Phòng ${this.room.code} · Vòng ${this.view.round}`;
    this.q("[data-resign]").hidden = !this.canResign();
    if (this.view.status === "finished" && this.view.result) this.showResult();
  }

  private canResign(): boolean {
    const s = this.mySeat;
    return (
      this.view.status === "playing" &&
      s !== null &&
      !this.view.finished.includes(s) &&
      !this.view.left.includes(s) &&
      this.online
    );
  }

  /** Các ghế đối thủ theo thứ tự đi sau mình (người xem thấy mọi ghế) */
  private opponentSeats(): SeatId[] {
    const seats = this.view.seats;
    const me = this.mySeat;
    if (me === null || !seats.includes(me)) return [...seats];
    const at = seats.indexOf(me);
    return [...seats.slice(at + 1), ...seats.slice(0, at)];
  }

  private oppSub(seat: SeatId): string {
    const v = this.view;
    if (v.left.includes(seat)) return "Đã rời";
    if (!this.room.seats[seat]?.connected) return "Mất kết nối";
    const out = v.finished.indexOf(seat);
    if (out >= 0) return `Hạng ${out + 1}`;
    if (v.status === "playing" && v.turn === seat) return "Đến lượt";
    return v.passed.includes(seat) ? "Bỏ lượt" : "";
  }

  private renderOpponents(): void {
    const v = this.view;
    this.q("[data-opps]").innerHTML = this.opponentSeats()
      .map((seat) => {
        const who = identityInRoom(this.room, seat);
        const gone = v.left.includes(seat);
        const cls = [
          "tl-opp",
          v.status === "playing" && v.turn === seat ? "turn" : "",
          v.passed.includes(seat) ? "passed" : "",
          v.finished.includes(seat) ? "out" : "",
          gone ? "gone" : "",
          this.room.seats[seat]?.connected ? "" : "offline",
        ];
        const n = v.handSizes[seat] ?? 0;
        return `<div class="${cls.filter(Boolean).join(" ")}">
          ${avatarHtml(who)}
          <div class="info"><b>${escapeHtml(who.name)}</b><span class="sub">${this.oppSub(seat)}</span></div>
          <span class="cnt" title="Số lá còn lại">${backHtml("sm")}<b>${n}</b></span>
        </div>`;
      })
      .join("");
  }

  private renderTable(): void {
    const t = this.view.table;
    const cardsEl = this.q("[data-table-cards]");
    const labelEl = this.q("[data-table-label]");
    if (!t) {
      cardsEl.innerHTML = "";
      labelEl.textContent = this.view.status === "finished" ? "Hết ván" : "Bàn trống · người đi trước đánh tự do";
      return;
    }
    const last = this.fresh ? "fresh" : "";
    cardsEl.innerHTML = t.combo.cards.map((c) => cardHtml(c, { extra: `tbl ${last}` })).join("");
    labelEl.textContent = `${this.nameOf(t.by)} · ${kindLabel(t.combo.kind)}`;
    this.fresh = false;
  }

  private renderStatus(): void {
    const v = this.view;
    const el = this.q("[data-status]");
    const pill = this.q(".status-pill");
    pill.classList.toggle("wait", !this.canAct);
    if (v.status === "finished") {
      el.textContent = "Ván đã kết thúc";
    } else if (this.mySeat === v.turn) {
      el.textContent = v.table ? "Lượt của bạn · đè hoặc bỏ lượt" : "Bạn đi tự do · chọn bài để đánh";
    } else {
      el.textContent = `Lượt của ${this.nameOf(v.turn)}…`;
    }
  }

  private renderHand(): void {
    const hand = this.sortedHand();
    for (const c of [...this.selected]) if (!hand.includes(c)) this.selected.delete(c);
    this.cursor = Math.min(this.cursor, Math.max(hand.length - 1, 0));
    if (this.view.hand === null) {
      this.handEl.innerHTML = `<p class="tl-spectate">Bạn đang xem ván này</p>`;
      return;
    }
    const usable = this.canAct && this.view.table ? usableCards(this.view) : null;
    this.handEl.innerHTML = hand
      .map((c) =>
        cardHtml(c, { button: true, selected: this.selected.has(c), extra: usable && !usable.has(c) ? "dim" : "" }),
      )
      .join("");
    this.layoutHand();
  }

  /** Các lá chồng lên nhau vừa khít chiều rộng khung (đủ chạm ≥ 24px mỗi lá khi vừa) */
  private layoutHand(): void {
    const cards = this.handEl.querySelectorAll<HTMLElement>("[data-card]");
    const n = cards.length;
    if (n === 0) return;
    const w = cards[0]?.getBoundingClientRect().width ?? 0;
    const room = this.handEl.clientWidth;
    if (w === 0 || room === 0) return;
    const step = n > 1 ? Math.min(w * 0.85, (room - w) / (n - 1)) : 0;
    this.handEl.style.setProperty("--step", `${Math.max(step, 0)}px`);
  }

  private renderButtons(): void {
    const v = this.view;
    const j = judge(v, [...this.selected]);
    const act = this.canAct;
    this.q<HTMLButtonElement>("[data-play]").disabled = !(act && j.ok);
    this.q<HTMLButtonElement>("[data-pass]").disabled = !(act && v.table !== null);
    this.q<HTMLButtonElement>("[data-clear]").disabled = this.selected.size === 0;
    this.q<HTMLButtonElement>("[data-sort]").disabled = v.hand === null;
    let hint = "";
    if (act) {
      if (this.selected.size > 0 && !j.ok) hint = j.reason;
      else if (this.selected.size === 0)
        hint = v.table ? "Chọn bộ lớn hơn để đè, hoặc bỏ lượt" : "Chạm các lá để chọn, chạm hai lần chọn nhanh";
    }
    this.q("[data-hint]").textContent = hint;
  }

  private renderMe(): void {
    const v = this.view;
    const seat = this.mySeat;
    this.card.el.hidden = seat === null;
    if (seat === null) return;
    const out = v.finished.indexOf(seat);
    this.card.render(identityInRoom(this.room, seat), {
      left: v.handSizes[seat] ?? 0,
      rank: out >= 0 ? out + 1 : null,
      wins: this.room.wins[seat] ?? 0,
      you: true,
      active: v.status === "playing" && v.turn === seat,
      offline: !this.online,
    });
  }

  private showResult(): void {
    const v = this.view;
    if (!v.result) return;
    const resEl = this.q(".result");
    const scrim = this.q(".scrim");
    resEl.innerHTML = resultHtml({
      result: v.result,
      revealed: v.revealed ?? [],
      toiTrang: v.toiTrang,
      identityOf: (seat) => identityInRoom(this.room, seat),
      mySeat: this.mySeat,
      nextFirst: this.room.nextFirst,
      rematchSeats: this.room.rematchVotes.map((id) => this.room.seats.findIndex((s) => s?.id === id)),
    });
    resEl.hidden = false;
    scrim.hidden = false;
    resEl.querySelector("[data-again]")?.addEventListener("click", () => this.actions.rematch());
    resEl.querySelector("[data-lobby]")?.addEventListener("click", () => this.actions.toLobby());
    resEl.querySelector("[data-leave]")?.addEventListener("click", () => this.actions.leave());
  }

  // ---------- GameScreen ----------

  receive(msg: RoomMessage): void {
    if (msg.room.gameId !== "tien-len" || !msg.room.game) return;
    this.room = msg.room;
    this.you = msg.you;
    this.view = msg.room.game;
    this.actionNo = msg.room.actionNo;
    this.pending = false;
    if (msg.type === "moveApplied" && msg.gameId === "tien-len") {
      this.log.push(...logEntries(msg.events, this.view.moveNo, this.nameOf));
      this.fresh = true;
    }
    this.refresh();
  }

  rejected(_code: ErrorCode): void {
    this.pending = false;
    this.refresh();
  }

  setOnline(online: boolean): void {
    this.online = online;
    this.q(".locked").hidden = online;
    this.refresh();
  }

  destroy(): void {
    document.removeEventListener("keydown", this.onKey);
    this.resizeObserver?.disconnect();
  }
}
