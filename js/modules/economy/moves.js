// Pestaña Gastos: lista de movimientos del mes (gastos, ingresos y ahorro) con filtros.

import { navigate, refresh } from '../../core/router.js';
import { esc } from '../../core/ui.js';
import { getData, catOf, ACCOUNT_TYPES } from './data.js';
import { state } from './state.js';
import { money, monthTitle, monthName, dayHeader, currentMonthKey, shiftMonthKey } from './fmt.js';
import { ei, navHtml, bindNav } from './shell.js';

const FILTERS = [['todos', 'Todos'], ['gastos', 'Gastos'], ['ingresos', 'Ingresos'], ['ahorro', 'Ahorro']];
const KIND_NAMES = { contrib: 'Aportación', withdraw: 'Retirada', adjust: 'Ajuste de saldo', value: 'Valor actualizado' };

export function renderMoves(el) {
  const d = getData();
  const mk = state.mk;
  const items = [];
  let n = 0;
  d.expenses.filter((e) => e.date.startsWith(mk)).forEach((e) => {
    const fixedName = e.fixedId || e.fixedName ? (d.fixed.find((f) => f.id === e.fixedId) || {}).name || e.fixedName : '';
    const cat = catOf(d, e.cat);
    items.push({ n: n++, kind: 'gastos', date: e.date, color: cat.color, name: fixedName || e.note || cat.name, tag: fixedName ? 'Fijo' : '',
      sub: `${cat.name} · Gasto`, amount: money(-e.amount), cls: '', route: '/economia/gasto/' + e.id });
  });
  d.incomes.filter((e) => e.date.startsWith(mk)).forEach((e) => {
    items.push({ n: n++, kind: 'ingresos', date: e.date, color: '#17594A', name: e.type, tag: '', sub: e.note ? `Ingreso · ${e.note}` : 'Ingreso',
      amount: money(e.amount, { sign: true }), cls: 'in', route: '/economia/ingreso/' + e.id });
  });
  d.movements.filter((m) => m.date.startsWith(mk)).forEach((m) => {
    const acc = d.accounts.find((a) => a.id === m.accId);
    const val = m.kind === 'contrib' ? m.amount : m.kind === 'withdraw' ? -m.amount : m.delta;
    items.push({ n: n++, kind: 'ahorro', date: m.date, color: '#4A9DB5', name: KIND_NAMES[m.kind], tag: '', sub: `${acc ? acc.name : 'Cuenta'} · Ahorro`,
      amount: m.kind === 'contrib' ? money(val) : money(val, { sign: true }), cls: 'sv', route: '/economia/ahorro/mov/' + m.id });
  });
  const shown = items.filter((i) => state.filter === 'todos' || i.kind === state.filter)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.n - a.n));

  let html = '';
  let last = '';
  shown.forEach((i) => {
    if (i.date !== last) { html += `<span class="eco-day">${dayHeader(i.date)}</span>`; last = i.date; }
    html += `<button type="button" class="eco-item" data-route="${i.route}"><span class="dot" style="background:${i.color}"></span>
      <span class="tx"><b>${esc(i.name)}${i.tag ? `<span class="eco-tag">${i.tag}</span>` : ''}</b><span>${esc(i.sub)}</span></span><span class="am ${i.cls}">${i.amount}</span></button>`;
  });
  const isNow = mk === currentMonthKey();

  el.innerHTML = `
    <div class="eco">
      <div class="eco-body">
        <header class="eco-head">
          <div class="grow"><span class="eco-sub" style="display:flex;align-items:center;gap:2px">
            <button type="button" id="prev" aria-label="Mes anterior" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;margin-left:-8px">${ei('back', 16)}</button>${monthTitle(mk)}
            <button type="button" id="next" aria-label="Mes siguiente" ${isNow ? 'disabled style="opacity:.3;width:32px;height:32px;display:flex;align-items:center;justify-content:center"' : 'style="width:32px;height:32px;display:flex;align-items:center;justify-content:center"'}>${ei('next', 16)}</button></span>
            <span class="eco-h1">Movimientos</span></div>
          <button type="button" class="eco-pill-btn" id="fixed">Gastos fijos</button>
        </header>
        <div class="eco-seg" role="group" aria-label="Filtro">${FILTERS.map(([k, l]) => `<button type="button" data-f="${k}" aria-pressed="${state.filter === k}">${l}</button>`).join('')}</div>
        ${shown.length ? `<div class="eco-list">${html}</div>` : `<div class="eco-card"><div class="eco-empty">No hay movimientos en ${monthName(mk)}${state.filter === 'todos' ? '' : ' con este filtro'}.</div></div>`}
      </div>
      ${navHtml('gastos')}
    </div>`;
  bindNav(el);
  el.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { state.filter = b.dataset.f; refresh(); }));
  el.querySelectorAll('[data-route]').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.route)));
  el.querySelector('#fixed').addEventListener('click', () => navigate('/economia/gastos-fijos'));
  el.querySelector('#prev').addEventListener('click', () => { state.mk = shiftMonthKey(mk, -1); refresh(); });
  el.querySelector('#next').addEventListener('click', () => { if (!isNow) { state.mk = shiftMonthKey(mk, 1); refresh(); } });
}
