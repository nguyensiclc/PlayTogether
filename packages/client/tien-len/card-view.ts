// Lá bài dạng HTML (docs/tien-len/02-thiet-ke-ux.md mục 7): số và chất là chữ, hình khối do CSS (`.tl-card`).

import type { Card } from "@playtogether/engine/tien-len";
import { rankLabel, suitOf, suitSymbol } from "@playtogether/engine/tien-len";

/** Rô và Cơ màu đỏ, Bích và Chuồn màu đen */
export const isRed = (c: Card): boolean => suitOf(c) >= 2;

export interface CardOpts {
  /** Class thêm: "sel", "dim", "fresh"… */
  extra?: string;
  /** Là nút chạm được (lá trong tay); mặc định chỉ để xem */
  button?: boolean;
  selected?: boolean;
}

/** HTML một lá bài ngửa */
export function cardHtml(c: Card, o: CardOpts = {}): string {
  const cls = `tl-card ${isRed(c) ? "red" : "black"}${o.selected ? " sel" : ""}${o.extra ? ` ${o.extra}` : ""}`;
  const label = `${rankLabel(c)}${suitSymbol(c)}`;
  const inner = `<b class="rk">${rankLabel(c)}</b><i class="st">${suitSymbol(c)}</i><i class="big">${suitSymbol(c)}</i>`;
  if (o.button) {
    return `<button type="button" class="${cls}" data-card="${c}" aria-pressed="${o.selected === true}" aria-label="${label}">${inner}</button>`;
  }
  return `<span class="${cls}" role="img" aria-label="${label}">${inner}</span>`;
}

/** Mặt lưng lá bài (bài úp của đối thủ) */
export const backHtml = (extra = ""): string =>
  `<span class="tl-card back${extra ? ` ${extra}` : ""}" aria-hidden="true"></span>`;
