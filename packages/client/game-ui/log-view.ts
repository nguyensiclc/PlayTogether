// HTML của nhật ký ván: danh sách đầy đủ (cột phải, desktop) và dòng mô tả nước vừa đi (dưới bàn, điện thoại).

import { escapeHtml } from "../dom.ts";

/** Một dòng nhật ký ván; mọi game dùng chung dạng này */
export interface LogEntry {
  /** Số thứ tự nước đi trong ván */
  n: number;
  who: string;
  text: string;
  /** Điểm vừa ăn, hiện "+N" màu xanh */
  gain?: number;
  /** Sự kiện đặc biệt, hiện màu đỏ (vd "−5" khi bù dân) */
  ev?: string;
}

/** Danh sách nhật ký, nước mới nhất ở trên */
export function logListHtml(log: readonly LogEntry[]): string {
  if (log.length === 0) return `<li class="empty">Chưa có nước đi nào.</li>`;
  return [...log].reverse().map(logItemHtml).join("");
}

function logItemHtml(e: LogEntry): string {
  const who = e.who ? `<span class="who">${escapeHtml(e.who)}</span> ` : "";
  const tail = e.gain ? `<span class="g">+${e.gain}</span>` : e.ev ? `<span class="ev">${escapeHtml(e.ev)}</span>` : "";
  return `<li><span class="n">${e.n}</span><div>${who}${escapeHtml(e.text)}</div>${tail}</li>`;
}

/** Dòng mô tả nước vừa đi dưới bàn; rỗng khi chưa có nước nào */
export function logLineHtml(e: LogEntry | undefined): string {
  if (!e) return "";
  const who = e.who ? `<b>${escapeHtml(e.who)}</b> ` : "";
  const gain = e.gain ? ` <span class="g">+${e.gain}</span>` : "";
  return `${who}${escapeHtml(e.text)}${gain}`;
}
