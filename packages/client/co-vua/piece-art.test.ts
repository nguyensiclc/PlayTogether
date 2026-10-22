import type { Color, PieceType } from "@playtogether/engine/co-vua";
import { describe, expect, it } from "vitest";
import { PIECE_DEFS, pieceSvg } from "./piece-art.ts";

const TYPES: PieceType[] = ["p", "n", "b", "r", "q", "k"];
const COLORS: Color[] = ["w", "b"];

describe("Quân cờ vua 3D", () => {
  it("mọi quân đều có hình, gradient khối và lớp bóng", () => {
    for (const color of COLORS) {
      for (const type of TYPES) {
        const svg = pieceSvg({ color, type });
        expect(svg).toContain(`url(#cv-body-${color})`);
        expect(svg).toContain("url(#cv-gloss)");
      }
    }
  });

  it("PIECE_DEFS khai báo đủ các gradient mà quân dùng", () => {
    for (const id of ["cv-body-w", "cv-body-b", "cv-gloss"]) expect(PIECE_DEFS).toContain(`id="${id}"`);
  });
});
