// Test cho move-log của Cờ vua.

import { parseSquare } from "@playtogether/engine/co-vua";
import { describe, expect, it } from "vitest";
import { formatAlgebraicMove } from "./move-log.ts";

describe("Cờ vua Move Log", () => {
  it("nước đi Tốt: tiến thẳng và ăn quân", () => {
    // e2 -> e4
    expect(
      formatAlgebraicMove({
        from: parseSquare("e2"),
        to: parseSquare("e4"),
        pieceType: "p",
      }),
    ).toBe("e4");

    // e4 ăn d5: exd5
    expect(
      formatAlgebraicMove({
        from: parseSquare("e4"),
        to: parseSquare("d5"),
        pieceType: "p",
        captured: true,
      }),
    ).toBe("exd5");
  });

  it("nước đi quân khác và ăn quân", () => {
    // Mã lên f3: Nf3
    expect(
      formatAlgebraicMove({
        from: parseSquare("g1"),
        to: parseSquare("f3"),
        pieceType: "n",
      }),
    ).toBe("Nf3");

    // Hậu ăn f7 chiếu bí: Qxf7#
    expect(
      formatAlgebraicMove({
        from: parseSquare("h5"),
        to: parseSquare("f7"),
        pieceType: "q",
        captured: true,
        isCheckmate: true,
      }),
    ).toBe("Qxf7#");
  });

  it("nhập thành và phong cấp", () => {
    // O-O
    expect(
      formatAlgebraicMove({
        from: parseSquare("e1"),
        to: parseSquare("g1"),
        pieceType: "k",
        castling: "k",
      }),
    ).toBe("O-O");

    // e7 -> e8=Q+
    expect(
      formatAlgebraicMove({
        from: parseSquare("e7"),
        to: parseSquare("e8"),
        pieceType: "p",
        promotion: "q",
        isCheck: true,
      }),
    ).toBe("e8=Q+");
  });
});
