// Tiện ích toạ độ và FEN cho Cờ vua (docs/co-vua/03-thiet-ke-ky-thuat.md).

import type { CastlingRights, Color, Piece, PieceType, Square } from "./types.ts";

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function fileOf(sq: Square): number {
  return sq % 8;
}

export function rankOf(sq: Square): number {
  return Math.floor(sq / 8);
}

export function toSquare(file: number, rank: number): Square {
  return rank * 8 + file;
}

export function parseSquare(name: string): Square {
  if (name.length !== 2) throw new Error(`Tên ô không hợp lệ: ${name}`);
  const f = name.charCodeAt(0) - 97; // 'a' -> 0
  const r = name.charCodeAt(1) - 49; // '1' -> 0
  if (f < 0 || f > 7 || r < 0 || r > 7) throw new Error(`Toạ độ ô không hợp lệ: ${name}`);
  return r * 8 + f;
}

export function squareName(sq: Square): string {
  const f = fileOf(sq);
  const r = rankOf(sq);
  return `${String.fromCharCode(97 + f)}${r + 1}`;
}

const CHAR_TO_PIECE: Record<string, Piece> = {
  p: { type: "p", color: "b" },
  n: { type: "n", color: "b" },
  b: { type: "b", color: "b" },
  r: { type: "r", color: "b" },
  q: { type: "q", color: "b" },
  k: { type: "k", color: "b" },
  P: { type: "p", color: "w" },
  N: { type: "n", color: "w" },
  B: { type: "b", color: "w" },
  R: { type: "r", color: "w" },
  Q: { type: "q", color: "w" },
  K: { type: "k", color: "w" },
};

const PIECE_TO_CHAR: Record<Color, Record<PieceType, string>> = {
  w: { p: "P", n: "N", b: "B", r: "R", q: "Q", k: "K" },
  b: { p: "p", n: "n", b: "b", r: "r", q: "q", k: "k" },
};

export interface ParsedFen {
  board: (Piece | null)[];
  turn: Color;
  castling: { w: CastlingRights; b: CastlingRights };
  enPassant: Square | null;
  halfmoveClock: number;
  fullmoveNumber: number;
}

function parseRow(rowStr: string, r: number, board: (Piece | null)[]): void {
  let f = 0;
  for (const ch of rowStr) {
    if (ch >= "1" && ch <= "8") {
      f += Number.parseInt(ch, 10);
    } else {
      const piece = CHAR_TO_PIECE[ch];
      if (!piece) throw new Error(`Ký tự quân không hợp lệ trong FEN: ${ch}`);
      board[r * 8 + f] = piece;
      f++;
    }
  }
  if (f !== 8) throw new Error(`FEN hàng ${r + 1} không đủ 8 cột: ${rowStr}`);
}

function parseBoardPlacement(placement: string): (Piece | null)[] {
  const board: (Piece | null)[] = new Array(64).fill(null);
  const rows = placement.split("/");
  if (rows.length !== 8) throw new Error(`FEN sai số hàng: ${placement}`);

  for (let r = 7; r >= 0; r--) {
    const rowStr = rows[7 - r] ?? "";
    parseRow(rowStr, r, board);
  }
  return board;
}

function parseCastling(castlingStr: string): { w: CastlingRights; b: CastlingRights } {
  return {
    w: { k: castlingStr.includes("K"), q: castlingStr.includes("Q") },
    b: { k: castlingStr.includes("k"), q: castlingStr.includes("q") },
  };
}

/** Đọc chuỗi FEN thành trạng thái bàn cờ */
export function parseFen(fen: string): ParsedFen {
  const parts = fen.trim().split(/\s+/);
  const placement = parts[0] ?? "";
  const turnStr = parts[1] ?? "w";
  const castlingStr = parts[2] ?? "-";
  const epStr = parts[3] ?? "-";
  const halfmoveStr = parts[4] ?? "0";
  const fullmoveStr = parts[5] ?? "1";

  const board = parseBoardPlacement(placement);
  const turn: Color = turnStr === "b" ? "b" : "w";
  const castling = parseCastling(castlingStr);
  const enPassant = epStr === "-" ? null : parseSquare(epStr);
  const halfmoveClock = Number.parseInt(halfmoveStr, 10) || 0;
  const fullmoveNumber = Number.parseInt(fullmoveStr, 10) || 1;

  return { board, turn, castling, enPassant, halfmoveClock, fullmoveNumber };
}

function formatRow(board: readonly (Piece | null)[], r: number): string {
  let empty = 0;
  let s = "";
  for (let f = 0; f < 8; f++) {
    const piece = board[r * 8 + f];
    if (!piece) {
      empty++;
    } else {
      if (empty > 0) {
        s += empty;
        empty = 0;
      }
      s += PIECE_TO_CHAR[piece.color][piece.type];
    }
  }
  if (empty > 0) s += empty;
  return s;
}

function formatCastling(castling: { w: CastlingRights; b: CastlingRights }): string {
  let c = "";
  if (castling.w.k) c += "K";
  if (castling.w.q) c += "Q";
  if (castling.b.k) c += "k";
  if (castling.b.q) c += "q";
  return c === "" ? "-" : c;
}

/** Tạo chuỗi định danh vị trí (không tính halfmove và fullmove) để so khớp lặp 3 lần */
export function positionKey(
  board: readonly (Piece | null)[],
  turn: Color,
  castling: { w: CastlingRights; b: CastlingRights },
  enPassant: Square | null,
): string {
  const rows: string[] = [];
  for (let r = 7; r >= 0; r--) {
    rows.push(formatRow(board, r));
  }

  const c = formatCastling(castling);
  const ep = enPassant !== null ? squareName(enPassant) : "-";
  return `${rows.join("/")} ${turn} ${c} ${ep}`;
}
