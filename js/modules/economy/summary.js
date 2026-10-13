// Resumen del mes: cuánto sobra, gastado, ahorrado, en qué se va el dinero y ahorro total.

import { navigate, go, back, refresh } from '../../core/router.js';
import { esc } from '../../core/ui.js';
import { getData } from './data.js';
import { state } from './state.js';
import { money, moneyAuto, pct, monthTitle, monthName, currentMonthKey, shiftMonthKey } from './fmt.js';
import { monthSummary, chartCategories, accountTotals } from './calc.js';
import { ei, round, navHtml, bindNav } from './shell.js';

const share = (a, b) => (b > 0 ? Math.max(0, (a / b) * 100) : 0);

export function renderSummary(el) {
  const d = getData();
  if (!d.setupDone) { go('/economia/inicio'); return; }
  const mk = state.mk;
  const isNow = mk === currentMonthKey();
  const s = monthSummary(d, mk);
  const tot = accountTotals(d);
  const cats = chartCategories(d, s.byCat);
  const catTotal = cats.reduce((t, c) => t + c.amount, 0);
  const medio = d.accounts.filter((a) => a.term === 'medio');
  const cushion = Math.min(d.cushion, tot.medio);
  const rates = [...new Set(medio.map((a) => a.rate))];

  const empty = !s.hasData && !isNow;
  const hero = `
    <div class="eco-hero">
      <span class="k">Te sobran este mes</span>
      <span class="big">${money(s.left)}</span>
      <div class="meter"><i style="width:${Math.min(100, s.pctSpent)}%"></i></div>
      <div class="foot"><span>Ingresos ${money(s.income)}</span><span>Gastado el ${s.income > 0 ? s.pctSpent : 0} %</span></div>
    </div>`;
  const cards = `
    <div class="eco-grid2">
      <div class="eco-card"><span class="k">Gastado</span><span class="v">${money(s.spent)}</span>
        <div class="eco-bar"><i style="width:${share(s.fixedSum, s.spent)}%;background:#3F5650"></i><i style="width:${share(s.puntualSum, s.spent)}%;background:#B9C7C1"></i></div>
        <div class="eco-leg"><span class="dot" style="background:#3F5650"></span><span class="grow">Fijos</span><span>${money(s.fixedSum)}</span></div>
        <div class="eco-leg"><span class="dot" style="background:#B9C7C1"></span><span class="grow">Puntuales</span><span>${money(s.puntualSum)}</span></div></div>
      <div class="eco-card"><span class="k">Aportado a ahorro</span><span class="v" style="color:var(--accent-text)">${money(s.contrib.medio + s.contrib.largo)}</span>
        <div class="eco-bar"><i style="width:${share(s.contrib.medio, s.contrib.medio + s.contrib.largo)}%;background:#17594A"></i><i style="width:${share(s.contrib.largo, s.contrib.medio + s.contrib.largo)}%;background:#4A9DB5"></i></div>
        <div class="eco-leg"><span class="dot" style="background:#17594A"></span><span class="grow">Medio plazo</span><span>${moneyAuto(s.contrib.medio)}</span></div>
        <div class="eco-leg"><span class="dot" style="background:#4A9DB5"></span><span class="grow">Largo plazo</span><span>${moneyAuto(s.contrib.largo)}</span></div></div>
    </div>`;
  const where = cats.length ? `
    <div class="eco-card pad"><h3>En qué se va el dinero</h3>
      <div class="eco-bar thick">${cats.map((c) => `<i style="width:${share(c.amount, catTotal)}%;background:${c.color}"></i>`).join('')}</div>
      <div style="display:flex;flex-direction:column;gap:6px">${cats.map((c) =>
        `<div class="eco-cat"><span class="dot" style="background:${c.color}"></span><span class="grow">${esc(c.name)}</span><span class="p">${Math.round(share(c.amount, catTotal))} %</span><span class="a">${money(c.amount)}</span></div>`).join('')}</div></div>` : '';
  const free = Math.max(0, tot.medio - cushion);
  const saving = `
    <div class="eco-card pad">
      <div style="display:flex;align-items:baseline;justify-content:space-between"><h3>Ahorro total</h3><span class="v">${money(tot.total)}</span></div>
      ${!isNow ? '<span class="eco-note" style="font-size:12px">Es el saldo de hoy, no el de ese mes.</span>' : ''}
      ${d.accounts.length ? `<div style="display:flex;flex-direction:column;gap:8px;font-size:13px;font-weight:600">
        <div style="display:flex;flex-direction:column;gap:6px">
          <div style="display:flex;justify-content:space-between"><span>Medio plazo${rates.length === 1 && medio.length ? ' · ' + pct(rates[0], rates[0] % 1 ? 1 : 0) + ' TAE' : ''}</span><span>${moneyAuto(tot.medio)}</span></div>
          ${d.cushion > 0 && tot.medio > 0 ? `<div class="eco-bar thick" style="height:10px"><i style="width:${share(cushion, tot.medio)}%;background:#E0A33A"></i><i style="width:${share(free, tot.medio)}%;background:#17594A"></i></div>
          <div style="display:flex;justify-content:space-between;font-size:12px">
            <div class="eco-leg"><span class="dot" style="background:#E0A33A"></span><span>Colchón ${moneyAuto(cushion)} · ${Math.round(share(cushion, tot.medio))} %</span></div>
            <div class="eco-leg"><span class="dot" style="background:#17594A"></span><span>Libre ${moneyAuto(free)}</span></div></div>` : ''}
        </div>
        <div style="display:flex;justify-content:space-between"><span>Largo plazo</span><span>${moneyAuto(tot.largo)}</span></div></div>`
        : '<span class="eco-note">Aún no has añadido ninguna cuenta. Puedes hacerlo en la pestaña Ahorro.</span>'}
    </div>`;
  const banner = d.cushion > 0 && tot.medio < d.cushion
    ? `<div class="eco-info warn">${ei('info', 18)}<span>El saldo de medio plazo (${money(tot.medio)}) está por debajo de tu colchón (${money(d.cushion)}).</span></div>` : '';

  el.innerHTML = `
    <div class="eco">
      <div class="eco-body">
        <header class="eco-head">
          ${round('go-home', 'home', 'Volver al inicio de WIBI', 'ghost')}
          <div class="grow"><span class="eco-sub">Economía</span><span class="eco-h1">${monthTitle(mk)}</span></div>
          ${round('settings', 'gear', 'Ajustes', 'ghost')}${round('prev', 'back', 'Mes anterior')}
          <button type="button" class="eco-round" id="next" aria-label="Mes siguiente" ${isNow ? 'disabled' : ''}>${ei('next', 20)}</button>
        </header>
        ${banner}
        ${hero}
        ${empty ? `<div class="eco-empty">No hay movimientos en ${monthName(mk)}.</div>` : isNow && !s.hasData ? '<div class="eco-info">' + ei('info', 18) + '<span>Empieza añadiendo tu sueldo con el botón + de abajo. Lo que apuntes aparecerá aquí.</span></div>' : ''}
        ${empty ? '' : cards + where}
        ${saving}
      </div>
      ${navHtml('resumen')}
    </div>`;
  bindNav(el);
  el.querySelector('#go-home').addEventListener('click', () => back('/'));
  el.querySelector('#settings').addEventListener('click', () => navigate('/economia/ajustes'));
  el.querySelector('#prev').addEventListener('click', () => { state.mk = shiftMonthKey(mk, -1); refresh(); });
  el.querySelector('#next').addEventListener('click', () => { if (!isNow) { state.mk = shiftMonthKey(mk, 1); refresh(); } });
}
