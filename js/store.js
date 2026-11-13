/* store.js – datový model, fiktivní ukázková data, localStorage, export/import JSON.
 * Všechna data v tomto souboru jsou VYMYŠLENÁ. Nic se neposílá na server. */
(function () {
  'use strict';
  const KEY = 'kbp.state.v1';
  const KEY_EXPORT = 'kbp.lastExport';
  const APP = 'kalkulacka-bydleni-poradce';
  const SCHEMA = 1;
  const MAX_VARIANTS = 6;
  const MAX_ITEMS = 30;
  const MAX_CLIENTS = 50;

  const uid = () => Math.random().toString(36).slice(2, 10);
  const items = (rows) => rows.map(([label, amount]) => ({ id: uid(), label, amount: amount || 0 }));

  const EXPENSE_LABELS = ['Jídlo a drogerie', 'Energie, služby, internet', 'Doprava a auto', 'Děti a škola', 'Zdraví a pojištění', 'Volný čas a restaurace', 'Ostatní'];
  const ANNUAL_LABELS = ['Pojištění auta', 'Letní dovolená', 'Servis a technická kontrola', 'Dárky a Vánoce', 'Ostatní roční výdaje'];
  const RENO_LABELS = ['Kuchyň', 'Koupelna a WC', 'Podlahy', 'Malování a stěrky', 'Topení a rozvody', 'Dveře a zárubně', 'Okna', 'Elektroinstalace', 'Nábytek a vybavení', 'Rezerva na nepředvídané'];
  const OLD_RUN_LABELS = ['Fond oprav', 'Pojištění nemovitosti', 'Daň z nemovitých věcí (měsíčně)'];
  const NEW_RUN_LABELS = ['Energie a služby', 'Fond oprav', 'Pojištění nemovitosti', 'Daň z nemovitých věcí (měsíčně)'];

  function blankVariant(name) {
    return {
      id: uid(), name: name || 'Varianta',
      price: 0, buyCosts: 0,
      reno: items(RENO_LABELS.map((l) => [l, 0])),
      savingsReno: 0, savingsMortgage: 0,
      rate: 4.7, years: 30, insFree: 0, insKeep: 0,
      running: items(NEW_RUN_LABELS.map((l) => [l, 0]))
    };
  }

  function blankClient(name) {
    return {
      id: uid(), name: name || 'Nový klient (fiktivní)', note: '',
      toggles: { hasOld: false, oldMortgage: false, refix: false, sell: false, rent: false, buyNew: true, annual: true },
      savings: 0,
      incomes: items([['Čistý příjem – osoba 1', 0]]),
      expenses: items(EXPENSE_LABELS.map((l) => [l, 0])),
      annual: items(ANNUAL_LABELS.map((l) => [l, 0])),
      old: {
        value: 0, acquisitionPrice: 0,
        mortgageBalance: 0, rate: 3, monthsLeft: 240, paymentOverride: 0, monthsToFixEnd: 12, newRate: 4.7, insurance: 0,
        running: items(OLD_RUN_LABELS.map((l) => [l, 0])),
        sale: { commissionPct: 3, otherCosts: 0, earlyFee: 0, taxExempt: true, taxRate: 15 },
        rent: { monthlyRent: 0, vacancyMonths: 1, managementPct: 0, repairsYear: 0, taxVariant: 'A', taxRate: 15, depreciationBase: 0, depreciationRatePct: 3.4 }
      },
      variants: [blankVariant('Varianta 1')],
      ui: { tab: 'domacnost', variant: 0, refixMode: 'now' }
    };
  }

  /* ---------- Fiktivní ukázková data ---------- */
  function seed() {
    const a = blankClient('Rodina Vzorová (fiktivní)');
    a.note = 'Ukázkový klient: stávající byt s hypotékou, konec fixace, zvažuje 3 nové nemovitosti.';
    a.toggles = { hasOld: true, oldMortgage: true, refix: true, sell: false, rent: true, buyNew: true, annual: true };
    a.savings = 2100000;
    a.incomes = items([['Čistý příjem – osoba 1', 64000], ['Čistý příjem – osoba 2', 53000]]);
    a.expenses = items([[EXPENSE_LABELS[0], 14500], [EXPENSE_LABELS[1], 6800], [EXPENSE_LABELS[2], 5500], [EXPENSE_LABELS[3], 4200], [EXPENSE_LABELS[4], 2600], [EXPENSE_LABELS[5], 5200], [EXPENSE_LABELS[6], 3000]]);
    a.annual = items([[ANNUAL_LABELS[0], 14000], [ANNUAL_LABELS[1], 58000], [ANNUAL_LABELS[2], 9000], [ANNUAL_LABELS[3], 15000], [ANNUAL_LABELS[4], 8000]]);
    Object.assign(a.old, {
      value: 5900000, acquisitionPrice: 3700000,
      mortgageBalance: 2150000, rate: 2.29, monthsLeft: 228, paymentOverride: 0, monthsToFixEnd: 9, newRate: 5.1, insurance: 650,
      running: items([[OLD_RUN_LABELS[0], 1900], [OLD_RUN_LABELS[1], 260], [OLD_RUN_LABELS[2], 160]])
    });
    Object.assign(a.old.sale, { commissionPct: 3, otherCosts: 25000, earlyFee: 0, taxExempt: true, taxRate: 15 });
    Object.assign(a.old.rent, { monthlyRent: 23500, vacancyMonths: 1, managementPct: 0, repairsYear: 12000, taxVariant: 'B', taxRate: 15, depreciationBase: 3700000, depreciationRatePct: 3.4 });

    const v1 = blankVariant('Byt 3+kk, Vzorové náměstí');
    Object.assign(v1, { price: 7900000, buyCosts: 80000, savingsReno: 520000, savingsMortgage: 1200000, rate: 4.69, years: 30, insFree: 950, insKeep: 1500 });
    v1.reno = items([[RENO_LABELS[0], 180000], [RENO_LABELS[1], 140000], [RENO_LABELS[2], 70000], [RENO_LABELS[3], 30000], [RENO_LABELS[4], 0], [RENO_LABELS[5], 40000], [RENO_LABELS[6], 0], [RENO_LABELS[7], 25000], [RENO_LABELS[8], 0], [RENO_LABELS[9], 35000]]);
    v1.running = items([[NEW_RUN_LABELS[0], 4200], [NEW_RUN_LABELS[1], 2600], [NEW_RUN_LABELS[2], 450], [NEW_RUN_LABELS[3], 300]]);

    const v2 = blankVariant('Byt 4+kk, Ukázková čtvrť');
    Object.assign(v2, { price: 8600000, buyCosts: 85000, savingsReno: 150000, savingsMortgage: 1950000, rate: 4.69, years: 30, insFree: 1050, insKeep: 1650 });
    v2.reno = items([[RENO_LABELS[0], 0], [RENO_LABELS[1], 0], [RENO_LABELS[2], 60000], [RENO_LABELS[3], 40000], [RENO_LABELS[4], 0], [RENO_LABELS[5], 0], [RENO_LABELS[6], 0], [RENO_LABELS[7], 0], [RENO_LABELS[8], 30000], [RENO_LABELS[9], 20000]]);
    v2.running = items([[NEW_RUN_LABELS[0], 5200], [NEW_RUN_LABELS[1], 3100], [NEW_RUN_LABELS[2], 520], [NEW_RUN_LABELS[3], 350]]);

    const v3 = blankVariant('Rodinný dům, Vzorová Lhota');
    Object.assign(v3, { price: 7200000, buyCosts: 70000, savingsReno: 380000, savingsMortgage: 1700000, rate: 4.79, years: 30, insFree: 1100, insKeep: 1700 });
    v3.reno = items([[RENO_LABELS[0], 120000], [RENO_LABELS[1], 90000], [RENO_LABELS[2], 50000], [RENO_LABELS[3], 30000], [RENO_LABELS[4], 0], [RENO_LABELS[5], 0], [RENO_LABELS[6], 0], [RENO_LABELS[7], 0], [RENO_LABELS[8], 0], [RENO_LABELS[9], 90000]]);
    v3.running = items([[NEW_RUN_LABELS[0], 5800], [NEW_RUN_LABELS[1], 0], [NEW_RUN_LABELS[2], 700], [NEW_RUN_LABELS[3], 600]]);
    a.variants = [v1, v2, v3];

    const b = blankClient('Pan Vzorný – první bydlení (fiktivní)');
    b.note = 'Ukázkový klient bez stávající nemovitosti, zvažuje 2 byty.';
    b.toggles = { hasOld: false, oldMortgage: false, refix: false, sell: false, rent: false, buyNew: true, annual: true };
    b.savings = 750000;
    b.incomes = items([['Čistý příjem – osoba 1', 58000]]);
    b.expenses = items([[EXPENSE_LABELS[0], 8500], [EXPENSE_LABELS[1], 2500], [EXPENSE_LABELS[2], 3500], [EXPENSE_LABELS[3], 0], [EXPENSE_LABELS[4], 1500], [EXPENSE_LABELS[5], 4500], [EXPENSE_LABELS[6], 2500]]);
    b.annual = items([[ANNUAL_LABELS[0], 9000], [ANNUAL_LABELS[1], 35000], [ANNUAL_LABELS[2], 6000], [ANNUAL_LABELS[3], 8000], [ANNUAL_LABELS[4], 5000]]);
    const w1 = blankVariant('Byt 2+kk, Ukázková ulice');
    Object.assign(w1, { price: 5400000, buyCosts: 55000, savingsReno: 100000, savingsMortgage: 600000, rate: 4.69, years: 30, insFree: 700, insKeep: 0 });
    w1.reno = items([[RENO_LABELS[2], 40000], [RENO_LABELS[3], 30000], [RENO_LABELS[8], 30000]].concat(RENO_LABELS.slice(0, 2).map((l) => [l, 0]), RENO_LABELS.slice(4, 8).map((l) => [l, 0]), [[RENO_LABELS[9], 0]]));
    w1.running = items([[NEW_RUN_LABELS[0], 2600], [NEW_RUN_LABELS[1], 1500], [NEW_RUN_LABELS[2], 250], [NEW_RUN_LABELS[3], 150]]);
    const w2 = blankVariant('Byt 3+kk, Vzorová čtvrť');
    Object.assign(w2, { price: 6300000, buyCosts: 62000, savingsReno: 0, savingsMortgage: 700000, rate: 4.69, years: 30, insFree: 800, insKeep: 0 });
    w2.running = items([[NEW_RUN_LABELS[0], 3300], [NEW_RUN_LABELS[1], 1900], [NEW_RUN_LABELS[2], 300], [NEW_RUN_LABELS[3], 200]]);
    b.variants = [w1, w2];

    return [a, b];
  }

  /* ---------- Normalizace (import je nedůvěryhodný vstup) ---------- */
  const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
  const numv = (x, d) => { const n = Number(x); return Number.isFinite(n) ? Math.max(-1e10, Math.min(1e10, n)) : (d || 0); };
  const strv = (x, max, d) => (typeof x === 'string' ? x.slice(0, max) : (d || ''));
  const list = (raw, fallback) => {
    if (!Array.isArray(raw)) return fallback;
    return raw.slice(0, MAX_ITEMS).filter(isObj).map((it) => ({ id: uid(), label: strv(it.label, 60), amount: numv(it.amount) }));
  };
  function fill(tpl, raw) {
    const out = {};
    const r = isObj(raw) ? raw : {};
    for (const k of Object.keys(tpl)) {
      const t = tpl[k];
      if (Array.isArray(t)) out[k] = list(r[k], t);
      else if (isObj(t)) out[k] = fill(t, r[k]);
      else if (typeof t === 'boolean') out[k] = typeof r[k] === 'boolean' ? r[k] : t;
      else if (typeof t === 'number') out[k] = numv(r[k], t);
      else out[k] = strv(r[k], 120, t);
    }
    return out;
  }
  function normalizeVariant(raw) {
    const v = fill(blankVariant(), raw);
    v.id = uid();
    v.name = strv(isObj(raw) ? raw.name : '', 60) || 'Varianta';
    return v;
  }
  function normalizeClient(raw) {
    const base = blankClient('Importovaný klient');
    const r = isObj(raw) ? raw : {};
    const c = fill(base, Object.assign({}, r, { variants: undefined, ui: undefined }));
    c.id = uid();
    c.name = strv(r.name, 80) || base.name;
    c.note = strv(r.note, 400);
    c.variants = (Array.isArray(r.variants) ? r.variants : []).slice(0, MAX_VARIANTS).map(normalizeVariant);
    if (!c.variants.length) c.variants = [blankVariant('Varianta 1')];
    if (!['A', 'B', 'C'].includes(c.old.rent.taxVariant)) c.old.rent.taxVariant = 'A';
    const ui = isObj(r.ui) ? r.ui : {};
    c.ui = {
      tab: ['domacnost', 'stary', 'nove'].includes(ui.tab) ? ui.tab : 'domacnost',
      variant: Math.max(0, Math.min(c.variants.length - 1, Math.round(numv(ui.variant)))),
      refixMode: ui.refixMode === 'after' ? 'after' : 'now'
    };
    return c;
  }

  /* ---------- Úložiště ---------- */
  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && raw.schema === SCHEMA && Array.isArray(raw.clients) && raw.clients.length) {
        const clients = raw.clients.slice(0, MAX_CLIENTS).map((c) => { const n = normalizeClient(c); if (isObj(c) && typeof c.id === 'string') n.id = c.id.slice(0, 20); return n; });
        const active = clients.some((c) => c.id === raw.active) ? raw.active : clients[0].id;
        return { clients, active };
      }
    } catch (e) { /* poškozená data → ukázková data */ }
    const clients = seed();
    return { clients, active: clients[0].id };
  }
  let timer = null;
  function save(state) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify({ schema: SCHEMA, active: state.active, clients: state.clients })); }
      catch (e) { /* plné úložiště nebo zakázané – aplikace běží dál v paměti */ }
    }, 150);
  }

  /* ---------- Export / import JSON ---------- */
  function exportPayload(clients) {
    return JSON.stringify({ app: APP, schema: SCHEMA, exportedAt: new Date().toISOString(), clients }, null, 2);
  }
  function parseImport(text) {
    let data;
    try { data = JSON.parse(text); } catch (e) { throw new Error('Soubor není platný JSON.'); }
    if (!isObj(data) || data.app !== APP) throw new Error('Soubor nepochází z této aplikace.');
    if (data.schema !== SCHEMA) throw new Error('Nepodporovaná verze souboru (schema ' + data.schema + ').');
    const rawClients = Array.isArray(data.clients) ? data.clients : (isObj(data.client) ? [data.client] : []);
    if (!rawClients.length) throw new Error('Soubor neobsahuje žádného klienta.');
    return rawClients.slice(0, MAX_CLIENTS).map(normalizeClient);
  }
  const markExported = () => { try { localStorage.setItem(KEY_EXPORT, String(Date.now())); } catch (e) { /* ignorovat */ } };
  const lastExport = () => { try { return Number(localStorage.getItem(KEY_EXPORT)) || 0; } catch (e) { return 0; } };

  window.KBP = window.KBP || {};
  window.KBP.store = {
    MAX_VARIANTS, MAX_ITEMS, MAX_CLIENTS, uid, items, blankClient, blankVariant, seed,
    normalizeClient, load, save, exportPayload, parseImport, markExported, lastExport
  };
})();
