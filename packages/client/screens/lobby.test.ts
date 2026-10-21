import { describe, expect, it } from "vitest";
import { buildInviteLink } from "./lobby.ts";

describe("buildInviteLink — tạo link mời", () => {
  it("khi mở qua localhost và có LAN IP thì thay localhost bằng IP", () => {
    const loc = {
      hostname: "localhost",
      protocol: "http:",
      port: "3000",
      origin: "http://localhost:3000",
    };
    expect(buildInviteLink("ABCD", "192.168.1.25", loc)).toBe("http://192.168.1.25:3000/r/ABCD");
  });

  it("khi mở qua 127.0.0.1 và có LAN IP thì thay 127.0.0.1 bằng IP", () => {
    const loc = {
      hostname: "127.0.0.1",
      protocol: "http:",
      port: "5173",
      origin: "http://127.0.0.1:5173",
    };
    expect(buildInviteLink("WXYZ", "192.168.1.25", loc)).toBe("http://192.168.1.25:5173/r/WXYZ");
  });

  it("khi mở qua localhost nhưng chưa có LAN IP thì giữ location.origin", () => {
    const loc = {
      hostname: "localhost",
      protocol: "http:",
      port: "3000",
      origin: "http://localhost:3000",
    };
    expect(buildInviteLink("ABCD", null, loc)).toBe("http://localhost:3000/r/ABCD");
  });

  it("khi đã mở qua IP thật hoặc domain thì giữ nguyên origin", () => {
    const loc = {
      hostname: "192.168.1.25",
      protocol: "http:",
      port: "3000",
      origin: "http://192.168.1.25:3000",
    };
    expect(buildInviteLink("ABCD", "192.168.1.99", loc)).toBe("http://192.168.1.25:3000/r/ABCD");
  });

  it("khi mở qua domain thật (vd production) thì giữ nguyên domain", () => {
    const loc = {
      hostname: "playtogether.vn",
      protocol: "https:",
      port: "",
      origin: "https://playtogether.vn",
    };
    expect(buildInviteLink("ABCD", "192.168.1.25", loc)).toBe("https://playtogether.vn/r/ABCD");
  });
});
