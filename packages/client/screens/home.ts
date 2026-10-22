// Trang chủ + danh sách trò chơi (docs/design/nen-tang/trang-chu*.html, Q20, Q22i):
// nickname, vào bằng mã phòng, phòng gần đây, tạo phòng. "Luật chơi" để tới M5.

import type { GameId } from "@playtogether/protocol";
import { normalizeRoomCode, roomPath } from "@playtogether/protocol";
import { $, escapeHtml } from "../dom.ts";
import { UPCOMING_GAMES } from "../games/catalog.ts";
import { CATEGORY_BG, CATEGORY_NAME, gameOf, PLAYABLE_GAMES } from "../games/registry.ts";
import type { Category } from "../games/types.ts";
import { getClientId, getName, randomName, recentRooms, setName } from "../identity.ts";
import { GameSocket } from "../net/socket.ts";
import { showRules } from "../rules/rules-dialog.ts";
import { avatarOfName } from "./room-players.ts";

/** Thẻ trong lưới trò chơi: game chơi được (có `gameId`) lẫn game sắp có */
interface GameCardInfo {
  name: string;
  players: string;
  category: Category;
  gameId?: GameId;
  icon: string;
}

const PLAYABLE_CARDS: GameCardInfo[] = PLAYABLE_GAMES.map((g) => ({ ...g.info, gameId: g.id, icon: g.info.cardIcon }));
const CARDS: GameCardInfo[] = [...PLAYABLE_CARDS, ...UPCOMING_GAMES];

/** Game được giới thiệu ở khối "Nổi bật" và nút Tạo phòng ở đầu trang: game đầu tiên có hình nổi bật */
const FEATURED = PLAYABLE_GAMES.find((g) => g.info.featuredArt) ?? PLAYABLE_GAMES[0];

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
              <button class="btn primary" type="button" data-create="${FEATURED?.id}">Tạo phòng ${FEATURED?.info.name}</button>
              ${FEATURED && gameOf(FEATURED.id).botSupported ? `<button class="btn secondary" type="button" data-create-bot="${FEATURED.id}">🤖 Chơi với máy</button>` : ""}
              <a class="btn ghost" href="#tat-ca">Xem tất cả trò chơi ↓</a>
            </div>
            <div class="steps desk-only"><div><b>1</b>Chọn trò</div><div><b>2</b>Gửi link</div><div><b>3</b>Chơi ngay</div></div>
          </div>
          <div class="mobile-only" data-recent></div>
          <div class="hero-feat">
            <div class="section-head mobile-only"><h2>Nổi bật</h2></div>
            <article class="card featured">
              <div class="art"><span class="badge live">● Chơi được ngay</span>${FEATURED?.info.featuredArt ?? ""}
                <span class="link-chip" aria-hidden="true">playtogether.vn/AB12</span>
                <span class="bubble b1" aria-hidden="true"><b>LA</b>Lan vừa vào phòng</span>
                <span class="bubble b2" aria-hidden="true"><b>MI</b>Đến lượt bạn!</span></div>
              <div class="body">
                <div class="info">
                  <h2>${FEATURED?.info.name}</h2>
                  <div class="meta"><span class="chip">👥 ${FEATURED?.info.players}</span><span class="chip">⏱ ${FEATURED?.info.duration}</span><span class="chip">${FEATURED ? CATEGORY_NAME[FEATURED.info.category] : ""}</span></div>
                </div>
                <div class="actions">
                  <button class="btn primary" type="button" data-create="${FEATURED?.id}">Tạo phòng</button>
                  ${FEATURED && gameOf(FEATURED.id).botSupported ? `<button class="btn secondary" type="button" data-create-bot="${FEATURED.id}">🤖 Chơi với máy</button>` : ""}
                </div>
              </div>
            </article>
          </div>
        </section>

        <div class="desk-only" data-recent></div>

        <div class="lib-head" id="tat-ca">
          <h2>Tất cả trò chơi <span class="count">· ${CARDS.length} trò</span></h2>
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
        <div class="games">${PLAYABLE_CARDS.map(gameCard).join("")}</div>
        <section class="soon-strip" aria-label="Sắp có">
          <div class="section-head"><h2>Sắp có</h2><span class="small muted">Đang làm</span></div>
          <div class="soon-list">${UPCOMING_GAMES.map(soonItem).join("")}</div>
        </section>
        <section class="rules-row" aria-label="Luật chơi">
          <div class="section-head"><h2>Đọc luật trước khi chơi</h2></div>
          <div class="rules-chips">${CARDS.flatMap((g) => (g.gameId ? [`<button class="btn sm" type="button" data-rules="${g.gameId}">📖 ${g.name}</button>`] : [])).join("")}</div>
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
    btn.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("[data-create-bot]")) return;
      createRoom(root, btn.dataset.create as GameId);
    });
  }
  for (const btn of root.querySelectorAll<HTMLElement>("[data-create-bot]")) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      createRoomWithBot(root, btn.dataset.createBot as GameId);
    });
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
    chip.innerHTML = `${avatarOfName(name, 0, "sm")}${escapeHtml(name)}<span aria-hidden="true">✎</span>`;
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
    // Mỗi người chỉ làm chủ một phòng: mời quay lại phòng đang có
    if (m.type === "error" && m.code === "ALREADY_HOSTING") {
      showHostLimit(root, m.message);
    }
  });
  socket.connect();
}

/** Tạo phòng kèm thêm sẵn Bot để chơi một mình (UX mục 6) */
function createRoomWithBot(root: HTMLElement, gameId: GameId, level = "medium"): void {
  for (const b of root.querySelectorAll<HTMLButtonElement>("[data-create], [data-create-bot]")) b.disabled = true;
  let sent = false;
  const socket = new GameSocket(() => {
    if (sent) return [];
    sent = true;
    return [
      { type: "hello", clientId: getClientId(), name: currentName() },
      { type: "createRoom", gameId },
    ];
  });
  socket.onMessage((m) => {
    if (m.type === "roomJoined") {
      socket.send({ type: "addBot", seat: 1, level });
      location.assign(roomPath(m.room.code));
    }
    if (m.type === "error" && m.code === "ALREADY_HOSTING") {
      showHostLimit(root, m.message);
    }
  });
  socket.connect();
}

/** Báo đang làm chủ một phòng khác và cho vào lại phòng đó */
function showHostLimit(root: HTMLElement, code: string): void {
  for (const b of root.querySelectorAll<HTMLButtonElement>("[data-create]")) b.disabled = false;
  root.querySelector(".host-limit")?.remove();
  const box = document.createElement("div");
  box.className = "card host-limit";
  box.setAttribute("role", "alert");
  box.style.cssText = "padding:12px 14px;margin:12px 0;display:flex;align-items:center;gap:10px;flex-wrap:wrap";
  box.innerHTML = `<span class="small" style="flex:1;min-width:200px">Bạn đang là chủ phòng <b>${escapeHtml(code)}</b>. Mỗi người chỉ làm chủ một phòng; hãy vào lại hoặc rời phòng đó trước khi tạo phòng mới.</span><a class="btn sm primary" href="${roomPath(code)}">Vào lại phòng</a>`;
  $(root, "main").prepend(box);
  box.scrollIntoView({ block: "center" });
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
      const game = gameOf(r.gameId).info;
      const others = r.with.length ? `<span class="with">Với ${escapeHtml(r.with.join(", "))}</span>` : "";
      return `<div class="card recent">
        <span class="mini ${CATEGORY_BG[game.category]}">${game.icon}</span>
        <div class="info"><div class="nm">${game.name} · Phòng ${r.code}</div><div class="small muted recent-meta">${others}<span class="when">${timeAgo(r.at)}</span></div></div>
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
  for (const g of root.querySelectorAll<HTMLElement>(".games .game, .soon-list .soon-item"))
    g.hidden = cat !== "" && g.dataset.cat !== cat;
}

/** Thẻ "Sắp có": chip nét đứt trong dải cuộn ngang, không chiếm chỗ của game chơi được */
function soonItem(g: GameCardInfo): string {
  return `<div class="soon-item" data-cat="${g.category}" aria-disabled="true"><span class="soon-ico">${g.icon}</span><span class="nm">${g.name}</span><span class="tag">${g.players}</span></div>`;
}

function gameCard(g: GameCardInfo): string {
  const info = g.gameId ? gameOf(g.gameId) : undefined;
  const meta = `<span>${g.players}</span><span>${CATEGORY_NAME[g.category]}</span>`;
  const badge = info?.botSupported ? "● Có bot" : "● Chơi được ngay";
  const botBtn = info?.botSupported
    ? `<button type="button" class="btn ghost sm bot" data-create-bot="${g.gameId}" aria-label="Chơi với máy">🤖</button>`
    : "";
  return `<article class="game playable" data-cat="${g.category}">
    <div class="ico" style="background:${info?.info.cardBg}"><span class="badge live">${badge}</span>${info?.info.cardArt ?? ""}</div>
    <div class="row"><div class="info"><div class="nm">${g.name}</div><div class="mt">${meta}</div></div>
    <div class="acts"><button type="button" class="btn primary sm" data-create="${g.gameId}">Tạo phòng</button>${botBtn}</div></div></article>`;
}
