// Trang chủ + danh sách trò chơi (docs/design/nen-tang/trang-chu*.html, đã chốt theo Q20).
// Thành phần của M3 (mã phòng, phòng gần đây, nickname, Tạo phòng) được ẩn. Ô ăn quan dẫn tới /offline (Q19).

type Category = "dangian" | "co" | "bai";

interface GameInfo {
  name: string;
  players: string;
  category: Category;
  /** Đường dẫn khi chơi được; không có nghĩa là "Sắp có" */
  href?: string;
  icon: string;
}

const CATEGORY_NAME: Record<Category, string> = { dangian: "Dân gian", co: "Cờ", bai: "Bài" };
const CATEGORY_BG: Record<Category, string> = { dangian: "c-dg", co: "c-co", bai: "c-bai" };

const OFFLINE = "/offline";

const GAMES: GameInfo[] = [
  {
    name: "Ô ăn quan",
    players: "2 người",
    category: "dangian",
    href: OFFLINE,
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
    .map((x) => `<rect x="${x}" y="14" width="27" height="31" rx="6"/><rect x="${x}" y="48" width="27" height="30" rx="6"/>`)
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
      </nav>
      <main class="wrap">
        <section class="hero">
          <div class="hero-text">
            <h1>Rủ bạn chơi,<br><em>chỉ cần một đường link.</em></h1>
            <p class="lead">Chọn trò rồi chơi ngay, không cần đăng ký.</p>
            <div class="cta desk-only">
              <a class="btn primary" href="${OFFLINE}">Chơi ngay Ô ăn quan</a>
              <a class="btn ghost" href="#tat-ca">Xem tất cả trò chơi ↓</a>
            </div>
          </div>
          <div class="hero-feat">
            <div class="section-head mobile-only"><h2>Nổi bật</h2></div>
            <article class="card featured">
              <div class="art"><span class="badge live">● Chơi được ngay</span>${FEATURED_ART}</div>
              <div class="body">
                <div class="info">
                  <h2>Ô ăn quan</h2>
                  <div class="meta"><span class="chip">👥 2 người</span><span class="chip">⏱ 10–15 phút</span><span class="chip">Dân gian</span></div>
                </div>
                <div class="actions"><a class="btn primary" href="${OFFLINE}">Chơi ngay</a></div>
              </div>
            </article>
          </div>
        </section>

        <div class="lib-head" id="tat-ca">
          <h2>Tất cả trò chơi <span class="count">· ${GAMES.length} trò</span></h2>
          <div class="filters" role="group" aria-label="Lọc theo nhóm">
            <button type="button" class="chip" data-cat="" aria-pressed="true">Tất cả</button>
            ${(Object.keys(CATEGORY_NAME) as Category[])
              .map((c) => `<button type="button" class="chip" data-cat="${c}" aria-pressed="false">${CATEGORY_NAME[c]}</button>`)
              .join("")}
          </div>
        </div>
        <div class="games">${GAMES.map(gameCard).join("")}</div>

        <footer>
          <span class="desk-only">PlayTogether · Chơi cùng nhau</span>
          <div class="ok"><span>Không cần đăng ký</span><span>Miễn phí</span><span>Không tiền thật</span></div>
        </footer>
      </main>
    </div>`;

  // Lọc trò chơi theo nhóm
  const chips = root.querySelectorAll<HTMLButtonElement>(".filters .chip");
  for (const chip of chips) {
    chip.addEventListener("click", () => {
      const cat = chip.dataset.cat ?? "";
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
      root.querySelectorAll<HTMLElement>(".games .game").forEach((g) => {
        g.hidden = cat !== "" && g.dataset.cat !== cat;
      });
    });
  }
}

function gameCard(g: GameInfo): string {
  const meta = `${g.players} · ${CATEGORY_NAME[g.category]}`;
  const ico = `<div class="ico ${CATEGORY_BG[g.category]}">${g.href ? "" : `<span class="badge">Sắp có</span>`}${g.icon}</div>`;
  if (!g.href) {
    return `<div class="game soon" data-cat="${g.category}" aria-disabled="true">${ico}
      <div class="row"><div><div class="nm">${g.name}</div><div class="mt">${meta}</div></div></div></div>`;
  }
  return `<a class="game" href="${g.href}" data-cat="${g.category}">${ico}
    <div class="row"><div><div class="nm">${g.name}</div><div class="mt">${meta}</div></div>
    <span class="btn primary sm desk-only">Chơi ngay</span></div></a>`;
}
