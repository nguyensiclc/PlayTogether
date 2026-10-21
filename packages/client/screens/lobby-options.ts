// Phần "Tuỳ chọn" trong phòng chờ của từng game (docs/design/nen-tang/phong-cho*.html, docs/design/caro).
// "Thời gian mỗi lượt" ẩn tới M4 (Q22d).

import type { GameId, PublicRoom } from "@playtogether/protocol";

export interface LobbyOptions {
  /** HTML của các tuỳ chọn; `editable` = người xem là chủ phòng */
  html(room: PublicRoom, editable: boolean): string;
  /** Đọc tuỳ chọn từ nút `[data-act="opt"]` vừa bấm; server kiểm tra lại bằng engine (parseOptions) */
  read(el: HTMLElement): object;
}

/** Nút chọn một trong nhiều giá trị */
function segButton(key: string, value: string, label: string, on: boolean, disabled: boolean): string {
  return `<button type="button" class="seg-btn${on ? " on" : ""}" data-act="opt" data-key="${key}" data-value="${value}" aria-pressed="${on}"${disabled ? " disabled" : ""}>${label}</button>`;
}

/** Hàng có công tắc bật/tắt */
function toggleRow(key: string, label: string, hint: string, on: boolean, disabled: boolean): string {
  return `<div class="opt-row inline">
      <div><b>${label}</b><div class="small muted">${hint}</div></div>
      <button type="button" class="toggle${on ? " on" : ""}" role="switch" aria-checked="${on}" aria-label="${label}" data-act="opt" data-key="${key}" data-value="${!on}"${disabled ? " disabled" : ""}></button>
    </div>`;
}

const segRow = (label: string, buttons: string[]): string =>
  `<div class="opt-row"><b>${label}</b><div class="seg">${buttons.join("")}</div></div>`;

const oAnQuan: LobbyOptions = {
  html(room, editable) {
    if (room.gameId !== "o-an-quan") return "";
    const o = room.options;
    const off = !editable;
    const quan = [10, 5].map((v) => segButton("giaTriQuan", String(v), `${v} dân`, o.giaTriQuan === v, off));
    return [
      segRow("Giá trị quan", quan),
      toggleRow("camAnQuanNon", "Quan Già", "Chỉ ăn được ô quan có từ 5 dân", o.camAnQuanNon, off),
      toggleRow("latBan", "Lật bàn", "Người đi sau được đổi bên 1 lần", o.latBan, off),
    ].join("");
  },
  read(el) {
    const { key, value } = el.dataset;
    if (key === "giaTriQuan") return { giaTriQuan: value === "5" ? 5 : 10 };
    if (key === "camAnQuanNon" || key === "latBan") return { [key]: value === "true" };
    return {};
  },
};

const caro: LobbyOptions = {
  html(room, editable) {
    if (room.gameId !== "caro") return "";
    const o = room.options;
    const off = !editable;
    const sizes = [15, 19].map((v) => segButton("kichThuoc", String(v), `${v} × ${v}`, o.kichThuoc === v, off));
    return [
      segRow("Cỡ bàn", sizes),
      toggleRow("chanHaiDau", "Chặn 2 đầu", "5 quân bị chặn cả hai đầu thì chưa thắng", o.chanHaiDau, off),
    ].join("");
  },
  read(el) {
    const { key, value } = el.dataset;
    if (key === "kichThuoc") return { kichThuoc: value === "19" ? 19 : 15 };
    if (key === "chanHaiDau") return { chanHaiDau: value === "true" };
    return {};
  },
};

export const LOBBY_OPTIONS: Record<GameId, LobbyOptions> = { "o-an-quan": oAnQuan, caro };
