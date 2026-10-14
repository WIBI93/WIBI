// Simuladores: interés compuesto e hipoteca. Los números son estimaciones; no se guardan en el historial.

import { go } from '../../core/router.js';
import { esc } from '../../core/ui.js';
import { getData, update } from './data.js';
import { money, moneyAuto, pct, parseMoney } from './fmt.js';
import { growth, mortgage } from './calc.js';
import { round, ei, navHtml, bindNav } from './shell.js';

let tab = 'interes';

const val = (t) => { const s = String(t ?? '').trim(); if (s === '') return 0; const n = parseMoney(s); return Number.isFinite(n) && n >= 0 ? n : NaN; };
const field = (id, label, v, ph, u, note = '') => `<div class="eco-fields"><label for="${id}">${label}</label><div class="eco-unit"><input class="eco-input unit" id="${id}" inputmode="decimal" autocomplete="off" value="${esc(v ?? '')}" placeholder="${ph}"><span>${u}</span></div>${note ? `<span class="eco-note">${note}</span>` : ''}</div>`;
const k = (n) => (n >= 1e6 ? (n / 1e6).toFixed(2).replace('.', ',') + ' M€' : Math.round(n / 1000).toLocaleString('es-ES') + ' k€');

function interestHtml(s) {
  const rates = [s.r1 ?? '5', s.r2 ?? '7', s.r3 ?? '10'];
  const years = val(s.years), monthly = val(s.monthly), start = val(s.start);
  const rs = rates.map(val);
  const ok = [years, monthly, start, ...rs].every(Number.isFinite) && years >= 1 && years <= 60 && (monthly > 0 || start > 0);
  let out = '';
  if (ok) {
    const y = Math.round(years);
    const ser = rs.map((r) => growth(start, monthly, r, y));
    const invested = start + monthly * 12 * y;
    const step = y <= 12 ? 1 : y <= 30 ? 5 : 10;
    const idx = []; for (let i = step; i <= y; i += step) idx.push(i); if (idx[idx.length - 1] !== y) idx.push(y);
    out = `<div class="eco-hero"><span class="k">En ${y} años, con ${rs[1]}% anual</span><span class="big" style="font-size:32px">${money(ser[1][y - 1].balance)}</span>
        <div class="foot"><span>Aportado ${moneyAuto(invested)}</span><span>Intereses ${money(ser[1][y - 1].balance - invested)}</span></div></div>
      <div class="eco-card pad"><h3>Según la rentabilidad</h3>
        <div style="display:grid;grid-template-columns:auto repeat(3,1fr);gap:8px 6px;font-size:13px;font-weight:700;align-items:center">
          <span style="color:var(--muted)">Años</span>${rs.map((r) => `<span style="text-align:right;color:var(--muted)">${pct(r, r % 1 ? 1 : 0)}</span>`).join('')}
          ${idx.map((i) => `<span>${i}</span>${ser.map((a) => `<span style="text-align:right">${k(a[i - 1].balance)}</span>`).join('')}`).join('')}</div></div>
      <div class="eco-note" style="padding:0 4px">Estimación con interés fijo y aportación al final de cada mes. La realidad variará y no incluye impuestos ni comisiones.</div>`;
  } else out = '<div class="eco-info">' + ei('info', 18) + '<span>Rellena la aportación mensual o el saldo inicial, y los años, para ver el resultado.</span></div>';
  return `<div class="eco-card pad">
      <div class="eco-grid2" style="gap:10px">${field('monthly', 'Aportación al mes', s.monthly, '0', '€')}${field('years', 'Años', s.years, '10', 'años')}</div>
      ${field('start', 'Saldo inicial', s.start, '0', '€')}
      <span class="eco-label">Rentabilidades a comparar (editables)</span>
      <div class="eco-grid2" style="grid-template-columns:repeat(3,1fr);gap:8px">${['r1', 'r2', 'r3'].map((id, i) => `<div class="eco-unit"><input class="eco-input unit" id="${id}" inputmode="decimal" value="${esc(rates[i])}" aria-label="Rentabilidad ${i + 1}" style="padding-left:10px"><span>%</span></div>`).join('')}</div></div>
    ${out}`;
}

function mortgageHtml(s) {
  const price = val(s.price), down = val(s.down), costs = val(s.costs), years = val(s.mYears), tin = val(s.tin);
  const ok = [price, down, costs, years, tin].every(Number.isFinite) && price > 0 && years >= 1 && down <= price;
  let out = '';
  if (ok) {
    const m = mortgage({ price, down, years, tin });
    const need = down + costs;
    out = `<div class="eco-hero"><span class="k">Cuota mensual aproximada</span><span class="big" style="font-size:32px">${money(m.pay)}</span>
        <div class="foot"><span>Préstamo ${pct((m.loan / price) * 100, 0)} del valor</span><span>Plazo ${Math.round(years)} años</span></div></div>
      <div class="eco-card pad"><h3>Resumen</h3>
        ${[['Necesitas ahorrado (entrada + gastos)', money(need)], ['Préstamo', money(m.loan)], ['Total a devolver', money(m.total)], ['Intereses totales', `${money(m.interest)} (${pct(m.loan ? (m.interest / m.loan) * 100 : 0, 0)} del préstamo)`]].map(([a, b]) => `<div style="display:flex;justify-content:space-between;gap:12px;font-size:14px;font-weight:700"><span style="color:var(--muted)">${a}</span><span style="text-align:right">${b}</span></div>`).join('')}</div>
      <div class="eco-card pad"><h3>Cuota según interés y plazo</h3>
        <div style="display:grid;grid-template-columns:auto repeat(3,1fr);gap:8px 6px;font-size:13px;font-weight:700;align-items:center"><span style="color:var(--muted)">TIN</span>${[20, 25, 30].map((y) => `<span style="text-align:right;color:var(--muted)">${y} años</span>`).join('')}
        ${[2, 3, 4].map((r) => `<span>${r}%</span>${[20, 25, 30].map((y) => `<span style="text-align:right">${money(mortgage({ price, down, years: y, tin: r }).pay)}</span>`).join('')}`).join('')}</div></div>
      <div class="eco-info warn">${ei('info', 18)}<span>Cálculo orientativo: no incluye seguros, comisiones ni cambios del euríbor si es variable.</span></div>`;
  } else out = '<div class="eco-info">' + ei('info', 18) + '<span>Rellena valor de la vivienda, entrada y plazo para ver la cuota.</span></div>';
  return `<div class="eco-card pad">
      ${field('price', 'Valor de la vivienda', s.price, '0', '€')}${field('down', 'Entrada', s.down, '0', '€')}
      ${field('costs', 'Gastos de compra (impuestos, notaría…)', s.costs, '0', '€', val(s.price) > 0 && val(s.costs) > 0 ? `Equivale al ${pct((val(s.costs) / val(s.price)) * 100, 1)} del valor. Suelen rondar el 10 %.` : 'Suelen rondar el 10 % del valor.')}
      <div class="eco-grid2" style="gap:10px">${field('mYears', 'Plazo', s.mYears, '25', 'años')}${field('tin', 'Interés (TIN)', s.tin, '3', '%')}</div></div>
    ${out}`;
}

export function renderSim(el) {
  const s = getData().sim || {};
  const draw = () => {
    el.innerHTML = `
      <div class="eco"><div class="eco-body">
        <header class="eco-head">${round('go-back', 'back', 'Volver')}<div class="grow"><span class="eco-sub">Economía</span><span class="eco-h1">Simular</span></div></header>
        <div class="eco-seg" role="group"><button type="button" data-t="interes" aria-pressed="${tab === 'interes'}">Interés compuesto</button><button type="button" data-t="hipoteca" aria-pressed="${tab === 'hipoteca'}">Hipoteca</button></div>
        <div id="sim">${tab === 'interes' ? interestHtml(s) : mortgageHtml(s)}</div>
      </div>${navHtml('simular')}</div>`;
    bindNav(el);
    el.querySelector('#go-back').addEventListener('click', () => go('/economia'));
    el.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.t; draw(); }));
    // Al escribir, solo se rehace el resultado para no perder el teclado.
    const keys = tab === 'interes' ? { monthly: 'monthly', years: 'years', start: 'start', r1: 'r1', r2: 'r2', r3: 'r3' } : { price: 'price', down: 'down', costs: 'costs', mYears: 'mYears', tin: 'tin' };
    el.querySelectorAll('#sim input').forEach((inp) => inp.addEventListener('input', () => {
      s[keys[inp.id]] = inp.value;
      update((d) => { d.sim = { ...s }; });
      const focus = inp.id, pos = inp.selectionStart;
      const box = el.querySelector('#sim');
      const html = tab === 'interes' ? interestHtml(s) : mortgageHtml(s);
      const tmp = document.createElement('div'); tmp.innerHTML = html;
      // Se sustituye todo salvo la tarjeta de campos, que conserva el foco.
      const cards = [...box.children], fresh = [...tmp.children];
      cards.slice(1).forEach((c) => c.remove());
      fresh.slice(1).forEach((c) => box.appendChild(c));
      const note = fresh[0].querySelector('.eco-note');
      const cur = box.querySelector('.eco-card .eco-note');
      if (note && cur && tab === 'hipoteca') cur.textContent = note.textContent;
      void focus; void pos;
    }));
  };
  draw();
}
