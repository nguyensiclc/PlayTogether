// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { BoardDom } from "./board-dom.ts";

const noop = { onSquare: () => {}, onArrow: () => {} };

/** Vị trí lưới (cột, hàng) của từng ô, theo chỉ số 0..11 */
function placements(board: BoardDom): string[] {
  return Array.from({ length: 12 }, (_, i) => {
    const c = board.cell(i);
    return `${c.style.gridColumn}/${c.style.gridRow}`;
  });
}

describe("BoardDom — xếp ô lên lưới", () => {
  it("ô được xếp ngay khi vừa tạo, không cần gọi setPerspective (lỗi cũ: ô quan 0 và ô 7 nằm cùng một cột)", () => {
    const p = placements(new BoardDom(noop));
    expect(p.every((x) => !x.startsWith("/") && !x.endsWith("/"))).toBe(true);
    // Hai ô quan ở hai đầu và cao bằng cả hai hàng
    expect(p[0]).toBe("1/1 / span 2");
    expect(p[6]).toBe("7/1 / span 2");
    // Mỗi ô dân một vị trí riêng, nằm trong cột 2..6
    const cells = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11].map((i) => p[i]);
    expect(new Set(cells).size).toBe(10);
    expect(cells.every((x) => /^[2-6]\/[12]$/.test(x ?? ""))).toBe(true);
  });

  it("đổi bên ngồi dưới: hàng của bên đó xuống hàng 2, hai ô quan đổi đầu", () => {
    const board = new BoardDom(noop);
    board.setPerspective(1);
    const p = placements(board);
    expect(p[6]).toBe("1/1 / span 2");
    expect(p[0]).toBe("7/1 / span 2");
    expect([7, 8, 9, 10, 11].map((i) => p[i])).toEqual(["2/2", "3/2", "4/2", "5/2", "6/2"]);
    expect([5, 4, 3, 2, 1].map((i) => p[i])).toEqual(["2/1", "3/1", "4/1", "5/1", "6/1"]);
  });
});
