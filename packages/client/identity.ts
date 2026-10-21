// Danh tính trên máy này (kỹ thuật mục 6): clientId bí mật, nickname, phòng gần đây. Lưu trong localStorage.

import type { GameId } from "@playtogether/protocol";
import { normalizeName } from "@playtogether/protocol";

const KEY = { clientId: "pt.clientId", name: "pt.name", recent: "pt.recentRooms" };
/** Số phòng gần đây giữ lại */
const MAX_RECENT = 5;

const ANIMALS = ["Cò", "Mèo", "Sóc", "Cá", "Sáo", "Nai", "Thỏ", "Gà", "Cáo", "Rùa", "Vịt", "Khỉ"];
const TRAITS = ["Trắng", "Mun", "Nâu", "Vàng", "Xám", "Nhỏ", "Lém", "Lanh", "Hồng", "Đốm"];

/** localStorage có thể bị chặn (chế độ riêng tư); khi đó coi như chưa lưu gì */
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Không lưu được thì lần sau hỏi lại, không ảnh hưởng ván đang chơi
  }
}

/**
 * Định danh bí mật để vào lại đúng ghế. Dùng getRandomValues vì randomUUID chỉ có ở HTTPS/localhost,
 * mà điện thoại mở qua địa chỉ LAN (http://192.168…) thì không phải.
 */
export function getClientId(): string {
  const saved = read(KEY.clientId);
  if (saved) return saved;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const id = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  write(KEY.clientId, id);
  return id;
}

export function getName(): string | null {
  const saved = read(KEY.name);
  return saved ? normalizeName(saved) : null;
}

export function setName(name: string): string | null {
  const clean = normalizeName(name);
  if (clean) write(KEY.name, clean);
  return clean;
}

/** Tên ngẫu nhiên kiểu "Cò Trắng 42" (UX mục 2.1) */
export function randomName(rng: () => number = Math.random): string {
  const pick = (list: string[]) => list[Math.floor(rng() * list.length)] ?? "";
  const withNumber = rng() < 0.5;
  return `${pick(ANIMALS)} ${pick(TRAITS)}${withNumber ? ` ${Math.floor(rng() * 90) + 10}` : ""}`;
}

export interface RecentRoom {
  code: string;
  gameId: GameId;
  /** Tên những người khác trong phòng */
  with: string[];
  at: number;
}

export function recentRooms(): RecentRoom[] {
  try {
    const list = JSON.parse(read(KEY.recent) ?? "[]") as unknown;
    return Array.isArray(list) ? (list as RecentRoom[]).filter((r) => typeof r?.code === "string") : [];
  } catch {
    return [];
  }
}

/** Ghi nhớ phòng vừa vào, mới nhất lên đầu */
export function rememberRoom(room: RecentRoom): void {
  const rest = recentRooms().filter((r) => r.code !== room.code);
  write(KEY.recent, JSON.stringify([room, ...rest].slice(0, MAX_RECENT)));
}
