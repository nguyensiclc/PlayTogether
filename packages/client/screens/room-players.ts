// Danh tính hiển thị của người chơi trong phòng: tên, chữ trong avatar, màu avatar theo ghế.

import type { SeatId } from "@playtogether/engine";
import type { PublicRoom } from "@playtogether/protocol";
import type { PlayerIdentity } from "../game-ui/result-parts.ts";

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

/** Người ngồi ghế `seat` trong phòng; ghế trống thì hiện "Ghế n" */
export function identityInRoom(room: PublicRoom, seat: SeatId): PlayerIdentity {
  const name = room.seats[seat]?.name ?? `Ghế ${seat + 1}`;
  return { name, initials: initialsOf(name), avatarClass: avatarClassOf(seat) };
}

/** Ghế của thành viên có `id` công khai; null nếu đang xem hoặc không có */
export function seatOfMember(room: PublicRoom, memberId: string): SeatId | null {
  const seat = room.seats.findIndex((m) => m?.id === memberId);
  return seat >= 0 ? seat : null;
}
