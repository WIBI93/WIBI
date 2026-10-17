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


// Gráfica de líneas: una por rentabilidad y otra discontinua con lo aportado.
function lineChart(ser, inv, y, start) {
  const W = 340, H = 190, L = 40, R = 10, T = 10, B = 24;
  const max = Math.max(...ser.map((a) => a[y - 1]), inv[y - 1], 1);
  const nice = 10 ** Math.floor(Math.log10(max));
  const top = Math.ceil(max / nice) * nice;
  const X = (i) => L + (i / y) * (W - L - R);
  const Y = (v) => T + (1 - v / top) * (H - T - B);
  const path = (a) => `M${X(0)} ${Y(start)} ` + a.map((v, i) => `L${X(i + 1)} ${Y(v)}`).join(' ');
  const lab = (t) => (t >= 1e6 ? (t / 1e6).toFixed(1).replace('.', ',') + 'M' : Math.round(t / 1000) + 'k');
  const stepX = y <= 10 ? 1 : y <= 30 ? 5 : 10;
  const xs = []; for (let i = 0; i <= y; i += stepX) xs.push(i); if (xs[xs.length - 1] !== y) xs.push(y);
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Evolución del dinero según cada rentabilidad">
    ${[0, 0.25, 0.5, 0.75, 1].map((f) => `<line x1="${L}" x2="${W - R}" y1="${Y(f * top)}" y2="${Y(f * top)}" class="gl"/><text x="${L - 6}" y="${Y(f * top) + 3}" text-anchor="end" class="tx">${lab(f * top)}</text>`).join('')}
    ${xs.map((i) => `<text x="${X(i)}" y="${H - 6}" text-anchor="middle" class="tx">${i}</text>`).join('')}
    <path d="${path(inv)}" fill="none" class="l-inv" stroke-width="2" stroke-dasharray="4 4"/>
    ${ser.map((a, i) => `<path d="${path(a)}" fill="none" class="l-s${i + 1}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${X(y)}" cy="${Y(a[y - 1])}" r="4.5" class="d-s${i + 1}" stroke-width="2"/>`).join('')}
  </svg>`;
}

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
    const inv = Array.from({ length: y }, (_, i) => start + monthly * 12 * (i + 1));
    const step = y <= 12 ? 1 : y <= 30 ? 5 : 10;
    const idx = []; for (let i = step; i <= y; i += step) idx.push(i); if (idx[idx.length - 1] !== y) idx.push(y);
    const cls = ['s1', 's2', 's3'];
    const rl = (i) => pct(rs[i], rs[i] % 1 ? 1 : 0);
    const cards = ser.map((a, i) => {
      const f = a[y - 1].balance, g = f - invested, top = Math.max(f, 1);
      return `<div class="sim-sc ${cls[i]}"><div class="hd"><span class="r"><i></i>${rl(i)} anual</span><span class="meta">${invested > 0 ? (f / invested).toFixed(1).replace('.', ',') + '× lo aportado' : ''}</span></div>
        <div class="amt">${money(f)}</div><div class="stack"><i class="inv" style="width:${(invested / top) * 100}%"></i><i class="fill" style="width:${(Math.max(0, g) / top) * 100}%"></i></div>
        <div class="meta"><span>Aportado ${moneyAuto(invested)}</span><span>Ganado ${moneyAuto(g)}</span></div></div>`;
    }).join('');
    const table = `<div class="sim-tbl"><span></span>${rs.map((r, i) => `<span class="h ${cls[i]}">${rl(i)}</span>`).join('')}
      ${idx.map((i) => `<span class="y">${i} años</span>${ser.map((a, j) => `<span class="c ${cls[j]}">${k(a[i - 1].balance)}</span>`).join('')}`).join('')}</div>`;
    const gap = ser[2][y - 1].balance - ser[0][y - 1].balance;
    out = `<div class="eco-hero"><span class="k">En ${y} años, con ${rl(1)} anual</span><span class="big" style="font-size:32px">${money(ser[1][y - 1].balance)}</span>
        <div class="foot"><span>Aportado ${moneyAuto(invested)}</span><span>Intereses ${money(ser[1][y - 1].balance - invested)}</span></div></div>
      ${cards}
      <div class="eco-card pad"><h3>Cómo crece con cada rentabilidad</h3>${lineChart(ser.map((a) => a.map((x) => x.balance)), inv, y, start)}
        <div class="sim-leg">${rs.map((r, i) => `<span><i class="${cls[i]}"></i>${rl(i)}</span>`).join('')}<span><i class="inv"></i>Solo lo aportado</span></div></div>
      <div class="eco-card pad"><h3>Año a año</h3>${table}</div>
      <div class="eco-note" style="padding:0 4px">Entre la rentabilidad más baja y la más alta hay ${money(gap)} de diferencia tras ${y} años. Estimación con interés fijo y aportación al final de cada mes; la realidad variará y no incluye impuestos ni comisiones.</div>`;
  } else out = '<div class="eco-info">' + ei('info', 18) + '<span>Rellena la aportación mensual o el saldo inicial, y los años, para ver el resultado.</span></div>';
  return `<div class="eco-card pad">
      <div class="eco-grid2" style="gap:10px">${field('monthly', 'Aportación al mes', s.monthly, '0', '€')}${field('years', 'Años', s.years, '10', 'años')}</div>
      ${field('start', 'Saldo inicial', s.start, '0', '€')}
      <span class="eco-label">Rentabilidades a comparar (editables)</span>
      <div class="eco-grid2" style="grid-template-columns:repeat(3,1fr);gap:8px">${['r1', 'r2', 'r3'].map((id, i) => `<div class="eco-unit sim-r s${i + 1}"><input class="eco-input unit" id="${id}" inputmode="decimal" value="${esc(rates[i])}" aria-label="Rentabilidad ${i + 1}" style="padding-left:10px"><span>%</span></div>`).join('')}</div></div>
    ${out}`;
}

// Anillo: parte del total que es préstamo y parte que son intereses.
function donut(m) {
  const R = 44, C = 2 * Math.PI * R, tot = Math.max(1, m.total), f = (m.loan / tot) * C;
  return `<svg viewBox="0 0 110 110" width="124" height="124" role="img" aria-label="Reparto entre préstamo e intereses"><circle cx="55" cy="55" r="${R}" fill="none" class="d-s3" stroke-width="14"/><circle cx="55" cy="55" r="${R}" fill="none" class="d-s1" stroke-width="14" stroke-dasharray="${f} ${C}" transform="rotate(-90 55 55)"/><text x="55" y="52" text-anchor="middle" class="tx">Total</text><text x="55" y="66" text-anchor="middle" class="tx big">${k(m.total)}</text></svg>`;
}

function mortgageHtml(s) {
  const price = val(s.price), down = val(s.down), costs = val(s.costs), years = val(s.mYears), tin = val(s.tin);
  const ok = [price, down, costs, years, tin].every(Number.isFinite) && price > 0 && years >= 1 && down <= price;
  let out = '';
  if (ok) {
    const m = mortgage({ price, down, years, tin });
    const need = down + costs;
    const ys = [20, 25, 30], ts = [2, 3, 4];
    const vals = ts.map((t) => ys.map((yy) => mortgage({ price, down, years: yy, tin: t }).pay));
    const flat = vals.flat(), mn = Math.min(...flat), mx = Math.max(...flat);
    const heatPct = (v) => (mx === mn ? 0 : Math.round(((v - mn) / (mx - mn)) * 100));
    const heat = `<div class="sim-heat"><span></span>${ys.map((yy) => `<span class="h">${yy} años</span>`).join('')}
      ${ts.map((t, i) => `<span class="y">${t} %</span>${vals[i].map((v) => `<span class="c" style="--hp:${heatPct(v)}%">${money(v)}</span>`).join('')}`).join('')}</div>`;
    out = `<div class="eco-hero"><span class="k">Cuota mensual aproximada</span><span class="big" style="font-size:32px">${money(m.pay)}</span>
        <div class="foot"><span>Préstamo ${pct((m.loan / price) * 100, 0)} del valor</span><span>Plazo ${Math.round(years)} años</span></div></div>
      <div class="eco-card pad"><h3>Qué pagas en total</h3>
        <div class="sim-donut">${donut(m)}<div class="tx"><div><i class="s1"></i><span>Préstamo<small>${money(m.loan)}</small></span></div>
          <div><i class="s3"></i><span>Intereses<small>${money(m.interest)} · ${pct(m.loan ? (m.interest / m.loan) * 100 : 0, 0)} del préstamo</small></span></div></div></div>
        <div class="sim-row"><span>Necesitas ahorrado (entrada + gastos)</span><b>${money(need)}</b></div></div>
      <div class="eco-card pad"><h3>Cuota según interés y plazo</h3>${heat}
        <span class="eco-note">Más claro es cuota más baja. Más cálido es cuota más alta.</span></div>
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
