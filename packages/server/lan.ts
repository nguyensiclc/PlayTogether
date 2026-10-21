// IP mạng LAN của máy chạy server, để link mời dùng được từ điện thoại cùng Wi-Fi.

import { networkInterfaces } from "node:os";

/** IPv4 riêng tư (192.168.x.x, 10.x.x.x, 172.16–31.x.x) đầu tiên không phải loopback; null nếu không có mạng */
export function lanAddress(): string | null {
  const isPrivate = (ip: string) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
  const all = Object.values(networkInterfaces()).flatMap((list) => list ?? []);
  const v4 = all.filter((i) => i.family === "IPv4" && !i.internal);
  return (v4.find((i) => isPrivate(i.address)) ?? v4[0])?.address ?? null;
}
