// Test suite cho Bot Cờ vua (docs/co-vua/04-ke-hoach-prototype.md Mốc V5).

import { describe, expect, it } from "vitest";
import { createRng } from "../game-module.ts";
import { chooseBotMove } from "./bot.ts";
import { parseFen, parseSquare } from "./fen.ts";
import { defaultOptions, isKingInCheck, setup, validStandardMoves } from "./rules.ts";
import type { State } from "./types.ts";

function stateFromFen(fen: string, seats: [number, number] = [0, 1]): State {
  const parsed = parseFen(fen);
  return {
    board: parsed.board,
    players: seats,
    turn: parsed.turn,
    castling: parsed.castling,
    enPassant: parsed.enPassant,
    halfmoveClock: parsed.halfmoveClock,
    fullmoveNumber: parsed.fullmoveNumber,
    lastMove: null,
    isCheck: isKingInCheck(parsed.board, parsed.turn),
    positionHistory: [fen],
    drawOfferedBy: null,
    captured: { w: [], b: [] },
    options: { ...defaultOptions },
    status: "playing",
    result: null,
  };
}

describe("Cờ vua Bot", () => {
  const rng = createRng(42);

  describe("Cấp độ Easy (Dễ)", () => {
    it("chọn nước đi hợp lệ từ thế cờ ban đầu cho Trắng", () => {
      const s = setup(defaultOptions, [0, 1], 0);
      const move = chooseBotMove(s, "easy", rng);
      expect(move).not.toBeNull();
      const legals = validStandardMoves(s);
      const exists = legals.some((m) => m.from === move?.from && m.to === move?.to);
      expect(exists).toBe(true);
    });

    it("chọn nước đi hợp lệ cho Đen", () => {
      const s = stateFromFen("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1");
      const move = chooseBotMove(s, "easy", rng);
      expect(move).not.toBeNull();
      const legals = validStandardMoves(s);
      const exists = legals.some((m) => m.from === move?.from && m.to === move?.to);
      expect(exists).toBe(true);
    });

    it("trả về null nếu không còn nước đi (chiếu bí)", () => {
      // Thế cờ Trắng đã bị chiếu bí
      const s = stateFromFen("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3");
      const move = chooseBotMove(s, "easy", rng);
      expect(move).toBeNull();
    });
  });

  describe("Cấp độ Medium (Trung bình)", () => {
    it("ăn quân miễn phí có giá trị cao (ăn Hậu miễn phí)", () => {
      // Trắng có Xe ở e1, Đen có Hậu ở e5 không được bảo vệ, Vua Đen ở e8, Vua Trắng ở h1
      // Xe e1 ăn Hậu e5 (e1 -> e5)
      const s = stateFromFen("4k3/8/8/4q3/8/8/8/4R2K w - - 0 1");
      const move = chooseBotMove(s, "medium", rng);
      expect(move).not.toBeNull();
      expect(move?.from).toBe(parseSquare("e1"));
      expect(move?.to).toBe(parseSquare("e5"));
    });

    it("tránh bị ăn quân lớn nếu có nước chạy", () => {
      // Hậu Trắng ở d4, Đen có Tốt c5 được Tốt b6 bảo vệ. Trắng không nên ăn c5 vì mất Hậu
      // 8/8/1p6/2p5/3Q4/8/8/4K2k w - - 0 1
      const s = stateFromFen("8/8/1p6/2p5/3Q4/8/8/4K2k w - - 0 1");
      const move = chooseBotMove(s, "medium", rng);
      expect(move).not.toBeNull();
      // Nước đi không nên ăn c5 vì bị tốt b6 ăn lại
      expect(move?.to).not.toBe(parseSquare("c5"));
    });
  });

  describe("Cấp độ Hard (Khó)", () => {
    it("tìm nước chiếu bí trong 1 nước (Scholar's mate checkmate)", () => {
      // 1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#
      // FEN trước nước Qxf7#: r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4
      const s = stateFromFen("r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4");
      const move = chooseBotMove(s, "hard", rng);
      expect(move).not.toBeNull();
      expect(move?.from).toBe(parseSquare("h5"));
      expect(move?.to).toBe(parseSquare("f7")); // Hậu ăn f7 chiếu bí
    });

    it("tìm nước chiếu bí hàng cuối (Back-rank checkmate)", () => {
      // 3r2k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1 -> e1 -> e8# chiếu bí
      const s = stateFromFen("6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1");
      const move = chooseBotMove(s, "hard", rng);
      expect(move).not.toBeNull();
      expect(move?.from).toBe(parseSquare("e1"));
      expect(move?.to).toBe(parseSquare("e8"));
    });

    it("ưu tiên phong Hậu khi tốt tới hàng 8", () => {
      // 8/4P3/8/8/8/8/8/4K2k w - - 0 1 -> e7 -> e8q
      const s = stateFromFen("8/4P3/8/8/8/8/8/4K2k w - - 0 1");
      const move = chooseBotMove(s, "hard", rng);
      expect(move).not.toBeNull();
      expect(move?.from).toBe(parseSquare("e7"));
      expect(move?.to).toBe(parseSquare("e8"));
      expect(move?.promotion).toBe("q");
    });
  });
});
