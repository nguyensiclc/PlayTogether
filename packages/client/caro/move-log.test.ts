import { describe, expect, it } from "vitest";
import { describePlace } from "./move-log.ts";

describe("describePlace", () => {
  it("đếm cột và hàng từ 1, kèm ký hiệu quân", () => {
    expect(describePlace(1, "Bạn", 0, 10, 5)).toEqual({ n: 1, who: "Bạn", text: "đặt ✕ vào cột 11, hàng 6" });
    expect(describePlace(2, "Mèo Mun", 1, 0, 0).text).toBe("đặt ◯ vào cột 1, hàng 1");
  });
});
