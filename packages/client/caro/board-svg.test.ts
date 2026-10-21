import type { Mark } from "@playtogether/engine/caro";
import { describe, expect, it } from "vitest";
import { boardSvg, cellAt, indexOf, loupeViewBox, stepCell } from "./board-svg.ts";

const empty = (size: number): (Mark | null)[] => Array.from({ length: size * size }, () => null);
const rect = { left: 10, top: 20, width: 150, height: 150 };

describe("cellAt", () => {
  it("đổi toạ độ chạm thành chỉ số ô (mỗi ô 10px trên bàn 15)", () => {
    expect(cellAt(15, rect, 10, 20)).toBe(0);
    expect(cellAt(15, rect, 19.9, 29.9)).toBe(0);
    expect(cellAt(15, rect, 20, 20)).toBe(1);
    expect(cellAt(15, rect, 10, 30)).toBe(15);
    expect(cellAt(15, rect, 159.9, 169.9)).toBe(224);
  });

  it("ngoài bàn thì null", () => {
    expect(cellAt(15, rect, 9, 50)).toBeNull();
    expect(cellAt(15, rect, 60, 19)).toBeNull();
    expect(cellAt(15, rect, 160, 50)).toBeNull();
    expect(cellAt(15, rect, 60, 170)).toBeNull();
  });

  it("khung rỗng (chưa bố cục) thì null", () => {
    expect(cellAt(15, { left: 0, top: 0, width: 0, height: 0 }, 0, 0)).toBeNull();
  });
});

describe("loupeViewBox", () => {
  it("vùng 5×5 quanh ô, kẹp ở mép bàn", () => {
    expect(loupeViewBox(15, indexOf(15, 7, 7))).toBe("5 5 5 5");
    expect(loupeViewBox(15, indexOf(15, 0, 0))).toBe("0 0 5 5");
    expect(loupeViewBox(15, indexOf(15, 14, 14))).toBe("10 10 5 5");
    expect(loupeViewBox(19, indexOf(19, 18, 0))).toBe("14 0 5 5");
  });
});

describe("stepCell", () => {
  it("đi một ô, đứng yên khi chạm mép", () => {
    expect(stepCell(15, indexOf(15, 3, 3), 1, 0)).toBe(indexOf(15, 4, 3));
    expect(stepCell(15, indexOf(15, 3, 3), 0, -1)).toBe(indexOf(15, 3, 2));
    expect(stepCell(15, indexOf(15, 0, 0), -1, 0)).toBe(0);
    expect(stepCell(15, indexOf(15, 14, 14), 0, 1)).toBe(indexOf(15, 14, 14));
  });
});

describe("boardSvg", () => {
  const base = { size: 15, cells: empty(15), last: null, winLine: [], preview: null };

  it("bàn trống: có lưới, 5 điểm sao (bàn 15), không có quân", () => {
    const svg = boardSvg(base);
    expect(svg).toContain('viewBox="0 0 15 15"');
    expect(svg.match(/class="star"/g)).toHaveLength(5);
    expect(svg).not.toContain('class="mx"');
    expect(svg).not.toContain('class="mo"');
  });

  it("bàn 19 có 9 điểm sao", () => {
    expect(boardSvg({ ...base, size: 19, cells: empty(19) }).match(/class="star"/g)).toHaveLength(9);
  });

  it("phân biệt X và O bằng hình dạng", () => {
    const cells = empty(15);
    cells[0] = 0;
    cells[1] = 1;
    const svg = boardSvg({ ...base, cells });
    expect(svg.match(/class="mx"/g)).toHaveLength(1);
    expect(svg.match(/class="mo"/g)).toHaveLength(1);
  });

  it("đánh dấu nước vừa đi và làm mờ quân thường khi có chuỗi thắng", () => {
    const cells = empty(15);
    const line = [0, 1, 2, 3, 4];
    for (const i of line) cells[i] = 0;
    cells[20] = 1;
    const svg = boardSvg({ ...base, cells, last: 4, winLine: line });
    expect(svg).toContain('class="last"');
    expect(svg).toContain('<g class="dim">');
    expect(svg.match(/class="win"/g)).toHaveLength(5);
    expect(svg).toContain('class="winline"');
  });

  it("quân xem trước vẽ thêm ô chọn, quân mờ và dải ngang dọc", () => {
    const svg = boardSvg({ ...base, preview: { index: 16, mark: 1, band: true } });
    expect(svg).toContain('class="sel"');
    expect(svg).toContain('class="ghost"');
    expect(svg.match(/class="band"/g)).toHaveLength(2);
    expect(boardSvg({ ...base, preview: { index: 16, mark: 1, band: false } })).not.toContain('class="band"');
  });
});
