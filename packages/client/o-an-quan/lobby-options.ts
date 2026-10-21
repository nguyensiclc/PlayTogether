// Tuỳ chọn phòng chờ của Ô ăn quan. "Thời gian mỗi lượt" ẩn tới M4 (Q22d).

import type { TargetScore } from "@playtogether/engine/o-an-quan";
import { segButton, segRow, toggleRow } from "../games/option-controls.ts";
import type { LobbyOptions } from "../games/types.ts";

/** Mốc điểm của chế độ Đấu trận (cộng dồn điểm nhiều ván); null = chơi từng ván */
const TARGET_SCORES: { value: TargetScore; label: string }[] = [
  { value: null, label: "Từng ván" },
  { value: 70, label: "70 điểm" },
  { value: 100, label: "100 điểm" },
  { value: 200, label: "200 điểm" },
  { value: 300, label: "300 điểm" },
  { value: 500, label: "500 điểm" },
];

function targetScoreRow(selected: TargetScore, disabled: boolean): string {
  const buttons = TARGET_SCORES.map((item) => {
    const value = item.value === null ? "null" : String(item.value);
    return segButton("targetScore", value, item.label, selected === item.value, disabled);
  }).join("");
  return `<div class="opt-row">
      <div><b>Mốc điểm thắng (Đấu trận)</b><div class="small muted">Cộng dồn điểm nhiều ván; chạm mốc là thắng</div></div>
      <div class="seg seg-grid">${buttons}</div>
    </div>`;
}

export const lobbyOptions: LobbyOptions = {
  html(room, editable) {
    if (room.gameId !== "o-an-quan") return "";
    const o = room.options;
    const off = !editable;
    const quan = [10, 5].map((v) => segButton("giaTriQuan", String(v), `${v} dân`, o.giaTriQuan === v, off));
    return [
      segRow("Giá trị quan", quan),
      targetScoreRow(o.targetScore, off),
      toggleRow("camAnQuanNon", "Quan Già", "Chỉ ăn được ô quan có từ 5 dân", o.camAnQuanNon, off),
      toggleRow("latBan", "Lật bàn", "Người đi sau được đổi bên 1 lần", o.latBan, off),
    ].join("");
  },
  read(el) {
    const { key, value } = el.dataset;
    if (key === "giaTriQuan") return { giaTriQuan: value === "5" ? 5 : 10 };
    if (key === "camAnQuanNon" || key === "latBan") return { [key]: value === "true" };
    if (key === "targetScore")
      return { targetScore: value === "null" || !value ? null : (Number(value) as TargetScore) };
    return {};
  },
};
