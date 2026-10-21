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

  it("khi rải thêm sỏi vào ô, các viên sỏi cũ giữ nguyên vị trí, chỉ thêm viên mới", () => {
    const board = new BoardDom(noop);
    const cellEl = board.cell(3);

    // Bắt đầu với 5 viên ở ô 3
    const view5 = {
      dan: [0, 5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5],
      quan: [true, true] as [boolean, boolean],
      captured: [
        { dan: 0, quan: 0 },
        { dan: 0, quan: 0 },
      ] as [{ dan: number; quan: number }, { dan: number; quan: number }],
      controller: [0, 1] as [number, number],
      buDanCount: [0, 0] as [number, number],
      hand: null,
    };
    board.render(view5);

    const stones5 = Array.from(cellEl.querySelectorAll<HTMLElement>(".stone:not(.big)"));
    expect(stones5.length).toBe(5);
    const pos5 = stones5.map((s) => ({ left: s.style.left, top: s.style.top }));

    // Rải thêm 1 viên vào ô 3 (thành 6 viên) khi đang rải
    const view6 = { ...view5, dan: [0, 5, 5, 6, 5, 5, 0, 5, 5, 5, 5, 5], hand: { at: 3, n: 2 } };
    board.render(view6);

    const stones6 = Array.from(cellEl.querySelectorAll<HTMLElement>(".stone:not(.big)"));
    expect(stones6.length).toBe(6);

    // 5 viên ban đầu phải giữ nguyên tuyệt đối vị trí
    for (let k = 0; k < 5; k++) {
      expect(stones6[k]?.style.left).toBe(pos5[k]?.left);
      expect(stones6[k]?.style.top).toBe(pos5[k]?.top);
    }
    // Viên thứ 6 là viên mới được thêm vào, có class drop-in và new-stone (màu đỏ)
    expect(stones6[5]?.classList.contains("drop-in")).toBe(true);
    expect(stones6[5]?.classList.contains("new-stone")).toBe(true);

    // Khi clearNewStones: toàn bộ sỏi đỏ chuyển về trắng
    board.clearNewStones();
    expect(stones6[5]?.classList.contains("new-stone")).toBe(false);
  });

  it("bàn tay hiển thị số lượng sỏi khi có view.hand", () => {
    const board = new BoardDom(noop);
    const view = {
      dan: [0, 5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5],
      quan: [true, true] as [boolean, boolean],
      captured: [
        { dan: 0, quan: 0 },
        { dan: 0, quan: 0 },
      ] as [{ dan: number; quan: number }, { dan: number; quan: number }],
      controller: [0, 1] as [number, number],
      buDanCount: [0, 0] as [number, number],
      hand: { at: 3, n: 4 },
    };
    board.render(view);

    const handEl = board.el.querySelector<HTMLElement>(".hand");
    const badgeEl = board.el.querySelector<HTMLElement>(".hand-badge");
    expect(handEl?.hidden).toBe(false);
    expect(badgeEl?.textContent).toBe("4");
    expect(badgeEl?.hidden).toBe(false);

    // Khi n = 0 (vừa rải viên cuối)
    board.render({ ...view, hand: { at: 3, n: 0 } });
    expect(handEl?.hidden).toBe(false);
    expect(badgeEl?.hidden).toBe(true);

    // Khi hand = null (hết lượt / kết thúc)
    board.render({ ...view, hand: null });
    expect(handEl?.hidden).toBe(true);
  });
});
