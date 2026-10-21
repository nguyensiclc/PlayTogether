// Luật Cờ vua, khớp docs/co-vua/01-luat-choi.md và thuật toán ở docs/co-vua/03-thiet-ke-ky-thuat.md.
// Hàm thuần: không sửa state đầu vào, không I/O, không ngẫu nhiên.

import type { ForfeitReason, GameModule, GameResult, SeatId } from "../game-module.ts";
import { fileOf, parseFen, positionKey, rankOf, START_FEN, toSquare } from "./fen.ts";
import type {
  CastlingRights,
  Color,
  DrawAcceptMove,
  DrawOfferMove,
  EndReason,
  GameEvent,
  Move,
  Options,
  Piece,
  PieceType,
  ScoreDetail,
  Square,
  StandardMove,
  State,
} from "./types.ts";

export const defaultOptions: Options = {
  thoiGianLuot: 60,
};

const DRAW_SCORE = 0.5;

export const isStandardMove = (m: Move): m is StandardMove => "from" in m && "to" in m;
export const isDrawOffer = (m: Move): m is DrawOfferMove => "drawOffer" in m;
export const isDrawAccept = (m: Move): m is DrawAcceptMove => "drawAccept" in m;

export function otherColor(c: Color): Color {
  return c === "w" ? "b" : "w";
}

function cloneBoard(b: readonly (Piece | null)[]): (Piece | null)[] {
  return b.map((p) => (p ? { type: p.type, color: p.color } : null));
}

function cloneState(s: State): State {
  return {
    ...s,
    board: cloneBoard(s.board),
    players: [s.players[0], s.players[1]],
    castling: {
      w: { ...s.castling.w },
      b: { ...s.castling.b },
    },
    positionHistory: [...s.positionHistory],
    captured: {
      w: [...s.captured.w],
      b: [...s.captured.b],
    },
    options: { ...s.options },
  };
}

export function colorOfSeat(s: State, seat: SeatId): Color | null {
  if (s.players[0] === seat) return "w";
  if (s.players[1] === seat) return "b";
  return null;
}

export function seatOfColor(s: State, color: Color): SeatId {
  return color === "w" ? s.players[0] : s.players[1];
}

/** Khởi tạo ván cờ vua mới theo FEN chuẩn */
export function setup(options: Options, seats: SeatId[], firstPlayer: SeatId): State {
  const [second, ...extra] = seats.filter((s) => s !== firstPlayer);
  if (seats.length !== 2 || second === undefined || extra.length > 0) {
    throw new Error(`Ghế không hợp lệ: ${seats} / ${firstPlayer}`);
  }

  const parsed = parseFen(START_FEN);
  const initialKey = positionKey(parsed.board, parsed.turn, parsed.castling, parsed.enPassant);

  return {
    board: parsed.board,
    players: [firstPlayer, second], // firstPlayer cầm Trắng
    turn: "w",
    castling: parsed.castling,
    enPassant: parsed.enPassant,
    halfmoveClock: parsed.halfmoveClock,
    fullmoveNumber: parsed.fullmoveNumber,
    lastMove: null,
    isCheck: false,
    positionHistory: [initialKey],
    drawOfferedBy: null,
    captured: { w: [], b: [] },
    options: { ...options },
    status: "playing",
    result: null,
  };
}

// -----------------------------------------------------------------------------
// Kiểm tra tấn công và chiếu
// -----------------------------------------------------------------------------

const KNIGHT_OFFSETS: readonly [number, number][] = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
];

const BISHOP_DIRS: readonly [number, number][] = [
  [1, 1],
  [1, -1],
  [-1, -1],
  [-1, 1],
];

const ROOK_DIRS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const KING_DIRS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, -1],
  [-1, 1],
];

function isAttackedByPawn(board: readonly (Piece | null)[], targetF: number, targetR: number, byColor: Color): boolean {
  const pawnR = byColor === "w" ? targetR - 1 : targetR + 1;
  if (pawnR < 0 || pawnR > 7) return false;

  if (targetF > 0) {
    const p = board[toSquare(targetF - 1, pawnR)];
    if (p && p.color === byColor && p.type === "p") return true;
  }
  if (targetF < 7) {
    const p = board[toSquare(targetF + 1, pawnR)];
    if (p && p.color === byColor && p.type === "p") return true;
  }
  return false;
}

function isAttackedByKnight(
  board: readonly (Piece | null)[],
  targetF: number,
  targetR: number,
  byColor: Color,
): boolean {
  for (const [df, dr] of KNIGHT_OFFSETS) {
    const f = targetF + df;
    const r = targetR + dr;
    if (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const p = board[toSquare(f, r)];
      if (p && p.color === byColor && p.type === "n") return true;
    }
  }
  return false;
}

function isAttackedByRay(
  board: readonly (Piece | null)[],
  targetF: number,
  targetR: number,
  byColor: Color,
  dirs: readonly [number, number][],
  validTypes: readonly PieceType[],
): boolean {
  for (const [df, dr] of dirs) {
    let f = targetF + df;
    let r = targetR + dr;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const p = board[toSquare(f, r)];
      if (p) {
        if (p.color === byColor && validTypes.includes(p.type)) return true;
        break;
      }
      f += df;
      r += dr;
    }
  }
  return false;
}

function isAttackedByKing(board: readonly (Piece | null)[], targetF: number, targetR: number, byColor: Color): boolean {
  for (const [df, dr] of KING_DIRS) {
    const f = targetF + df;
    const r = targetR + dr;
    if (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const p = board[toSquare(f, r)];
      if (p && p.color === byColor && p.type === "k") return true;
    }
  }
  return false;
}

export function isSquareAttacked(board: readonly (Piece | null)[], sq: Square, byColor: Color): boolean {
  const targetF = fileOf(sq);
  const targetR = rankOf(sq);

  if (isAttackedByPawn(board, targetF, targetR, byColor)) return true;
  if (isAttackedByKnight(board, targetF, targetR, byColor)) return true;
  if (isAttackedByRay(board, targetF, targetR, byColor, BISHOP_DIRS, ["b", "q"])) return true;
  if (isAttackedByRay(board, targetF, targetR, byColor, ROOK_DIRS, ["r", "q"])) return true;
  return isAttackedByKing(board, targetF, targetR, byColor);
}

export function findKing(board: readonly (Piece | null)[], color: Color): Square {
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.color === color && p.type === "k") return i;
  }
  return -1;
}

export function isKingInCheck(board: readonly (Piece | null)[], color: Color): boolean {
  const kingSq = findKing(board, color);
  if (kingSq === -1) return false;
  return isSquareAttacked(board, kingSq, otherColor(color));
}

// -----------------------------------------------------------------------------
// Sinh nước đi bán hợp lệ (Pseudo-legal moves)
// -----------------------------------------------------------------------------

function generatePawnForward(
  board: readonly (Piece | null)[],
  sq: Square,
  f: number,
  r: number,
  forward: number,
  startRank: number,
  promoRank: number,
  out: StandardMove[],
): void {
  const nextR = r + forward;
  if (nextR < 0 || nextR > 7 || board[toSquare(f, nextR)] !== null) return;

  if (nextR === promoRank) {
    const promos: PieceType[] = ["q", "r", "b", "n"];
    for (const promotion of promos) out.push({ from: sq, to: toSquare(f, nextR), promotion });
  } else {
    out.push({ from: sq, to: toSquare(f, nextR) });
    const doubleR = r + forward * 2;
    if (r === startRank && board[toSquare(f, doubleR)] === null) {
      out.push({ from: sq, to: toSquare(f, doubleR) });
    }
  }
}

function addPawnCapture(sq: Square, targetSq: Square, nextR: number, promoRank: number, out: StandardMove[]): void {
  if (nextR === promoRank) {
    const promos: PieceType[] = ["q", "r", "b", "n"];
    for (const promotion of promos) out.push({ from: sq, to: targetSq, promotion });
  } else {
    out.push({ from: sq, to: targetSq });
  }
}

function generatePawnCaptures(
  board: readonly (Piece | null)[],
  sq: Square,
  f: number,
  r: number,
  forward: number,
  color: Color,
  promoRank: number,
  enPassant: Square | null,
  out: StandardMove[],
): void {
  const nextR = r + forward;
  if (nextR < 0 || nextR > 7) return;

  for (const cf of [f - 1, f + 1]) {
    if (cf < 0 || cf > 7) continue;
    const targetSq = toSquare(cf, nextR);
    const targetPiece = board[targetSq];
    const isEp = enPassant !== null && targetSq === enPassant;

    if ((targetPiece && targetPiece.color !== color) || isEp) {
      addPawnCapture(sq, targetSq, nextR, promoRank, out);
    }
  }
}

function generatePawnMoves(
  board: readonly (Piece | null)[],
  sq: Square,
  color: Color,
  enPassant: Square | null,
  out: StandardMove[],
): void {
  const f = fileOf(sq);
  const r = rankOf(sq);
  const forward = color === "w" ? 1 : -1;
  const startRank = color === "w" ? 1 : 6;
  const promoRank = color === "w" ? 7 : 0;

  generatePawnForward(board, sq, f, r, forward, startRank, promoRank, out);
  generatePawnCaptures(board, sq, f, r, forward, color, promoRank, enPassant, out);
}

function generateSlidingMoves(
  board: readonly (Piece | null)[],
  sq: Square,
  color: Color,
  dirs: readonly [number, number][],
  out: StandardMove[],
): void {
  const f = fileOf(sq);
  const r = rankOf(sq);
  for (const [df, dr] of dirs) {
    let curF = f + df;
    let curR = r + dr;
    while (curF >= 0 && curF <= 7 && curR >= 0 && curR <= 7) {
      const targetSq = toSquare(curF, curR);
      const piece = board[targetSq];
      if (!piece) {
        out.push({ from: sq, to: targetSq });
      } else {
        if (piece.color !== color) out.push({ from: sq, to: targetSq });
        break; // Gặp quân cản
      }
      curF += df;
      curR += dr;
    }
  }
}

function generateKnightMoves(board: readonly (Piece | null)[], sq: Square, color: Color, out: StandardMove[]): void {
  const f = fileOf(sq);
  const r = rankOf(sq);
  for (const [df, dr] of KNIGHT_OFFSETS) {
    const curF = f + df;
    const curR = r + dr;
    if (curF >= 0 && curF <= 7 && curR >= 0 && curR <= 7) {
      const targetSq = toSquare(curF, curR);
      const piece = board[targetSq];
      if (!piece || piece.color !== color) out.push({ from: sq, to: targetSq });
    }
  }
}

function generateCastlingMoves(
  board: readonly (Piece | null)[],
  color: Color,
  castling: { w: CastlingRights; b: CastlingRights },
  out: StandardMove[],
): void {
  const enemy = otherColor(color);
  if (color === "w") {
    if (
      castling.w.k &&
      board[5] === null &&
      board[6] === null &&
      !isSquareAttacked(board, 4, enemy) &&
      !isSquareAttacked(board, 5, enemy) &&
      !isSquareAttacked(board, 6, enemy)
    ) {
      out.push({ from: 4, to: 6 });
    }
    if (
      castling.w.q &&
      board[1] === null &&
      board[2] === null &&
      board[3] === null &&
      !isSquareAttacked(board, 4, enemy) &&
      !isSquareAttacked(board, 3, enemy) &&
      !isSquareAttacked(board, 2, enemy)
    ) {
      out.push({ from: 4, to: 2 });
    }
  } else {
    if (
      castling.b.k &&
      board[61] === null &&
      board[62] === null &&
      !isSquareAttacked(board, 60, enemy) &&
      !isSquareAttacked(board, 61, enemy) &&
      !isSquareAttacked(board, 62, enemy)
    ) {
      out.push({ from: 60, to: 62 });
    }
    if (
      castling.b.q &&
      board[57] === null &&
      board[58] === null &&
      board[59] === null &&
      !isSquareAttacked(board, 60, enemy) &&
      !isSquareAttacked(board, 59, enemy) &&
      !isSquareAttacked(board, 58, enemy)
    ) {
      out.push({ from: 60, to: 58 });
    }
  }
}

function generateKingMoves(
  board: readonly (Piece | null)[],
  sq: Square,
  color: Color,
  castling: { w: CastlingRights; b: CastlingRights },
  out: StandardMove[],
): void {
  const f = fileOf(sq);
  const r = rankOf(sq);
  for (const [df, dr] of KING_DIRS) {
    const curF = f + df;
    const curR = r + dr;
    if (curF >= 0 && curF <= 7 && curR >= 0 && curR <= 7) {
      const targetSq = toSquare(curF, curR);
      const piece = board[targetSq];
      if (!piece || piece.color !== color) out.push({ from: sq, to: targetSq });
    }
  }

  if ((color === "w" && sq === 4) || (color === "b" && sq === 60)) {
    generateCastlingMoves(board, color, castling, out);
  }
}

function applySimulatedCastling(b: (Piece | null)[], to: Square): void {
  if (to === 6) {
    b[7] = null;
    b[5] = { type: "r", color: "w" };
  } else if (to === 2) {
    b[0] = null;
    b[3] = { type: "r", color: "w" };
  } else if (to === 62) {
    b[63] = null;
    b[61] = { type: "r", color: "b" };
  } else if (to === 58) {
    b[56] = null;
    b[59] = { type: "r", color: "b" };
  }
}

/** Giả lập nước đi trên bản sao bàn cờ để kiểm tra an toàn của Vua */
function simulateMove(board: (Piece | null)[], move: StandardMove, enPassant: Square | null): (Piece | null)[] {
  const b = cloneBoard(board);
  const p = b[move.from];
  if (!p) return b;

  b[move.from] = null;

  if (p.type === "p" && enPassant !== null && move.to === enPassant) {
    const enemyPawnSq = p.color === "w" ? enPassant - 8 : enPassant + 8;
    b[enemyPawnSq] = null;
  }

  if (p.type === "k" && Math.abs(move.to - move.from) === 2) {
    applySimulatedCastling(b, move.to);
  }

  b[move.to] = move.promotion ? { type: move.promotion, color: p.color } : p;
  return b;
}

// -----------------------------------------------------------------------------
// Sinh nước đi hợp lệ hoàn chỉnh (Legal moves)
// -----------------------------------------------------------------------------

function generatePieceMoves(
  board: readonly (Piece | null)[],
  sq: Square,
  p: Piece,
  enPassant: Square | null,
  castling: { w: CastlingRights; b: CastlingRights },
  out: StandardMove[],
): void {
  if (p.type === "p") {
    generatePawnMoves(board, sq, p.color, enPassant, out);
  } else if (p.type === "n") {
    generateKnightMoves(board, sq, p.color, out);
  } else if (p.type === "b") {
    generateSlidingMoves(board, sq, p.color, BISHOP_DIRS, out);
  } else if (p.type === "r") {
    generateSlidingMoves(board, sq, p.color, ROOK_DIRS, out);
  } else if (p.type === "q") {
    generateSlidingMoves(board, sq, p.color, KING_DIRS, out);
  } else if (p.type === "k") {
    generateKingMoves(board, sq, p.color, castling, out);
  }
}

export function validStandardMoves(state: State): StandardMove[] {
  const pseudo: StandardMove[] = [];
  const color = state.turn;

  for (let sq = 0; sq < 64; sq++) {
    const p = state.board[sq];
    if (p && p.color === color) {
      generatePieceMoves(state.board, sq, p, state.enPassant, state.castling, pseudo);
    }
  }

  const legal: StandardMove[] = [];
  for (const m of pseudo) {
    const simBoard = simulateMove(state.board, m, state.enPassant);
    if (!isKingInCheck(simBoard, color)) legal.push(m);
  }

  return legal;
}

export function validMoves(state: State, seat: SeatId): Move[] {
  if (state.status !== "playing") return [];
  const color = colorOfSeat(state, seat);
  if (color === null) return [];

  // Nếu đối thủ đang đề nghị hoà, người này có quyền chấp nhận hoà
  if (state.drawOfferedBy !== null && state.drawOfferedBy !== color && color !== state.turn) {
    return [{ drawAccept: true }];
  }

  if (color !== state.turn) return [];

  const moves: Move[] = [...validStandardMoves(state)];

  // Nước đề nghị hoà và đồng ý hoà
  if (state.drawOfferedBy !== null && state.drawOfferedBy !== color) {
    moves.push({ drawAccept: true });
  } else if (state.drawOfferedBy === null) {
    moves.push({ drawOffer: true });
  }

  return moves;
}

// -----------------------------------------------------------------------------
// Kiểm tra điều kiện hoà
// -----------------------------------------------------------------------------

function isSameColorBishops(bishops: readonly { piece: Piece; sq: Square }[]): boolean {
  if (bishops.length !== 2) return false;
  const b0 = bishops[0];
  const b1 = bishops[1];
  if (!b0 || !b1) return false;

  const sqColor0 = (fileOf(b0.sq) + rankOf(b0.sq)) % 2;
  const sqColor1 = (fileOf(b1.sq) + rankOf(b1.sq)) % 2;
  return b0.piece.color !== b1.piece.color && sqColor0 === sqColor1;
}

export function isInsufficientMaterial(board: readonly (Piece | null)[]): boolean {
  const pieces: { piece: Piece; sq: Square }[] = [];
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p) {
      if (p.type === "p" || p.type === "r" || p.type === "q") return false;
      pieces.push({ piece: p, sq: i });
    }
  }

  if (pieces.length === 2) return true; // 2 Vua

  if (pieces.length === 3) {
    const nonKings = pieces.filter((x) => x.piece.type !== "k");
    const t = nonKings[0]?.piece.type;
    return t === "b" || t === "n";
  }

  if (pieces.length === 4) {
    const bishops = pieces.filter((x) => x.piece.type === "b");
    return isSameColorBishops(bishops);
  }

  return false;
}

function countRepetitions(history: readonly string[], key: string): number {
  let count = 0;
  for (const k of history) {
    if (k === key) count++;
  }
  return count;
}

function finishGame(s: State, reason: EndReason, winnerColor: Color | null, events: GameEvent[]): void {
  const winnerSeat = winnerColor === null ? null : seatOfColor(s, winnerColor);
  let scores: number[];
  if (winnerSeat === null) {
    scores = [DRAW_SCORE, DRAW_SCORE];
  } else if (winnerSeat === s.players[0]) {
    scores = [1, 0];
  } else {
    scores = [0, 1];
  }

  const detail: ScoreDetail = {
    moves: s.fullmoveNumber,
    winnerColor,
    captured: s.captured,
  };

  const gameResult: GameResult = {
    winner: winnerSeat,
    scores,
    reason,
    detail,
  };

  s.status = "finished";
  s.result = gameResult;
  events.push({ t: "gameOver", result: gameResult });
}

// -----------------------------------------------------------------------------
// Thực hiện nước đi (applyMove)
// -----------------------------------------------------------------------------

function updateCastlingRights(rights: { w: CastlingRights; b: CastlingRights }, from: Square, to: Square): void {
  if (from === 4) {
    rights.w.k = false;
    rights.w.q = false;
  }
  if (from === 60) {
    rights.b.k = false;
    rights.b.q = false;
  }

  if (from === 0 || to === 0) rights.w.q = false;
  if (from === 7 || to === 7) rights.w.k = false;
  if (from === 56 || to === 56) rights.b.q = false;
  if (from === 63 || to === 63) rights.b.k = false;
}

function applyBoardCastling(s: State, to: Square): "k" | "q" | undefined {
  if (to === 6) {
    s.board[7] = null;
    s.board[5] = { type: "r", color: "w" };
    return "k";
  }
  if (to === 2) {
    s.board[0] = null;
    s.board[3] = { type: "r", color: "w" };
    return "q";
  }
  if (to === 62) {
    s.board[63] = null;
    s.board[61] = { type: "r", color: "b" };
    return "k";
  }
  if (to === 58) {
    s.board[56] = null;
    s.board[59] = { type: "r", color: "b" };
    return "q";
  }
  return undefined;
}

function checkPostMoveEndings(s: State, color: Color, key: string, events: GameEvent[]): void {
  const nextLegalMoves = validStandardMoves(s);

  if (nextLegalMoves.length === 0) {
    if (s.isCheck) {
      events.push({ t: "checkmate", winner: color });
      finishGame(s, "chieu-bi", color, events);
    } else {
      events.push({ t: "stalemate" });
      finishGame(s, "the-bi", null, events);
    }
  } else if (s.halfmoveClock >= 100) {
    events.push({ t: "draw", reason: "50-moves" });
    finishGame(s, "50-nuoc", null, events);
  } else if (countRepetitions(s.positionHistory, key) >= 3) {
    events.push({ t: "draw", reason: "repetition" });
    finishGame(s, "lap-3-lan", null, events);
  } else if (isInsufficientMaterial(s.board)) {
    events.push({ t: "draw", reason: "insufficient-material" });
    finishGame(s, "thieu-luc-luong", null, events);
  }
}

function handleCapture(s: State, color: Color, isEp: boolean, capturedPiece: Piece | null): void {
  if (isEp && s.enPassant !== null) {
    const epSq = color === "w" ? s.enPassant - 8 : s.enPassant + 8;
    const epPawn = s.board[epSq];
    if (epPawn) {
      s.captured[color].push(epPawn.type);
      s.board[epSq] = null;
    }
  } else if (capturedPiece) {
    s.captured[color].push(capturedPiece.type);
  }
}

function updateClockAndTurn(s: State, color: Color, p: Piece, capturedPiece: Piece | null, isEp: boolean): void {
  s.halfmoveClock = p.type === "p" || capturedPiece || isEp ? 0 : s.halfmoveClock + 1;
  const nextColor = otherColor(color);
  s.turn = nextColor;
  if (nextColor === "w") s.fullmoveNumber++;
  s.drawOfferedBy = null;
}

function applyStandard(
  s: State,
  color: Color,
  move: StandardMove,
  events: GameEvent[],
): { state: State; events: GameEvent[] } {
  const p = s.board[move.from];
  if (!p) return { state: s, events };

  const capturedPiece = s.board[move.to] ?? null;
  const isEp = p.type === "p" && s.enPassant !== null && move.to === s.enPassant;
  let castlingSide: "k" | "q" | undefined;

  s.board[move.from] = null;
  handleCapture(s, color, isEp, capturedPiece);

  if (p.type === "k" && Math.abs(move.to - move.from) === 2) {
    castlingSide = applyBoardCastling(s, move.to);
  }

  s.board[move.to] = move.promotion ? { type: move.promotion, color } : p;

  const moveEvent: GameEvent = {
    t: "move",
    from: move.from,
    to: move.to,
    piece: p,
    ...(capturedPiece ? { captured: capturedPiece } : {}),
    ...(move.promotion ? { promotion: move.promotion } : {}),
    ...(castlingSide ? { castling: castlingSide } : {}),
    ...(isEp ? { enPassant: true } : {}),
  };
  events.push(moveEvent);

  updateCastlingRights(s.castling, move.from, move.to);
  s.enPassant = p.type === "p" && Math.abs(move.to - move.from) === 16 ? (move.from + move.to) / 2 : null;
  updateClockAndTurn(s, color, p, capturedPiece, isEp);
  s.lastMove = move;

  const key = positionKey(s.board, s.turn, s.castling, s.enPassant);
  s.positionHistory.push(key);

  s.isCheck = isKingInCheck(s.board, s.turn);
  if (s.isCheck) events.push({ t: "check", color: s.turn });

  checkPostMoveEndings(s, color, key, events);
  return { state: s, events };
}

export function applyMove(
  state: State,
  seat: SeatId,
  move: Move,
): { state: State; events: GameEvent[] } | { error: string } {
  if (state.status !== "playing") return { error: "INVALID_MOVE" };
  const color = colorOfSeat(state, seat);
  if (color === null) return { error: "INVALID_MOVE" };

  if (isDrawAccept(move)) {
    if (state.drawOfferedBy === null || state.drawOfferedBy === color) return { error: "INVALID_MOVE" };
    const s = cloneState(state);
    const events: GameEvent[] = [{ t: "draw", reason: "agreement" }];
    finishGame(s, "hoa-thuan", null, events);
    return { state: s, events };
  }

  if (color !== state.turn) return { error: "NOT_YOUR_TURN" };

  if (isDrawOffer(move)) {
    if (state.drawOfferedBy !== null) return { error: "INVALID_MOVE" };
    const s = cloneState(state);
    s.drawOfferedBy = color;
    return { state: s, events: [{ t: "drawOffer", by: color }] };
  }

  if (!isStandardMove(move)) return { error: "INVALID_MOVE" };

  const legalMoves = validStandardMoves(state);
  const match = legalMoves.find(
    (m) => m.from === move.from && m.to === move.to && (!m.promotion || m.promotion === move.promotion),
  );
  if (!match) return { error: "INVALID_MOVE" };

  const s = cloneState(state);
  const events: GameEvent[] = [];
  return applyStandard(s, color, move, events);
}

// -----------------------------------------------------------------------------
// Forfeit, parseOptions, parseMove
// -----------------------------------------------------------------------------

export function forfeit(
  state: State,
  seat: SeatId,
  reason: ForfeitReason,
): { state: State; events: GameEvent[] } | { error: string } {
  if (state.status !== "playing") return { error: "INVALID_MOVE" };
  const loserColor = colorOfSeat(state, seat);
  if (loserColor === null) return { error: "INVALID_MOVE" };

  const s = cloneState(state);
  const events: GameEvent[] = [];
  const winnerColor = otherColor(loserColor);
  const endReason: EndReason = reason === "bo-cuoc" ? "bo-cuoc" : "het-gio";

  finishGame(s, endReason, winnerColor, events);
  return { state: s, events };
}

export function result(state: State): GameResult | null {
  return state.result;
}

const OPTION_VALUES: { [K in keyof Options]: readonly Options[K][] } = {
  thoiGianLuot: [15, 30, 60, 180, null],
};

export function parseOptions(raw: unknown, base: Options): Options {
  const out: Options = { ...base };
  if (typeof raw !== "object" || raw === null) return out;
  const input = raw as Record<string, unknown>;
  const val = input.thoiGianLuot;
  if ((OPTION_VALUES.thoiGianLuot as readonly unknown[]).includes(val)) {
    out.thoiGianLuot = val as Options["thoiGianLuot"];
  }
  return out;
}

export function parseMove(raw: unknown): Move | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  if (obj.drawOffer === true) return { drawOffer: true };
  if (obj.drawAccept === true) return { drawAccept: true };

  const { from, to, promotion } = obj;
  if (
    typeof from === "number" &&
    Number.isInteger(from) &&
    from >= 0 &&
    from <= 63 &&
    typeof to === "number" &&
    Number.isInteger(to) &&
    to >= 0 &&
    to <= 63
  ) {
    if (promotion !== undefined) {
      if (promotion === "q" || promotion === "r" || promotion === "b" || promotion === "n") {
        return { from, to, promotion };
      }
      return null;
    }
    return { from, to };
  }

  return null;
}

export const coVua: GameModule<State, Move, Options, GameEvent> = {
  id: "co-vua",
  minPlayers: 2,
  maxPlayers: 2,
  defaultOptions,
  setup,
  validMoves,
  applyMove,
  viewFor: (state) => state,
  result,
  forfeit,
  parseOptions,
  parseMove,
};
