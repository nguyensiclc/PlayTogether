// Phần chung của thẻ người chơi: avatar, tên, nhãn "(bạn)", viền vàng khi đến lượt, trạng thái mất kết nối.
// Mỗi game kế thừa và thêm phần riêng (kho điểm, quân đang cầm…); CSS `.player` nằm ở style.css.

import { $, create } from "../dom.ts";
import type { PlayerIdentity } from "./result-parts.ts";

export interface BaseCardState {
  /** Thẻ của "bạn" (người ngồi dưới) */
  you: boolean;
  /** Đang đến lượt: viền vàng */
  active: boolean;
  /** Mất kết nối: avatar mờ, hiện "Mất kết nối" thay cho phần chi tiết (Q22e) */
  offline: boolean;
}

export abstract class PlayerCardBase {
  readonly el: HTMLElement;
  private readonly avatar: HTMLElement;
  private readonly name: HTMLElement;
  private readonly you: HTMLElement;
  private readonly detail: HTMLElement;
  private readonly reconn: HTMLElement;

  /**
   * @param detailHtml dòng chi tiết dưới tên; phần tử gốc phải có thuộc tính `data-detail`
   * @param endHtml phần bên phải thẻ (điểm, biểu tượng quân…)
   */
  protected constructor(detailHtml: string, endHtml: string) {
    this.el = create("div", "player");
    this.el.innerHTML = `
      <span class="avatar"></span>
      <div class="info">
        <div class="name"><span data-name></span><span class="small muted" data-you> (bạn)</span></div>
        ${detailHtml}
        <div class="reconn" hidden>Mất kết nối</div>
      </div>
      ${endHtml}`;
    this.avatar = $(this.el, ".avatar");
    this.name = $(this.el, "[data-name]");
    this.you = $(this.el, "[data-you]");
    this.detail = $(this.el, "[data-detail]");
    this.reconn = $(this.el, ".reconn");
  }

  protected renderBase(who: PlayerIdentity, state: BaseCardState): void {
    this.avatar.className = `avatar ${who.avatarClass}${who.avatarUrl ? " pic" : ""}`;
    this.avatar.textContent = who.avatarUrl ? "" : who.initials;
    this.avatar.style.backgroundImage = who.avatarUrl ? `url(${who.avatarUrl})` : "";
    if (who.avatarUrl) this.avatar.setAttribute("aria-label", who.name);
    this.name.textContent = who.name;
    this.you.hidden = !state.you;
    this.el.classList.toggle("active", state.active);
    this.el.classList.toggle("offline", state.offline);
    this.detail.hidden = state.offline;
    this.reconn.hidden = !state.offline;
  }

  protected $<T extends HTMLElement | SVGElement = HTMLElement>(selector: string): T {
    return $(this.el, selector) as unknown as T;
  }
}
