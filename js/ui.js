/* ui.js – vykreslování, formuláře, výsledky. Všechny texty se vkládají přes textContent / createTextNode. */
(function () {
  'use strict';
  const { calc, store, charts } = window.KBP;
  const state = store.load();
  const cur = () => state.clients.find((c) => c.id === state.active) || state.clients[0];
  const persist = () => store.save(state);
  const $ = (s) => document.querySelector(s);
  const nb = ' ';

  const kc = (n) => Math.round(n).toLocaleString('cs-CZ') + nb + 'Kč';
  const pct = (x) => (x * 100).toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + nb + '%';
  const dash = '–';

  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        const v = attrs[k];
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'text') e.textContent = v;
        else if (k.startsWith('on')) e[k] = v;
        else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'hidden') e[k] = v;
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const kid of kids.flat()) {
      if (kid === null || kid === undefined || kid === false) continue;
      e.appendChild(typeof kid === 'string' || typeof kid === 'number' ? document.createTextNode(String(kid)) : kid);
    }
    return e;
  }

  /* ---------- aktualizace ---------- */
  let raf = 0;
  let lives = [];
  function refreshLive() { lives.forEach((fn) => fn()); }
  function scheduleResults() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { renderResults(); refreshLive(); });
  }
  const onChange = () => { persist(); scheduleResults(); };
  function structural() { persist(); renderRail(); renderToggles(); renderTabs(); renderForms(); renderResults(); }
  function live(fn) { const s = h('span', { class: 'live tn' }); const upd = () => { s.textContent = fn(); }; lives.push(upd); upd(); return s; }

  /* ---------- toast ---------- */
  let toastTimer = 0;
  function toast(msg, bad) {
    const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (bad ? ' bad' : '');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.className = 'toast'; }, 5000);
  }

  /* ---------- pole formulářů ---------- */
  function numField(label, obj, key, o) {
    o = o || {};
    const input = h('input', { type: 'number', step: o.step || 'any', min: o.min === undefined ? 0 : o.min, value: obj[key], inputmode: 'decimal' });
    input.oninput = () => { const v = parseFloat(input.value); obj[key] = Number.isFinite(v) ? v : 0; onChange(); };
    return h('label', { class: 'field' + (o.wide ? ' wide' : '') },
      h('span', { class: 'lbl', text: label }),
      h('span', { class: 'inp' }, input, o.suffix ? h('em', { text: o.suffix }) : null),
      o.hint ? h('small', null, o.hint) : null);
  }
  function textField(label, obj, key, o) {
    o = o || {};
    const input = h('input', { type: 'text', value: obj[key], maxlength: o.max || 80 });
    input.oninput = () => { obj[key] = input.value; if (o.rail) renderRail(); onChange(); };
    return h('label', { class: 'field wide' }, h('span', { class: 'lbl', text: label }), h('span', { class: 'inp' }, input));
  }
  function selectField(label, obj, key, options, hint) {
    const sel = h('select', null, options.map(([v, t]) => h('option', { value: v, text: t })));
    sel.value = obj[key];
    sel.onchange = () => { obj[key] = sel.value; onChange(); };
    return h('label', { class: 'field wide' }, h('span', { class: 'lbl', text: label }), h('span', { class: 'inp' }, sel), hint ? h('small', null, hint) : null);
  }
  function checkField(label, obj, key, hint) {
    const cb = h('input', { type: 'checkbox', checked: !!obj[key] });
    cb.onchange = () => { obj[key] = cb.checked; structural(); };
    return h('label', { class: 'field wide check' }, cb, h('span', null, h('span', { class: 'lbl', text: label }), hint ? h('small', null, hint) : null));
  }
  function itemList(arr, o) {
    o = o || {};
    const total = h('strong', { class: 'tn' });
    const upd = () => { total.textContent = kc(calc.sum(arr)) + (o.per || ''); };
    const wrap = h('div', { class: 'items' });
    arr.forEach((it, idx) => {
      const lab = h('input', { type: 'text', value: it.label, maxlength: 60, 'aria-label': 'Název položky' });
      lab.oninput = () => { it.label = lab.value; onChange(); };
      const amt = h('input', { type: 'number', step: 'any', min: 0, value: it.amount, 'aria-label': 'Částka: ' + it.label });
      amt.oninput = () => { const v = parseFloat(amt.value); it.amount = Number.isFinite(v) ? v : 0; upd(); onChange(); };
      const del = h('button', { type: 'button', class: 'icon', title: 'Odebrat položku', 'aria-label': 'Odebrat položku ' + it.label, text: '×', onclick: () => { arr.splice(idx, 1); persist(); renderForms(); scheduleResults(); } });
      wrap.appendChild(h('div', { class: 'item' }, lab, h('span', { class: 'inp' }, amt, h('em', { text: o.unit || 'Kč' })), del));
    });
    const foot = h('div', { class: 'items-foot' });
    if (arr.length < store.MAX_ITEMS) foot.appendChild(h('button', { type: 'button', class: 'link', text: '+ ' + (o.add || 'Přidat položku'), onclick: () => { arr.push({ id: store.uid(), label: 'Nová položka', amount: 0 }); persist(); renderForms(); } }));
    foot.appendChild(h('span', { class: 'items-total' }, o.totalLabel || 'Celkem', ' ', total));
    wrap.appendChild(foot);
    upd();
    return wrap;
  }
  const card = (title, ...kids) => h('section', { class: 'card' }, h('h3', { text: title }), kids);
  const grid = (...kids) => h('div', { class: 'grid2' }, kids);

  /* ---------- levý panel: klienti ---------- */
  function renderRail() {
    const rail = $('#rail'); rail.textContent = '';
    rail.appendChild(h('h2', { text: 'Klienti' }));
    const ul = h('div', { class: 'clients', role: 'list' });
    state.clients.forEach((c) => {
      const f = calc.flags(c.toggles);
      const tags = [f.hasOld ? 'stávající byt' : 'bez stávajícího bytu', f.buyNew ? c.variants.length + ' var.' : null].filter(Boolean).join(' · ');
      ul.appendChild(h('button', { type: 'button', role: 'listitem', class: 'client' + (c.id === state.active ? ' on' : ''), onclick: () => { state.active = c.id; persist(); structural(); }, 'aria-current': c.id === state.active ? 'true' : null },
        h('strong', { text: c.name || '(bez jména)' }), h('small', { text: tags })));
    });
    rail.appendChild(ul);
    const add = () => {
      if (state.clients.length >= store.MAX_CLIENTS) return toast('Maximum ' + store.MAX_CLIENTS + ' klientů.', true);
      const c = store.blankClient(); state.clients.push(c); state.active = c.id; structural();
    };
    const dup = () => {
      if (state.clients.length >= store.MAX_CLIENTS) return toast('Maximum ' + store.MAX_CLIENTS + ' klientů.', true);
      const copy = store.normalizeClient(JSON.parse(JSON.stringify(cur())));
      copy.name = (cur().name + ' (kopie)').slice(0, 80);
      state.clients.push(copy); state.active = copy.id; structural();
    };
    const del = () => {
      if (state.clients.length <= 1) return toast('Poslední klienta nelze smazat.', true);
      if (!confirm('Smazat klienta „' + cur().name + '“? Nelze vrátit, pokud ho nemáte exportovaného.')) return;
      state.clients = state.clients.filter((c) => c.id !== state.active); state.active = state.clients[0].id; structural();
    };
    rail.appendChild(h('div', { class: 'btnrow' },
      h('button', { type: 'button', class: 'btn primary', text: '+ Nový klient', onclick: add }),
      h('button', { type: 'button', class: 'btn', text: 'Duplikovat', onclick: dup }),
      h('button', { type: 'button', class: 'btn danger', text: 'Smazat', onclick: del })));

    rail.appendChild(h('h2', { class: 'mt', text: 'Záloha dat' }));
    const last = store.lastExport();
    const days = last ? Math.floor((Date.now() - last) / 864e5) : null;
    const stale = last === 0 || days >= 7;
    rail.appendChild(h('p', { class: 'backup' + (stale ? ' warn' : '') },
      stale ? h('span', { class: 'badge', text: '⚠ Pozor' }) : null,
      last === 0 ? ' Zatím nezálohováno. Data jsou jen v tomto prohlížeči a smažou se spolu s jeho daty.' : (days >= 7 ? ' Poslední záloha před ' + days + ' dny.' : ' Poslední záloha: ' + (days === 0 ? 'dnes' : 'před ' + days + ' dny') + '.')));
    const file = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    file.onchange = () => {
      const f = file.files[0]; file.value = '';
      if (!f) return;
      if (f.size > 2 * 1024 * 1024) return toast('Soubor je příliš velký (max 2 MB).', true);
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const imported = store.parseImport(String(fr.result));
          const room = store.MAX_CLIENTS - state.clients.length;
          if (room <= 0) return toast('Maximum ' + store.MAX_CLIENTS + ' klientů.', true);
          const use = imported.slice(0, room);
          state.clients.push(...use); state.active = use[0].id; structural();
          toast('Importováno klientů: ' + use.length + '.');
        } catch (e) { toast('Import se nezdařil: ' + e.message, true); }
      };
      fr.readAsText(f);
    };
    const download = (clients, name) => {
      const blob = new Blob([store.exportPayload(clients)], { type: 'application/json' });
      const a = h('a', { href: URL.createObjectURL(blob), download: name });
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      store.markExported(); renderRail();
    };
    const slug = (s) => (s || 'klient').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40) || 'klient';
    const stamp = new Date().toISOString().slice(0, 10);
    rail.appendChild(h('div', { class: 'btnrow col' },
      h('button', { type: 'button', class: 'btn', text: 'Exportovat klienta (JSON)', onclick: () => download([cur()], 'klient-' + slug(cur().name) + '-' + stamp + '.json') }),
      h('button', { type: 'button', class: 'btn', text: 'Exportovat všechny (JSON)', onclick: () => download(state.clients, 'klienti-vsichni-' + stamp + '.json') }),
      h('button', { type: 'button', class: 'btn', text: 'Importovat JSON…', onclick: () => file.click() }),
      file));
    rail.appendChild(h('div', { class: 'btnrow col mt' },
      h('button', { type: 'button', class: 'btn subtle', text: 'Obnovit ukázková data', onclick: () => {
        if (!confirm('Všichni klienti budou nahrazeni ukázkovými daty. Pokračovat?')) return;
        state.clients = store.seed(); state.active = state.clients[0].id; structural();
      } })));
    rail.appendChild(h('p', { class: 'fine', text: 'Žádná data se neposílají na server. Ukládá se jen do localStorage tohoto prohlížeče.' }));
  }

  /* ---------- přepínače situací ---------- */
  const TOGGLES = [
    ['hasOld', 'Mám stávající byt', 'Zapíná modul stávajícího bytu.'],
    ['oldMortgage', 'Stávající hypotéka', 'Zůstatek, sazba a splátka stávající hypotéky.', (t) => !t.hasOld],
    ['refix', 'Končí fixace', 'Přepočet splátky po refixaci.', (t) => !t.hasOld || !t.oldMortgage],
    ['sell', 'Prodat stávající byt', 'Výtěžek jde do zdrojů pro nový byt. Vylučuje pronájem.', (t) => !t.hasOld],
    ['rent', 'Pronajímat stávající byt', 'Příjem z nájmu a daň A/B/C. Vylučuje prodej.', (t) => !t.hasOld],
    ['buyNew', 'Koupit nový byt', 'Varianty nových nemovitostí a jejich srovnání.'],
    ['annual', 'Roční výdaje', 'Jednorázové roční výdaje domácnosti (÷ 12 do měsíčního cashflow).']
  ];
  function renderToggles() {
    const c = cur(); const t = c.toggles; const box = $('#toggles'); box.textContent = '';
    box.appendChild(h('div', { class: 'tg-title' }, h('strong', { text: 'Situace klienta' }), h('small', { text: 'Přepínače mění formuláře i výstupy.' })));
    const row = h('div', { class: 'chips' });
    TOGGLES.forEach(([key, label, hint, dis]) => {
      const off = dis ? dis(t) : false;
      const cb = h('input', { type: 'checkbox', checked: !!t[key], disabled: off });
      cb.onchange = () => {
        t[key] = cb.checked;
        if (key === 'sell' && cb.checked) t.rent = false;
        if (key === 'rent' && cb.checked) t.sell = false;
        structural();
      };
      row.appendChild(h('label', { class: 'chip' + (t[key] && !off ? ' on' : '') + (off ? ' off' : ''), title: hint }, cb, h('span', { text: label })));
    });
    box.appendChild(row);
  }

  /* ---------- záložky ---------- */
  function visibleTabs(c) {
    const f = calc.flags(c.toggles);
    const tabs = [['domacnost', 'Domácnost']];
    if (f.hasOld) tabs.push(['stary', 'Stávající byt']);
    if (f.buyNew) tabs.push(['nove', 'Nové byty (' + c.variants.length + ')']);
    return tabs;
  }
  function renderTabs() {
    const c = cur(); const tabs = visibleTabs(c);
    if (!tabs.some(([k]) => k === c.ui.tab)) c.ui.tab = tabs[0][0];
    const nav = $('#tabs'); nav.textContent = '';
    tabs.forEach(([k, label]) => nav.appendChild(h('button', { type: 'button', class: 'tab' + (c.ui.tab === k ? ' on' : ''), role: 'tab', 'aria-selected': c.ui.tab === k ? 'true' : 'false', text: label, onclick: () => { c.ui.tab = k; persist(); renderTabs(); renderForms(); } })));
  }

  /* ---------- formuláře ---------- */
  function renderForms() {
    const c = cur(); const f = calc.flags(c.toggles); const box = $('#forms'); box.textContent = ''; lives = [];
    if (c.ui.tab === 'domacnost') {
      box.appendChild(card('Klient',
        textField('Jméno (fiktivní)', c, 'name', { rail: true }),
        textField('Poznámka', c, 'note', { max: 400 }),
        grid(numField('Úspory k dispozici (Kč)', c, 'savings', { suffix: 'Kč', hint: 'Jeden společný balík. Každá varianta s ním nakládá zvlášť.' }))));
      box.appendChild(card('Měsíční příjmy (čisté)', itemList(c.incomes, { add: 'Přidat příjem', unit: 'Kč/měs.', totalLabel: 'Celkem měsíčně' })));
      box.appendChild(card('Měsíční výdaje domácnosti', h('p', { class: 'hint', text: 'Bez splátek hypotéky a provozu bytů – ty se zadávají u nemovitostí.' }), itemList(c.expenses, { unit: 'Kč/měs.', totalLabel: 'Celkem měsíčně' })));
      if (f.annual) box.appendChild(card('Roční jednorázové výdaje', itemList(c.annual, { unit: 'Kč/rok', totalLabel: 'Celkem ročně' }), h('p', { class: 'hint' }, 'Do měsíčního cashflow se počítají jako 1/12: ', live(() => kc(calc.sum(c.annual) / 12) + ' měsíčně'))));
    } else if (c.ui.tab === 'stary' && f.hasOld) {
      renderOldForms(c, f, box);
    } else if (c.ui.tab === 'nove' && f.buyNew) {
      renderVariantForms(c, f, box);
    }
  }

  function renderOldForms(c, f, box) {
    const o = c.old;
    box.appendChild(card('Stávající byt',
      grid(numField('Odhadní cena (Kč)', o, 'value', { suffix: 'Kč' }), numField('Pořizovací cena (Kč)', o, 'acquisitionPrice', { suffix: 'Kč', hint: 'Pro daň z prodeje a odpisy.' })),
      h('h4', { class: 'sub', text: 'Provozní náklady vlastníka' }),
      itemList(o.running, { unit: 'Kč/měs.', totalLabel: 'Celkem měsíčně' })));
    if (f.oldMortgage) {
      box.appendChild(card('Stávající hypotéka',
        grid(numField('Zůstatek jistiny (Kč)', o, 'mortgageBalance', { suffix: 'Kč' }),
          numField('Úroková sazba (% p.a.)', o, 'rate', { suffix: '%', step: 0.01 }),
          numField('Zbývá měsíců do splacení', o, 'monthsLeft', { suffix: 'měs.', step: 1 }),
          numField('Splátka – přepsat ručně (Kč)', o, 'paymentOverride', { suffix: 'Kč', hint: '0 = dopočítat z výše uvedeného.' }),
          numField('Pojištění hypotéky (Kč/měs.)', o, 'insurance', { suffix: 'Kč', hint: 'Pevná částka, nepřepočítává se podle úvěru.' })),
        h('p', { class: 'hint' }, 'Dopočtená splátka: ', live(() => { const R = calc.computeClient(c); return kc(R.old ? R.old.autoPayment : 0); }))));
    }
    if (f.refix) {
      box.appendChild(card('Konec fixace',
        grid(numField('Měsíců do konce fixace', o, 'monthsToFixEnd', { suffix: 'měs.', step: 1 }), numField('Nová sazba po fixaci (% p.a.)', o, 'newRate', { suffix: '%', step: 0.01 })),
        h('p', { class: 'hint' }, 'Splátka po refixaci: ', live(() => { const R = calc.computeClient(c); return kc(R.old ? R.old.paymentAfterRefix : 0); }))));
    }
    if (f.sell) {
      box.appendChild(card('Prodej stávajícího bytu',
        grid(numField('Provize a služby (% z ceny)', o.sale, 'commissionPct', { suffix: '%', step: 0.1 }),
          numField('Ostatní náklady prodeje (Kč)', o.sale, 'otherCosts', { suffix: 'Kč', hint: 'Právník, průkaz energetické náročnosti apod.' }),
          numField('Poplatek za předčasné splacení (Kč)', o.sale, 'earlyFee', { suffix: 'Kč' })),
        checkField('Příjem z prodeje je osvobozen od daně', o.sale, 'taxExempt', 'Platí např. při 2 letech bydliště, při splnění časového testu (u nabytí od 2021 10 let) nebo při použití peněz na vlastní bytovou potřebu. Podmínky musí posoudit poradce.'),
        !o.sale.taxExempt ? grid(numField('Sazba daně (%)', o.sale, 'taxRate', { suffix: '%', step: 0.1 })) : null));
    }
    if (f.rent) {
      box.appendChild(card('Pronájem stávajícího bytu',
        grid(numField('Nájemné (Kč/měs.)', o.rent, 'monthlyRent', { suffix: 'Kč' }),
          numField('Neobsazenost (měsíců v roce)', o.rent, 'vacancyMonths', { suffix: 'měs.', step: 0.5 }),
          numField('Správa bytu (% z nájmu)', o.rent, 'managementPct', { suffix: '%', step: 0.1 }),
          numField('Opravy a údržba (Kč/rok)', o.rent, 'repairsYear', { suffix: 'Kč' })),
        selectField('Varianta zdanění', o.rent, 'taxVariant', [['A', 'A – paušální výdaje 30 % (max. 600 000 Kč)'], ['B', 'B – skutečné výdaje'], ['C', 'C – skutečné výdaje + odpisy']], 'Zjednodušený model, nikdo ho neověřil. Provozní náklady z karty bytu a úroky z hypotéky se berou jako výdaj u B a C.'),
        grid(numField('Sazba daně (%)', o.rent, 'taxRate', { suffix: '%', step: 0.1, hint: 'Základní 15 %. Vyšší sazba nad limitem se nepočítá.' }),
          numField('Odpisová základna (Kč)', o.rent, 'depreciationBase', { suffix: 'Kč', hint: 'Vstupní cena bytu bez pozemku, jen pro variantu C.' }),
          numField('Roční sazba odpisů (%)', o.rent, 'depreciationRatePct', { suffix: '%', step: 0.1, hint: 'Skupina 5, rovnoměrně: 1,4 % v prvním roce, 3,4 % dále.' }))));
    }
  }

  function renderVariantForms(c, f, box) {
    const vs = c.variants;
    c.ui.variant = Math.max(0, Math.min(vs.length - 1, c.ui.variant));
    const v = vs[c.ui.variant];
    const pills = h('div', { class: 'pills' });
    let pillText = null;
    vs.forEach((x, i) => {
      const b = h('button', { type: 'button', class: 'pill' + (i === c.ui.variant ? ' on' : ''), text: x.name || 'Varianta ' + (i + 1), onclick: () => { c.ui.variant = i; persist(); renderForms(); } });
      if (i === c.ui.variant) pillText = b;
      pills.appendChild(b);
    });
    const bar = h('div', { class: 'varbar' }, pills,
      h('button', { type: 'button', class: 'btn', text: '+ Varianta', disabled: vs.length >= store.MAX_VARIANTS, onclick: () => { vs.push(store.blankVariant('Varianta ' + (vs.length + 1))); c.ui.variant = vs.length - 1; persist(); renderTabs(); renderForms(); renderResults(); } }),
      h('button', { type: 'button', class: 'btn danger', text: 'Smazat', disabled: vs.length <= 1, onclick: () => { if (!confirm('Smazat variantu „' + v.name + '“?')) return; vs.splice(c.ui.variant, 1); c.ui.variant = Math.max(0, c.ui.variant - 1); persist(); renderTabs(); renderForms(); renderResults(); } }));
    box.appendChild(bar);

    const nameInput = h('input', { type: 'text', value: v.name, maxlength: 60 });
    nameInput.oninput = () => { v.name = nameInput.value; if (pillText) pillText.textContent = v.name || 'Varianta'; onChange(); };
    box.appendChild(card('Nemovitost',
      h('label', { class: 'field wide' }, h('span', { class: 'lbl', text: 'Název varianty' }), h('span', { class: 'inp' }, nameInput)),
      grid(numField('Kupní cena (Kč)', v, 'price', { suffix: 'Kč' }), numField('Náklady na pořízení (Kč)', v, 'buyCosts', { suffix: 'Kč', hint: 'Provize, právník, poplatek za vklad.' }))));
    box.appendChild(card('Rekonstrukce', itemList(v.reno, { unit: 'Kč', totalLabel: 'Rekonstrukce celkem' })));
    const left = () => calc.sum([]) + Math.round(calc.num(c.savings) - calc.num(v.savingsReno) - calc.num(v.savingsMortgage));
    box.appendChild(card('Financování z úspor',
      grid(numField('Úspory na rekonstrukci (Kč)', v, 'savingsReno', { suffix: 'Kč' }), numField('Úspory na snížení hypotéky (Kč)', v, 'savingsMortgage', { suffix: 'Kč' })),
      h('p', { class: 'hint' }, 'Úspory klienta: ', kc(c.savings), ' · po použití zbývá: ', live(() => kc(left())), f.sell ? ' · výtěžek z prodeje se přičte automaticky.' : '')));
    box.appendChild(card('Hypotéka',
      grid(numField('Úroková sazba (% p.a.)', v, 'rate', { suffix: '%', step: 0.01 }), numField('Doba splácení (let)', v, 'years', { suffix: 'let', step: 1 }),
        numField(f.hasOld ? 'Pojištění hypotéky – starý byt prodán nebo žádný (Kč/měs.)' : 'Pojištění hypotéky (Kč/měs.)', v, 'insFree', { suffix: 'Kč', hint: 'Pevná částka, nepřepočítává se podle úvěru.' }),
        f.hasOld ? numField('Pojištění hypotéky – starý byt ponechán (Kč/měs.)', v, 'insKeep', { suffix: 'Kč', hint: 'Vyšší hypotéka, vyšší pojistné. Použije se, když se starý byt neprodává.' }) : null),
      h('p', { class: 'hint' }, 'Výše nové hypotéky: ', live(() => { const R = calc.computeClient(c); const x = R.variants[c.ui.variant]; return x ? kc(x.loan) + ' · splátka ' + kc(x.payment) : dash; }))));
    box.appendChild(card('Provozní náklady nového bytu', itemList(v.running, { unit: 'Kč/měs.', totalLabel: 'Celkem měsíčně' })));
  }

  /* ---------- výsledky ---------- */
  let draws = [];
  const tile = (label, value, sub, cls) => h('div', { class: 'tile ' + (cls || '') }, h('span', { class: 'tl', text: label }), h('strong', { text: value }), sub ? h('small', { text: sub }) : null);

  function table(cls, head, body) {
    return h('div', { class: 'tblwrap' }, h('table', { class: 'tbl ' + (cls || '') }, h('thead', null, head), h('tbody', null, body)));
  }

  function compTable(R, c) {
    const f = R.flags;
    const vs = R.variants;
    const hasBase = !!R.baseline;
    const defs = [
      { g: 'Pořízení' },
      { l: 'Kupní cena', v: (x) => x.price },
      { l: 'Náklady na pořízení', v: (x) => x.buyCosts },
      { l: 'Rekonstrukce celkem', v: (x) => x.reno },
      { l: 'Potřeba celkem', v: (x) => x.needs, strong: true },
      { g: 'Zdroje a hypotéka' },
      { l: 'Úspory použité', v: (x) => x.savingsUsed },
      { l: 'Výtěžek z prodeje starého bytu', v: (x) => x.proceeds, show: f.sell },
      { l: 'Nová hypotéka', v: (x) => x.loan, best: 'min', strong: true },
      { l: 'LTV (hypotéka / kupní cena)', v: (x) => x.ltv, fmt: pct, best: 'min' },
      { g: 'Měsíčně' },
      { l: 'Splátka nové hypotéky', v: (x) => x.payment, best: 'min' },
      { l: 'Pojištění hypotéky', v: (x) => x.insurance },
      { l: 'Provozní náklady nového bytu', v: (x) => x.running },
      { l: 'Starý byt (splátka + provoz − nájem po dani)', v: (x) => x.oldNet, show: f.keep },
      { l: 'Bydlení celkem', v: (x) => x.housing, base: R.baseline && R.baseline.housing, best: 'min', strong: true },
      { l: 'Výdaje domácnosti (vč. ročních ÷ 12)', v: () => R.household, base: R.household },
      { l: 'Příjem domácnosti', v: () => R.income, base: R.income },
      { l: 'Volné cashflow', v: (x) => x.free, base: R.baseline && R.baseline.free, best: 'max', strong: true },
      { l: 'Splátky / příjem (orientačně)', v: (x) => x.dsti, fmt: pct, base: R.old && R.income > 0 ? R.old.paymentUsed / R.income : null, best: 'min' }
    ];
    const head = h('tr', null, h('th', { text: '' }), hasBase ? h('th', { class: 'num base', text: 'Stávající stav' }) : null, vs.map((x) => h('th', { class: 'num', text: x.name || '–' })));
    const body = [];
    defs.forEach((d) => {
      if (d.show === false) return;
      if (d.g) { body.push(h('tr', { class: 'grp' }, h('th', { colspan: 1 + (hasBase ? 1 : 0) + vs.length, text: d.g }))); return; }
      const vals = vs.map((x) => d.v(x));
      let bestIdx = -1;
      if (d.best && vs.length > 1) {
        const nums = vals.map((v) => (v === null || v === undefined ? NaN : v));
        const target = d.best === 'min' ? Math.min(...nums.filter((n) => !isNaN(n))) : Math.max(...nums.filter((n) => !isNaN(n)));
        if (Number.isFinite(target)) bestIdx = nums.findIndex((n) => Math.abs(n - target) < 1e-6);
        if (nums.filter((n) => Math.abs(n - target) < 1e-6).length > 1) bestIdx = -1;
      }
      const fm = d.fmt || kc;
      // rozdíl, který se po zaokrouhlení na displeji neukáže, nevyznačujeme jako „nejlepší“
      if (bestIdx >= 0 && vals.some((v, i) => i !== bestIdx && v !== null && fm(v) === fm(vals[bestIdx]))) bestIdx = -1;
      const cell = (v, extra) => h('td', { class: 'num tn' + (extra || '') }, v === null || v === undefined ? dash : fm(v));
      body.push(h('tr', { class: d.strong ? 'strong' : '' }, h('th', { text: d.l }),
        hasBase ? (d.base === undefined || d.base === null || d.base === false ? h('td', { class: 'num base', text: dash }) : h('td', { class: 'num tn base', text: fm(d.base) })) : null,
        vals.map((v, i) => h('td', { class: 'num tn' + (i === bestIdx ? ' best' : ''), title: i === bestIdx ? 'Nejlepší z variant v tomto řádku' : null }, v === null || v === undefined ? dash : fm(v), i === bestIdx ? h('span', { class: 'bestmark', 'aria-label': 'nejlepší', text: ' ✓' }) : null))));
    });
    return table('comp', head, body);
  }

  function comparisonCharts(R) {
    const f = R.flags; const vs = R.variants; const wrap = h('div', { class: 'charts' });
    const S = charts.SLOT;
    // A – měsíční náklady bydlení (skládané)
    const serA = [{ name: 'Splátka nové hypotéky', color: S[0] }, { name: 'Pojištění hypotéky', color: S[1] }, { name: 'Provoz nového bytu', color: S[2] }];
    if (f.hasOld) serA.push({ name: 'Stávající byt (po odečtu nájmu)', color: S[3] });
    const rowsA = [];
    if (R.baseline) rowsA.push({ label: 'Stávající stav', values: [0, 0, 0, R.baseline.housing], muted: true });
    vs.forEach((x) => rowsA.push({ label: x.name, values: f.hasOld ? [x.payment, x.insurance, x.running, x.oldNet] : [x.payment, x.insurance, x.running] }));
    const A = charts.hbar({ title: 'Měsíční náklady na bydlení', subtitle: 'Kč měsíčně, součet na konci sloupce', series: serA, rows: rowsA, stacked: true, tableHeaders: ['Varianta'] });
    // B – volné cashflow (emphasis: stávající stav šedě)
    const rowsB = [];
    if (R.baseline) rowsB.push({ label: 'Stávající stav', values: [R.baseline.free], color: charts.GRAY, muted: true });
    vs.forEach((x) => rowsB.push({ label: x.name, values: [x.free] }));
    const B = charts.hbar({ title: 'Volné cashflow domácnosti', subtitle: 'Příjem − výdaje domácnosti − bydlení, Kč měsíčně', series: [{ name: 'Volné cashflow', color: S[0] }], rows: rowsB, stacked: false, tableHeaders: ['Varianta'] });
    // C – financování
    const serC = [{ name: 'Úspory', color: S[0] }];
    if (f.sell) serC.push({ name: 'Výtěžek z prodeje', color: S[1] });
    serC.push({ name: 'Nová hypotéka', color: S[2] });
    const rowsC = vs.map((x) => ({ label: x.name, values: f.sell ? [x.savingsUsed, x.proceeds, x.loan] : [x.savingsUsed, x.loan] }));
    const C = charts.hbar({ title: 'Jak se pořízení financuje', subtitle: 'Kupní cena + náklady + rekonstrukce, Kč', series: serC, rows: rowsC, stacked: true, tableHeaders: ['Varianta'] });
    [A, B, C].forEach((ch) => { wrap.appendChild(ch.el); draws.push(ch.draw); });
    return wrap;
  }

  function oldSections(R, c, root) {
    const f = R.flags; const o = R.old;
    if (f.oldMortgage) {
      const sec = h('section', { class: 'panel' }, h('h3', { text: 'Stávající hypotéka' }));
      const tiles = [tile('Splátka dnes', kc(o.payment), 'Zůstatek ' + kc(o.balance))];
      if (f.refix) {
        tiles.push(tile('Zůstatek na konci fixace', kc(o.balanceAtFixEnd), 'za ' + o.monthsToFixEnd + ' měs.'));
        tiles.push(tile('Splátka po refixaci', kc(o.paymentAfterRefix), 'sazba ' + calc.num(c.old.newRate).toLocaleString('cs-CZ') + ' %, zbývá ' + o.remaining + ' měs.'));
        const d = o.refixDelta;
        tiles.push(tile('Změna splátky', (d >= 0 ? '▲ +' : '▼ −') + kc(Math.abs(d)), d >= 0 ? 'splátka roste' : 'splátka klesá', d > 0 ? 'warn' : ''));
      }
      sec.appendChild(h('div', { class: 'tiles' }, tiles));
      if (f.refix) {
        const ch = charts.hbar({ title: 'Splátka před a po refixaci', subtitle: 'Kč měsíčně', series: [{ name: 'Splátka', color: charts.SLOT[0] }], rows: [{ label: 'Dnes', values: [o.payment], color: charts.GRAY, muted: true }, { label: 'Po refixaci', values: [o.paymentAfterRefix] }], tableHeaders: ['Období'] });
        sec.appendChild(ch.el); draws.push(ch.draw);
      }
      root.appendChild(sec);
    }
    if (f.sell && o.sale) {
      const s = o.sale;
      const rows = [['Prodejní cena', s.price], ['− Provize a služby', -s.commission], ['− Ostatní náklady prodeje', -s.otherCosts], ['− Splacení hypotéky', -s.balance], ['− Poplatek za předčasné splacení', -s.earlyFee], ['− Daň z prodeje' + (s.taxExempt ? ' (osvobozeno)' : ''), -s.tax]];
      const body = rows.map(([l, v]) => h('tr', null, h('th', { text: l }), h('td', { class: 'num tn', text: kc(v) })));
      body.push(h('tr', { class: 'strong' }, h('th', { text: 'Čistý výtěžek do zdrojů pro nový byt' }), h('td', { class: 'num tn', text: kc(s.proceeds) })));
      root.appendChild(h('section', { class: 'panel' }, h('h3', { text: 'Prodej stávajícího bytu' }), table('narrow', h('tr', null, h('th', { text: 'Položka' }), h('th', { class: 'num', text: 'Částka' })), body)));
    }
    if (f.rent && o.rent) {
      const r = o.rent; const rate = calc.num(c.old.rent.taxRate);
      const head = h('tr', null, h('th', { text: '' }), ['A', 'B', 'C'].map((k) => h('th', { class: 'num' }, 'Varianta ' + k, r.chosen === k ? h('span', { class: 'sel', text: ' (zvoleno)' }) : null)));
      const row = (l, fn, strong) => h('tr', { class: strong ? 'strong' : '' }, h('th', { text: l }), ['A', 'B', 'C'].map((k) => h('td', { class: 'num tn' + (strong && k === r.best ? ' best' : '') }, fn(r[k], k), strong && k === r.best ? h('span', { class: 'bestmark', text: ' ✓' }) : null)));
      const body = [
        row('Příjmy z nájmu za rok', () => kc(r.income)),
        row('Uplatněné výdaje', (x) => kc(x.expenses)),
        row('Základ daně (ztráta se nezohledňuje)', (x) => kc(x.base)),
        row('Daň ' + rate.toLocaleString('cs-CZ') + ' % za rok', (x) => kc(x.tax), true)
      ];
      const ch = charts.hbar({ title: 'Roční daň z pronájmu podle varianty', subtitle: 'Kč za rok, modře nejnižší daň', series: [{ name: 'Daň', color: charts.SLOT[0] }], rows: ['A', 'B', 'C'].map((k) => ({ label: 'Varianta ' + k + (k === 'A' ? ' – paušál' : k === 'B' ? ' – skutečné výdaje' : ' – výdaje + odpisy'), values: [r[k].tax], color: k === r.best ? charts.SLOT[0] : charts.GRAY })), tableHeaders: ['Varianta'] });
      const tiles = h('div', { class: 'tiles' }, tile('Čistý příjem z nájmu', kc(r.netMonthly), 'měsíčně po dani, bez splátek a provozu'), tile('Zvolená varianta', 'Varianta ' + r.chosen, 'daň ' + kc(r.tax) + ' ročně'), tile('Nejnižší daň', 'Varianta ' + r.best, kc(r[r.best].tax) + ' ročně'));
      root.appendChild(h('section', { class: 'panel' }, h('h3', { text: 'Pronájem stávajícího bytu a daň' }), tiles, table('narrow', head, body), ch.el,
        h('p', { class: 'caveat' }, '⚠ Zjednodušený daňový model, žádný daňový poradce ho neověřil. Nepočítá slevy na poplatníka, zaokrouhlování základu ani vyšší sazbu 23 %.')));
      draws.push(ch.draw);
    }
  }

  function renderResults() {
    const c = cur(); const R = calc.computeClient(c); const f = R.flags;
    const root = $('#results'); const scroll = root.scrollTop; root.textContent = ''; draws = [];
    root.appendChild(h('div', { class: 'res-head' }, h('h2', { text: c.name || '(bez jména)' }), c.note ? h('p', { class: 'sub', text: c.note }) : null));

    const tiles = [tile('Příjem domácnosti', kc(R.income), 'měsíčně'), tile('Výdaje domácnosti', kc(R.household), f.annual ? 'z toho roční ÷ 12: ' + kc(R.annualMonthly) : 'měsíčně'), tile('Úspory', kc(R.savings), 'k dispozici')];
    if (R.baseline) {
      tiles.push(tile('Bydlení dnes', kc(R.baseline.housing), 'měsíčně'));
      const fr = R.baseline.free;
      tiles.push(tile('Volné cashflow dnes', kc(fr), fr < 0 ? '▼ záporné' : 'měsíčně', fr < 0 ? 'warn' : ''));
    }
    root.appendChild(h('div', { class: 'tiles' }, tiles));

    const warns = [];
    if (R.income <= 0) warns.push('Chybí příjem domácnosti – výsledky nejsou smysluplné.');
    R.variants.forEach((x) => x.warnings.forEach((w) => warns.push(x.name + ': ' + w)));
    if (warns.length) root.appendChild(h('ul', { class: 'warns', role: 'status' }, warns.map((w) => h('li', null, h('span', { class: 'wicon', text: '⚠ Upozornění' }), ' ' + w))));

    if (f.buyNew) {
      const sec = h('section', { class: 'panel' }, h('h3', { text: 'Srovnání nových bytů' }));
      if (f.refix && f.keep) {
        const mk = (mode, label) => h('button', { type: 'button', class: c.ui.refixMode === mode ? 'on' : '', text: label, onclick: () => { c.ui.refixMode = mode; persist(); renderResults(); } });
        sec.appendChild(h('div', { class: 'modebar' }, h('span', { text: 'Splátka stávající hypotéky ve srovnání:' }), h('div', { class: 'kbp-seg' }, mk('now', 'Dnešní'), mk('after', 'Po refixaci'))));
      }
      sec.appendChild(compTable(R, c));
      sec.appendChild(comparisonCharts(R));
      root.appendChild(sec);
    }
    if (f.hasOld && R.old) oldSections(R, c, root);

    root.appendChild(h('section', { class: 'panel disclaimer' }, h('h3', { text: 'Orientační výpočet – známá omezení' }),
      h('ul', null,
        h('li', { text: 'Výstup je orientační výpočet, ne nabídka banky ani závazné doporučení.' }),
        h('li', { text: 'Daň z pronájmu (A/B/C) je zjednodušený model a nikdo ho neověřil. Prodej bytu se zdaňuje jen jako příznak „osvobozeno / zdaněno“.' }),
        h('li', { text: 'Pojištění hypotéky je pevná částka zadaná ručně, nepřepočítává se podle výše úvěru.' }),
        h('li', { text: 'Výpočty nejsou nezávisle ověřené. Kontrolní příklady jsou v tests/ a v docs/KONTROLNI-PRIKLADY.md.' }),
        h('li', { text: 'Fiktivní data. Do dema nezadávejte skutečné údaje klientů.' }))));

    draws.forEach((d) => d());
    root.scrollTop = scroll;
  }

  /* ---------- start ---------- */
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(renderResults, 150); });
  document.addEventListener('scroll', () => charts.hideTip(), true);
  renderRail(); renderToggles(); renderTabs(); renderForms(); renderResults();
})();
