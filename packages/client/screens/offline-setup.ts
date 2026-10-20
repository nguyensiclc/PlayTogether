// Màn hình bắt đầu của chế độ chơi trên một máy (Q9, Q19). Không có thiết kế riêng, dùng token chung.

import type { Options } from "@playtogether/engine/o-an-quan";
import { $ } from "../dom.ts";
import { BACK_ICON } from "../icons.ts";

/** Một lựa chọn trên màn hình bắt đầu: tên input, các giá trị và cách đọc/ghi vào Options */
interface Choice {
  name: string;
  label: string;
  hint?: string;
  items: [value: string, text: string][];
  read: (options: Options) => string;
  write: (options: Options, value: string) => Options;
}

const CHOICES: Choice[] = [
  {
    name: "giaTriQuan",
    label: "Giá trị quan",
    items: [
      ["10", "10 dân"],
      ["5", "5 dân"],
    ],
    read: (o) => String(o.giaTriQuan),
    write: (o, v) => ({ ...o, giaTriQuan: v === "5" ? 5 : 10 }),
  },
  {
    name: "camAnQuanNon",
    label: "Quan Già",
    hint: "Bật: ô quan còn quan mà có dưới 5 dân thì không được ăn.",
    items: [
      ["off", "Tắt"],
      ["on", "Bật"],
    ],
    read: (o) => (o.camAnQuanNon ? "on" : "off"),
    write: (o, v) => ({ ...o, camAnQuanNon: v === "on" }),
  },
  {
    name: "latBan",
    label: "Lật bàn",
    hint: "Bật: sau nước đầu tiên, người đi sau được đổi bên một lần.",
    items: [
      ["off", "Tắt"],
      ["on", "Bật"],
    ],
    read: (o) => (o.latBan ? "on" : "off"),
    write: (o, v) => ({ ...o, latBan: v === "on" }),
  },
];

function choiceHtml(c: Choice): string {
  const radios = c.items
    .map(([value, text]) => `<label><input type="radio" name="${c.name}" value="${value}"><span>${text}</span></label>`)
    .join("");
  return `<div class="opt-row"><span><b>${c.label}</b></span><div class="seg">${radios}</div>${
    c.hint ? `<p class="hint">${c.hint}</p>` : ""
  }</div>`;
}

/** Vẽ màn hình bắt đầu với tuỳ chọn `options`; bấm Bắt đầu thì gọi `onStart` với tuỳ chọn đã chọn. */
export function showSetup(root: HTMLElement, options: Options, onStart: (chosen: Options) => void): void {
  root.innerHTML = `
    <div class="screen setup">
      <header class="topbar">
        <a class="icon-btn" href="/" aria-label="Về trang chủ">${BACK_ICON}</a>
        <div class="title">Ô ăn quan</div>
        <span class="icon-btn" aria-hidden="true"></span>
      </header>
      <h1>Chơi trên một máy</h1>
      <p class="note">Chơi hai người trên cùng một máy. Chơi qua link mời: sắp có.</p>
      <div class="card">${CHOICES.map(choiceHtml).join("")}</div>
      <button class="btn primary block" type="button" data-start>Bắt đầu</button>
    </div>`;
  for (const c of CHOICES) {
    $<HTMLInputElement>(root, `input[name=${c.name}][value="${c.read(options)}"]`).checked = true;
  }
  $(root, "[data-start]").addEventListener("click", () => {
    const chosen = CHOICES.reduce(
      (o, c) => c.write(o, $<HTMLInputElement>(root, `input[name=${c.name}]:checked`).value),
      options,
    );
    onStart(chosen);
  });
}
