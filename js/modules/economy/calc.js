// Cálculos de economía: resúmenes del mes, totales de ahorro, proyecciones e hipoteca.

import { OTROS, catOf, isFixedExp } from './data.js';

export const sum = (list, f = (x) => x) => Math.round(list.reduce((t, x) => t + f(x), 0) * 100) / 100;
export const inMonth = (item, mk) => item.date.startsWith(mk);

export function monthSummary(d, mk) {
  const exps = d.expenses.filter((e) => inMonth(e, mk));
  const incs = d.incomes.filter((e) => inMonth(e, mk));
  const movs = d.movements.filter((m) => inMonth(m, mk));
  const termOf = (m) => (d.accounts.find((a) => a.id === m.accId) || {}).term;
  const contrib = { medio: 0, largo: 0 };
  movs.filter((m) => m.kind === 'contrib' && m.fromSalary).forEach((m) => { const t = termOf(m); if (t) contrib[t] += m.amount; });
  const income = sum(incs, (e) => e.amount);
  const spent = sum(exps, (e) => e.amount);
  const fixedSum = sum(exps.filter(isFixedExp), (e) => e.amount);
  const byCat = {};
  exps.forEach((e) => { byCat[e.cat] = (byCat[e.cat] || 0) + e.amount; });
  return {
    income, spent, fixedSum, puntualSum: Math.round((spent - fixedSum) * 100) / 100,
    left: Math.round((income - spent - contrib.medio - contrib.largo) * 100) / 100,
    pctSpent: income > 0 ? Math.round((spent / income) * 100) : 0,
    pctUsed: income > 0 ? Math.round(((spent + contrib.medio + contrib.largo) / income) * 100) : 0,
    contrib: { medio: Math.round(contrib.medio * 100) / 100, largo: Math.round(contrib.largo * 100) / 100 },
    byCat, hasData: exps.length + incs.length + movs.length > 0,
  };
}

// Las 4 categorías mayores y el resto junto con "Otros".
export function chartCategories(d, byCat) {
  const rows = Object.entries(byCat).filter(([, v]) => v > 0).map(([id, v]) => ({ cat: catOf(d, id), amount: v }));
  const named = rows.filter((r) => r.cat.id !== OTROS).sort((a, b) => b.amount - a.amount);
  const top = named.slice(0, 4);
  const restAmount = sum(named.slice(4), (r) => r.amount) + sum(rows.filter((r) => r.cat.id === OTROS), (r) => r.amount);
  const out = top.map((r) => ({ name: r.cat.name, color: r.cat.color, amount: r.amount }));
  if (restAmount > 0) out.push({ name: 'Otros', color: '#B9C7C1', amount: Math.round(restAmount * 100) / 100 });
  return out;
}

export function accountTotals(d) {
  const medio = sum(d.accounts.filter((a) => a.term === 'medio'), (a) => a.balance);
  const largo = sum(d.accounts.filter((a) => a.term === 'largo'), (a) => a.balance);
  return { medio, largo, total: Math.round((medio + largo) * 100) / 100 };
}

// Gastos fijos de un mes: cuánto se ha puesto en cada uno.
export function fixedStatus(d, mk) {
  return d.fixed.map((f) => {
    const exps = d.expenses.filter((e) => e.fixedId === f.id && inMonth(e, mk));
    return { fixed: f, amount: exps.length ? sum(exps, (e) => e.amount) : null, filled: exps.length > 0, ids: exps.map((e) => e.id) };
  });
}

// Crecimiento con aportación mensual (al final de cada mes) e interés anual nominal.
// Devuelve un dato por año: lo aportado (con el saldo inicial) y el saldo total.
export function growth(start, monthly, ratePct, years) {
  const r = (Number(ratePct) || 0) / 100 / 12;
  let bal = Number(start) || 0;
  const out = [];
  for (let m = 1; m <= years * 12; m++) {
    bal = bal * (1 + r) + (Number(monthly) || 0);
    if (m % 12 === 0) out.push({ year: m / 12, invested: (Number(start) || 0) + (Number(monthly) || 0) * m, balance: bal });
  }
  return out;
}

export function mortgage({ price, down, years, tin }) {
  const loan = Math.max(0, (Number(price) || 0) - (Number(down) || 0));
  const n = Math.round((Number(years) || 0) * 12);
  const r = (Number(tin) || 0) / 100 / 12;
  if (!loan || !n) return { loan, n, pay: 0, total: 0, interest: 0 };
  const pay = r === 0 ? loan / n : (loan * r) / (1 - Math.pow(1 + r, -n));
  const total = pay * n;
  return { loan, n, pay, total, interest: total - loan };
}
