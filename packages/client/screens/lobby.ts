// Phòng chờ (docs/design/nen-tang/phong-cho*.html, UX mục 2.3, Q22): link mời, QR, ghế, người xem, tuỳ chọn, bắt đầu.

import type { SeatId } from "@playtogether/engine";
import type { PublicMember, PublicRoom, You } from "@playtogether/protocol";
import { roomPath } from "@playtogether/protocol";
import { escapeHtml } from "../dom.ts";
import { GAME_INFO } from "../games.ts";
import { BACK_ICON } from "../icons.ts";
import { inviteOrigin } from "../invite-origin.ts";
import { qrSvg } from "../qr.ts";
import { showRules } from "../rules/rules-dialog.ts";
import { LOBBY_OPTIONS } from "./lobby-options.ts";
import { avatarClassOf, initialsOf } from "./room-players.ts";

export interface LobbyActions {
  takeSeat(seat: SeatId): void;
  setOptions(options: object): void;
  start(): void;
  leave(): void;
}

const SHARE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13"/></svg>';
const QR_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v1M14 20h1M18 18h3v3"/></svg>';
export class LobbyView {
  private readonly root: HTMLElement;
  private readonly actions: LobbyActions;
  private room: PublicRoom | null = null;
  private you: You | null = null;
  private qrOpen = false;
  private copied = false;

  /** Tự tạo phần tử riêng trong `host`: khi màn hình khác thay chỗ, bộ lắng nghe cũng mất theo */
  constructor(host: HTMLElement, actions: LobbyActions) {
    this.root = document.createElement("div");
    host.replaceChildren(this.root);
    this.actions = actions;
    // Một bộ lắng nghe cho cả màn hình, vì nội dung vẽ lại mỗi lần phòng thay đổi
    this.root.addEventListener("click", (e) => this.onClick(e));
  }

  render(room: PublicRoom, you: You): void {
    this.room = room;
    this.you = you;
    const isHost = room.hostId === you.memberId;
    const game = GAME_INFO[room.gameId];
    const link = `${inviteOrigin()}${roomPath(room.code)}`;
    const seated = room.seats.filter((m) => m !== null).length;
    this.root.innerHTML = `
      <div class="screen lobby">
        <header class="topbar lobby-top">
          <button class="icon-btn mobile-only" type="button" data-act="leave" aria-label="Rời phòng">${BACK_ICON}</button>
          <span class="logo desk-only"><span class="logo-mark"><i></i></span>PlayTogether</span>
          <div class="title mobile-only">Phòng chờ</div>
          <div class="spacer desk-only"></div>
          <button class="btn sm desk-only" type="button" data-act="leave">Rời phòng</button>
          <span class="icon-btn mobile-only" aria-hidden="true"></span>
        </header>
        <div class="game-head">
          <span class="mini">${game.icon}</span>
          <div><h2>${game.name}</h2><div class="code-big"><span class="desk-only">Phòng chờ · </span>Mã phòng <b>${room.code}</b></div></div>
          <button class="btn sm" type="button" data-act="rules" style="margin-left:auto">📖 Luật chơi</button>
        </div>
        <div class="lobby-cols">
          <div class="lobby-main">
            <div class="section-head"><h2>Người chơi</h2><span class="small muted">${seated}/${room.seats.length}${seated === room.seats.length ? " · đủ người" : ""}</span></div>
            <section class="card seats">${room.seats.map((m, seat) => this.seatHtml(m, seat, room, you)).join('<span class="vs desk-only">VS</span>')}</section>
            ${spectatorsHtml(room.spectators)}
            <div class="section-head"><h2>Tuỳ chọn</h2><span class="small muted">${isHost ? "Bạn là chủ phòng" : "Chủ phòng chỉnh"}</span></div>
            <section class="card opts">${LOBBY_OPTIONS[room.gameId].html(room, isHost)}</section>
          </div>
          <aside class="lobby-side">
            <section class="card invite">
              <h3>Mời bạn bè vào chơi</h3>
              <div class="link"><span>${escapeHtml(link.replace(/^https?:\/\//, ""))}</span><button class="btn sm" type="button" data-act="copy">${this.copied ? "Đã chép" : "Sao chép"}</button></div>
              <div class="row mobile-only">
                ${"share" in navigator ? `<button class="btn share" type="button" data-act="share">${SHARE_ICON}Chia sẻ</button>` : ""}
                <button class="btn" type="button" data-act="qr" aria-expanded="${this.qrOpen}">${QR_ICON}Mã QR</button>
              </div>
              <div class="qr${this.qrOpen ? " open" : ""}">${qrSvg(link)}<p class="small">Quét bằng camera điện thoại để vào phòng. Hoặc đọc mã <b>${room.code}</b> cho bạn nhập ở trang chủ.</p></div>
              <p class="tiny note mobile-only">“Chia sẻ” mở bảng chia sẻ của điện thoại (Zalo, Messenger…).</p>
            </section>
            <div class="cta">${this.startHtml(room, isHost, seated)}</div>
          </aside>
        </div>
      </div>`;
  }

  private seatHtml(m: PublicMember | null, seat: SeatId, room: PublicRoom, you: You): string {
    if (!m) {
      // Chỉ người đang xem mới cần nút ngồi vào ghế trống (UX mục 2.3)
      const canSit = you.seat === null;
      return `<div class="seat waiting">
        <span class="avatar empty">${seat + 1}</span>
        <div class="who"><b class="dots">Đang chờ bạn bè</b><span class="small">Ghế ${seat + 1} · gửi link để mời</span></div>
        ${canSit ? `<button class="btn sm" type="button" data-act="sit" data-seat="${seat}">Ngồi đây</button>` : ""}
      </div>`;
    }
    const me = m.id === you.memberId;
    const badge = !m.connected
      ? '<span class="badge offline">Mất kết nối</span>'
      : m.id === room.hostId
        ? '<span class="badge host">Chủ phòng</span>'
        : '<span class="badge live">● Đã vào</span>';
    return `<div class="seat">
      <span class="avatar ${avatarClassOf(seat)}">${escapeHtml(initialsOf(m.name))}</span>
      <div class="who"><b>${escapeHtml(m.name)}${me ? ' <span class="small muted">(bạn)</span>' : ""}</b><span class="small muted">Ghế ${seat + 1}</span></div>
      ${badge}
    </div>`;
  }

  private startHtml(room: PublicRoom, isHost: boolean, seated: number): string {
    const missing = room.seats.length - seated;
    if (!isHost) return `<button class="btn block" type="button" disabled>Chờ chủ phòng bắt đầu</button>`;
    if (missing > 0)
      return `<button class="btn block" type="button" disabled>Cần thêm ${missing} người để bắt đầu</button>`;
    const first =
      room.nextFirst === null
        ? "Người đi trước được chọn ngẫu nhiên khi bắt đầu"
        : `${escapeHtml(room.seats[room.nextFirst]?.name ?? "")} đi trước (thua ván trước)`;
    return `<button class="btn primary block" type="button" data-act="start">Bắt đầu ván</button><p class="small muted">${first}</p>`;
  }

  private onClick(e: Event): void {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (!el || !this.room || !this.you) return;
    const act = el.dataset.act;
    if (act === "leave") this.actions.leave();
    else if (act === "rules") showRules(this.room.gameId);
    else if (act === "start") this.actions.start();
    else if (act === "sit") this.actions.takeSeat(Number(el.dataset.seat));
    else if (act === "opt") this.actions.setOptions(LOBBY_OPTIONS[this.room.gameId].read(el));
    else if (act === "copy") void this.copyLink();
    else if (act === "share") void this.share();
    else if (act === "qr") {
      this.qrOpen = !this.qrOpen;
      this.render(this.room, this.you);
    }
  }

  private async copyLink(): Promise<void> {
    if (!this.room || !this.you) return;
    await copyText(`${inviteOrigin()}${roomPath(this.room.code)}`);
    this.copied = true;
    this.render(this.room, this.you);
  }

  /** Web Share API: mở bảng chia sẻ của điện thoại (Q22j) */
  private async share(): Promise<void> {
    if (!this.room) return;
    try {
      await navigator.share({
        title: `Chơi ${GAME_INFO[this.room.gameId].name}`,
        text: `Vào chơi ${GAME_INFO[this.room.gameId].name} với mình, phòng ${this.room.code}`,
        url: `${inviteOrigin()}${roomPath(this.room.code)}`,
      });
    } catch {
      // Người dùng đóng bảng chia sẻ: không cần làm gì
    }
  }
}

function spectatorsHtml(list: PublicMember[]): string {
  if (list.length === 0) return "";
  const names = list.map((m) => escapeHtml(m.name)).join(", ");
  const avatars = list.map((m) => `<span class="avatar sm av2">${escapeHtml(initialsOf(m.name))}</span>`).join("");
  return `<div class="spect small muted">${avatars}<span>${names} đang xem</span></div>`;
}

/** Chép vào clipboard. Trang mở bằng http qua LAN không có navigator.clipboard, nên có cách dự phòng. */
async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
}
