/* Kontrolní příklady. Očekávané hodnoty jsou spočítané NEZÁVISLE na aplikaci:
 * skript docs/overeni-hodnot.py počítá anuitu a zůstatek cyklem po měsících (Decimal),
 * daň z pronájmu a prodej prostou aritmetikou. Příklad 1 je navíc obecně známá hodnota (3 mil. / 5 % / 30 let = 16 104,65 Kč).
 * Testy dokazují, že kód odpovídá vzorcům. Neříkají nic o tom, zda je daňový model právně správně. */
(function (root, factory) {
  const cases = factory();
  if (typeof module === 'object' && module.exports) module.exports = cases;
  else { root.KBP = root.KBP || {}; root.KBP.cases = cases; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const it = (rows) => rows.map(([label, amount], i) => ({ id: 'i' + i, label, amount }));

  function client(over) {
    over = over || {};
    return {
      toggles: Object.assign({ hasOld: false, oldMortgage: false, refix: false, sell: false, rent: false, buyNew: true, annual: true }, over.toggles),
      savings: over.savings || 0,
      incomes: it([['příjem', over.income === undefined ? 100000 : over.income]]),
      expenses: it([['výdaje', over.expenses === undefined ? 30000 : over.expenses]]),
      annual: it([['roční', over.annual === undefined ? 60000 : over.annual]]),
      old: Object.assign({
        value: 0, acquisitionPrice: 0, mortgageBalance: 0, rate: 3, monthsLeft: 240, paymentOverride: 0, monthsToFixEnd: 12, newRate: 4.7, insurance: 0,
        running: it([]),
        sale: { commissionPct: 3, otherCosts: 0, earlyFee: 0, taxExempt: true, taxRate: 15 },
        rent: { monthlyRent: 0, vacancyMonths: 0, managementPct: 0, repairsYear: 0, taxVariant: 'A', taxRate: 15, depreciationBase: 0, depreciationRatePct: 3.4 }
      }, over.old),
      variants: over.variants || [],
      ui: { refixMode: 'now' }
    };
  }
  function variant(over) {
    return Object.assign({ name: 'V', price: 0, buyCosts: 0, reno: it([]), savingsReno: 0, savingsMortgage: 0, rate: 4.5, years: 30, insFree: 0, insKeep: 0, running: it([]) }, over);
  }
  const rentOld = (rent, extra) => Object.assign({ rent: Object.assign({ monthlyRent: 20000, vacancyMonths: 1, managementPct: 0, repairsYear: 0, taxVariant: 'A', taxRate: 15, depreciationBase: 0, depreciationRatePct: 3.4 }, rent) }, extra);

  return [
    { name: '01 Anuita: 3 000 000 Kč, 5 %, 30 let', expected: 16104.65, actual: (c) => c.pmt(3000000, 5, 360) },
    { name: '02 Anuita: 2 000 000 Kč, 4,5 %, 25 let', expected: 11116.65, actual: (c) => c.pmt(2000000, 4.5, 300) },
    { name: '03 Anuita při nulové sazbě: 1 200 000 Kč, 0 %, 10 let', expected: 10000, actual: (c) => c.pmt(1200000, 0, 120) },
    { name: '04 Zůstatek po 60 měsících: 2 000 000 Kč, 4,5 %, 25 let', expected: 1757158.07, actual: (c) => c.balanceAfter(2000000, 4.5, c.pmt(2000000, 4.5, 300), 60) },
    {
      name: '05a Refixace: dnešní splátka (zůstatek 2 500 000, 2,19 %, 240 měs.)', expected: 12873.27,
      actual: (c) => c.computeClient(client({ toggles: { hasOld: true, oldMortgage: true, refix: true, buyNew: false }, old: { mortgageBalance: 2500000, rate: 2.19, monthsLeft: 240, monthsToFixEnd: 18, newRate: 5.2 } })).old.payment
    },
    {
      name: '05b Refixace: zůstatek na konci fixace (po 18 měsících)', expected: 2348062.83,
      actual: (c) => c.computeClient(client({ toggles: { hasOld: true, oldMortgage: true, refix: true, buyNew: false }, old: { mortgageBalance: 2500000, rate: 2.19, monthsLeft: 240, monthsToFixEnd: 18, newRate: 5.2 } })).old.balanceAtFixEnd
    },
    {
      name: '05c Refixace: splátka po refixaci (5,2 %, zbývá 222 měs.)', expected: 16488.93,
      actual: (c) => c.computeClient(client({ toggles: { hasOld: true, oldMortgage: true, refix: true, buyNew: false }, old: { mortgageBalance: 2500000, rate: 2.19, monthsLeft: 240, monthsToFixEnd: 18, newRate: 5.2 } })).old.paymentAfterRefix
    },
    {
      name: '06 Daň z nájmu A (paušál): 20 000 × 11 měs. = 220 000, výdaje 30 %, daň 15 %', expected: 23100,
      actual: (c) => c.computeClient(client({ toggles: { hasOld: true, rent: true, buyNew: false }, old: rentOld({ taxVariant: 'A' }) })).old.rent.A.tax
    },
    {
      name: '07 Daň z nájmu A: strop paušálu 600 000 (příjem 2,4 mil.), základ 1,8 mil., daň 270 000', expected: 270000,
      actual: (c) => c.computeClient(client({ toggles: { hasOld: true, rent: true, buyNew: false }, old: rentOld({ monthlyRent: 200000, vacancyMonths: 0 }) })).old.rent.A.tax
    },
    {
      name: '08 Daň z nájmu B: provoz 3 000×12 + opravy 20 000 + správa 5 % + úroky z hypotéky za 12 měs.', expected: 18526.02,
      actual: (c) => c.computeClient(client({
        toggles: { hasOld: true, oldMortgage: true, rent: true, buyNew: false },
        old: rentOld({ managementPct: 5, repairsYear: 20000 }, { mortgageBalance: 1000000, rate: 3, monthsLeft: 240, running: it([['provoz', 3000]]) })
      })).old.rent.B.tax
    },
    {
      name: '09 Daň z nájmu C: jako B + odpisy 2 000 000 × 3,4 % = 68 000', expected: 8326.02,
      actual: (c) => c.computeClient(client({
        toggles: { hasOld: true, oldMortgage: true, rent: true, buyNew: false },
        old: rentOld({ managementPct: 5, repairsYear: 20000, depreciationBase: 2000000 }, { mortgageBalance: 1000000, rate: 3, monthsLeft: 240, running: it([['provoz', 3000]]) })
      })).old.rent.C.tax
    },
    {
      name: '10 Ztráta z nájmu se nezohledňuje: výdaje vyšší než příjem → daň 0', expected: 0,
      actual: (c) => c.computeClient(client({ toggles: { hasOld: true, rent: true, buyNew: false }, old: rentOld({ repairsYear: 300000 }) })).old.rent.B.tax
    },
    {
      name: '11a Prodej bytu, osvobozeno: 6 mil. − provize 180 000 − náklady 25 000 − hypotéka 2 mil.', expected: 3795000,
      actual: (c) => c.computeClient(client({ toggles: { hasOld: true, oldMortgage: true, sell: true, buyNew: false }, old: { value: 6000000, acquisitionPrice: 3500000, mortgageBalance: 2000000, sale: { commissionPct: 3, otherCosts: 25000, earlyFee: 0, taxExempt: true, taxRate: 15 } } })).old.sale.proceeds
    },
    {
      name: '11b Prodej bytu, zdaněno 15 % ze zisku 2 295 000 (daň 344 250)', expected: 3450750,
      actual: (c) => c.computeClient(client({ toggles: { hasOld: true, oldMortgage: true, sell: true, buyNew: false }, old: { value: 6000000, acquisitionPrice: 3500000, mortgageBalance: 2000000, sale: { commissionPct: 3, otherCosts: 25000, earlyFee: 0, taxExempt: false, taxRate: 15 } } })).old.sale.proceeds
    },
    {
      name: '12a Varianta: potřeba 7,5 mil. − úspory 800 000 − výtěžek 3 795 000 = hypotéka 2 905 000', expected: 2905000,
      actual: (c) => c.computeClient(client({
        toggles: { hasOld: true, oldMortgage: true, sell: true },
        old: { value: 6000000, acquisitionPrice: 3500000, mortgageBalance: 2000000, sale: { commissionPct: 3, otherCosts: 25000, earlyFee: 0, taxExempt: true, taxRate: 15 } },
        savings: 800000,
        variants: [variant({ price: 7000000, buyCosts: 100000, reno: it([['a', 250000], ['b', 150000]]), savingsReno: 600000, savingsMortgage: 200000 })]
      })).variants[0].loan
    },
    {
      name: '12b Varianta: splátka hypotéky 2 905 000 Kč, 4,5 %, 30 let', expected: 14719.21,
      actual: (c) => c.computeClient(client({
        toggles: { hasOld: true, oldMortgage: true, sell: true },
        old: { value: 6000000, acquisitionPrice: 3500000, mortgageBalance: 2000000, sale: { commissionPct: 3, otherCosts: 25000, earlyFee: 0, taxExempt: true, taxRate: 15 } },
        savings: 800000,
        variants: [variant({ price: 7000000, buyCosts: 100000, reno: it([['a', 250000], ['b', 150000]]), savingsReno: 600000, savingsMortgage: 200000 })]
      })).variants[0].payment
    },
    {
      name: '13 Volné cashflow bez starého bytu: 100 000 − (30 000 + 60 000/12) − (splátka 4 mil./5 %/30 let + 700 + 3 000)', expected: 39827.14,
      actual: (c) => c.computeClient(client({ variants: [variant({ price: 4000000, rate: 5, insFree: 700, running: it([['provoz', 3000]]) })] })).variants[0].free
    },
    {
      name: '14 Starý byt ponechán a pronajímán: netto = 10 000 + 500 + 2 000 − nájem po dani 17 900 = −5 400', expected: -5400,
      actual: (c) => c.computeClient(client({
        toggles: { hasOld: true, oldMortgage: true, rent: true },
        old: rentOld({ vacancyMonths: 0, taxVariant: 'A' }, { mortgageBalance: 1000000, paymentOverride: 10000, insurance: 500, running: it([['provoz', 2000]]) }),
        variants: [variant({ price: 5000000 })]
      })).variants[0].oldNet
    }
  ];
});
