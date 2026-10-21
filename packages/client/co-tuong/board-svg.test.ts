import { indexOf, setup } from "@playtogether/engine/co-tuong";
import { describe, expect, it } from "vitest";
import { boardSvg, cellAtPoint, PIECE_GLYPH } from "./board-svg.ts";

describe("cellAtPoint", () => {
  it("làm tròn đến giao điểm gần nhất", () => {
    expect(cellAtPoint(0.2, 0.1, false)).toBe(indexOf(0, 0));
    expect(cellAtPoint(4.4, 9.4, false)).toBe(indexOf(4, 9));
  });

  it("ngoài bàn thì null", () => {
    expect(cellAtPoint(-0.7, 3, false)).toBeNull();
    expect(cellAtPoint(8.6, 3, false)).toBeNull();
    expect(cellAtPoint(3, 9.6, false)).toBeNull();
  });

  it("bàn xoay 180° đảo ô", () => {
    expect(cellAtPoint(0, 0, true)).toBe(indexOf(8, 9));
    expect(cellAtPoint(8, 9, true)).toBe(indexOf(0, 0));
  });
});

describe("boardSvg", () => {
  const cells = setup({ thoiGianLuot: null }, [0, 1], 0).cells;

  it("vẽ đủ 32 quân, chữ Hán đúng bên", () => {
    const svg = boardSvg({ cells, last: null, flipped: false });
    expect(svg.match(/class="pc /g)).toHaveLength(32);
    for (const side of [0, 1] as const) {
      for (const glyph of Object.values(PIECE_GLYPH[side])) expect(svg).toContain(`>${glyph}<`);
    }
  });

  it("quân đang chọn, ô đến, vòng chiếu và nước vừa đi hiện ra", () => {
    const from = indexOf(1, 7);
    const svg = boardSvg({
      cells,
      last: { from, to: indexOf(1, 0) },
      selected: from,
      targets: [indexOf(1, 6), indexOf(1, 0)],
      checkCell: indexOf(4, 9),
      flipped: false,
      fresh: true,
    });
    expect(svg).toContain("pc red sel");
    expect(svg.match(/class="tgt"/g)).toHaveLength(1); // ô trống
    expect(svg.match(/class="tgt-cap"/g)).toHaveLength(1); // ô có quân địch
    expect(svg).toContain('class="chk"');
    expect(svg).toContain("last-to");
    expect(svg).toContain("pc black fresh");
  });
});
