// Vẽ bàn Ô ăn quan tĩnh cho mockup. Không phải code sản phẩm.
// Chỉ số ô theo docs/o-an-quan/01-luat-choi.md: 0 = quan trái, 1..5 = hàng A, 6 = quan phải, 7..11 = hàng B.
// Mặc định nhìn từ phía A (hàng A ở dưới): hàng trên hiển thị 11,10,9,8,7 từ trái sang phải.
//
// renderBoard(el, {
//   dan: number[12], quan: [bool, bool],
//   valid: number[], selected: number, dim: number[], off: number[],
//   pick: true,                    // hiện thanh ◀ ▶ trên ô đang chọn
//   hand: number,                  // ô "bàn tay" đang rải tới (hiệu ứng)
//   capture: { cell, gain }        // ô vừa bị ăn, hiện chữ "+N"
// })
(function () {
  function rand(seed) {
    let s = seed * 9301 + 49297;
    return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  const ARROW_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  const ARROW_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';

  function fillStones(cell, n, isQuan, hasQuan, idx) {
    const r = rand(idx * 31 + n * 7 + 3);
    if (isQuan && hasQuan) {
      const q = document.createElement("i");
      q.className = "stone big";
      q.style.left = "calc(50% - 10px)";
      q.style.top = "26%";
      cell.appendChild(q);
    }
    const shown = Math.min(n, isQuan ? 10 : 14);
    for (let k = 0; k < shown; k++) {
      const s = document.createElement("i");
      s.className = "stone";
      const x = isQuan ? 22 + r() * 46 : 12 + r() * 66;
      const y = isQuan ? 50 + r() * 28 : 10 + r() * 58;
      s.style.left = x + "%";
      s.style.top = y + "%";
      cell.appendChild(s);
    }
    if (n > 0) {
      const c = document.createElement("span");
      c.className = "count";
      c.textContent = n;
      cell.appendChild(c);
    }
  }

  window.renderBoard = function (el, opt) {
    const o = Object.assign({ valid: [], dim: [], off: [], selected: -1 }, opt);
    el.classList.add("board");
    el.innerHTML = "";
    const order = [
      { i: 0, col: 1, row: "1 / 3" },
      { i: 11, col: 2, row: 1 }, { i: 10, col: 3, row: 1 }, { i: 9, col: 4, row: 1 }, { i: 8, col: 5, row: 1 }, { i: 7, col: 6, row: 1 },
      { i: 1, col: 2, row: 2 }, { i: 2, col: 3, row: 2 }, { i: 3, col: 4, row: 2 }, { i: 4, col: 5, row: 2 }, { i: 5, col: 6, row: 2 },
      { i: 6, col: 7, row: "1 / 3" },
    ];
    const cells = {};
    for (const p of order) {
      const d = document.createElement("div");
      const isQuan = p.i === 0 || p.i === 6;
      d.className = "cell" + (isQuan ? " quan " + (p.i === 0 ? "left" : "right") : "");
      d.style.gridColumn = p.col;
      d.style.gridRow = p.row;
      if (o.valid.includes(p.i)) d.classList.add("valid");
      if (o.dim.includes(p.i)) d.classList.add("dim");
      if (o.off.includes(p.i)) d.classList.add("off");
      if (o.selected === p.i) d.classList.add("selected");
      if (o.hand === p.i) d.classList.add("hand");
      if (o.capture && o.capture.cell === p.i) {
        d.classList.add("capture");
        const g = document.createElement("b");
        g.className = "gain";
        g.textContent = "+" + o.capture.gain;
        d.appendChild(g);
      }
      fillStones(d, o.dan[p.i], isQuan, isQuan && o.quan[p.i === 0 ? 0 : 1], p.i);
      el.appendChild(d);
      cells[p.i] = d;
    }
    if (o.pick && o.selected >= 0) {
      requestAnimationFrame(function () {
        const c = cells[o.selected];
        const bar = document.createElement("div");
        bar.className = "dir-pick";
        bar.innerHTML = "<span>" + ARROW_L + "</span><span>" + ARROW_R + "</span>";
        bar.style.left = ((c.offsetLeft + c.offsetWidth / 2) / el.clientWidth) * 100 + "%";
        bar.style.top = c.offsetTop - 62 + "px";
        el.appendChild(bar);
      });
    }
  };
})();
