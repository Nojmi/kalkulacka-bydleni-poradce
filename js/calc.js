/* calc.js – čistá výpočetní logika bez DOM.
 * ORIENTAČNÍ VÝPOČET, není to nabídka banky ani daňové poradenství.
 * Funguje v prohlížeči (window.KBP.calc) i v Node (require) kvůli testům. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.KBP = root.KBP || {}; root.KBP.calc = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PAUSAL_PCT = 0.30;      // § 9 odst. 4 ZDP: paušál 30 % z příjmů z nájmu
  const PAUSAL_CAP = 600000;    // nejvýše 600 000 Kč ročně

  const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const sum = (items) => (items || []).reduce((s, i) => s + num(i && i.amount), 0);

  /** Měsíční splátka anuity. rate = roční sazba v %, months = počet měsíců. */
  function pmt(principal, annualRatePct, months) {
    principal = num(principal); months = Math.round(num(months));
    if (principal <= 0 || months <= 0) return 0;
    const i = num(annualRatePct) / 100 / 12;
    if (i === 0) return principal / months;
    const f = Math.pow(1 + i, months);
    return principal * i * f / (f - 1);
  }

  /** Zůstatek jistiny po `months` měsících při pevné splátce (uzavřený vzorec). */
  function balanceAfter(principal, annualRatePct, payment, months) {
    const b = num(principal);
    const n = Math.max(0, Math.round(num(months)));
    if (b <= 0) return 0;
    const i = num(annualRatePct) / 100 / 12;
    if (i === 0) return Math.max(0, b - num(payment) * n);
    const f = Math.pow(1 + i, n);
    return Math.max(0, b * f - num(payment) * (f - 1) / i);
  }

  /** Součet úroků za prvních `months` měsíců (iterativně). */
  function interestNext(principal, annualRatePct, payment, months) {
    let b = num(principal), total = 0;
    const i = num(annualRatePct) / 100 / 12;
    for (let k = 0; k < months && b > 0; k++) {
      const interest = b * i;
      total += interest;
      b = Math.max(0, b - (num(payment) - interest));
    }
    return total;
  }

  /** Efektivní přepínače – závislosti mezi moduly na jednom místě. */
  function flags(t) {
    t = t || {};
    const hasOld = !!t.hasOld;
    const oldMortgage = hasOld && !!t.oldMortgage;
    const refix = oldMortgage && !!t.refix;
    const sell = hasOld && !!t.sell;
    const rent = hasOld && !sell && !!t.rent;
    return { hasOld, oldMortgage, refix, sell, rent, keep: hasOld && !sell, buyNew: !!t.buyNew, annual: !!t.annual };
  }

  /** Daň z pronájmu – varianty A (paušál), B (skutečné výdaje), C (skutečné + odpisy). */
  function rentTax(o, f, balance, payment, running) {
    const r = o.rent;
    const months = Math.min(12, Math.max(0, 12 - num(r.vacancyMonths)));
    const income = num(r.monthlyRent) * months;
    const repairs = num(r.repairsYear);
    const mgmt = income * num(r.managementPct) / 100;
    const running12 = running * 12;
    const interest12 = f.oldMortgage ? interestNext(balance, o.rate, payment, 12) : 0;
    const actualExpenses = running12 + repairs + mgmt + interest12;
    const depreciation = num(r.depreciationBase) * num(r.depreciationRatePct) / 100;
    const rate = num(r.taxRate) / 100;

    const A = { expenses: Math.min(PAUSAL_PCT * income, PAUSAL_CAP) };
    const B = { expenses: actualExpenses };
    const C = { expenses: actualExpenses + depreciation };
    for (const v of [A, B, C]) {
      v.base = Math.max(0, income - v.expenses);   // ztráta z nájmu se nezohledňuje
      v.tax = v.base * rate;
    }
    const chosen = ['A', 'B', 'C'].includes(r.taxVariant) ? r.taxVariant : 'A';
    const tax = { A, B, C }[chosen].tax;
    const best = ['A', 'B', 'C'].reduce((m, k) => ({ A, B, C }[k].tax < { A, B, C }[m].tax ? k : m), 'A');
    return {
      income, repairs, mgmt, running12, interest12, actualExpenses, depreciation,
      A, B, C, chosen, best, tax,
      netMonthly: (income - repairs - mgmt - tax) / 12   // provoz a splátky jsou ve starém bytě zvlášť
    };
  }

  function computeSale(o, balance) {
    const s = o.sale;
    const price = num(o.value);
    const commission = price * num(s.commissionPct) / 100;
    const otherCosts = num(s.otherCosts);
    const earlyFee = num(s.earlyFee);
    const base = s.taxExempt ? 0 : Math.max(0, price - num(o.acquisitionPrice) - commission - otherCosts);
    const tax = base * num(s.taxRate) / 100;
    const proceeds = price - commission - otherCosts - balance - earlyFee - tax;
    return { price, commission, otherCosts, balance, earlyFee, taxExempt: !!s.taxExempt, base, tax, proceeds };
  }

  function computeOld(c, f) {
    const o = c.old;
    const balance = f.oldMortgage ? num(o.mortgageBalance) : 0;
    const monthsLeft = f.oldMortgage ? Math.max(0, Math.round(num(o.monthsLeft))) : 0;
    const autoPayment = pmt(balance, o.rate, monthsLeft);
    const payment = f.oldMortgage ? (num(o.paymentOverride) > 0 ? num(o.paymentOverride) : autoPayment) : 0;
    const n = Math.min(Math.max(0, Math.round(num(o.monthsToFixEnd))), monthsLeft);
    const balanceAtFixEnd = balanceAfter(balance, o.rate, payment, n);
    const remaining = monthsLeft - n;
    const paymentAfterRefix = f.refix && remaining > 0 ? pmt(balanceAtFixEnd, o.newRate, remaining) : 0;
    const usePost = f.refix && c.ui && c.ui.refixMode === 'after';
    const paymentUsed = usePost ? paymentAfterRefix : payment;
    const insurance = f.oldMortgage ? num(o.insurance) : 0;
    const running = sum(o.running);
    const out = {
      value: num(o.value), balance, monthsLeft, autoPayment, payment, monthsToFixEnd: n,
      balanceAtFixEnd, remaining, paymentAfterRefix, paymentUsed, usePost,
      refixDelta: f.refix ? paymentAfterRefix - payment : 0,
      insurance, running, sale: null, rent: null
    };
    if (f.sell) out.sale = computeSale(o, balance);
    if (f.rent) out.rent = rentTax(o, f, balance, payment, running);
    return out;
  }

  function computeVariant(c, ctx, v) {
    const { f, income, household, old } = ctx;
    const reno = sum(v.reno);
    const price = num(v.price);
    const buyCosts = num(v.buyCosts);
    const needs = price + buyCosts + reno;
    const savingsUsed = num(v.savingsReno) + num(v.savingsMortgage);
    const proceeds = f.sell && old.sale ? old.sale.proceeds : 0;
    const funds = savingsUsed + proceeds;
    const loanRaw = needs - funds;
    const loan = Math.max(0, loanRaw);
    const surplus = Math.max(0, -loanRaw);
    const payment = pmt(loan, v.rate, num(v.years) * 12);
    const insurance = loan > 0 ? (f.keep ? num(v.insKeep) : num(v.insFree)) : 0;
    const running = sum(v.running);
    const newHousing = payment + insurance + running;
    const oldNet = f.keep
      ? old.paymentUsed + old.insurance + old.running - (f.rent && old.rent ? old.rent.netMonthly : 0)
      : 0;
    const housing = newHousing + oldNet;
    const free = income - household - housing;
    const dsti = income > 0 ? (payment + (f.keep ? old.paymentUsed : 0)) / income : null;
    const ltv = price > 0 ? loan / price : null;

    const warnings = [];
    if (savingsUsed > num(c.savings) + 0.5) warnings.push('Použité úspory (' + Math.round(savingsUsed) + ' Kč) přesahují úspory klienta.');
    if (proceeds < 0) warnings.push('Výtěžek z prodeje starého bytu je záporný – prodej nepokryje zbytek hypotéky.');
    if (surplus > 0.5) warnings.push('Zdroje převyšují potřebu o ' + Math.round(surplus) + ' Kč (hypotéka by byla nulová).');
    if (ltv !== null && ltv > 0.9) warnings.push('LTV nad 90 % – většina bank takový úvěr nenabídne.');
    else if (ltv !== null && ltv > 0.8) warnings.push('LTV nad 80 % – banky obvykle zvyšují sazbu nebo vyžadují další jištění.');
    if (free < 0) warnings.push('Záporné volné cashflow domácnosti.');

    return {
      name: v.name, price, buyCosts, reno, needs, savingsUsed, proceeds, funds, loan, surplus,
      payment, insurance, running, newHousing, oldNet, housing, free, dsti, ltv, warnings
    };
  }

  function computeClient(c) {
    const f = flags(c.toggles);
    const income = sum(c.incomes);
    const expenses = sum(c.expenses);
    const annualMonthly = f.annual ? sum(c.annual) / 12 : 0;
    const household = expenses + annualMonthly;
    const old = f.hasOld ? computeOld(c, f) : null;
    const ctx = { f, income, household, old };
    let baseline = null;
    if (old) {
      const housing = old.paymentUsed + old.insurance + old.running;
      baseline = { housing, free: income - household - housing };
    }
    const variants = f.buyNew ? (c.variants || []).map((v) => computeVariant(c, ctx, v)) : [];
    return { flags: f, income, expenses, annualMonthly, household, savings: num(c.savings), old, baseline, variants };
  }

  return { PAUSAL_PCT, PAUSAL_CAP, num, sum, pmt, balanceAfter, interestNext, flags, rentTax, computeSale, computeOld, computeVariant, computeClient };
});
