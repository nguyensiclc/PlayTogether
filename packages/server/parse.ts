// Kiểm tra message client gửi lên trước khi xử lý (kỹ thuật mục 10): chỉ nhận đúng kiểu và đúng định dạng.

import type { ClientMessage } from "@playtogether/protocol";
import { isGameId } from "@playtogether/protocol";

/** clientId do client tự sinh (UUID): chỉ chữ, số, gạch ngang, 8–64 ký tự */
const CLIENT_ID_RE = /^[A-Za-z0-9-]{8,64}$/;

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);

/** Cách đọc từng loại message; trả về null nếu sai định dạng */
const PARSERS: Record<ClientMessage["type"], (m: Raw) => ClientMessage | null> = {
  hello: (m) =>
    typeof m.clientId === "string" && CLIENT_ID_RE.test(m.clientId) && typeof m.name === "string"
      ? { type: "hello", clientId: m.clientId, name: m.name }
      : null,
  createRoom: (m) =>
    isGameId(m.gameId)
      ? { type: "createRoom", gameId: m.gameId, ...(isObject(m.options) ? { options: m.options } : {}) }
      : null,
  joinRoom: (m) => (typeof m.code === "string" ? { type: "joinRoom", code: m.code } : null),
  takeSeat: (m) => (isInt(m.seat) ? { type: "takeSeat", seat: m.seat } : null),
  leaveSeat: () => ({ type: "leaveSeat" }),
  // Giá trị từng tuỳ chọn do engine kiểm tra (parseOptions)
  setOptions: (m) => (isObject(m.options) ? { type: "setOptions", options: m.options } : null),
  start: () => ({ type: "start" }),
  // Hình dạng của nước đi tuỳ game nên do module game kiểm tra ở Room.move (parseMove)
  move: (m) => (isObject(m.move) && isInt(m.actionNo) ? { type: "move", move: m.move, actionNo: m.actionNo } : null),
  rematch: () => ({ type: "rematch" }),
  leaveRoom: () => ({ type: "leaveRoom" }),
};

/** Đọc một message dạng chuỗi JSON. Sai JSON, sai loại hoặc sai định dạng thì trả về null. */
export function parseClientMessage(text: string): ClientMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(data) || typeof data.type !== "string" || !Object.hasOwn(PARSERS, data.type)) return null;
  return PARSERS[data.type as ClientMessage["type"]](data);
}
