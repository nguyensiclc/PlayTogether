// Trang chủ + danh sách trò chơi (docs/design/nen-tang/trang-chu*.html, Q20, Q22i):
// nickname, vào bằng mã phòng, phòng gần đây, tạo phòng. "Luật chơi" để tới M5.

import type { GameId } from "@playtogether/protocol";
import { normalizeRoomCode, roomPath } from "@playtogether/protocol";
import { $, escapeHtml } from "../dom.ts";
import { GAME_INFO } from "../games.ts";
import { getClientId, getName, randomName, recentRooms, setName } from "../identity.ts";
import { GameSocket } from "../net/socket.ts";
import { showRules } from "../rules/rules-dialog.ts";
import { initialsOf } from "./room-players.ts";

type Category = "dangian" | "co" | "bai";

interface GameInfo {
  name: string;
  players: string;
  category: Category;
  /** Game đã chơi được; không có nghĩa là "Sắp có" */
  gameId?: GameId;
  icon: string;
}

const CATEGORY_NAME: Record<Category, string> = { dangian: "Dân gian", co: "Cờ", bai: "Bài" };
const CATEGORY_BG: Record<Category, string> = { dangian: "c-dg", co: "c-co", bai: "c-bai" };

const GAMES: GameInfo[] = [
  {
    name: "Ô ăn quan",
    players: "2 người",
    category: "dangian",
    gameId: "o-an-quan",
    icon: `<svg viewBox="0 0 56 56" aria-hidden="true"><rect x="3" y="18" width="50" height="20" rx="10" fill="#8a5a2e"/><g fill="#eee6d4"><circle cx="17" cy="24" r="2.4"/><circle cx="24" cy="24" r="2.4"/><circle cx="31" cy="24" r="2.4"/><circle cx="38" cy="24" r="2.4"/><circle cx="17" cy="32" r="2.4"/><circle cx="24" cy="32" r="2.4"/><circle cx="31" cy="32" r="2.4"/><circle cx="38" cy="32" r="2.4"/></g><circle cx="9" cy="28" r="3.5" fill="#33251b"/><circle cx="47" cy="28" r="3.5" fill="#33251b"/></svg>`,
  },
  {
    name: "Cờ tướng",
    players: "2 người",
    category: "co",
    icon: `<svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="20" fill="#fffaf0" stroke="#b5462f" stroke-width="3"/><circle cx="28" cy="28" r="15" fill="none" stroke="#b5462f" stroke-width="1.2"/><text x="28" y="35" text-anchor="middle" font-size="19" font-weight="700" fill="#b5462f" font-family="serif">帥</text></svg>`,
  },
  {
    name: "Cờ caro",
    players: "2 người",
    category: "co",
    gameId: "caro",
    icon: `<svg viewBox="0 0 56 56" aria-hidden="true"><g stroke="#2f6b5a" stroke-width="1.6" opacity=".5"><path d="M8 19h40M8 28h40M8 37h40M19 8v40M28 8v40M37 8v40"/></g><path d="M11 11l6 6M17 11l-6 6M29 29l6 6M35 29l-6 6" stroke="#b5462f" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="14" r="3.6" fill="none" stroke="#3a4f8f" stroke-width="2.6"/><circle cx="14" cy="32" r="3.6" fill="none" stroke="#3a4f8f" stroke-width="2.6"/></svg>`,
  },
  {
    name: "Tiến lên miền Nam",
    players: "2–4 người",
    category: "bai",
    icon: `<svg viewBox="0 0 56 56" aria-hidden="true"><rect x="10" y="12" width="24" height="34" rx="4" fill="#fffaf0" stroke="#3a4f8f" stroke-width="1.5" transform="rotate(-12 22 29)"/><rect x="22" y="10" width="24" height="34" rx="4" fill="#fffaf0" stroke="#3a4f8f" stroke-width="1.5" transform="rotate(10 34 27)"/><text x="35" y="33" text-anchor="middle" font-size="16" fill="#2b2118" font-weight="700" transform="rotate(10 34 27)">♠2</text></svg>`,
  },
  {
    name: "Lô tô",
    players: "2–10 người",
    category: "dangian",
    icon: `<svg viewBox="0 0 56 56" aria-hidden="true"><rect x="8" y="12" width="40" height="32" rx="4" fill="#fffaf0" stroke="#b5462f" stroke-width="1.5"/><g font-size="9" font-weight="700" fill="#2b2118" text-anchor="middle"><text x="16" y="25">7</text><text x="28" y="25">23</text><text x="40" y="25">41</text><text x="16" y="38">12</text><text x="28" y="38">55</text><text x="40" y="38">86</text></g><circle cx="28" cy="35" r="7" fill="#b5462f" opacity=".3"/></svg>`,
  },
  {
    name: "Cờ gánh",
    players: "2 người",
    category: "dangian",
    icon: `<svg viewBox="0 0 56 56" aria-hidden="true"><g stroke="#6b421f" stroke-width="1.6" fill="none"><path d="M10 10h36v36H10zM10 28h36M28 10v36M10 10l36 36M46 10L10 46"/></g><circle cx="10" cy="10" r="3.6" fill="#b5462f"/><circle cx="28" cy="10" r="3.6" fill="#b5462f"/><circle cx="46" cy="10" r="3.6" fill="#b5462f"/><circle cx="10" cy="46" r="3.6" fill="#2b2118"/><circle cx="28" cy="46" r="3.6" fill="#2b2118"/><circle cx="46" cy="46" r="3.6" fill="#2b2118"/></svg>`,
  },
  {
    name: "Cờ cá ngựa",
    players: "2–4 người",
    category: "co",
    icon: `<svg viewBox="0 0 56 56" aria-hidden="true"><rect x="8" y="8" width="18" height="18" rx="3" fill="#b5462f"/><rect x="30" y="8" width="18" height="18" rx="3" fill="#2f6b5a"/><rect x="8" y="30" width="18" height="18" rx="3" fill="#3a4f8f"/><rect x="30" y="30" width="18" height="18" rx="3" fill="#f2b33d"/><rect x="21" y="21" width="14" height="14" rx="3" fill="#fffaf0" stroke="#2b2118" stroke-width="1.4"/><circle cx="25" cy="25" r="1.4" fill="#2b2118"/><circle cx="31" cy="31" r="1.4" fill="#2b2118"/></svg>`,
  },
  {
    name: "Phỏm",
    players: "2–4 người",
    category: "bai",
    icon: `<svg viewBox="0 0 56 56" aria-hidden="true"><rect x="16" y="11" width="24" height="34" rx="4" fill="#fffaf0" stroke="#3a4f8f" stroke-width="1.5"/><text x="28" y="34" text-anchor="middle" font-size="18" fill="#b5462f">♥</text></svg>`,
  },
];

/** Hình bàn Ô ăn quan trên thẻ nổi bật */
const FEATURED_ART = `<svg viewBox="0 0 250 92" aria-hidden="true">
  <rect x="4" y="6" width="242" height="80" rx="40" fill="#6b421f"/>
  <rect x="8" y="10" width="234" height="72" rx="36" fill="#8a5a2e"/>
  <path d="M44 14 A32 32 0 0 0 44 78 Z" fill="#b07a45"/><path d="M206 14 A32 32 0 0 1 206 78 Z" fill="#b07a45"/>
  <g fill="#b07a45">${[50, 81, 112, 143, 174]
    .map(
      (x) =>
        `<rect x="${x}" y="14" width="27" height="31" rx="6"/><rect x="${x}" y="48" width="27" height="30" rx="6"/>`,
    )
    .join("")}</g>
  <circle cx="30" cy="46" r="8" fill="#33251b"/><circle cx="220" cy="46" r="8" fill="#33251b"/>
  <g fill="#eee6d4"><circle cx="58" cy="24" r="3"/><circle cx="66" cy="30" r="3"/><circle cx="60" cy="36" r="3"/><circle cx="70" cy="22" r="3"/><circle cx="68" cy="38" r="3"/><circle cx="90" cy="25" r="3"/><circle cx="99" cy="31" r="3"/><circle cx="92" cy="37" r="3"/><circle cx="100" cy="22" r="3"/><circle cx="96" cy="38" r="3"/><circle cx="120" cy="26" r="3"/><circle cx="130" cy="30" r="3"/><circle cx="124" cy="37" r="3"/><circle cx="131" cy="21" r="3"/><circle cx="120" cy="20" r="3"/><circle cx="152" cy="24" r="3"/><circle cx="160" cy="31" r="3"/><circle cx="151" cy="36" r="3"/><circle cx="163" cy="22" r="3"/><circle cx="162" cy="38" r="3"/><circle cx="182" cy="25" r="3"/><circle cx="192" cy="29" r="3"/><circle cx="185" cy="37" r="3"/><circle cx="193" cy="21" r="3"/><circle cx="192" cy="38" r="3"/><circle cx="58" cy="57" r="3"/><circle cx="68" cy="62" r="3"/><circle cx="60" cy="70" r="3"/><circle cx="70" cy="54" r="3"/><circle cx="69" cy="71" r="3"/><circle cx="90" cy="58" r="3"/><circle cx="99" cy="63" r="3"/><circle cx="91" cy="70" r="3"/><circle cx="100" cy="54" r="3"/><circle cx="99" cy="71" r="3"/><circle cx="121" cy="57" r="3"/><circle cx="131" cy="62" r="3"/><circle cx="122" cy="70" r="3"/><circle cx="130" cy="54" r="3"/><circle cx="131" cy="71" r="3"/><circle cx="152" cy="57" r="3"/><circle cx="162" cy="62" r="3"/><circle cx="153" cy="70" r="3"/><circle cx="161" cy="54" r="3"/><circle cx="162" cy="71" r="3"/><circle cx="183" cy="57" r="3"/><circle cx="193" cy="62" r="3"/><circle cx="184" cy="70" r="3"/><circle cx="192" cy="54" r="3"/><circle cx="193" cy="71" r="3"/></g>
</svg>`;

export function mountHome(root: HTMLElement): void {
  root.innerHTML = `
    <div class="screen home">
      <nav class="nav">
        <a class="logo" href="/"><span class="logo-mark"><i></i></span>PlayTogether</a>
        <div class="links desk-only"><a href="/" aria-current="page">Trò chơi</a></div>
        <div class="spacer"></div>
        <form class="field code desk-only" data-join><input name="code" placeholder="Mã phòng" maxlength="4" autocomplete="off" aria-label="Mã phòng"><button class="btn dark sm" type="submit">Vào</button></form>
        <button type="button" class="chip nick" data-nick aria-label="Đổi tên"></button>
      </nav>
      <main class="wrap">
        <section class="hero">
          <div class="hero-text">
            <h1>Rủ bạn chơi,<br><em>chỉ cần một đường link.</em></h1>
            <p class="lead mobile-only">Tạo phòng, gửi link qua Zalo hay Messenger. Không cần đăng ký.</p>
            <p class="lead desk-only">Chọn trò, tạo phòng, gửi link qua Zalo hay Messenger. Bạn bè bấm là vào chơi, không cần đăng ký.</p>
            <form class="join mobile-only" data-join>
              <label class="lbl" for="join-code">Có mã phòng?</label>
              <div class="field code"><input id="join-code" name="code" placeholder="VD: ABCD" maxlength="4" autocomplete="off"><button class="btn dark sm" type="submit">Vào phòng</button></div>
            </form>
            <p class="join-error small" hidden>Mã phòng gồm 4 ký tự, vd ABCD.</p>
            <div class="cta desk-only">
              <button class="btn primary" type="button" data-create="o-an-quan">Tạo phòng Ô ăn quan</button>
              <a class="btn ghost" href="#tat-ca">Xem tất cả trò chơi ↓</a>
            </div>
            <div class="steps desk-only"><div><b>1</b>Chọn trò</div><div><b>2</b>Gửi link</div><div><b>3</b>Chơi ngay</div></div>
          </div>
          <div class="mobile-only" data-recent></div>
          <div class="hero-feat">
            <div class="section-head mobile-only"><h2>Nổi bật</h2></div>
            <article class="card featured">
              <div class="art"><span class="badge live">● Chơi được ngay</span>${FEATURED_ART}</div>
              <div class="body">
                <div class="info">
                  <h2>Ô ăn quan</h2>
                  <div class="meta"><span class="chip">👥 2 người</span><span class="chip">⏱ 10–15 phút</span><span class="chip">Dân gian</span></div>
                </div>
                <div class="actions"><button class="btn primary" type="button" data-create="o-an-quan">Tạo phòng</button></div>
              </div>
            </article>
          </div>
        </section>

        <div class="desk-only" data-recent></div>

        <div class="lib-head" id="tat-ca">
          <h2>Tất cả trò chơi <span class="count">· ${GAMES.length} trò</span></h2>
          <div class="filters" role="group" aria-label="Lọc theo nhóm">
            <button type="button" class="chip" data-cat="" aria-pressed="true">Tất cả</button>
            ${(Object.keys(CATEGORY_NAME) as Category[])
              .map(
                (c) =>
                  `<button type="button" class="chip" data-cat="${c}" aria-pressed="false">${CATEGORY_NAME[c]}</button>`,
              )
              .join("")}
          </div>
        </div>
        <div class="games">${GAMES.map(gameCard).join("")}</div>
        <section class="rules-row" aria-label="Luật chơi">
          <h2>Đọc luật trước khi chơi</h2>
          ${GAMES.flatMap((g) => (g.gameId ? [`<button class="btn sm" type="button" data-rules="${g.gameId}">📖 ${g.name}</button>`] : [])).join("")}
        </section>

        <footer>
          <span class="desk-only">PlayTogether · Chơi cùng nhau</span>
          <div class="ok"><span>Không cần đăng ký</span><span>Miễn phí</span><span>Không tiền thật</span></div>
        </footer>
      </main>
    </div>`;

  for (const chip of root.querySelectorAll<HTMLButtonElement>(".filters .chip")) {
    chip.addEventListener("click", () => filterGames(root, chip));
  }
  for (const form of root.querySelectorAll<HTMLFormElement>("[data-join]")) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      joinByCode(root, form);
    });
  }
  for (const btn of root.querySelectorAll<HTMLButtonElement>("[data-create]")) {
    btn.addEventListener("click", () => createRoom(root, btn.dataset.create as GameId));
  }
  for (const btn of root.querySelectorAll<HTMLButtonElement>("[data-rules]")) {
    btn.addEventListener("click", () => showRules(btn.dataset.rules as GameId));
  }
  setupNickname($(root, "[data-nick]"));
  // Điện thoại: "Phòng gần đây" nằm trên "Nổi bật"; desktop: dưới khối hero hai cột (như mockup)
  const recent = recentHtml();
  for (const slot of root.querySelectorAll<HTMLElement>("[data-recent]")) slot.innerHTML = recent;
}

/** Tên lưu trên máy; lần đầu vào thì điền sẵn tên ngẫu nhiên (UX mục 2.1) */
function currentName(): string {
  return getName() ?? setName(randomName()) ?? randomName();
}

/** Chip nickname: bấm để sửa tại chỗ, Enter hoặc rời ô thì lưu */
function setupNickname(chip: HTMLElement): void {
  const show = () => {
    const name = currentName();
    chip.innerHTML = `<span class="avatar sm av1">${escapeHtml(initialsOf(name))}</span>${escapeHtml(name)}<span aria-hidden="true">✎</span>`;
  };
  show();
  chip.addEventListener("click", () => {
    if (chip.querySelector("input")) return;
    chip.innerHTML = `<input maxlength="20" aria-label="Tên của bạn" value="${escapeHtml(currentName())}">`;
    const input = $<HTMLInputElement>(chip, "input");
    input.select();
    input.addEventListener(
      "blur",
      () => {
        setName(input.value);
        show();
      },
      { once: true },
    );
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") input.blur();
    });
  });
}

function joinByCode(root: HTMLElement, form: HTMLFormElement): void {
  const input = $<HTMLInputElement>(form, "input");
  const code = normalizeRoomCode(input.value);
  $(root, ".join-error").hidden = code !== null;
  if (code) location.assign(roomPath(code));
  else input.focus();
}

/** Tạo phòng qua WebSocket rồi chuyển sang trang phòng (UX mục 1) */
function createRoom(root: HTMLElement, gameId: GameId): void {
  for (const b of root.querySelectorAll<HTMLButtonElement>("[data-create]")) b.disabled = true;
  let sent = false;
  // Chỉ gửi createRoom ở lần kết nối đầu, để rớt mạng giữa chừng không tạo thêm phòng
  const socket = new GameSocket(() => {
    if (sent) return [];
    sent = true;
    return [
      { type: "hello", clientId: getClientId(), name: currentName() },
      { type: "createRoom", gameId },
    ];
  });
  socket.onMessage((m) => {
    if (m.type === "roomJoined") location.assign(roomPath(m.room.code));
  });
  socket.connect();
}

/** "5 phút trước", "2 giờ trước"… */
function timeAgo(at: number): string {
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)} giờ trước`;
  return `${Math.round(minutes / (24 * 60))} ngày trước`;
}

/** Mục "Phòng gần đây" (Q22i); không có phòng nào thì ẩn */
function recentHtml(): string {
  const list = recentRooms();
  if (list.length === 0) return "";
  const items = list
    .map((r) => {
      const game = GAME_INFO[r.gameId];
      const others = r.with.length ? `Với ${escapeHtml(r.with.join(", "))} · ` : "";
      return `<div class="card recent">
        <span class="mini ${game.tile}">${game.icon}</span>
        <div class="info"><div class="nm">${game.name} · Phòng ${r.code}</div><div class="small muted">${others}${timeAgo(r.at)}</div></div>
        <a class="btn sm" href="${roomPath(r.code)}">Vào lại</a>
      </div>`;
    })
    .join("");
  return `<div class="section-head"><h2>Phòng gần đây</h2></div><div class="recent-list">${items}</div>`;
}

/** Lọc lưới trò chơi theo nhóm của chip vừa bấm ("" = tất cả). */
function filterGames(root: HTMLElement, chip: HTMLButtonElement): void {
  const cat = chip.dataset.cat ?? "";
  for (const c of root.querySelectorAll(".filters .chip")) c.setAttribute("aria-pressed", String(c === chip));
  for (const g of root.querySelectorAll<HTMLElement>(".games .game")) g.hidden = cat !== "" && g.dataset.cat !== cat;
}

function gameCard(g: GameInfo): string {
  const meta = `${g.players} · ${CATEGORY_NAME[g.category]}`;
  const ico = `<div class="ico ${CATEGORY_BG[g.category]}">${g.gameId ? "" : `<span class="badge">Sắp có</span>`}${g.icon}</div>`;
  if (!g.gameId) {
    return `<div class="game soon" data-cat="${g.category}" aria-disabled="true">${ico}
      <div class="row"><div><div class="nm">${g.name}</div><div class="mt">${meta}</div></div></div></div>`;
  }
  return `<button type="button" class="game playable" data-create="${g.gameId}" data-cat="${g.category}">${ico}
    <div class="row"><div><div class="nm">${g.name}</div><div class="mt">${meta}</div></div>
    <span class="btn primary sm desk-only">Tạo phòng</span></div></button>`;
}
