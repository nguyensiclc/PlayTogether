// Vẽ bàn Cờ caro tĩnh cho mockup. Không phải code sản phẩm.
// Hình học khớp packages/client/caro/board-svg.ts: 1 đơn vị = 1 ô, ô (x, y) chiếm [x, x+1] × [y, y+1].
//
// renderCaroBoard(el, {
//   size: 15 | 19,
//   x: [[x, y], …], o: [[x, y], …],     // quân X và O
//   last: [x, y],                        // nước vừa đi
//   win: [[x, y], …],                    // các ô của chuỗi thắng (đã nối)
//   selected: [x, y], me: "x" | "o",     // ô đang chọn và quân xem trước của mình
//   viewBox: "x y w h"                   // dùng cho kính lúp
// })
(function () {
  function stars(n) {
    const pts = n === 19 ? [3, 9, 15] : [3, 7, 11];
    const all = [];
    for (const y of pts) for (const x of pts) all.push([x, y]);
    // Bàn 15: chỉ 5 điểm sao (4 góc + giữa)
    return n === 19 ? all : all.filter(([x, y]) => (x === 7) === (y === 7));
  }
  const xMark = (x, y) => `<path class="mx" d="M${x + 0.24} ${y + 0.24}L${x + 0.76} ${y + 0.76}M${x + 0.76} ${y + 0.24}L${x + 0.24} ${y + 0.76}"/>`;
  const oMark = (x, y) => `<circle class="mo" cx="${x + 0.5}" cy="${y + 0.5}" r="0.27"/>`;
  const cell = (cls, x, y) => `<rect class="${cls}" x="${x + 0.07}" y="${y + 0.07}" width="0.86" height="0.86" rx="0.16"/>`;

  window.caroBoardSvg = function (o) {
    const n = o.size || 15;
    const X = o.x || [], O = o.o || [], win = o.win || [];
    const inWin = (x, y) => win.some((w) => w[0] === x && w[1] === y);
    const piece = (mark, x, y) => (mark === "x" ? xMark(x, y) : oMark(x, y));
    let grid = "";
    for (let i = 1; i < n; i++) grid += `M${i} 0V${n}M0 ${i}H${n}`;
    let s = `<svg class="caro-svg" viewBox="${o.viewBox || `0 0 ${n} ${n}`}" role="img" aria-label="Bàn cờ caro ${n} × ${n}">`;
    s += `<path class="grid" d="${grid}"/>`;
    s += stars(n).map(([x, y]) => `<circle class="star" cx="${x + 0.5}" cy="${y + 0.5}" r="0.1"/>`).join("");
    if (o.selected) {
      const [sx, sy] = o.selected;
      s += `<rect class="band" x="0" y="${sy}" width="${n}" height="1"/><rect class="band" x="${sx}" y="0" width="1" height="${n}"/>`;
    }
    if (o.last) s += cell("last", o.last[0], o.last[1]);
    for (const [x, y] of win) s += cell("win", x, y);
    const dim = win.length ? ' class="dim"' : "";
    const stones = (list, mark) => list.map(([x, y]) => (win.length && inWin(x, y) ? "" : piece(mark, x, y))).join("");
    s += `<g${dim}>${stones(X, "x")}${stones(O, "o")}</g>`;
    if (win.length) {
      s += win.map(([x, y]) => piece(X.some((p) => p[0] === x && p[1] === y) ? "x" : "o", x, y)).join("");
      const pts = [...win].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const a = pts[0], b = pts[pts.length - 1];
      s += `<line class="winline" x1="${a[0] + 0.5}" y1="${a[1] + 0.5}" x2="${b[0] + 0.5}" y2="${b[1] + 0.5}"/>`;
    }
    if (o.selected) {
      const [sx, sy] = o.selected;
      s += cell("sel", sx, sy) + `<g class="ghost">${piece(o.me || "x", sx, sy)}</g>`;
    }
    return s + "</svg>";
  };

  window.renderCaroBoard = function (el, o) {
    el.classList.add("caro-board");
    el.innerHTML = window.caroBoardSvg(o);
  };

  // Kính lúp: vùng 5 × 5 ô quanh ô đang chọn
  window.renderCaroLoupe = function (el, o) {
    const [sx, sy] = o.selected;
    const n = o.size || 15;
    const x0 = Math.min(Math.max(sx - 2, 0), n - 5), y0 = Math.min(Math.max(sy - 2, 0), n - 5);
    el.classList.add("caro-loupe");
    el.innerHTML = window.caroBoardSvg({ ...o, viewBox: `${x0} ${y0} 5 5` });
  };
})();
