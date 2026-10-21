// Lấy địa chỉ IP mạng nội bộ (LAN) của máy chủ để tạo link mời và mã QR cho các thiết bị khác trong cùng mạng Wi-Fi.
import { networkInterfaces } from "node:os";

export interface InterfaceInfo {
  address: string;
  family: string | number;
  internal: boolean;
}

export type NetworkInterfaceMap = Record<string, InterfaceInfo[] | undefined>;

function adapterPriority(name: string): number {
  if (/virtual|vbox|vmware|vethernet|loopback/i.test(name)) return 0;
  if (/wi-?fi|wlan|ethernet|eth|en\d/i.test(name)) return 3;
  return 1;
}

function isLanIpv4(net: InterfaceInfo): boolean {
  return (net.family === 4 || net.family === "IPv4") && !net.internal;
}

/**
 * Chọn địa chỉ IPv4 nội bộ tốt nhất từ danh sách network interfaces.
 * Ưu tiên các cổng vật lý (Wi-Fi, Ethernet) trước các cổng ảo (VirtualBox, WSL, vEthernet).
 */
export function pickLanIp(nets: NetworkInterfaceMap): string | null {
  const candidates: { address: string; priority: number }[] = [];
  for (const [name, list] of Object.entries(nets)) {
    if (!list) continue;
    const priority = adapterPriority(name);
    for (const net of list) {
      if (isLanIpv4(net)) candidates.push({ address: net.address, priority });
    }
  }
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0]?.address ?? null;
}

export function getLanIp(): string | null {
  return pickLanIp(networkInterfaces() as NetworkInterfaceMap);
}
