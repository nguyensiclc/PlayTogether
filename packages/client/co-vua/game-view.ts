// Bàn chơi Cờ vua online: hiển thị thế cờ từ server, gửi ý định đi quân (UX mục 3).

import type { GameEvent, Move, PieceType, Square, StandardMove, State } from "@playtogether/engine/co-vua";
import { colorOfSeat, findKing, rankOf, validStandardMoves } from "@playtogether/engine/co-vua";
import type { CoVuaRoom, ErrorCode, PublicRoom, You } from "@playtogether/protocol";
import "./co-vua.css";
import { $ } from "../dom.ts";
import { type LogEntry, logListHtml } from "../game-ui/log-view.ts";
import type { GameActions, GameScreen, RoomMessage } from "../games/types.ts";
import { identityInRoom } from "../screens/room-players.ts";
import { BOARD_PIXELS, displayCoordToSquare, pieceSvg, renderBoardSvg } from "./board-svg.ts";
import { coVuaPageHtml } from "./game-page.ts";
import { formatAlgebraicMove } from "./move-log.ts";
import { CoVuaPlayerCard } from "./player-card.ts";
import { resultHtml } from "./result-view.ts";

export class CoVuaGameView implements GameScreen {
  private room: CoVuaRoom;
  private you: You;
  private state: State;
  private actionNo: number;
  private pending = false;
  private online = true;
  private selectedSq: Square | null = null;
  private validDestinations = new Set<Square>();
  private pendingPromotion: { from: Square; to: Square } | null = null;
  private log: LogEntry[] = [];

  private readonly page: HTMLElement;
  private readonly boardWrap: HTMLElement;
  private readonly boardEl: HTMLElement;
  private readonly promoModal: HTMLElement;
  private readonly promoOptions: HTMLElement;
  private readonly dialogScrim: HTMLElement;
  private readonly dialogBox: HTMLElement;
  private readonly cards = { top: new CoVuaPlayerCard(), bottom: new CoVuaPlayerCard() };
  private readonly actions: GameActions;

  constructor(root: HTMLElement, room: PublicRoom, you: You, actions: GameActions) {
    if (room.gameId !== "co-vua") throw new Error(`Cần phòng Cờ vua, nhận ${room.gameId}`);
    if (!room.game) throw new Error("Phòng chưa có ván");

    this.room = room;
    this.you = you;
    this.state = room.game;
    this.actionNo = room.actionNo;
    this.actions = actions;

    root.innerHTML = coVuaPageHtml(room.options);
    this.page = $(root, ".chess-page-root");

    this.q("[data-card-top]").replaceWith(this.cards.top.el);
    this.q("[data-card-bottom]").replaceWith(this.cards.bottom.el);

    this.boardWrap = this.q("[data-board-wrap]");
    this.boardEl = this.q("[data-board]");
    this.promoModal = this.q("[data-promo]");
    this.promoOptions = this.q("[data-promo-options]");
    this.dialogScrim = this.q("[data-dialog-scrim]");
    this.dialogBox = this.q("[data-dialog-box]");

    this.initEvents();
    this.refresh();
  }

  private q<T extends HTMLElement = HTMLElement>(sel: string): T {
    return $(this.page, sel);
  }

  private isFlipped(): boolean {
    const myColor = this.you.seat !== null ? colorOfSeat(this.state, this.you.seat) : null;
    return myColor === "b";
  }

  private initEvents(): void {
    for (const b of this.page.querySelectorAll("[data-rules]")) {
      b.addEventListener("click", () => this.actions.showRules());
    }
    for (const b of this.page.querySelectorAll("[data-history]")) {
      b.addEventListener("click", () => this.actions.showHistory());
    }

    this.boardWrap.addEventListener("click", (e) => this.handleBoardClick(e));
    this.q("[data-offer-draw]").addEventListener("click", () => this.askOfferDraw());
    this.q("[data-resign]").addEventListener("click", () => this.askResign());
  }

  private handleBoardClick(e: MouseEvent): void {
    if (!this.online || this.pending || this.state.status !== "playing") return;
    if (this.pendingPromotion !== null) return;

    const myColor = this.you.seat !== null ? colorOfSeat(this.state, this.you.seat) : null;
    if (myColor === null || myColor !== this.state.turn) return;

    const rect = this.boardWrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

    const col = Math.floor((x / rect.width) * 8);
    const row = Math.floor((y / rect.height) * 8);
    if (col < 0 || col > 7 || row < 0 || row > 7) return;

    const clickedSq = displayCoordToSquare(col, row, this.isFlipped());
    this.processSquareSelection(clickedSq, myColor);
  }

  private processSquareSelection(sq: Square, myColor: "w" | "b"): void {
    const p = this.state.board[sq];

    if (this.selectedSq === null) {
      if (p && p.color === myColor) {
        this.selectSquare(sq);
      }
      return;
    }

    if (sq === this.selectedSq) {
      this.clearSelection();
      return;
    }

    if (p && p.color === myColor) {
      this.selectSquare(sq);
      return;
    }

    if (this.validDestinations.has(sq)) {
      this.tryMakeMove(this.selectedSq, sq, myColor);
      return;
    }

    this.clearSelection();
  }

  private selectSquare(sq: Square): void {
    this.selectedSq = sq;
    const legalMoves = validStandardMoves(this.state);
    const dests = legalMoves.filter((m) => m.from === sq).map((m) => m.to);
    this.validDestinations = new Set(dests);
    this.renderBoard();
  }

  private clearSelection(): void {
    this.selectedSq = null;
    this.validDestinations.clear();
    this.renderBoard();
  }

  private tryMakeMove(from: Square, to: Square, color: "w" | "b"): void {
    const p = this.state.board[from];
    if (!p) return;

    const targetRank = rankOf(to);
    const isPawnPromo = p.type === "p" && ((color === "w" && targetRank === 7) || (color === "b" && targetRank === 0));

    if (isPawnPromo) {
      this.showPromotionDialog(from, to, color);
      return;
    }

    this.sendMove({ from, to });
  }

  private showPromotionDialog(from: Square, to: Square, color: "w" | "b"): void {
    this.pendingPromotion = { from, to };
    const pieces: PieceType[] = ["q", "r", "b", "n"];

    this.promoOptions.innerHTML = pieces
      .map((type) => {
        return `<button class="promo-btn" data-promo-piece="${type}" type="button">
          <svg viewBox="0 0 ${BOARD_PIXELS / 8} ${BOARD_PIXELS / 8}">${pieceSvg({ type, color })}</svg>
        </button>`;
      })
      .join("");

    for (const btn of this.promoOptions.querySelectorAll("[data-promo-piece]")) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const pt = (btn as HTMLElement).dataset.promoPiece as PieceType;
        this.promoModal.hidden = true;
        const promo = this.pendingPromotion;
        this.pendingPromotion = null;
        if (promo) {
          this.sendMove({ from: promo.from, to: promo.to, promotion: pt });
        }
      });
    }

    this.promoModal.hidden = false;
  }

  private sendMove(move: Move): void {
    this.pending = true;
    this.selectedSq = null;
    this.validDestinations.clear();
    this.actions.move(move, this.actionNo);
  }

  private renderBoard(): void {
    let checkSq: Square | null = null;
    if (this.state.isCheck) {
      checkSq = findKing(this.state.board, this.state.turn);
    }

    let lastMovePair: { from: Square; to: Square } | null = null;
    if (this.state.lastMove && "from" in this.state.lastMove) {
      lastMovePair = { from: this.state.lastMove.from, to: this.state.lastMove.to };
    }

    this.boardEl.innerHTML = renderBoardSvg({
      board: this.state.board,
      flipped: this.isFlipped(),
      selectedSq: this.selectedSq,
      validDestinations: this.validDestinations,
      lastMove: lastMovePair,
      checkSq,
    });
  }

  private renderStatus(): void {
    const statusEl = this.q("[data-status]");
    if (this.state.status === "finished") {
      statusEl.textContent = "Ván đấu đã kết thúc";
      return;
    }

    const myColor = this.you.seat !== null ? colorOfSeat(this.state, this.you.seat) : null;
    const isMyTurn = myColor === this.state.turn;

    if (isMyTurn) {
      statusEl.textContent = this.state.isCheck ? "Chiếu! Bạn đang bị chiếu — hãy giải chiếu" : "Lượt của bạn";
    } else {
      const activeSeat = this.state.players[this.state.turn === "w" ? 0 : 1];
      const name = identityInRoom(this.room, activeSeat).name;
      statusEl.textContent = `Lượt của ${name}…`;
    }
  }

  private renderCards(): void {
    const flipped = this.isFlipped();
    const bottomSeat = flipped ? this.state.players[1] : this.state.players[0];
    const topSeat = flipped ? this.state.players[0] : this.state.players[1];

    const bottomColor = flipped ? "b" : "w";
    const topColor = flipped ? "w" : "b";

    const scoreMap: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const getMaterial = (captured: PieceType[]) => captured.reduce((acc, t) => acc + scoreMap[t], 0);

    const bottomCap = this.state.captured[bottomColor];
    const topCap = this.state.captured[topColor];
    const diff = getMaterial(bottomCap) - getMaterial(topCap);

    this.cards.bottom.render(identityInRoom(this.room, bottomSeat), {
      color: bottomColor,
      wins: this.room.wins[bottomSeat] ?? 0,
      captured: bottomCap,
      diff: Math.max(0, diff),
      you: this.you.seat === bottomSeat,
      active: this.state.turn === bottomColor && this.state.status === "playing",
      offline: !this.room.seats[bottomSeat]?.connected,
    });

    this.cards.top.render(identityInRoom(this.room, topSeat), {
      color: topColor,
      wins: this.room.wins[topSeat] ?? 0,
      captured: topCap,
      diff: Math.max(0, -diff),
      you: this.you.seat === topSeat,
      active: this.state.turn === topColor && this.state.status === "playing",
      offline: !this.room.seats[topSeat]?.connected,
    });
  }

  private renderLog(): void {
    this.q("[data-log]").innerHTML = logListHtml(this.log);
  }

  private refresh(): void {
    this.renderBoard();
    this.renderCards();
    this.renderStatus();
    this.renderLog();

    if (this.state.status === "finished" && this.state.result) {
      this.showResult();
    }
  }

  private showResult(): void {
    if (!this.state.result) return;
    const resEl = this.q<HTMLElement>(".result");
    const scrim = this.q<HTMLElement>(".scrim");

    resEl.innerHTML = resultHtml({
      result: this.state.result,
      board: this.state.board,
      flipped: this.isFlipped(),
      identityOf: (seat) => identityInRoom(this.room, seat),
      mySeat: this.you.seat,
      nextFirst: this.room.nextFirst,
      wins: this.room.wins,
      rematchSeats: this.room.rematchVotes.map((id) => this.room.seats.findIndex((s) => s?.id === id)),
    });

    resEl.hidden = false;
    scrim.hidden = false;

    resEl.querySelector("[data-again]")?.addEventListener("click", () => this.actions.rematch());
    resEl.querySelector("[data-lobby]")?.addEventListener("click", () => this.actions.toLobby());
    resEl.querySelector("[data-leave]")?.addEventListener("click", () => this.actions.leave());
  }

  private askOfferDraw(): void {
    this.showDialog(
      "Đề nghị hoà",
      "Bạn có muốn gửi lời mời chia điểm hoà ván đấu này tới đối thủ không?",
      "Gửi đề nghị",
      () => {
        this.sendMove({ drawOffer: true });
      },
    );
  }

  private askResign(): void {
    this.showDialog("Đầu hàng", "Bạn có chắc chắn muốn đầu hàng và nhận thua ván này không?", "Đầu hàng", () => {
      this.actions.leave();
    });
  }

  private showDialog(title: string, msg: string, confirmBtnText: string, onConfirm: () => void): void {
    this.dialogBox.innerHTML = `
      <h4>${title}</h4>
      <p>${msg}</p>
      <div class="chess-dialog-actions">
        <button class="btn secondary" data-cancel>Huỷ</button>
        <button class="btn primary" data-confirm>${confirmBtnText}</button>
      </div>
    `;

    this.dialogScrim.hidden = false;
    this.dialogBox.querySelector("[data-cancel]")?.addEventListener("click", () => {
      this.dialogScrim.hidden = true;
    });
    this.dialogBox.querySelector("[data-confirm]")?.addEventListener("click", () => {
      this.dialogScrim.hidden = true;
      onConfirm();
    });
  }

  receive(msg: RoomMessage): void {
    if (msg.room.gameId !== "co-vua") return;
    this.room = msg.room;
    this.actionNo = msg.room.actionNo;
    this.you = msg.you;

    if (msg.room.game) {
      this.state = msg.room.game;
    }
    this.pending = false;

    if (msg.type === "moveApplied" && msg.gameId === "co-vua") {
      this.appendMoveLog(msg.move, msg.events);
    }

    this.refresh();
  }

  private appendMoveLog(move: Move, events: GameEvent[]): void {
    if (!("from" in move)) return;
    const stdMove = move as StandardMove;
    const isCheck = events.some((e) => e.t === "check");
    const isCheckmate = events.some((e) => e.t === "checkmate");

    const piece = this.state.board[stdMove.to];
    const text = formatAlgebraicMove({
      from: stdMove.from,
      to: stdMove.to,
      pieceType: piece?.type ?? "p",
      captured: events.some((e) => e.t === "move" && e.captured),
      promotion: stdMove.promotion,
      castling: events.find((e) => e.t === "move")?.t === "move" ? undefined : undefined,
      isCheck,
      isCheckmate,
    });

    const isWhite = this.state.turn === "b";
    this.log.push({
      n: this.state.fullmoveNumber,
      who: isWhite ? "Trắng" : "Đen",
      text,
    });
  }

  rejected(_code: ErrorCode): void {
    this.pending = false;
    this.clearSelection();
  }

  setOnline(online: boolean): void {
    this.online = online;
    const locked = this.page.querySelector<HTMLElement>(".locked");
    if (locked) locked.hidden = online;
  }

  destroy(): void {
    // Không có standing timers hay global listeners ngoài page DOM
  }
}
