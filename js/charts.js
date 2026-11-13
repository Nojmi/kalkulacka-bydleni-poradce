/* charts.js – vlastní SVG grafy bez knihoven (žádné CDN).
 * Horizontální sloupce: jednoduché i skládané, záporné hodnoty, tooltip, legenda, tabulkový pohled. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const MUTED = '#898781';

  // Pevné pořadí kategorických barev (validováno skriptem validate_palette.js: 4 sloty, světlý režim)
  const SLOT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100'];
  const GRAY = '#c3c2b7';

  const fmtKc = (n) => Math.round(n).toLocaleString('cs-CZ') + ' Kč';
  function fmtAxis(v, max) {
    const a = Math.abs(max);
    if (a >= 2e6) return (v / 1e6).toLocaleString('cs-CZ', { maximumFractionDigits: 1 }) + ' mil.';
    if (a >= 10000) return (v / 1e3).toLocaleString('cs-CZ', { maximumFractionDigits: 0 }) + ' tis.';
    return Math.round(v).toLocaleString('cs-CZ');
  }

  function el(name, attrs, parent) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function html(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function niceTicks(min, max, target) {
    if (min === max) { max = min + 1; }
    const span = max - min;
    const raw = span / (target || 5);
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const m = raw / p;
    const step = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.abs(v) < step / 1e6 ? 0 : v);
    return { lo, hi, ticks };
  }

  function barPath(x, y, w, h, r, side) {
    r = Math.min(r, w, h / 2);
    if (side === 'right') return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
    if (side === 'left') return `M${x + w},${y}H${x + r}Q${x},${y} ${x},${y + r}V${y + h - r}Q${x},${y + h} ${x + r},${y + h}H${x + w}Z`;
    return `M${x},${y}h${w}v${h}h${-w}Z`;
  }

  // ---- tooltip (jediný, sdílený); texty vždy přes textContent ----
  let tip = null;
  function tooltip() {
    if (!tip) { tip = html('div', 'kbp-tip'); tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.appendChild(tip); }
    return tip;
  }
  function showTip(row, series, stacked, fmt, x, y) {
    const t = tooltip();
    t.textContent = '';
    t.appendChild(html('div', 'kbp-tip-title', row.label));
    row.values.forEach((v, i) => {
      if (v === null || v === undefined) return;
      const line = html('div', 'kbp-tip-row');
      const key = html('span', 'kbp-tip-key');
      key.style.background = row.color || series[i].color;
      line.appendChild(key);
      line.appendChild(html('strong', null, fmt(v)));
      if (series[i].name) line.appendChild(html('span', 'kbp-tip-name', series[i].name));
      t.appendChild(line);
    });
    if (stacked && row.values.length > 1) {
      const tot = row.values.reduce((s, v) => s + (v || 0), 0);
      const line = html('div', 'kbp-tip-row kbp-tip-total');
      line.appendChild(html('strong', null, fmt(tot)));
      line.appendChild(html('span', 'kbp-tip-name', 'celkem'));
      t.appendChild(line);
    }
    t.hidden = false;
    const w = t.offsetWidth, hgt = t.offsetHeight;
    t.style.left = Math.min(window.innerWidth - w - 8, x + 14) + 'px';
    t.style.top = Math.max(8, Math.min(window.innerHeight - hgt - 8, y + 14)) + 'px';
  }
  const hideTip = () => { if (tip) tip.hidden = true; };

  /**
   * opts: { title, subtitle, series:[{name,color}], rows:[{label, values:[..], color?, muted?}],
   *         stacked, fmt, tableHeaders? }
   * Vrací DOM kartu; vykreslí se podle šířky kontejneru po vložení (volej draw()).
   */
  function hbar(opts) {
    const fmt = opts.fmt || fmtKc;
    const series = opts.series;
    const card = html('section', 'kbp-chart');
    const head = html('div', 'kbp-chart-head');
    const titles = html('div');
    titles.appendChild(html('h4', null, opts.title));
    if (opts.subtitle) titles.appendChild(html('p', 'kbp-sub', opts.subtitle));
    head.appendChild(titles);
    const toggle = html('div', 'kbp-seg');
    const bGraf = html('button', 'on', 'Graf'); bGraf.type = 'button';
    const bTab = html('button', null, 'Tabulka'); bTab.type = 'button';
    toggle.append(bGraf, bTab);
    head.appendChild(toggle);
    card.appendChild(head);

    if (series.length > 1) {
      const legend = html('div', 'kbp-legend');
      series.forEach((s) => {
        const it = html('span', 'kbp-legend-item');
        const sw = html('i'); sw.style.background = s.color;
        it.append(sw, document.createTextNode(s.name));
        legend.appendChild(it);
      });
      card.appendChild(legend);
    }

    const plot = html('div', 'kbp-plot');
    card.appendChild(plot);

    const tableWrap = html('div', 'kbp-tablewrap'); tableWrap.hidden = true;
    const table = html('table', 'kbp-table');
    const thead = html('thead'); const trh = html('tr');
    trh.appendChild(html('th', null, opts.tableHeaders ? opts.tableHeaders[0] : ''));
    series.forEach((s) => trh.appendChild(html('th', 'num', s.name || 'Hodnota')));
    if (opts.stacked && series.length > 1) trh.appendChild(html('th', 'num', 'Celkem'));
    thead.appendChild(trh); table.appendChild(thead);
    const tbody = html('tbody');
    opts.rows.forEach((r) => {
      const tr = html('tr');
      tr.appendChild(html('th', null, r.label));
      r.values.forEach((v) => tr.appendChild(html('td', 'num', v === null || v === undefined ? '–' : fmt(v))));
      if (opts.stacked && series.length > 1) tr.appendChild(html('td', 'num', fmt(r.values.reduce((s, v) => s + (v || 0), 0))));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody); tableWrap.appendChild(table); card.appendChild(tableWrap);

    bGraf.onclick = () => { plot.hidden = false; tableWrap.hidden = true; bGraf.classList.add('on'); bTab.classList.remove('on'); };
    bTab.onclick = () => { plot.hidden = true; tableWrap.hidden = false; bTab.classList.add('on'); bGraf.classList.remove('on'); };

    function draw() {
      plot.textContent = '';
      const W = Math.max(420, plot.clientWidth || card.clientWidth || 700);
      const rows = opts.rows;
      const labelW = Math.min(230, Math.max(150, W * 0.24));
      const padR = 92, rowH = 40, bar = 22, top = 6, axisH = 28;

      // rozsah: kladné a záporné součty
      let mn = 0, mx = 0;
      rows.forEach((r) => {
        let pos = 0, neg = 0;
        r.values.forEach((v) => { v = v || 0; if (opts.stacked) { if (v >= 0) pos += v; else neg += v; } else { pos = Math.max(pos, v); neg = Math.min(neg, v); } });
        mx = Math.max(mx, pos); mn = Math.min(mn, neg);
      });
      const x0 = labelW + (mn < 0 ? 84 : 0);   // místo pro popisek záporné hodnoty vlevo od sloupce
      const x1 = W - padR;
      const H = top + rows.length * rowH + axisH;
      const nt = niceTicks(mn, mx || 1, Math.max(3, Math.floor((x1 - x0) / 90)));
      const sx = (v) => x0 + ((v - nt.lo) / (nt.hi - nt.lo)) * (x1 - x0);

      const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': opts.title });
      // mřížka + osa (hairline, plná)
      nt.ticks.forEach((t) => {
        el('line', { x1: sx(t), x2: sx(t), y1: top, y2: top + rows.length * rowH, stroke: t === 0 ? '#c3c2b7' : '#e1e0d9', 'stroke-width': 1 }, svg);
        const lab = el('text', { x: sx(t), y: H - 8, 'text-anchor': 'middle', fill: MUTED, 'font-size': 11, class: 'tn' }, svg);
        lab.textContent = fmtAxis(t, nt.hi);
      });

      rows.forEach((r, ri) => {
        const y = top + ri * rowH + (rowH - bar) / 2;
        const g = el('g', { class: 'kbp-row', tabindex: 0, role: 'img', 'aria-label': r.label + ': ' + r.values.map((v, i) => (series[i].name ? series[i].name + ' ' : '') + fmt(v || 0)).join(', ') }, svg);
        // popisek řádku (text token, ne barva řady)
        const name = r.label.length > 34 ? r.label.slice(0, 33) + '…' : r.label;
        const t = el('text', { x: labelW - 10, y: y + bar / 2 + 4, 'text-anchor': 'end', 'font-size': 12.5, fill: r.muted ? '#52514e' : '#0b0b0b' }, g);
        t.textContent = name;
        if (name !== r.label) { const ti = el('title', {}, g); ti.textContent = r.label; }

        let posCur = 0, negCur = 0, firstPos = true, firstNeg = true;
        const segs = [];
        r.values.forEach((v, i) => {
          v = v || 0;
          if (v === 0) return;
          let a, b;
          if (opts.stacked) {
            if (v >= 0) { a = posCur; b = posCur + v; posCur = b; } else { a = negCur; b = negCur + v; negCur = b; }
          } else { a = 0; b = v; if (v >= 0) posCur = Math.max(posCur, v); else negCur = Math.min(negCur, v); }
          segs.push({ a, b, i, v });
        });
        // poslední segment na každé straně má zaoblený konec (data-end), u baseline zůstává rovný
        const lastPos = segs.filter((s) => s.v > 0).slice(-1)[0];
        const lastNeg = segs.filter((s) => s.v < 0).slice(-1)[0];
        segs.forEach((s) => {
          const gap = 2;
          let px1 = sx(s.a), px2 = sx(s.b);
          let xl = Math.min(px1, px2), xr = Math.max(px1, px2);
          const isPos = s.v > 0;
          const isFirst = isPos ? s.a === 0 : s.a === 0;
          if (opts.stacked && !isFirst) { if (isPos) xl += gap; else xr -= gap; }
          const w = Math.max(0, xr - xl);
          if (w <= 0) return;
          const side = isPos ? (s === lastPos ? 'right' : 'none') : (s === lastNeg ? 'left' : 'none');
          el('path', { d: barPath(xl, y, w, bar, 4, side), fill: r.color || series[s.i].color, class: 'kbp-mark' }, g);
        });

        // hodnota na konci sloupce (součet u skládaných)
        const total = opts.stacked ? r.values.reduce((s, v) => s + (v || 0), 0) : (r.values[0] || 0);
        const hasPos = posCur > 0;
        const lx = hasPos ? sx(posCur) + 8 : sx(negCur) - 8;
        const lab = el('text', { x: lx, y: y + bar / 2 + 4, 'text-anchor': hasPos ? 'start' : 'end', 'font-size': 12, 'font-weight': 600, fill: '#0b0b0b', class: 'tn' }, g);
        lab.textContent = fmt(total);

        // hit oblast přes celý řádek (větší než značka)
        const hit = el('rect', { x: 0, y: top + ri * rowH, width: W, height: rowH, fill: 'transparent' }, g);
        const show = (ev) => showTip(r, series, opts.stacked, fmt, ev.clientX, ev.clientY);
        hit.addEventListener('pointermove', show);
        hit.addEventListener('pointerleave', hideTip);
        g.addEventListener('focus', () => { const bb = g.getBoundingClientRect(); showTip(r, series, opts.stacked, fmt, bb.left + labelW, bb.top); });
        g.addEventListener('blur', hideTip);
      });
      plot.appendChild(svg);
    }
    return { el: card, draw };
  }

  window.KBP = window.KBP || {};
  window.KBP.charts = { hbar, SLOT, GRAY, fmtKc, hideTip };
})();
