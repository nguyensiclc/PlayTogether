import { describe, expect, it } from "vitest";
import { clientIp, IpLimiter, isOriginAllowed, MAX_CONNECTIONS_PER_IP, MAX_HITS_PER_MINUTE } from "./ip-guard.ts";

const req = (xff: string | undefined, remote = "9.9.9.9") =>
  ({ headers: xff ? { "x-forwarded-for": xff } : {}, socket: { remoteAddress: remote } }) as never;

describe("clientIp", () => {
  it("chỉ tin X-Forwarded-For khi bật trustProxy", () => {
    expect(clientIp(req("1.2.3.4, 5.6.7.8"), true)).toBe("1.2.3.4");
    expect(clientIp(req("1.2.3.4"), false)).toBe("9.9.9.9");
    expect(clientIp(req(undefined), true)).toBe("9.9.9.9");
  });
});

describe("isOriginAllowed", () => {
  it("cho qua khi không có Origin, cùng tên miền, hoặc mạng cục bộ", () => {
    expect(isOriginAllowed(undefined, "x.com", [])).toBe(true);
    expect(isOriginAllowed("https://x.com", "x.com", [])).toBe(true);
    expect(isOriginAllowed("http://localhost:5173", "x.com", [])).toBe(true);
    expect(isOriginAllowed("http://192.168.1.5:5173", "x.com", [])).toBe(true);
  });
  it("chặn trang lạ, cho qua khi nằm trong danh sách cho phép", () => {
    expect(isOriginAllowed("https://evil.com", "x.com", [])).toBe(false);
    expect(isOriginAllowed("https://evil.com", "x.com", ["https://evil.com"])).toBe(true);
    expect(isOriginAllowed("không-phải-url", "x.com", [])).toBe(false);
  });
});

describe("IpLimiter", () => {
  it("giới hạn số kết nối đồng thời và cho mở lại sau khi đóng", () => {
    const l = new IpLimiter();
    for (let i = 0; i < MAX_CONNECTIONS_PER_IP; i++) expect(l.tryOpen("a")).toBe(true);
    expect(l.tryOpen("a")).toBe(false);
    expect(l.tryOpen("b")).toBe(true);
    l.release("a");
    expect(l.tryOpen("a")).toBe(true);
  });
  it("giới hạn số lần gọi mỗi phút và đếm lại khi sang phút mới", () => {
    const l = new IpLimiter();
    for (let i = 0; i < MAX_HITS_PER_MINUTE; i++) expect(l.allowHit("a", 0)).toBe(true);
    expect(l.allowHit("a", 1000)).toBe(false);
    expect(l.allowHit("a", 61_000)).toBe(true);
  });
});
