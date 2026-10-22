import { describe, expect, it } from "vitest";
import { avatarUrlOf } from "./avatars.ts";

describe("avatarUrlOf", () => {
  it("cùng tên luôn ra cùng một con, không phân biệt hoa thường và khoảng trắng đầu cuối", () => {
    expect(avatarUrlOf("Cò Trắng 42")).toBe(avatarUrlOf("  cò trắng 42 "));
  });

  it("các tên khác nhau phủ nhiều con khác nhau", () => {
    const urls = new Set(Array.from({ length: 200 }, (_, i) => avatarUrlOf(`Người ${i}`)));
    expect(urls.size).toBeGreaterThan(8);
    expect([...urls].every((u) => u !== "")).toBe(true);
  });
});
