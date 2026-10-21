// Phòng chờ (docs/design/nen-tang/phong-cho*.html, UX mục 2.3, Q22): link mời, QR, ghế, người xem, tuỳ chọn, bắt đầu.

import type { SeatId } from "@playtogether/engine";
import type { Options, TargetScore } from "@playtogether/engine/o-an-quan";
import type { PublicMember, PublicRoom, You } from "@playtogether/protocol";
import { roomPath } from "@playtogether/protocol";
import { escapeHtml } from "../dom.ts";
import { BACK_ICON } from "../icons.ts";
import { qrSvg } from "../qr.ts";
import { avatarClassOf, initialsOf } from "./room-players.ts";

export interface LobbyActions {
  takeSeat(seat: SeatId): void;
  setOptions(options: Partial<Options>): void;
  start(): void;
  leave(): void;
}

const SHARE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13"/></svg>';
const QR_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v1M14 20h1M18 18h3v3"/></svg>';
const GAME_ICON =
  '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="3" y="12" width="34" height="16" rx="8" fill="#8a5a2e"/><g fill="#eee6d4"><circle cx="13" cy="17" r="2"/><circle cx="20" cy="17" r="2"/><circle cx="27" cy="17" r="2"/><circle cx="13" cy="23" r="2"/><circle cx="20" cy="23" r="2"/><circle cx="27" cy="23" r="2"/></g></svg>';

/** Tuỳ chọn bật/tắt hiển thị ở phòng chờ; "Thời gian mỗi lượt" ẩn tới M4 (Q22d) */
const TOGGLES: { key: "camAnQuanNon" | "latBan"; label: string; hint: string }[] = [
  { key: "camAnQuanNon", label: "Quan Già", hint: "Chỉ ăn được ô quan có từ 5 dân" },
  { key: "latBan", label: "Lật bàn", hint: "Người đi sau được đổi bên 1 lần" },
];

const TARGET_SCORES: { value: TargetScore; label: string }[] = [
  { value: null, label: "Từng ván" },
  { value: 70, label: "70 điểm" },
  { value: 100, label: "100 điểm" },
  { value: 200, label: "200 điểm" },
  { value: 300, label: "300 điểm" },
  { value: 500, label: "500 điểm" },
];

const LAN_IP_KEY = "playtogether:lanIp";

export function getStoredLanIp(): string | null {
  try {
    return localStorage.getItem(LAN_IP_KEY);
  } catch {
    return null;
  }
}

export function setStoredLanIp(ip: string): void {
  try {
    localStorage.setItem(LAN_IP_KEY, ip);
  } catch {
    // Không làm gì nếu localStorage bị chặn
  }
}

export async function fetchLanIp(): Promise<string | null> {
  try {
    const res = await fetch("/api/lan-ip");
    if (!res.ok) return null;
    const data = (await res.json()) as { lanIp?: string | null };
    return data.lanIp ?? null;
  } catch {
    return null;
  }
}

/**
 * Xây dựng link mời vào phòng.
 * Nếu máy mở bằng localhost / 127.0.0.1, tự động thay bằng IP nội bộ để bạn bè cùng mạng Wi-Fi/LAN vào được.
 */
export function buildInviteLink(
  code: string,
  lanIp: string | null,
  loc: { hostname: string; protocol: string; port: string; origin: string } = location,
): string {
  const isLocal = loc.hostname === "localhost" || loc.hostname === "127.0.0.1" || loc.hostname === "::1";
  if (isLocal && lanIp) {
    const port = loc.port ? `:${loc.port}` : "";
    return `${loc.protocol}//${lanIp}${port}${roomPath(code)}`;
  }
  return `${loc.origin}${roomPath(code)}`;
}

export class LobbyView {
  private readonly root: HTMLElement;
  private readonly actions: LobbyActions;
  private room: PublicRoom | null = null;
  private you: You | null = null;
  private qrOpen = false;
  private copied = false;
  private lanIp: string | null = getStoredLanIp();

  /** Tự tạo phần tử riêng trong `host`: khi màn hình khác thay chỗ, bộ lắng nghe cũng mất theo */
  constructor(host: HTMLElement, actions: LobbyActions) {
    this.root = document.createElement("div");
    host.replaceChildren(this.root);
    this.actions = actions;
    // Một bộ lắng nghe cho cả màn hình, vì nội dung vẽ lại mỗi lần phòng thay đổi
    this.root.addEventListener("click", (e) => this.onClick(e));
    void this.syncLanIp();
  }

  private async syncLanIp(): Promise<void> {
    const ip = await fetchLanIp();
    if (ip && ip !== this.lanIp) {
      this.lanIp = ip;
      setStoredLanIp(ip);
      if (this.room && this.you) this.render(this.room, this.you);
    }
  }

  private inviteLink(code: string): string {
    return buildInviteLink(code, this.lanIp);
  }

  render(room: PublicRoom, you: You): void {
    this.room = room;
    this.you = you;
    const isHost = room.hostId === you.memberId;
    const link = this.inviteLink(room.code);
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
          <span class="mini">${GAME_ICON}</span>
          <div><h2>Ô ăn quan</h2><div class="code-big"><span class="desk-only">Phòng chờ · </span>Mã phòng <b>${room.code}</b></div></div>
        </div>
        <div class="lobby-cols">
          <div class="lobby-main">
            <div class="section-head"><h2>Người chơi</h2><span class="small muted">${seated}/${room.seats.length}${seated === room.seats.length ? " · đủ người" : ""}</span></div>
            <section class="card seats">${room.seats.map((m, seat) => this.seatHtml(m, seat, room, you)).join('<span class="vs desk-only">VS</span>')}</section>
            ${spectatorsHtml(room.spectators)}
            <div class="section-head"><h2>Tuỳ chọn</h2><span class="small muted">${isHost ? "Bạn là chủ phòng" : "Chủ phòng chỉnh"}</span></div>
            <section class="card opts">${optionsHtml(room.options, isHost)}</section>
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
    else if (act === "start") this.actions.start();
    else if (act === "sit") this.actions.takeSeat(Number(el.dataset.seat));
    else if (act === "opt") this.actions.setOptions(readOption(el));
    else if (act === "copy") void this.copyLink();
    else if (act === "share") void this.share();
    else if (act === "qr") {
      this.qrOpen = !this.qrOpen;
      this.render(this.room, this.you);
    }
  }

  private async copyLink(): Promise<void> {
    if (!this.room || !this.you) return;
    await copyText(this.inviteLink(this.room.code));
    this.copied = true;
    this.render(this.room, this.you);
  }

  /** Web Share API: mở bảng chia sẻ của điện thoại (Q22j) */
  private async share(): Promise<void> {
    if (!this.room) return;
    try {
      await navigator.share({
        title: "Chơi Ô ăn quan",
        text: `Vào chơi Ô ăn quan với mình, phòng ${this.room.code}`,
        url: this.inviteLink(this.room.code),
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

function optionsHtml(o: Options, editable: boolean): string {
  const dis = editable ? "" : " disabled";
  const seg = [10, 5]
    .map(
      (v) =>
        `<button type="button" class="seg-btn${o.giaTriQuan === v ? " on" : ""}" data-act="opt" data-key="giaTriQuan" data-value="${v}" aria-pressed="${o.giaTriQuan === v}"${dis}>${v} dân</button>`,
    )
    .join("");
  const targetSeg = TARGET_SCORES.map((item) => {
    const isSelected = o.targetScore === item.value;
    const valAttr = item.value === null ? "null" : String(item.value);
    return `<button type="button" class="seg-btn${isSelected ? " on" : ""}" data-act="opt" data-key="targetScore" data-value="${valAttr}" aria-pressed="${isSelected}"${dis}>${item.label}</button>`;
  }).join("");
  const toggles = TOGGLES.map(
    (t) => `<div class="opt-row inline">
      <div><b>${t.label}</b><div class="small muted">${t.hint}</div></div>
      <button type="button" class="toggle${o[t.key] ? " on" : ""}" role="switch" aria-checked="${o[t.key]}" aria-label="${t.label}" data-act="opt" data-key="${t.key}" data-value="${!o[t.key]}"${dis}></button>
    </div>`,
  ).join("");
  return `
    <div class="opt-row"><b>Giá trị quan</b><div class="seg">${seg}</div></div>
    <div class="opt-row">
      <div><b>Mốc điểm thắng (Đấu trận)</b><div class="small muted">Cộng dồn điểm nhiều ván; chạm mốc là thắng</div></div>
      <div class="seg seg-grid">${targetSeg}</div>
    </div>
    ${toggles}`;
}

/** Đọc tuỳ chọn từ nút vừa bấm; server sẽ kiểm tra lại bằng engine */
function readOption(el: HTMLElement): Partial<Options> {
  const { key, value } = el.dataset;
  if (key === "giaTriQuan") return { giaTriQuan: value === "5" ? 5 : 10 };
  if (key === "camAnQuanNon" || key === "latBan") return { [key]: value === "true" };
  if (key === "targetScore") {
    if (value === "null" || !value) return { targetScore: null };
    const num = Number(value);
    return { targetScore: num as TargetScore };
  }
  return {};
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
