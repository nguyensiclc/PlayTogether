// Ghi và định dạng nhật ký nước đi cờ vua theo ký hiệu đại số FIDE (docs/co-vua/02-thiet-ke-ux.md).

import type { PieceType, Square } from "@playtogether/engine/co-vua";
import { fileOf, squareName } from "@playtogether/engine/co-vua";

const PIECE_LETTERS: Record<PieceType, string> = {
  p: "",
  n: "N",
  b: "B",
  r: "R",
  q: "Q",
  k: "K",
};

export interface FormatMoveParams {
  from: Square;
  to: Square;
  pieceType: PieceType;
  captured?: boolean;
  promotion?: PieceType | undefined;
  castling?: "k" | "q" | undefined;
  isCheck?: boolean;
  isCheckmate?: boolean;
}

function moveSuffix(isCheckmate?: boolean, isCheck?: boolean): string {
  if (isCheckmate) return "#";
  if (isCheck) return "+";
  return "";
}

function formatPawnMove(p: FormatMoveParams, toName: string): string {
  let notation = "";
  if (p.captured) {
    const fromFile = String.fromCharCode(97 + fileOf(p.from));
    notation = `${fromFile}x${toName}`;
  } else {
    notation = toName;
  }
  if (p.promotion) {
    notation += `=${PIECE_LETTERS[p.promotion]}`;
  }
  return notation;
}

export function formatAlgebraicMove(p: FormatMoveParams): string {
  const suffix = moveSuffix(p.isCheckmate, p.isCheck);
  if (p.castling === "k") return `O-O${suffix}`;
  if (p.castling === "q") return `O-O-O${suffix}`;

  const toName = squareName(p.to);
  if (p.pieceType === "p") {
    return `${formatPawnMove(p, toName)}${suffix}`;
  }

  const pieceLetter = PIECE_LETTERS[p.pieceType];
  const captureSign = p.captured ? "x" : "";
  return `${pieceLetter}${captureSign}${toName}${suffix}`;
}
