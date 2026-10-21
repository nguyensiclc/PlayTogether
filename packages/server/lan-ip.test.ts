import { describe, expect, it } from "vitest";
import { getLanIp, type NetworkInterfaceMap, pickLanIp } from "./lan-ip.ts";

describe("pickLanIp — chọn IP nội bộ tốt nhất", () => {
  it("bỏ qua IP nội bộ (internal) và IPv6", () => {
    const nets: NetworkInterfaceMap = {
      lo: [
        { address: "127.0.0.1", family: "IPv4", internal: true },
        { address: "::1", family: "IPv6", internal: true },
      ],
      eth0: [{ address: "fe80::1", family: "IPv6", internal: false }],
    };
    expect(pickLanIp(nets)).toBeNull();
  });

  it("ưu tiên card Wi-Fi hoặc Ethernet trước card ảo", () => {
    const nets: NetworkInterfaceMap = {
      vEthernet: [{ address: "172.17.0.1", family: "IPv4", internal: false }],
      VirtualBox: [{ address: "192.168.56.1", family: "IPv4", internal: false }],
      "Wi-Fi": [{ address: "192.168.1.15", family: "IPv4", internal: false }],
    };
    expect(pickLanIp(nets)).toBe("192.168.1.15");
  });

  it("chọn Ethernet khi không có Wi-Fi", () => {
    const nets: NetworkInterfaceMap = {
      Ethernet: [{ address: "192.168.1.25", family: "IPv4", internal: false }],
      "VMware Network": [{ address: "192.168.100.1", family: "IPv4", internal: false }],
    };
    expect(pickLanIp(nets)).toBe("192.168.1.25");
  });

  it("trả về null khi danh sách rỗng", () => {
    expect(pickLanIp({})).toBeNull();
  });

  it("getLanIp() hoạt động trên máy thật mà không ném lỗi", () => {
    const ip = getLanIp();
    // Trên máy dev có kết nối mạng thì ip là chuỗi dạng x.x.x.x hoặc null nếu ngắt mạng
    if (ip !== null) {
      expect(ip).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
    }
  });
});
