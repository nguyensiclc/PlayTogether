// Test suite cho Cờ vua (docs/co-vua/04-ke-hoach-prototype.md).

import { describe, expect, it } from "vitest";
import { createRng } from "../game-module.ts";
import { parseFen, parseSquare } from "./fen.ts";
import {
  applyMove,
  coVua,
  defaultOptions,
  forfeit,
  isKingInCheck,
  parseMove,
  parseOptions,
  setup,
  validStandardMoves,
} from "./rules.ts";
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

describe("Cờ vua Engine", () => {
  it("V01 — setup: thế cờ ban đầu 32 quân", () => {
    const s = setup(defaultOptions, [10, 20], 10);
    expect(s.status).toBe("playing");
    expect(s.turn).toBe("w");
    expect(s.players).toEqual([10, 20]);
    expect(s.castling).toEqual({
      w: { k: true, q: true },
      b: { k: true, q: true },
    });
    expect(s.enPassant).toBeNull();
    expect(s.board.filter((p) => p !== null).length).toBe(32);

    // Trắng có 20 nước mở đầu hợp lệ (16 nước Tốt + 4 nước Mã)
    const moves = validStandardMoves(s);
    expect(moves.length).toBe(20);
  });

  it("V02 — Tốt: tiến 1 ô, tiến 2 ô từ vị trí ban đầu", () => {
    const s = setup(defaultOptions, [0, 1], 0);
    const e2 = parseSquare("e2");
    const e3 = parseSquare("e3");
    const e4 = parseSquare("e4");

    // Đi e2 -> e4
    const res = applyMove(s, 0, { from: e2, to: e4 });
    expect("state" in res).toBe(true);
    if ("state" in res) {
      expect(res.state.turn).toBe("b");
      expect(res.state.board[e2]).toBeNull();
      expect(res.state.board[e4]?.type).toBe("p");
      expect(res.state.enPassant).toBe(e3);
    }
  });

  it("V03 — Tốt: ăn chéo, không được ăn thẳng", () => {
    // Trắng e4, Đen d5
    const s = stateFromFen("rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2");
    const e4 = parseSquare("e4");
    const d5 = parseSquare("d5");

    const moves = validStandardMoves(s).filter((m) => m.from === e4);
    expect(moves.some((m) => m.to === d5)).toBe(true);
    expect(moves.some((m) => m.to === parseSquare("e5"))).toBe(true);

    const res = applyMove(s, 0, { from: e4, to: d5 });
    expect("state" in res).toBe(true);
    if ("state" in res) {
      expect(res.state.board[d5]?.color).toBe("w");
      expect(res.state.captured.w).toContain("p");
    }
  });

  it("V04 — Tốt: Bắt tốt qua đường (En passant)", () => {
    const s = stateFromFen("rnbqkbnr/ppppp1pp/8/4Pp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3");
    const e5 = parseSquare("e5");
    const f6 = parseSquare("f6");
    const f5 = parseSquare("f5");

    const moves = validStandardMoves(s).filter((m) => m.from === e5);
    expect(moves.some((m) => m.to === f6)).toBe(true);

    const res = applyMove(s, 0, { from: e5, to: f6 });
    expect("state" in res).toBe(true);
    if ("state" in res) {
      expect(res.state.board[f6]?.type).toBe("p");
      expect(res.state.board[f5]).toBeNull();
      expect(res.state.captured.w).toContain("p");
    }
  });

  it("V05 — Tốt: Phong cấp", () => {
    const s = stateFromFen("8/4P3/8/8/8/8/k6K/8 w - - 0 1");
    const e7 = parseSquare("e7");
    const e8 = parseSquare("e8");

    const moves = validStandardMoves(s).filter((m) => m.from === e7);
    expect(moves.length).toBe(4); // Q, R, B, N

    const res = applyMove(s, 0, { from: e7, to: e8, promotion: "q" });
    expect("state" in res).toBe(true);
    if ("state" in res) {
      expect(res.state.board[e8]?.type).toBe("q");
      expect(res.state.board[e8]?.color).toBe("w");
    }
  });

  it("V06 — Mã: nhảy hình chữ L qua quân cản", () => {
    const s = setup(defaultOptions, [0, 1], 0);
    const b1 = parseSquare("b1");
    const a3 = parseSquare("a3");
    const c3 = parseSquare("c3");

    const moves = validStandardMoves(s).filter((m) => m.from === b1);
    expect(moves.length).toBe(2);
    expect(moves.some((m) => m.to === a3)).toBe(true);
    expect(moves.some((m) => m.to === c3)).toBe(true);
  });

  it("V07 — Tượng: đi chéo và bị cản", () => {
    const s = stateFromFen("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1");
    const f1 = parseSquare("f1");

    const moves = validStandardMoves(s).filter((m) => m.from === f1);
    expect(moves.length).toBe(5);
    expect(moves.some((m) => m.to === parseSquare("c4"))).toBe(true);
    expect(moves.some((m) => m.to === parseSquare("a6"))).toBe(true);
  });

  it("V08 — Xe: đi thẳng và bị cản", () => {
    const s = stateFromFen("rnbqkbnr/1ppppppp/8/8/P7/8/1PPPPPPP/RNBQKBNR w KQkq - 0 1");
    const a1 = parseSquare("a1");

    const moves = validStandardMoves(s).filter((m) => m.from === a1);
    expect(moves.length).toBe(2);
    expect(moves.some((m) => m.to === parseSquare("a3"))).toBe(true);
  });

  it("V09 — Hậu: kết hợp sức mạnh Xe và Tượng", () => {
    const s = stateFromFen("8/8/8/4Q3/8/8/8/k6K w - - 0 1");
    const e5 = parseSquare("e5");
    const moves = validStandardMoves(s).filter((m) => m.from === e5);
    expect(moves.length).toBe(27);
  });

  it("V10 — Vua: đi 1 ô và không được đi vào ô bị đe doạ", () => {
    const s = stateFromFen("4r3/8/8/8/8/8/4P3/4K3 w - - 0 1");
    const e1 = parseSquare("e1");
    const moves = validStandardMoves(s).filter((m) => m.from === e1);
    expect(moves.some((m) => m.to === parseSquare("d1"))).toBe(true);
    expect(moves.some((m) => m.to === parseSquare("f1"))).toBe(true);
  });

  it("V11 — Nhập thành cánh Vua (ngắn O-O)", () => {
    const s = stateFromFen("rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4");
    const e1 = parseSquare("e1");
    const g1 = parseSquare("g1");

    const moves = validStandardMoves(s).filter((m) => m.from === e1);
    expect(moves.some((m) => m.to === g1)).toBe(true);

    const res = applyMove(s, 0, { from: e1, to: g1 });
    expect("state" in res).toBe(true);
    if ("state" in res) {
      expect(res.state.board[g1]?.type).toBe("k");
      expect(res.state.board[parseSquare("f1")]?.type).toBe("r");
      expect(res.state.board[parseSquare("h1")]).toBeNull();
      expect(res.state.castling.w.k).toBe(false);
      expect(res.state.castling.w.q).toBe(false);
    }
  });

  it("V12 — Nhập thành cánh Hậu (dài O-O-O)", () => {
    const s = stateFromFen("r3kbnr/pppqpppp/2np4/1B4B1/4P3/3P1N2/PPPQ1PPP/R3K2R w KQkq - 1 8");
    const e1 = parseSquare("e1");
    const c1 = parseSquare("c1");

    const moves = validStandardMoves(s).filter((m) => m.from === e1);
    expect(moves.some((m) => m.to === c1)).toBe(true);

    const res = applyMove(s, 0, { from: e1, to: c1 });
    expect("state" in res).toBe(true);
    if ("state" in res) {
      expect(res.state.board[c1]?.type).toBe("k");
      expect(res.state.board[parseSquare("d1")]?.type).toBe("r");
      expect(res.state.board[parseSquare("a1")]).toBeNull();
    }
  });

  it("V13 — Nhập thành không hợp lệ khi bị chiếu hoặc đi qua ô bị chiếu", () => {
    const sCheck = stateFromFen("4r3/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    const e1 = parseSquare("e1");
    const g1 = parseSquare("g1");
    const c1 = parseSquare("c1");

    const movesCheck = validStandardMoves(sCheck).filter((m) => m.from === e1);
    expect(movesCheck.some((m) => m.to === g1)).toBe(false);
    expect(movesCheck.some((m) => m.to === c1)).toBe(false);

    const sPass = stateFromFen("5r2/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
    const movesPass = validStandardMoves(sPass).filter((m) => m.from === e1);
    expect(movesPass.some((m) => m.to === g1)).toBe(false);
  });

  it("V14 — Mất quyền nhập thành khi Xe hoặc Vua di chuyển", () => {
    const s = stateFromFen("rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4");
    const h1 = parseSquare("h1");
    const g1 = parseSquare("g1");

    const res = applyMove(s, 0, { from: h1, to: g1 });
    expect("state" in res).toBe(true);
    if ("state" in res) {
      expect(res.state.castling.w.k).toBe(false);
      expect(res.state.castling.w.q).toBe(true);
    }
  });

  it("V15 — Phát hiện chiếu (isCheck)", () => {
    const checkState = stateFromFen("rnb1kbnr/pppp1ppp/4p3/8/7q/5P2/PPPPP1PP/RNBQKBNR w KQkq - 1 3");
    expect(checkState.isCheck).toBe(true);
  });

  it("V16 — Nước đi khi bị chiếu chỉ cho phép giải chiếu", () => {
    const s = stateFromFen("rnb1kbnr/pppp1ppp/4p3/8/7q/5P2/PPPPP1PP/RNBQKBNR w KQkq - 1 3");
    expect(s.isCheck).toBe(true);
    const moves = validStandardMoves(s);
    expect(moves.length).toBe(1);
    expect(moves[0]?.from).toBe(parseSquare("g2"));
    expect(moves[0]?.to).toBe(parseSquare("g3"));
  });

  it("V17 — Chiếu bí (Checkmate / Scholar's Mate)", () => {
    const s = stateFromFen("r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4");
    expect(s.isCheck).toBe(true);
    expect(validStandardMoves(s).length).toBe(0);

    const preState = stateFromFen("r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4");
    const res = applyMove(preState, 0, { from: parseSquare("h5"), to: parseSquare("f7") });
    expect("state" in res).toBe(true);
    if ("state" in res) {
      expect(res.state.status).toBe("finished");
      expect(res.state.result?.winner).toBe(0);
      expect(res.state.result?.reason).toBe("chieu-bi");
      expect(res.state.result?.scores).toEqual([1, 0]);
    }
  });

  it("V18 — Thế bí (Stalemate / Hoà)", () => {
    const s = stateFromFen("k7/8/1Q6/8/8/8/8/K7 b - - 0 1");
    expect(s.isCheck).toBe(false);
    expect(validStandardMoves(s).length).toBe(0);

    const preState = stateFromFen("k7/8/8/8/8/8/1Q6/K7 w - - 0 1");
    const res = applyMove(preState, 0, { from: parseSquare("b2"), to: parseSquare("b6") });
    expect("state" in res).toBe(true);
    if ("state" in res) {
      expect(res.state.status).toBe("finished");
      expect(res.state.result?.winner).toBeNull();
      expect(res.state.result?.reason).toBe("the-bi");
      expect(res.state.result?.scores).toEqual([0.5, 0.5]);
    }
  });

  it("V19 — Quy tắc 50 nước", () => {
    const s = stateFromFen("8/8/8/4k3/8/8/4K3/8 w - - 99 50");
    const res = applyMove(s, 0, { from: parseSquare("e2"), to: parseSquare("e3") });
    expect("state" in res).toBe(true);
    if ("state" in res) {
      expect(res.state.status).toBe("finished");
      expect(res.state.result?.reason).toBe("50-nuoc");
      expect(res.state.result?.winner).toBeNull();
    }
  });

  it("V20 — Lặp lại thế cờ 3 lần", () => {
    const s = setup(defaultOptions, [0, 1], 0);
    const nf3 = { from: parseSquare("g1"), to: parseSquare("f3") };
    const ng1 = { from: parseSquare("f3"), to: parseSquare("g1") };
    const nf6 = { from: parseSquare("g8"), to: parseSquare("f6") };
    const ng8 = { from: parseSquare("f6"), to: parseSquare("g8") };

    let cur = s;
    const moves = [nf3, nf6, ng1, ng8, nf3, nf6, ng1, ng8];
    for (let i = 0; i < moves.length; i++) {
      const seat = cur.turn === "w" ? 0 : 1;
      const m = moves[i]!;
      const r = applyMove(cur, seat, m);
      expect("state" in r).toBe(true);
      if ("state" in r) cur = r.state;
    }

    expect(cur.status).toBe("finished");
    expect(cur.result?.reason).toBe("lap-3-lan");
    expect(cur.result?.winner).toBeNull();
  });

  it("V21 — Thiếu lực lượng chiếu bí (Insufficient material)", () => {
    const s1 = stateFromFen("8/8/8/4k3/8/8/4K3/8 w - - 0 1");
    const res = applyMove(s1, 0, { from: parseSquare("e2"), to: parseSquare("e3") });
    expect("state" in res).toBe(true);
    if ("state" in res) {
      expect(res.state.status).toBe("finished");
      expect(res.state.result?.reason).toBe("thieu-luc-luong");
    }
  });

  it("V22 — Đầu hàng (forfeit)", () => {
    const s = setup(defaultOptions, [0, 1], 0);
    const res = forfeit(s, 0, "bo-cuoc");
    expect("state" in res).toBe(true);
    if ("state" in res) {
      expect(res.state.status).toBe("finished");
      expect(res.state.result?.winner).toBe(1);
      expect(res.state.result?.reason).toBe("bo-cuoc");
      expect(res.state.result?.scores).toEqual([0, 1]);
    }
  });

  it("V23 — Đề nghị hoà và Đồng ý hoà", () => {
    const s = setup(defaultOptions, [0, 1], 0);

    const r1 = applyMove(s, 0, { drawOffer: true });
    expect("state" in r1).toBe(true);
    if ("state" in r1) {
      expect(r1.state.drawOfferedBy).toBe("w");

      const r2 = applyMove(r1.state, 1, { drawAccept: true });
      expect("state" in r2).toBe(true);
      if ("state" in r2) {
        expect(r2.state.status).toBe("finished");
        expect(r2.state.result?.reason).toBe("hoa-thuan");
        expect(r2.state.result?.scores).toEqual([0.5, 0.5]);
      }
    }
  });

  it("V24 — parseMove & parseOptions", () => {
    expect(parseOptions({ thoiGianLuot: 180 }, defaultOptions)).toEqual({ thoiGianLuot: 180 });
    expect(parseOptions({ thoiGianLuot: 999 }, defaultOptions)).toEqual(defaultOptions);

    expect(parseMove({ from: 12, to: 28 })).toEqual({ from: 12, to: 28 });
    expect(parseMove({ from: 52, to: 60, promotion: "q" })).toEqual({ from: 52, to: 60, promotion: "q" });
    expect(parseMove({ drawOffer: true })).toEqual({ drawOffer: true });
    expect(parseMove({ drawAccept: true })).toEqual({ drawAccept: true });

    expect(parseMove(null)).toBeNull();
    expect(parseMove({ from: -1, to: 10 })).toBeNull();
    expect(parseMove({ from: 0, to: 64 })).toBeNull();
    expect(parseMove({ from: 10, to: 20, promotion: "k" })).toBeNull();
  });

  function verifyInvariants(state: State): void {
    const whiteKings = state.board.filter((p) => p?.type === "k" && p?.color === "w").length;
    const blackKings = state.board.filter((p) => p?.type === "k" && p?.color === "b").length;
    expect(whiteKings).toBe(1);
    expect(blackKings).toBe(1);

    const inactiveColor = state.turn === "w" ? "b" : "w";
    expect(isKingInCheck(state.board, inactiveColor)).toBe(false);
  }

  function runFuzzGame(rng: () => number): void {
    let state = setup(defaultOptions, [0, 1], 0);
    let step = 0;

    while (state.status === "playing" && step < 150) {
      verifyInvariants(state);
      const moves = validStandardMoves(state);
      if (moves.length === 0) break;

      const idx = Math.floor(rng() * moves.length);
      const chosen = moves[idx]!;
      const seat = state.turn === "w" ? 0 : 1;
      const res = applyMove(state, seat, chosen);
      if ("error" in res) {
        throw new Error(`Nước đi hợp lệ bị từ chối: ${JSON.stringify(chosen)} - ${res.error}`);
      }
      state = res.state;
      step++;
    }

    if (state.status === "finished") {
      expect(state.result).not.toBeNull();
    }
  }

  it("V25 — Fuzz testing: 200 ván ngẫu nhiên không lỗi và bảo toàn bất biến", () => {
    const rng = createRng(123456789);
    for (let game = 0; game < 200; game++) {
      runFuzzGame(rng);
    }
  }, 60_000);

  it("GameModule: định danh và hợp đồng module", () => {
    expect(coVua.id).toBe("co-vua");
    expect(coVua.minPlayers).toBe(2);
    expect(coVua.maxPlayers).toBe(2);
  });
});
