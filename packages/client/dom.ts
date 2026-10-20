// Tiện ích DOM dùng chung: tìm phần tử có kiểm tra, tạo phần tử, escape HTML (quy ước code mục 3, 6).

/** Tìm phần tử bắt buộc phải có. Không thấy thì ném lỗi rõ ràng thay vì dùng `!`. */
export function $<T extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Không tìm thấy phần tử: ${selector}`);
  return found;
}

export function create<K extends keyof HTMLElementTagNameMap>(tag: K, className = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escape chuỗi động trước khi đưa vào `innerHTML`. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

/** Hẹn giờ gỡ class hiệu ứng, theo phần tử và tên class */
const fxTimers = new WeakMap<HTMLElement, Map<string, number>>();

/** Gắn lại class hiệu ứng để animation CSS chạy lại từ đầu, tự gỡ sau `ms`. */
export function restartAnimation(node: HTMLElement, cls: string, ms: number): void {
  const timers = fxTimers.get(node) ?? new Map<string, number>();
  fxTimers.set(node, timers);
  clearTimeout(timers.get(cls));
  node.classList.remove(cls);
  void node.offsetWidth;
  node.style.setProperty("--fx-ms", `${Math.round(ms)}ms`);
  node.classList.add(cls);
  timers.set(
    cls,
    window.setTimeout(() => node.classList.remove(cls), ms),
  );
}
