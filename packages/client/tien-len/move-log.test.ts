import { describe, expect, it } from "vitest";
import { logEntries } from "./move-log.ts";

const name = (s: number): string => ["An", "Bình", "Chi"][s] ?? "?";

describe("logEntries", () => {
  it("đánh bộ, chặt, bỏ lượt, hết bài, vòng mới", () => {
    const rows = logEntries(
      [
        { type: "play", seat: 0, cards: [16, 17], kind: "doi", cut: false },
        { type: "pass", seat: 1 },
        { type: "play", seat: 2, cards: [48, 49, 50, 51], kind: "tuQuy", cut: true },
        { type: "out", seat: 2, rank: 1 },
        { type: "newRound", leader: 0 },
      ],
      7,
      name,
    );
    expect(rows.map((r) => `${r.who}: ${r.text}`)).toEqual([
      "An: đánh đôi 7♠ 7♣",
      "Bình: bỏ lượt",
      "Chi: chặt bằng tứ quý 2♠ 2♣ 2♦ 2♥",
      "Chi: hết bài, về nhất",
      "An: đi tự do (vòng mới)",
    ]);
    expect(rows[2]?.ev).toBe("Chặt!");
    expect(rows.every((r) => r.n === 7)).toBe(true);
  });

  it("người rời ván", () => {
    expect(logEntries([{ type: "left", seat: 1 }], 3, name)[0]?.text).toBe("đã rời ván");
  });
});
