// Danh tính hiển thị của người chơi trong phòng: tên, chữ trong avatar, màu avatar theo ghế.

import type { SeatId } from "@playtogether/engine";
import type { PublicRoom } from "@playtogether/protocol";
import { avatarUrlOf } from "../avatars.ts";
import { avatarHtml, type PlayerIdentity } from "../game-ui/result-parts.ts";

/** Màu avatar theo ghế (av1 cho ghế 1, av3 cho ghế 2, như mockup) */
const AVATAR_BY_SEAT = ["av1", "av3"] as const;

/** Chữ cái đầu của tối đa hai từ đầu tiên: "Cò Trắng 42" → "CT" */
export function initialsOf(name: string): string {
  const letters = name
    .split(" ")
    .filter((w) => /\p{L}/u.test(w))
    .slice(0, 2)
    .map((w) => [...w][0] ?? "");
  return letters.join("").toUpperCase() || "?";
}

export function avatarClassOf(seat: SeatId | null): string {
  return (seat !== null && AVATAR_BY_SEAT[seat]) || "av2";
}

/** HTML avatar của người tên `name` ngồi ghế `seat` (null = người xem); `extra` là class thêm (sm…) */
export function avatarOfName(name: string, seat: SeatId | null, extra = ""): string {
  const who = { name, initials: initialsOf(name), avatarClass: avatarClassOf(seat), avatarUrl: avatarUrlOf(name) };
  return avatarHtml(who, extra);
}

/** Người ngồi ghế `seat` trong phòng; ghế trống thì hiện "Ghế n" */
export function identityInRoom(room: PublicRoom, seat: SeatId): PlayerIdentity {
  const m = room.seats[seat];
  const name = m?.name ?? `Ghế ${seat + 1}`;
  const initials = m?.isBot ? "🤖" : initialsOf(name);
  const avatarUrl = m && !m.isBot ? avatarUrlOf(name) : undefined;
  return { name, initials, avatarClass: avatarClassOf(seat), avatarUrl };
}

/** Ghế của thành viên có `id` công khai; null nếu đang xem hoặc không có */
export function seatOfMember(room: PublicRoom, memberId: string): SeatId | null {
  const seat = room.seats.findIndex((m) => m?.id === memberId);
  return seat >= 0 ? seat : null;
}
