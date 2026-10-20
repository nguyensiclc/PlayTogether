// Chế độ hai người chơi chung một máy (M2, Q8–Q12, Q19). Đường dẫn /offline.
// Giao diện theo docs/design/o-an-quan (Đã chốt theo Q20): ban-choi, ban-choi-doi-thu, lat-ban, ket-qua và bản desktop.
// Ở đây "bạn" là người đang đến lượt (Q8). Thành phần của M3–M5 được ẩn.
import { oAnQuan, owner, ROWS } from "@playtogether/engine/o-an-quan";
import type { EndReason, GameEvent, Move, Options, ScoreDetail, Seat, State } from "@playtogether/engine/o-an-quan";
import type { SeatId } from "@playtogether/engine";
import { BoardDom } from "../o-an-quan/board-dom.ts";
import { dirForArrow } from "../o-an-quan/layout.ts";
import { describeMove, keepSideEntry, type LogEntry } from "../o-an-quan/move-log.ts";
import { FAST_SPEED, Playback, type StepContext } from "../o-an-quan/playback.ts";
import { points, viewFromState, type BoardView } from "../o-an-quan/view-model.ts";

/** Tên theo ghế (SeatId), không theo bên bàn (Q11) */
const NAMES = ["Người chơi A", "Người chơi B"] as const;
const INITIALS = ["A", "B"] as const;
const AVATAR = ["av1", "av3"] as const;
const nameOf = (seat: SeatId): string => NAMES[seat] ?? `Ghế ${seat}`;

const REASON_CHIP: Record<EndReason, string> = {
  "het-quan": "Hết quan · thu dân về",
  "khong-du-bu-dan": "Không đủ điểm bù dân",
  "lap-nuoc": "Lặp nước 3 lần",
  "het-gio": "Hết giờ",
  "bo-cuoc": "Bỏ cuộc",
};

const BACK_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
const SWAP_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>';

export function mountOffline(root: HTMLElement): void {
  showSetup(root, { ...oAnQuan.defaultOptions });
}

// ---------- Màn hình bắt đầu (Q9, Q19) ----------

function showSetup(root: HTMLElement, options: Options): void {
  const seg = (name: string, items: [string, string][]) =>
    `<div class="seg">${items
      .map(([value, label]) => `<label><input type="radio" name="${name}" value="${value}"><span>${label}</span></label>`)
      .join("")}</div>`;
  root.innerHTML = `
    <div class="screen setup">
      <header class="topbar">
        <a class="icon-btn" href="/" aria-label="Về trang chủ">${BACK_ICON}</a>
        <div class="title">Ô ăn quan</div>
        <span class="icon-btn" aria-hidden="true"></span>
      </header>
      <h1>Chơi trên một máy</h1>
      <p class="note">Chơi hai người trên cùng một máy. Chơi qua link mời: sắp có.</p>
      <div class="card">
        <div class="opt-row"><span class="lbl"><b>Giá trị quan</b></span>${seg("giaTriQuan", [
          ["10", "10 dân"],
          ["5", "5 dân"],
        ])}</div>
        <div class="opt-row"><span><b>Quan Già</b></span>${seg("camAnQuanNon", [
          ["off", "Tắt"],
          ["on", "Bật"],
        ])}<p class="hint">Bật: ô quan còn quan mà có dưới 5 dân thì không được ăn.</p></div>
        <div class="opt-row"><span><b>Lật bàn</b></span>${seg("latBan", [
          ["off", "Tắt"],
          ["on", "Bật"],
        ])}<p class="hint">Bật: sau nước đầu tiên, người đi sau được đổi bên một lần.</p></div>
      </div>
      <button class="btn primary block" type="button" data-start>Bắt đầu</button>
    </div>`;
  const check = (name: string, value: string) =>
    ((root.querySelector(`input[name=${name}][value="${value}"]`) as HTMLInputElement).checked = true);
  check("giaTriQuan", String(options.giaTriQuan));
  check("camAnQuanNon", options.camAnQuanNon ? "on" : "off");
  check("latBan", options.latBan ? "on" : "off");

  root.querySelector("[data-start]")!.addEventListener("click", () => {
    const value = (name: string) => (root.querySelector(`input[name=${name}]:checked`) as HTMLInputElement).value;
    const chosen: Options = {
      ...options,
      giaTriQuan: value("giaTriQuan") === "5" ? 5 : 10,
      camAnQuanNon: value("camAnQuanNon") === "on",
      latBan: value("latBan") === "on",
    };
    // Ván đầu: chọn ngẫu nhiên người đi trước (luật mục 2)
    new OfflineGame(root, chosen).start(Math.random() < 0.5 ? 0 : 1);
  });
}

// ---------- Thẻ người chơi ----------

class PlayerCard {
  readonly el: HTMLElement;
  private readonly avatar: HTMLElement;
  private readonly name: HTMLElement;
  private readonly dan: HTMLElement;
  private readonly quan: HTMLElement;
  private readonly delta: HTMLElement;
  private readonly score: HTMLElement;

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "player";
    this.el.innerHTML = `
      <span class="avatar"></span>
      <div class="info">
        <div class="name"></div>
        <div class="kho"><span class="ddot"></span><span data-dan></span> · <span class="qdot"></span><span data-quan></span><span class="delta" hidden></span></div>
      </div>
      <div class="score"><b></b><span class="tiny muted">điểm</span></div>`;
    this.avatar = this.el.querySelector(".avatar")!;
    this.name = this.el.querySelector(".name")!;
    this.dan = this.el.querySelector("[data-dan]")!;
    this.quan = this.el.querySelector("[data-quan]")!;
    this.delta = this.el.querySelector(".delta")!;
    this.score = this.el.querySelector(".score b")!;
  }

  render(view: BoardView, side: Seat, giaTriQuan: number, you: boolean, active: boolean): void {
    const seat = view.controller[side];
    this.avatar.className = `avatar ${AVATAR[seat] ?? "av1"}`;
    this.avatar.textContent = INITIALS[seat] ?? "?";
    this.name.innerHTML = `${nameOf(seat)}${you ? ' <span class="small muted">(bạn)</span>' : ""}`;
    const p = view.captured[side];
    this.dan.textContent = `${p.dan} dân`;
    this.quan.textContent = `${p.quan} quan`;
    this.score.textContent = String(points(p, giaTriQuan));
    this.el.classList.toggle("active", active);
  }

  /** "+N" khi ăn, "−5" khi bù dân */
  showDelta(text: string, minus = false): void {
    this.delta.hidden = false;
    this.delta.textContent = text;
    this.delta.classList.toggle("minus", minus);
    this.delta.style.animation = "none";
    void this.delta.offsetWidth;
    this.delta.style.animation = "";
  }

  flashSwap(ms: number): void {
    this.el.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(6px)" }, { opacity: 1 }], { duration: ms });
  }
}

// ---------- Ván chơi ----------

class OfflineGame {
  private state!: State;
  private firstPlayer: SeatId = 0;
  private selected: number | null = null;
  private busy = false;
  /** Người đi sau đã chọn giữ bên (đóng hộp hỏi Lật bàn) */
  private latBanDeclined = false;
  private playback: Playback | null = null;
  private log: LogEntry[] = [];
  private lastMove: LogEntry[] = [];
  private readonly board: BoardDom;
  private readonly page: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly cards: { top: PlayerCard; bottom: PlayerCard };
  private readonly q = <T extends HTMLElement>(sel: string) => this.page.querySelector<T>(sel)!;
  private readonly onKey = (e: KeyboardEvent) => this.handleKey(e);
  private readonly onOutside = (e: PointerEvent) => {
    const t = e.target as HTMLElement;
    if (this.selected !== null && !t.closest(".cell, .dir-pick")) this.select(null);
  };

  constructor(
    private readonly root: HTMLElement,
    private readonly options: Options,
  ) {
    this.board = new BoardDom({
      onSquare: (i) => this.tapSquare(i),
      onArrow: (a) => void this.playSow(dirForArrow(a)),
    });
    const onOff = (b: boolean) => (b ? "bật" : "tắt");
    root.innerHTML = `
      <div class="screen game-page">
        <header class="topbar g-top">
          <a class="icon-btn" href="/" aria-label="Về trang chủ">${BACK_ICON}</a>
          <span class="logo-mark desk-only"><i></i></span>
          <div class="title">Ô ăn quan<small data-sub></small></div>
          <div class="spacer desk-only"></div>
          <span class="chip desk-only">Quan = ${options.giaTriQuan}</span>
          <span class="chip desk-only">Quan Già: ${onOff(options.camAnQuanNon)}</span>
          <span class="chip desk-only">Lật bàn: ${onOff(options.latBan)}</span>
          <button class="btn sm desk-only" type="button" data-setup>Đổi tuỳ chọn</button>
          <span class="icon-btn mobile-only" aria-hidden="true"></span>
        </header>
        <div class="g-layout">
          <main class="stage">
            <div data-card-top></div>
            <div class="spacer"></div>
            <div class="board-wrap">
              <span class="row-label top" data-label-top></span>
              <div data-board></div>
              <span class="row-label bottom">Hàng của bạn</span>
              <span class="row-label bottom right mobile-only" data-pick-hint hidden>◀ ▶ chọn chiều rải</span>
              <span class="row-label bottom right desk-only"><kbd>1</kbd>–<kbd>5</kbd> chọn ô · <kbd>←</kbd><kbd>→</kbd> chọn chiều</span>
            </div>
            <div class="spacer"></div>
            <p class="log-line mobile-only" aria-live="polite"></p>
            <div class="status-row">
              <div class="status-pill"><span class="pulse"></span><span data-status aria-live="polite"></span></div>
              <span class="small muted desk-only" data-esc hidden><kbd>Esc</kbd> chọn lại</span>
            </div>
            <p class="hint mobile-only" data-hint hidden>Chạm ra ngoài bàn để chọn lại ô khác</p>
            <div class="playback" hidden>
              <button class="btn sm" type="button" data-fast aria-pressed="false">⏩ Tua nhanh ×4</button>
              <button class="btn sm ghost" type="button" data-skip>Bỏ qua hiệu ứng</button>
            </div>
            <div data-card-bottom></div>
          </main>
          <aside class="g-side desk-only">
            <div class="tabs"><span>Nhật ký ván</span></div>
            <div class="log"><ul data-log></ul></div>
            <div class="block">
              <h3>Phím tắt</h3>
              <div class="keys">
                <span><kbd>1</kbd>–<kbd>5</kbd></span><span>Chọn ô (trái → phải)</span>
                <span><kbd>←</kbd> <kbd>→</kbd></span><span>Rải sang trái / phải</span>
                <span><kbd>Esc</kbd></span><span>Chọn lại / giữ bên</span>
                <span><kbd>L</kbd></span><span>Lật bàn</span>
                <span><kbd>Space</kbd></span><span>Tua nhanh hiệu ứng</span>
                <span><kbd>Enter</kbd></span><span>Ván nữa</span>
              </div>
            </div>
          </aside>
        </div>
        <div class="scrim" hidden></div>
        <section class="sheet latban" hidden role="dialog" aria-modal="true" aria-labelledby="latban-title"></section>
        <section class="result" hidden role="dialog" aria-modal="true" aria-labelledby="result-title"></section>
      </div>`;
    this.page = root.querySelector(".game-page")!;
    this.stage = this.q(".stage");
    this.cards = { top: new PlayerCard(), bottom: new PlayerCard() };
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
    showSetup(this.root, this.options);
  }

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

  /** Vẽ bàn, hai thẻ người chơi và nhãn hàng. Bên dưới là bên đến lượt ("bạn"). */
  private renderView(view: BoardView, handMs = 0): void {
    const bottom = this.board.bottomSeat;
    const top: Seat = bottom === 0 ? 1 : 0;
    const v = this.options.giaTriQuan;
    const playing = this.state.status === "playing";
    this.board.render(view, handMs);
    this.cards.bottom.render(view, bottom, v, true, playing && this.state.turn === bottom);
    this.cards.top.render(view, top, v, false, playing && this.state.turn === top);
    this.q("[data-label-top]").textContent = `Hàng của ${nameOf(view.controller[top])}`;
    this.q("[data-sub]").textContent = `Chơi trên một máy · Lượt ${this.state.moveNo + (playing ? 1 : 0)}`;
  }

  private cardOf(side: Seat): PlayerCard {
    return side === this.board.bottomSeat ? this.cards.bottom : this.cards.top;
  }

  private setStatus(text: string, waiting: boolean): void {
    this.q("[data-status]").textContent = text;
    this.q(".status-pill").classList.toggle("wait", waiting);
  }

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

  // ---------- Lật bàn (UX mục 3, thiết kế lat-ban) ----------

  private openLatBan(): void {
    const v = this.options.giaTriQuan;
    const side = this.state.turn;
    const other: Seat = side === 0 ? 1 : 0;
    const opener = nameOf(this.state.controller[other]);
    const box = this.q(".latban");
    box.innerHTML = `
      <div class="grab"></div>
      <h2 id="latban-title">Đổi bên với đối thủ?</h2>
      <p class="small muted" style="margin-top:4px">Bạn được Lật bàn một lần, ngay bây giờ. Bàn giữ nguyên: bạn nhận bên của ${opener} cùng kho điểm của bên đó, còn ${opener} sẽ đi tiếp ở bên của bạn.</p>
      <div class="compare">
        <div class="side"><span class="tiny muted">Giữ bên</span><b>${points(this.state.captured[side], v)}</b><span class="tiny">điểm<br>bạn đi tiếp</span></div>
        <span class="swap">${SWAP_ICON}</span>
        <div class="side after"><span class="tiny muted">Lật bàn</span><b>${points(this.state.captured[other], v)}</b><span class="tiny">điểm<br>đối thủ đi tiếp</span></div>
      </div>
      <div class="acts">
        <button class="btn" type="button" data-keep>Giữ bên <kbd class="desk-only">Esc</kbd></button>
        <button class="btn primary" type="button" data-flip>Lật bàn <kbd class="desk-only">L</kbd></button>
      </div>`;
    box.querySelector("[data-keep]")!.addEventListener("click", () => this.declineLatBan());
    box.querySelector("[data-flip]")!.addEventListener("click", () => void this.playLatBan());
    box.hidden = false;
    this.q(".scrim").hidden = false;
    box.querySelector<HTMLElement>("[data-flip]")!.focus();
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
    this.state = r.state;
    const next = this.state;
    this.addLog(describeMove(n, nameOf(seat), move, r.events, this.options.giaTriQuan, (side) => nameOf(next.controller[side])));
    this.busy = true;
    this.select(null);
    this.setStatus(move.kind === "latBan" ? `${nameOf(seat)} lật bàn…` : `${nameOf(seat)} đang rải…`, true);
    if (move.kind === "sow") this.q(".playback").hidden = false;

    const pb = new Playback();
    pb.speed = this.q("[data-fast]").getAttribute("aria-pressed") === "true" ? FAST_SPEED : 1;
    this.playback = pb;
    await pb.run(r.events, before, this.options.giaTriQuan, {
      render: (view, ms) => this.renderView(view, ms),
      effect: (e, ctx) => this.effect(e, ctx),
    });
    this.playback = null;
    // Ghi đè bằng state cuối của engine
    this.renderView(viewFromState(this.state));
    this.q(".playback").hidden = true;

    if (this.state.status === "finished") {
      this.showResult();
      return;
    }
    // Q8: người đến lượt luôn thấy bên mình ở dưới. Xoay sau khi hiệu ứng kết thúc.
    // Lật bàn không đổi bên đến lượt nên không xoay, chỉ đổi người cầm máy.
    if (this.state.turn !== this.board.bottomSeat || move.kind === "latBan") {
      this.setStatus(`Chuyền máy cho ${nameOf(this.mover())}`, true);
      await this.board.rotateTo(this.state.turn, this.stage);
      this.renderView(viewFromState(this.state));
    }
    this.idle();
  }

  private effect(e: GameEvent, { index, prev, ms }: StepContext): void {
    const v = this.options.giaTriQuan;
    switch (e.t) {
      case "pick":
        this.board.flash(e.i, index === 0 ? "pick" : "pick2", ms);
        break;
      case "drop":
        this.board.flash(e.i, "drop", ms);
        break;
      case "capture": {
        const gain = e.dan + e.quan * v;
        this.board.capture(e.i, gain, ms);
        this.cardOf(e.by).showDelta(`+${gain}`);
        break;
      }
      case "turnEnd":
        this.board.toast(e.reason === "quan-non" ? "Quan Già — không được ăn" : "Hết lượt", ms);
        break;
      case "buDan": {
        for (const i of ROWS[e.seat]) this.board.flash(i, "budan", ms);
        this.cardOf(e.seat).showDelta("−5", true);
        const who = nameOf(prev.controller[e.seat]);
        this.board.toast(`${who} hết dân — Bù dân −5 điểm${e.doiQuan ? " (đổi 1 quan)" : ""}`, ms * 2);
        break;
      }
      case "latBan": {
        this.cards.top.flashSwap(ms);
        this.cards.bottom.flashSwap(ms);
        const flipper = nameOf(prev.controller[this.state.turn]);
        const opener = nameOf(prev.controller[this.state.turn === 0 ? 1 : 0]);
        this.board.toast(`${flipper} đã lật bàn — đến lượt ${opener}`, ms * 2);
        break;
      }
      case "gameOver": {
        const reason = e.result.reason as EndReason;
        if (reason === "het-quan" || reason === "lap-nuoc") {
          for (const i of [...ROWS[0], ...ROWS[1]]) if ((prev.dan[i] ?? 0) > 0) this.board.flash(i, "collect", ms);
        }
        break;
      }
    }
  }

  // ---------- Nhật ký ván ----------

  private addLog(entries: LogEntry[]): void {
    this.log.push(...entries);
    this.lastMove = entries;
    this.renderLog();
  }

  private renderLog(): void {
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => `&#${c.charCodeAt(0)};`);
    const ul = this.q("[data-log]");
    ul.innerHTML = this.log.length
      ? [...this.log]
          .reverse()
          .map(
            (e) =>
              `<li><span class="n">${e.n}</span><div>${e.who ? `<span class="who">${esc(e.who)}</span> ` : ""}${esc(e.text)}</div>${
                e.gain ? `<span class="g">+${e.gain}</span>` : e.ev ? `<span class="ev">${e.ev}</span>` : ""
              }</li>`,
          )
          .join("")
      : `<li class="empty">Chưa có nước đi nào.</li>`;
    const first = this.lastMove[0];
    this.q(".log-line").innerHTML = first
      ? `${first.who ? `<b>${esc(first.who)}</b> ` : ""}${esc(first.text)}${first.gain ? ` <span class="g">+${first.gain}</span>` : ""}`
      : "";
  }

  // ---------- Phím tắt ----------

  private toggleFast(): void {
    const b = this.q("[data-fast]");
    const on = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", String(on));
    if (this.playback) this.playback.speed = on ? FAST_SPEED : 1;
  }

  private handleKey(e: KeyboardEvent): void {
    if (!this.page.isConnected) return this.destroy();
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if (!this.q(".result").hidden) {
      if (key === "Enter") {
        e.preventDefault();
        this.start(this.nextFirst());
      }
      return;
    }
    if (key === " ") {
      if (this.busy) {
        e.preventDefault();
        this.toggleFast();
      }
      return;
    }
    if (!this.q(".latban").hidden) {
      if (key === "Escape") this.declineLatBan();
      else if (key === "l") void this.playLatBan();
      return;
    }
    if (this.busy || this.state.status !== "playing") return;
    if (key >= "1" && key <= "5") {
      // Phím 1–5: ô thứ n từ trái sang trên hàng dưới (hàng của bên đến lượt)
      this.tapSquare(ROWS[this.state.turn][Number(key) - 1]!);
    } else if (key === "ArrowLeft" || key === "ArrowRight") {
      if (this.selected !== null) {
        e.preventDefault();
        void this.playSow(dirForArrow(key === "ArrowLeft" ? "left" : "right"));
      }
    } else if (key === "Escape") {
      this.select(null);
    } else if (key === "l" && this.canLatBan()) {
      void this.playLatBan();
    }
  }

  // ---------- Kết quả (UX mục 2.5, thiết kế ket-qua) ----------

  private showResult(): void {
    const res = this.state.result!;
    const reason = res.reason as EndReason;
    const detail = res.detail as ScoreDetail[];
    const v = this.options.giaTriQuan;
    const draw = res.winner === null;
    const title = draw ? "Hoà!" : `${nameOf(res.winner!)} thắng!`;
    const loser = draw ? null : res.winner === 0 ? 1 : 0;
    const why: Partial<Record<EndReason, string>> = {
      "khong-du-bu-dan": `${loser === null ? "" : nameOf(loser)} hết dân nhưng kho dưới 5 điểm nên thua.`,
      "lap-nuoc": "Quân còn trong ô quan không được tính.",
    };
    const [d0, d1] = detail as [ScoreDetail, ScoreDetail];
    const row = (label: string, f: (d: ScoreDetail) => string, cls = "") =>
      `<tr${cls ? ` class="${cls}"` : ""}><th>${label}</th><td>${f(d0)}</td><td>${f(d1)}</td></tr>`;
    const vsP = (seat: SeatId, d: ScoreDetail) =>
      `<div class="p${res.winner === seat ? " win" : ""}"><span class="avatar ${AVATAR[seat]}">${INITIALS[seat]}</span><span class="small">${nameOf(seat)}</span><b>${d.total}</b></div>`;
    const first = this.nextFirst();

    const box = this.q(".result");
    box.innerHTML = `
      <div class="side-hero">
        <div class="trophy">${draw ? "🤝" : "🏆"}</div>
        <h1 id="result-title">${title}</h1>
        <span class="chip reason">${REASON_CHIP[reason]}</span>
        ${why[reason] ? `<p class="why">${why[reason]}</p>` : ""}
        <div class="score"><b${res.winner === 0 ? ' class="win"' : ""}>${d0.total}</b><span>–</span><b${res.winner === 1 ? ' class="win"' : ""}>${d1.total}</b></div>
        <span class="small muted desk-only">${nameOf(0)} · ${nameOf(1)}</span>
      </div>
      <div class="detail">
        <div class="vs">${vsP(0, d0)}<span class="sep">–</span>${vsP(1, d1)}</div>
        <table>
          <thead><tr><th></th><td>${nameOf(0)}</td><td>${nameOf(1)}</td></tr></thead>
          <tbody>
            ${row("Dân đã ăn", (d) => String(d.dan))}
            ${row(`Quan đã ăn (×${v})`, (d) => `${d.quan} · ${d.quan * v}`)}
            ${row("Bù dân", (d) => (d.buDan ? `${d.buDan} lần` : "0"))}
            ${row("Dân thu cuối ván", (d) => String(d.rowDan))}
            ${row("Tổng", (d) => String(d.total), "total")}
          </tbody>
        </table>
        <button class="btn primary block" type="button" data-again>Ván nữa · ${nameOf(first)} đi trước <kbd class="desk-only">Enter</kbd></button>
        <div class="acts">
          <button class="btn sm" type="button" data-setup2>Đổi tuỳ chọn</button>
          <a class="btn sm" href="/">Về trang chủ</a>
        </div>
      </div>`;
    box.hidden = false;
    this.q(".scrim").hidden = false;
    this.setStatus(title, true);
    box.querySelector("[data-again]")!.addEventListener("click", () => this.start(first));
    box.querySelector("[data-setup2]")!.addEventListener("click", () => this.leaveToSetup());
    box.querySelector<HTMLElement>("[data-again]")!.focus();
  }

  /** Luật mục 2: người thua ván trước đi trước; hoà thì đổi lượt so với ván trước. */
  private nextFirst(): SeatId {
    const w = this.state.result!.winner;
    if (w === null) return this.firstPlayer === 0 ? 1 : 0;
    return w === 0 ? 1 : 0;
  }
}
