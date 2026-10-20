// Chế độ hai người chơi chung một máy (M2, Q8–Q12, Q19). Đường dẫn /offline.
// Điều phối ván: nhận thao tác, hỏi engine, phát hiệu ứng, xoay bàn, hiện kết quả.
// Giao diện theo docs/design/o-an-quan (Đã chốt theo Q20). Ở đây "bạn" là người đang đến lượt (Q8).

import type { SeatId } from "@playtogether/engine";
import type { GameEvent, Move, Options, Seat, State } from "@playtogether/engine/o-an-quan";
import { oAnQuan, owner, ROWS } from "@playtogether/engine/o-an-quan";
import { $ } from "../dom.ts";
import { BoardDom } from "../o-an-quan/board-dom.ts";
import { latBanSheetHtml } from "../o-an-quan/lat-ban-sheet.ts";
import { dirForArrow } from "../o-an-quan/layout.ts";
import { logLineHtml, logListHtml } from "../o-an-quan/log-view.ts";
import { playEffect } from "../o-an-quan/move-effects.ts";
import { describeMove, keepSideEntry, type LogEntry } from "../o-an-quan/move-log.ts";
import { FAST_SPEED, Playback } from "../o-an-quan/playback.ts";
import { PlayerCard, type PlayerIdentity } from "../o-an-quan/player-card.ts";
import { resultHtml } from "../o-an-quan/result-view.ts";
import { type BoardView, points, viewFromState } from "../o-an-quan/view-model.ts";
import { handleGameKey, type KeyActions } from "./offline-keys.ts";
import { gamePageHtml } from "./offline-page.ts";
import { showSetup } from "./offline-setup.ts";

/** Hai người chơi theo ghế (SeatId), không theo bên bàn (Q11) */
const PLAYERS: readonly PlayerIdentity[] = [
  { name: "Người chơi A", initials: "A", avatarClass: "av1" },
  { name: "Người chơi B", initials: "B", avatarClass: "av3" },
];

function identityOf(seat: SeatId): PlayerIdentity {
  return PLAYERS[seat] ?? { name: `Ghế ${seat}`, initials: "?", avatarClass: "av1" };
}

const nameOf = (seat: SeatId): string => identityOf(seat).name;

export function mountOffline(root: HTMLElement): void {
  openSetup(root, { ...oAnQuan.defaultOptions });
}

function openSetup(root: HTMLElement, options: Options): void {
  showSetup(root, options, (chosen) => {
    // Ván đầu: chọn ngẫu nhiên người đi trước (luật mục 2). Ngẫu nhiên ở client, không ở engine.
    new OfflineGame(root, chosen).start(Math.random() < 0.5 ? 0 : 1);
  });
}

class OfflineGame {
  private state: State;
  private firstPlayer: SeatId = 0;
  private selected: number | null = null;
  /** Đang chạy hiệu ứng hoặc xoay bàn: không nhận thao tác */
  private busy = false;
  /** Người đi sau đã chọn giữ bên (đóng hộp hỏi Lật bàn) */
  private latBanDeclined = false;
  private playback: Playback | null = null;
  private log: LogEntry[] = [];
  private lastMove: LogEntry[] = [];
  private readonly board: BoardDom;
  private readonly page: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly cards = { top: new PlayerCard(), bottom: new PlayerCard() };
  private readonly onKey = (e: KeyboardEvent) => this.handleKey(e);
  private readonly onOutside = (e: PointerEvent) => {
    const target = e.target as HTMLElement;
    if (this.selected !== null && !target.closest(".cell, .dir-pick")) this.select(null);
  };

  constructor(
    private readonly root: HTMLElement,
    private readonly options: Options,
  ) {
    this.state = oAnQuan.setup(options, [0, 1], 0);
    this.board = new BoardDom({
      onSquare: (i) => this.tapSquare(i),
      onArrow: (a) => void this.playSow(dirForArrow(a)),
    });
    root.innerHTML = gamePageHtml(options);
    this.page = $(root, ".game-page");
    this.stage = this.q(".stage");
    this.q("[data-card-top]").replaceWith(this.cards.top.el);
    this.q("[data-card-bottom]").replaceWith(this.cards.bottom.el);
    this.q("[data-board]").replaceWith(this.board.el);

    this.q("[data-fast]").addEventListener("click", () => this.toggleFast());
    this.q("[data-skip]").addEventListener("click", () => this.playback?.skip());
    this.q("[data-setup]").addEventListener("click", () => this.leaveToSetup());
    this.q(".scrim").addEventListener("click", () => {
      if (!this.q(".latban").hidden) this.declineLatBan();
    });
    document.addEventListener("keydown", this.onKey);
    document.addEventListener("pointerdown", this.onOutside);
  }

  private q<T extends HTMLElement = HTMLElement>(selector: string): T {
    return $<T>(this.page, selector);
  }

  /** Bắt đầu ván: bên A luôn đi trước, do `firstPlayer` điều khiển (Q17). */
  start(firstPlayer: SeatId): void {
    this.firstPlayer = firstPlayer;
    this.state = oAnQuan.setup(this.options, [0, 1], firstPlayer);
    this.latBanDeclined = false;
    this.log = [];
    this.lastMove = [];
    this.renderLog();
    this.q(".result").hidden = true;
    this.q(".scrim").hidden = true;
    this.board.setPerspective(this.state.turn);
    this.renderView(viewFromState(this.state));
    this.idle();
  }

  private destroy(): void {
    document.removeEventListener("keydown", this.onKey);
    document.removeEventListener("pointerdown", this.onOutside);
  }

  private leaveToSetup(): void {
    this.destroy();
    openSetup(this.root, this.options);
  }

  // ---------- Truy vấn engine ----------

  private mover(): SeatId {
    return this.state.controller[this.state.turn];
  }

  private moves(): Move[] {
    return oAnQuan.validMoves(this.state, this.mover());
  }

  private validSquares(): Set<number> {
    return new Set(this.moves().flatMap((m) => (m.kind === "sow" ? [m.square] : [])));
  }

  private canLatBan(): boolean {
    return !this.busy && !this.latBanDeclined && this.moves().some((m) => m.kind === "latBan");
  }

  // ---------- Vẽ ----------

  /** Vẽ bàn, hai thẻ người chơi và nhãn hàng. Bên dưới là bên đến lượt ("bạn"). */
  private renderView(view: BoardView, handMs = 0): void {
    const bottom = this.board.bottomSeat;
    const top: Seat = bottom === 0 ? 1 : 0;
    const playing = this.state.status === "playing";
    this.board.render(view, handMs);
    this.renderCard(this.cards.bottom, view, bottom, true, playing);
    this.renderCard(this.cards.top, view, top, false, playing);
    this.q("[data-label-top]").textContent = `Hàng của ${nameOf(view.controller[top])}`;
    this.q("[data-sub]").textContent = `Chơi trên một máy · Lượt ${this.state.moveNo + (playing ? 1 : 0)}`;
  }

  private renderCard(card: PlayerCard, view: BoardView, side: Seat, you: boolean, playing: boolean): void {
    const pile = view.captured[side];
    card.render(identityOf(view.controller[side]), {
      pile,
      points: points(pile, this.options.giaTriQuan),
      you,
      active: playing && this.state.turn === side,
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

  /** Chờ người đến lượt thao tác. */
  private idle(): void {
    this.busy = false;
    this.q(".playback").hidden = true;
    this.select(null);
    if (this.canLatBan()) this.openLatBan();
  }

  private select(square: number | null): void {
    this.selected = square;
    const active = !this.busy && this.state.status === "playing";
    this.board.setInteraction({ active, valid: active ? this.validSquares() : new Set(), selected: square });
    const picking = active && square !== null;
    this.q("[data-pick-hint]").hidden = !picking;
    this.q("[data-hint]").hidden = !picking;
    this.q("[data-esc]").hidden = !picking;
    if (active) this.setStatus(picking ? "Lượt của bạn · chọn chiều rải" : "Lượt của bạn · chọn một ô", false);
  }

  private tapSquare(i: number): void {
    if (this.busy || this.state.status !== "playing") return;
    if (owner(i) !== this.state.turn || !this.validSquares().has(i)) {
      this.board.shake(i);
      return;
    }
    this.select(this.selected === i ? null : i);
  }

  // ---------- Lật bàn (UX mục 3) ----------

  private openLatBan(): void {
    const side = this.state.turn;
    const other: Seat = side === 0 ? 1 : 0;
    const v = this.options.giaTriQuan;
    const box = this.q(".latban");
    box.innerHTML = latBanSheetHtml({
      opener: nameOf(this.state.controller[other]),
      keepPoints: points(this.state.captured[side], v),
      flipPoints: points(this.state.captured[other], v),
    });
    $(box, "[data-keep]").addEventListener("click", () => this.declineLatBan());
    $(box, "[data-flip]").addEventListener("click", () => void this.playLatBan());
    box.hidden = false;
    this.q(".scrim").hidden = false;
    $(box, "[data-flip]").focus();
  }

  private closeLatBan(): void {
    this.q(".latban").hidden = true;
    this.q(".scrim").hidden = true;
  }

  /** Đóng hộp hỏi nghĩa là giữ bên (UX mục 3). */
  private declineLatBan(): void {
    if (this.latBanDeclined) return;
    this.latBanDeclined = true;
    this.closeLatBan();
    this.addLog([keepSideEntry(this.state.moveNo + 1, nameOf(this.mover()))]);
  }

  // ---------- Đi quân ----------

  private playSow(dir: 1 | -1): Promise<void> {
    if (this.selected === null) return Promise.resolve();
    return this.play({ kind: "sow", square: this.selected, dir });
  }

  private playLatBan(): Promise<void> {
    this.closeLatBan();
    return this.play({ kind: "latBan" });
  }

  private async play(move: Move): Promise<void> {
    if (this.busy || this.state.status !== "playing") return;
    const seat = this.mover();
    const r = oAnQuan.applyMove(this.state, seat, move);
    if ("error" in r) {
      if (this.selected !== null) this.board.shake(this.selected);
      return;
    }
    const n = this.state.moveNo + 1;
    const before = viewFromState(this.state);
    const after = r.state;
    this.state = after;
    const v = this.options.giaTriQuan;
    this.addLog(describeMove(n, nameOf(seat), move, r.events, v, (side) => nameOf(after.controller[side])));

    this.busy = true;
    this.select(null);
    this.setStatus(move.kind === "latBan" ? `${nameOf(seat)} lật bàn…` : `${nameOf(seat)} đang rải…`, true);
    this.q(".playback").hidden = move.kind !== "sow";
    await this.runEffects(r.events, before);
    this.q(".playback").hidden = true;

    if (this.state.status === "finished") {
      this.showResult();
      return;
    }
    await this.passDevice(move);
    this.idle();
  }

  private async runEffects(events: GameEvent[], before: BoardView): Promise<void> {
    const pb = new Playback();
    pb.speed = this.q("[data-fast]").getAttribute("aria-pressed") === "true" ? FAST_SPEED : 1;
    this.playback = pb;
    await pb.run(events, before, this.options.giaTriQuan, {
      render: (view, ms) => this.renderView(view, ms),
      effect: (e, ctx) =>
        playEffect(e, ctx, {
          board: this.board,
          cardOf: (side) => this.cardOf(side),
          giaTriQuan: this.options.giaTriQuan,
          nameOf,
          turnAfter: this.state.turn,
        }),
    });
    this.playback = null;
    // Ghi đè bằng state cuối của engine
    this.renderView(viewFromState(this.state));
  }

  /**
   * Q8: người đến lượt luôn thấy bên mình ở dưới, nên xoay bàn sau khi hiệu ứng kết thúc.
   * Lật bàn không đổi bên đến lượt nên không xoay, chỉ đổi người cầm máy.
   */
  private async passDevice(move: Move): Promise<void> {
    if (this.state.turn === this.board.bottomSeat && move.kind !== "latBan") return;
    this.setStatus(`Chuyền máy cho ${nameOf(this.mover())}`, true);
    await this.board.rotateTo(this.state.turn, this.stage);
    this.renderView(viewFromState(this.state));
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

  // ---------- Phím tắt (UX mục 3) ----------

  private toggleFast(): void {
    const b = this.q("[data-fast]");
    const on = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", String(on));
    if (this.playback) this.playback.speed = on ? FAST_SPEED : 1;
  }

  private handleKey(e: KeyboardEvent): void {
    if (!this.page.isConnected) {
      this.destroy();
      return;
    }
    if (handleGameKey(e, this.keyActions)) e.preventDefault();
  }

  private readonly keyActions: KeyActions = {
    context: () => (!this.q(".result").hidden ? "result" : !this.q(".latban").hidden ? "latBan" : "board"),
    isBusy: () => this.busy,
    canAct: () => !this.busy && this.state.status === "playing",
    hasSelection: () => this.selected !== null,
    canLatBan: () => this.canLatBan(),
    playAgain: () => this.start(this.nextFirst()),
    keepSide: () => this.declineLatBan(),
    latBan: () => void this.playLatBan(),
    toggleFast: () => this.toggleFast(),
    selectNth: (n) => {
      const square = ROWS[this.state.turn][n - 1];
      if (square !== undefined) this.tapSquare(square);
    },
    sow: (arrow) => void this.playSow(dirForArrow(arrow)),
    deselect: () => this.select(null),
  };

  // ---------- Kết quả (UX mục 2.5) ----------

  private showResult(): void {
    const result = this.state.result;
    if (!result) throw new Error("Ván đã kết thúc nhưng chưa có kết quả");
    const first = this.nextFirst();
    const box = this.q(".result");
    box.innerHTML = resultHtml({ result, giaTriQuan: this.options.giaTriQuan, identityOf, nextFirst: first });
    box.hidden = false;
    this.q(".scrim").hidden = false;
    this.setStatus(result.winner === null ? "Hoà!" : `${nameOf(result.winner)} thắng!`, true);
    $(box, "[data-again]").addEventListener("click", () => this.start(first));
    $(box, "[data-setup]").addEventListener("click", () => this.leaveToSetup());
    $(box, "[data-again]").focus();
  }

  /** Luật mục 2: người thua ván trước đi trước; hoà thì đổi lượt so với ván trước. */
  private nextFirst(): SeatId {
    const winner = this.state.result?.winner ?? null;
    if (winner === null) return this.firstPlayer === 0 ? 1 : 0;
    return winner === 0 ? 1 : 0;
  }
}
