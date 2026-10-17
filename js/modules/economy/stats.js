// Estadísticas: análisis de gastos del mes y del año (solo con los datos que ya hay; no guarda nada).

import { refresh } from '../../core/router.js';
import { esc } from '../../core/ui.js';
import { getData, catOf, isFixedExp } from './data.js';
import { state } from './state.js';
import { money, moneyAuto, pct, monthTitle, monthName, currentMonthKey, shiftMonthKey, MONTHS } from './fmt.js';
import { sum } from './calc.js';
import { ei, round, navHtml, bindNav } from './shell.js';

const ui = { mode: 'mes', year: new Date().getFullYear() };
const share = (a, b) => (b > 0 ? (a / b) * 100 : 0);
const pc = (a, b) => Math.round(share(a, b));
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const short = (mk) => cap(MONTHS[Number(mk.slice(5, 7)) - 1]).slice(0, 3);
const eur0 = (n) => moneyAuto(Math.round(n));

// Todo lo de un mes, ya sumado.
function monthData(d, mk) {
  const exps = d.expenses.filter((e) => e.date.startsWith(mk));
  const incs = d.incomes.filter((e) => e.date.startsWith(mk));
  const movs = d.movements.filter((m) => m.date.startsWith(mk));
  const byCat = {};
  exps.forEach((e) => { byCat[e.cat] = (byCat[e.cat] || 0) + e.amount; });
  const spent = sum(exps, (e) => e.amount);
  const fix = sum(exps.filter(isFixedExp), (e) => e.amount);
  const income = sum(incs, (e) => e.amount);
  const saved = sum(movs.filter((m) => m.kind === 'contrib' && m.fromSalary), (m) => m.amount);
  return { mk, exps, spent, fix, pun: Math.round((spent - fix) * 100) / 100, income, saved, byCat, left: income - spent - saved, has: exps.length > 0 || incs.length > 0 };
}
const catRows = (d, byCat) => Object.entries(byCat).filter(([, v]) => v > 0).map(([id, v]) => ({ cat: catOf(d, id), amount: v }))
  .reduce((acc, r) => { const f = acc.find((x) => x.cat.id === r.cat.id); if (f) f.amount += r.amount; else acc.push({ ...r }); return acc; }, [])
  .sort((a, b) => b.amount - a.amount);

// ---- Dibujos ----
function donut(rows, total, label, center) {
  const R = 42, C = 2 * Math.PI * R; let off = 0;
  const segs = rows.map((r) => { const f = (r.amount / total) * C; const s = `<circle cx="55" cy="55" r="${R}" fill="none" stroke="${r.cat.color}" stroke-width="14" stroke-dasharray="${Math.max(0, f - 2)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 55 55)"/>`; off += f; return s; }).join('');
  return `<svg viewBox="0 0 110 110" width="118" height="118" style="flex:none" role="img" aria-label="Reparto por categorías">${segs}<text x="55" y="52" text-anchor="middle" class="tx">${label}</text><text x="55" y="66" text-anchor="middle" class="tx big">${center}</text></svg>`;
}
function bars(vals, labels, avg, selIdx = -1) {
  const W = 340, h = 130, H = h + 22, n = vals.length, bw = W / n;
  const present = vals.filter((v) => v != null);
  const mx = Math.max(1, ...present) * 1.12;
  const hi = vals.indexOf(Math.max(...present)), lo = vals.indexOf(Math.min(...present));
  const Y = (v) => h - (v / mx) * h + 4;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Gasto mes a mes">
    ${vals.map((v, i) => {
      const x = i * bw + bw * 0.18, w = bw * 0.64;
      const cls = v == null ? '' : present.length > 1 && i === hi ? 'b-hi' : present.length > 1 && i === lo ? 'b-lo' : 'b-mid';
      return `${v == null ? '' : `<rect x="${x}" y="${Y(v)}" width="${w}" height="${h + 4 - Y(v)}" rx="5" class="${cls}"/>`}<text x="${x + w / 2}" y="${H - 4}" text-anchor="middle" class="tx${i === selIdx ? ' big' : ''}">${labels[i]}</text>`;
    }).join('')}
    <line x1="0" x2="${W}" y1="${Y(avg)}" y2="${Y(avg)}" class="b-avg" stroke-width="2" stroke-dasharray="5 4"/>
    <text x="${W}" y="${Y(avg) - 5}" text-anchor="end" class="tx avg">media ${eur0(avg)}</text></svg>`;
}
function pace(mk, cur, prev) {
  const days = 31, W = 340, H = 150, L = 36, R = 8, T = 8, B = 22;
  const acc = (exps) => { const a = Array(days).fill(0); exps.forEach((e) => { a[Number(e.date.slice(8, 10)) - 1] += e.amount; }); let c = 0; return a.map((v) => (c += v)); };
  const a = acc(cur.exps), b = acc(prev.exps);
  const [yy, mm] = mk.split('-').map(Number);
  const last = mk === currentMonthKey() ? new Date().getDate() : new Date(yy, mm, 0).getDate();
  const max = Math.max(...a.slice(0, last), ...b, 1) * 1.05;
  const X = (d) => L + (d / (days - 1)) * (W - L - R), Y = (v) => T + (1 - v / max) * (H - T - B);
  const P = (arr, n) => 'M' + arr.slice(0, n).map((v, d) => `${X(d)} ${Y(v)}`).join(' L');
  return { a, b, last, svg: `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Gasto acumulado del mes">
    ${[0, 0.5, 1].map((f) => `<line x1="${L}" x2="${W - R}" y1="${Y(f * max)}" y2="${Y(f * max)}" class="gl"/><text x="${L - 6}" y="${Y(f * max) + 3}" text-anchor="end" class="tx">${Math.round((f * max) / 10) * 10}</text>`).join('')}
    ${[1, 10, 20, 30].map((d) => `<text x="${X(d - 1)}" y="${H - 6}" text-anchor="middle" class="tx">${d}</text>`).join('')}
    <path d="${P(b, days)}" fill="none" class="p-prev" stroke-width="2.5" stroke-dasharray="5 4"/>
    <path d="${P(a, last)}" fill="none" class="p-cur" stroke-width="3" stroke-linecap="round"/>
    <circle cx="${X(last - 1)}" cy="${Y(a[last - 1])}" r="4.5" class="p-dot" stroke-width="2"/></svg>` };
}
function spark(vals) {
  const W = 84, H = 26, mx = Math.max(...vals), mn = Math.min(...vals);
  const X = (i) => 2 + (i / Math.max(1, vals.length - 1)) * (W - 4), Y = (v) => (mx === mn ? H / 2 : H - 3 - ((v - mn) / (mx - mn)) * (H - 6));
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true"><path d="M${vals.map((v, i) => `${X(i)} ${Y(v)}`).join(' L')}" fill="none" class="p-cur" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${X(vals.length - 1)}" cy="${Y(vals[vals.length - 1])}" r="3" class="p-dot"/></svg>`;
}
const salaryBand = (m, income, title, hint) => {
  const parts = [['Gastos fijos', 'st-fix', m.fix], ['Gastos puntuales', 'st-pun', m.pun], ['Ahorro', 'st-sav', m.saved], ['Te sobran', 'st-left', Math.max(0, income - m.fix - m.pun - m.saved)]];
  return `<div class="eco-card pad"><h3>${title}</h3><span class="eco-note" style="margin-top:-6px">${hint}</span>
    <div class="st-band">${parts.map(([, c, v]) => `<i class="${c}" style="width:${share(v, income)}%"></i>`).join('')}</div>
    <div class="st-leg">${parts.map(([n, c, v]) => `<div><i class="${c}"></i><span>${n}</span><b>${money(v)} <small>${pc(v, income)} %</small></b></div>`).join('')}</div></div>`;
};
const catList = (rows, total, right) => `<div class="st-cats">${rows.map((r) => `<div class="st-cat"><div class="t"><span class="d" style="background:${r.cat.color}"></span><span class="g">${esc(r.cat.name)}</span>${right(r)}</div><div class="bar"><i style="width:${share(r.amount, rows[0].amount)}%;background:${r.cat.color}"></i></div></div>`).join('')}</div>`;

// ---- Vista de mes ----
function viewMonth(d, mk) {
  const a = monthData(d, mk), pk = shiftMonthKey(mk, -1), p = monthData(d, pk);
  if (!a.has) return `<div class="eco-empty">No hay datos en ${monthName(mk)}.</div>`;
  const dv = p.spent > 0 ? Math.round(((a.spent - p.spent) / p.spent) * 100) : null;
  const rows = catRows(d, a.byCat), prow = catRows(d, p.byCat);
  const hero = `<div class="eco-hero"><span class="k">Has gastado en ${monthName(mk)}</span><span class="big">${money(a.spent)}</span>
    <div class="st-pills">${dv !== null ? `<span>${dv >= 0 ? '▲' : '▼'} ${Math.abs(dv)} % ${dv >= 0 ? 'más' : 'menos'} que ${monthName(pk)}</span>` : ''}${a.income > 0 ? `<span>Ahorras el ${pc(a.saved, a.income)} % del sueldo</span>` : ''}</div></div>`;
  const band = a.income > 0 ? salaryBand(a, a.income, 'Qué hace tu sueldo', `Ingresos de ${money(a.income)} repartidos`) : '';
  const cats = rows.length ? `<div class="eco-card pad"><h3>En qué se va el dinero</h3><span class="eco-note" style="margin-top:-6px">Porcentaje de lo gastado y cambio respecto a ${monthName(pk)}</span>
    <div class="st-donut">${donut(rows, a.spent, 'Gastado', moneyAuto(a.spent))}<div class="st-top4">${rows.slice(0, 4).map((r) => `<div><span class="d" style="background:${r.cat.color}"></span><span class="g">${esc(r.cat.name)}</span><b>${pc(r.amount, a.spent)} %</b></div>`).join('')}${rows.length > 4 ? `<span class="eco-note">+ ${rows.length - 4} más abajo</span>` : ''}</div></div>
    ${catList(rows, a.spent, (r) => { const pv = (prow.find((x) => x.cat.id === r.cat.id) || {}).amount || 0; const dd = pv ? Math.round(((r.amount - pv) / pv) * 100) : null; return `${dd !== null ? `<span class="dl ${dd > 0 ? 'up' : 'dn'}">${dd > 0 ? '▲' : '▼'} ${Math.abs(dd)} %</span>` : ''}<b>${money(r.amount)}</b>`; })}</div>` : '';
  let ritmo = '';
  if (p.spent > 0 && a.spent > 0) {
    const pz = pace(mk, a, p), diff = Math.round(pz.a[pz.last - 1] - pz.b[pz.last - 1]);
    ritmo = `<div class="eco-card pad"><h3>Ritmo del mes</h3><span class="eco-note" style="margin-top:-6px">Gasto acumulado día a día</span>${pz.svg}
      <div class="st-lg2"><span><i class="cur"></i>${cap(monthName(mk))}</span><span><i class="prev"></i>${cap(monthName(pk))}</span></div>
      <span class="eco-note">${mk === currentMonthKey() ? `Al día ${pz.last} llevas` : 'En todo el mes llevaste'} ${money(Math.abs(diff))} ${diff > 0 ? 'más' : 'menos'} que ${mk === currentMonthKey() ? 'el mes pasado a estas alturas' : monthName(pk)}.</span></div>`;
  }
  const big = [...a.exps].sort((x, y) => y.amount - x.amount).slice(0, 5);
  const top = big.length ? `<div class="eco-card pad"><h3>Gastos más grandes</h3>${big.map((e, i) => {
    const fx = e.fixedId || e.fixedName ? (d.fixed.find((f) => f.id === e.fixedId) || {}).name || e.fixedName : '';
    return `<div class="st-top"><span class="n">${i + 1}</span><span class="g">${esc(fx || e.note || catOf(d, e.cat).name)}<small>${esc(catOf(d, e.cat).name)}${fx ? ' · fijo' : ''}</small></span><b>${money(e.amount)}</b></div>`; }).join('')}</div>` : '';
  const mks = []; for (let i = 5; i >= 0; i--) mks.push(shiftMonthKey(mk, -i));
  const md = mks.map((k) => monthData(d, k)); const withData = md.filter((x) => x.spent > 0);
  const avg = withData.length ? sum(withData, (x) => x.spent) / withData.length : 0;
  const hist = withData.length > 1 ? `<div class="eco-card pad"><h3>Últimos 6 meses</h3><span class="eco-note" style="margin-top:-6px">Rojo: el más caro. Verde: el más barato</span>${bars(md.map((x) => (x.spent > 0 ? x.spent : null)), mks.map(short), avg, 5)}</div>` : '';
  return hero + band + cats + ritmo + top + hist;
}

// ---- Vista de año ----
function viewYear(d, year) {
  const mks = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
  const md = mks.map((k) => monthData(d, k));
  const have = md.filter((x) => x.has);
  if (!have.length) return `<div class="eco-empty">No hay datos en ${year}.</div>`;
  const n = have.length, tot = sum(have, (x) => x.spent), avg = tot / n;
  const income = sum(have, (x) => x.income), saved = sum(have, (x) => x.saved);
  const incAvg = income / n;
  const byCat = {}; have.forEach((x) => Object.entries(x.byCat).forEach(([id, v]) => { byCat[id] = (byCat[id] || 0) + v; }));
  const rows = catRows(d, byCat);
  const fixAvg = sum(have, (x) => x.fix) / n;
  const hero = `<div class="eco-hero"><span class="k">Gasto medio al mes en ${year}</span><span class="big">${money(avg)}</span>
    <div class="st-pills"><span>${money(tot)} en ${n} ${n === 1 ? 'mes' : 'meses'}</span>${income > 0 ? `<span>Ahorras el ${pc(saved, income)} % del sueldo</span>` : ''}</div></div>`;
  const months = `<div class="eco-card pad"><h3>Mes a mes</h3><span class="eco-note" style="margin-top:-6px">Rojo: el más caro. Verde: el más barato</span>${bars(md.map((x) => (x.has ? x.spent : null)), mks.map(short), avg)}</div>`;
  const avgM = { fix: fixAvg, pun: sum(have, (x) => x.pun) / n, saved: saved / n };
  const band = incAvg > 0 ? salaryBand(avgM, incAvg, 'Qué hace tu sueldo, de media', `Ingresos medios de ${money(incAvg)} al mes`) : '';
  const cats = rows.length ? `<div class="eco-card pad"><h3>Media por categoría</h3><span class="eco-note" style="margin-top:-6px">Lo que gastas de media cada mes en cada una</span>
    <div class="st-donut">${donut(rows, tot, 'Media/mes', moneyAuto(avg))}<div class="st-top4">${rows.slice(0, 4).map((r) => `<div><span class="d" style="background:${r.cat.color}"></span><span class="g">${esc(r.cat.name)}</span><b>${pc(r.amount, tot)} %</b></div>`).join('')}${rows.length > 4 ? `<span class="eco-note">+ ${rows.length - 4} más abajo</span>` : ''}</div></div>
    ${catList(rows, tot, (r) => `<span class="p">${pc(r.amount, tot)} %</span><b>${eur0(r.amount / n)}/mes</b>`)}</div>` : '';
  let evo = '';
  if (n >= 4 && rows.length) {
    const half = Math.floor(n / 2);
    const rowsEvo = rows.map((r) => { const ser = have.map((x) => sum(Object.entries(x.byCat).filter(([id]) => catOf(d, id).id === r.cat.id), ([, v]) => v));
      const a = ser.slice(0, half).reduce((s, v) => s + v, 0) / half, b = ser.slice(-half).reduce((s, v) => s + v, 0) / half; return { r, ser, t: a > 0 ? Math.round(((b - a) / a) * 100) : null }; });
    evo = `<div class="eco-card pad"><h3>Cómo evoluciona cada categoría</h3><span class="eco-note" style="margin-top:-6px">Los ${half} últimos meses frente a los ${half} primeros</span>
      ${rowsEvo.map(({ r, ser, t }) => `<div class="st-spk"><span class="d" style="background:${r.cat.color}"></span><span class="g">${esc(r.cat.name)}<small>${eur0(r.amount / n)}/mes de media</small></span>${spark(ser)}${t !== null ? `<span class="dl ${t > 0 ? 'up' : 'dn'}">${t > 0 ? '▲' : '▼'} ${Math.abs(t)} %</span>` : ''}</div>`).join('')}</div>`;
  }
  const hi = have.reduce((a, b) => (b.spent > a.spent ? b : a)), lo = have.reduce((a, b) => (b.spent < a.spent ? b : a));
  const tiles = `<div class="eco-grid2">
    <div class="eco-card tint-sand"><span class="k">Mes más caro</span><span class="v">${cap(monthName(hi.mk))}</span><span class="k">${money(hi.spent)}</span></div>
    <div class="eco-card tint-mint"><span class="k">Mes más barato</span><span class="v">${cap(monthName(lo.mk))}</span><span class="k">${money(lo.spent)}</span></div>
    ${rows.length ? `<div class="eco-card tint-mist"><span class="k">Categoría más fuerte</span><span class="v">${esc(rows[0].cat.name)}</span><span class="k">${pc(rows[0].amount, tot)} % del gasto</span></div>` : ''}
    <div class="eco-card tint-lav"><span class="k">Gasto fijo medio</span><span class="v">${money(fixAvg)}</span><span class="k">${pc(fixAvg, avg)} % de lo que gastas</span></div></div>`;
  return hero + months + band + cats + evo + tiles + `<div class="eco-note" style="padding:0 4px">Las medias se calculan solo con los meses que tienen datos (${n} en ${year}), no con 12.</div>`;
}

export function renderStats(el) {
  const d = getData();
  const mk = state.mk, now = currentMonthKey(), isNow = mk === now;
  const yearNow = new Date().getFullYear();
  const month = ui.mode === 'mes';
  el.innerHTML = `
    <div class="eco"><div class="eco-body">
      <header class="eco-head"><div class="grow"><span class="eco-sub">Economía</span><span class="eco-h1">Estadísticas</span></div>
        ${round('prev', 'back', month ? 'Mes anterior' : 'Año anterior')}
        <button type="button" class="eco-round" id="next" aria-label="${month ? 'Mes siguiente' : 'Año siguiente'}" ${(month ? isNow : ui.year >= yearNow) ? 'disabled' : ''}>${ei('next', 20)}</button></header>
      <div class="eco-seg" role="group"><button type="button" data-m="mes" aria-pressed="${month}">Mes</button><button type="button" data-m="anio" aria-pressed="${!month}">Año</button></div>
      <span class="eco-sub" style="padding:0 4px">${month ? monthTitle(mk) : ui.year}</span>
      ${month ? viewMonth(d, mk) : viewYear(d, ui.year)}
    </div>${navHtml('estadisticas')}</div>`;
  bindNav(el);
  el.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { ui.mode = b.dataset.m; refresh(); }));
  el.querySelector('#prev').addEventListener('click', () => { if (month) state.mk = shiftMonthKey(mk, -1); else ui.year -= 1; refresh(); });
  el.querySelector('#next').addEventListener('click', () => { if (month) { if (!isNow) state.mk = shiftMonthKey(mk, 1); } else if (ui.year < yearNow) ui.year += 1; refresh(); });
}
