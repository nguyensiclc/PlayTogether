import { indexOf } from "@playtogether/engine/co-tuong";
import { describe, expect, it } from "vitest";
import { describeMove } from "./move-log.ts";

describe("describeMove", () => {
  it("đếm cột và hàng từ 1, hàng 1 là hàng sau của Đỏ", () => {
    const log = describeMove(1, "Bạn", { kind: "phao", side: 0 }, indexOf(1, 7), indexOf(4, 7), null);
    expect(log).toEqual({ n: 1, who: "Bạn", text: "Pháo (2,3) → (5,3)" });
  });

  it("ghi quân bị ăn", () => {
    const log = describeMove(2, "Mèo", { kind: "xe", side: 1 }, indexOf(0, 0), indexOf(0, 3), { kind: "tot", side: 0 });
    expect(log.text).toBe("Xe (1,10) → (1,7) ăn Tốt");
  });
});
