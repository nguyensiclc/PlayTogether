// Hộp hỏi khi người cuối cùng rời phòng: rời đi thì phòng bị xoá khỏi server (không còn ai để giữ phòng).

import type { PublicRoom } from "@playtogether/protocol";
import { confirmBox } from "../game-ui/confirm-box.ts";

/** Số người đang là thành viên của phòng (ngồi ghế hoặc xem) */
export function memberCount(room: PublicRoom): number {
  return room.seats.filter((m) => m !== null).length + room.spectators.length;
}

/** Người cuối cùng rời thì phòng bị xoá (UX mục 6): phải xác nhận */
export function confirmDeleteRoom(): Promise<boolean> {
  return confirmBox({
    title: "Bạn là người cuối cùng trong phòng",
    body: "Rời đi thì phòng sẽ bị xoá và link mời không còn dùng được nữa.",
    cancel: "Ở lại",
    ok: "Rời và xoá phòng",
  });
}
