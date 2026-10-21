// Test cho board-svg của Cờ vua.

import { parseSquare } from "@playtogether/engine/co-vua";
import { describe, expect, it } from "vitest";
import { displayCoordToSquare, toDisplayCoord } from "./board-svg.ts";

describe("Cờ vua Board SVG", () => {
  it("toDisplayCoord: hướng Trắng (flipped = false)", () => {
    // a1 (file 0, rank 0) -> hiển thị ở góc dưới bên trái: col 0, row 7
    expect(toDisplayCoord(0, 0, false)).toEqual({ col: 0, row: 7 });
    // h8 (file 7, rank 7) -> góc trên bên phải: col 7, row 0
    expect(toDisplayCoord(7, 7, false)).toEqual({ col: 7, row: 0 });
    // e4 (file 4, rank 3) -> col 4, row 4
    expect(toDisplayCoord(4, 3, false)).toEqual({ col: 4, row: 4 });
  });

  it("toDisplayCoord: hướng Đen (flipped = true)", () => {
    // a1 (file 0, rank 0) -> hiển thị ở góc trên bên phải: col 7, row 0
    expect(toDisplayCoord(0, 0, true)).toEqual({ col: 7, row: 0 });
    // h8 (file 7, rank 7) -> góc dưới bên trái: col 0, row 7
    expect(toDisplayCoord(7, 7, true)).toEqual({ col: 0, row: 7 });
  });

  it("displayCoordToSquare khứ hồi chính xác", () => {
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        const sq = r * 8 + f;
        // Trắng
        const dcW = toDisplayCoord(f, r, false);
        expect(displayCoordToSquare(dcW.col, dcW.row, false)).toBe(sq);
        // Đen
        const dcB = toDisplayCoord(f, r, true);
        expect(displayCoordToSquare(dcB.col, dcB.row, true)).toBe(sq);
      }
    }
  });

  it("parseSquare khớp toạ độ", () => {
    expect(parseSquare("a1")).toBe(0);
    expect(parseSquare("h1")).toBe(7);
    expect(parseSquare("a8")).toBe(56);
    expect(parseSquare("h8")).toBe(63);
  });
});
