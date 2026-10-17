// Pestaña Pagos: calendario de gastos fijos que se repiten (se calcula cada mes, no se guarda) y pagos sueltos previstos.

import { navigate, refresh } from '../../core/router.js';
import { esc, toast, formDialog } from '../../core/ui.js';
import { getData, update, uid, OTROS } from './data.js';
import { state } from './state.js';
import { money, moneyAuto, parseMoney, toInput, dateKey, monthTitle, shiftMonthKey } from './fmt.js';
import { sum } from './calc.js';
import { ei, round, navHtml, bindNav } from './shell.js';

const pad = (n) => String(n).padStart(2, '0');
const monthsOf = (mk) => Number(mk.slice(0, 4)) * 12 + Number(mk.slice(5, 7)) - 1;
const daysIn = (mk) => new Date(Number(mk.slice(0, 4)), Number(mk.slice(5, 7)), 0).getDate();
export const EVERY = { 1: 'Cada mes', 2: 'Cada 2 meses', 3: 'Cada 3 meses', 12: 'Cada año', 0: 'No se repite' };

// ¿Toca este gasto fijo en ese mes?
export function occurs(f, mk) {
  if (f.every === null || !f.start) return false;
  const diff = monthsOf(mk) - monthsOf(f.start);
  if (diff < 0) return false;
  return f.every === 0 ? diff === 0 : diff % f.every === 0;
}

// Pagos del mes (fijos que tocan + sueltos previstos), ordenados por fecha. Cada uno con su estado.
export function monthPayments(d, mk, today = dateKey()) {
  const out = [];
  d.fixed.forEach((f) => {
    if (!occurs(f, mk)) return;
    const exps = d.expenses.filter((e) => e.fixedId === f.id && e.date.startsWith(mk));
    const skipped = d.pay.skip.some((x) => x.fixedId === f.id && x.mk === mk);
    const mv = d.pay.move.find((x) => x.fixedId === f.id && x.mk === mk);
    const day = Math.min(mv ? mv.day : f.day, daysIn(mk));
    const date = `${mk}-${pad(day)}`;
    const prev = d.expenses.filter((e) => e.fixedId === f.id && e.date.slice(0, 7) < mk).sort((a, b) => b.date.localeCompare(a.date))[0];
    out.push({ key: 'f' + f.id, kind: 'fixed', f, name: f.name, date, day, paid: exps.length > 0, skipped, amount: exps.length ? sum(exps, (e) => e.amount) : prev ? prev.amount : null, estimate: !exps.length, moved: !!mv });
  });
  d.pay.extras.filter((x) => x.date.startsWith(mk)).forEach((x) => {
    out.push({ key: 'x' + x.id, kind: 'extra', x, name: x.name, date: x.date, day: Number(x.date.slice(8, 10)), paid: false, skipped: false, amount: x.amount, estimate: false });
  });
  out.forEach((p) => {
    if (p.paid) p.state = 'paid';
    else if (p.skipped) p.state = 'skipped';
    else if (p.date < today) p.state = 'late';
    else {
      const n = Math.round((new Date(p.date) - new Date(today)) / 86400000);
      p.left = n; p.state = n <= 7 ? 'soon' : 'planned';
    }
  });
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

const LABEL = (p) => ({ paid: 'Pagado', skipped: 'Saltado', late: 'Sin rellenar', planned: 'Previsto', soon: p.left === 0 ? 'Vence hoy' : `Vence en ${p.left} ${p.left === 1 ? 'día' : 'días'}` }[p.state]);

export function renderPagos(el) {
  const d = getData();
  const mk = state.mk;
  const list = monthPayments(d, mk);
  const active = list.filter((p) => p.state !== 'skipped');
  const paidSum = sum(active.filter((p) => p.paid), (p) => p.amount || 0);
  const planSum = sum(active.filter((p) => !p.paid), (p) => p.amount || 0);
  const unsched = d.fixed.filter((f) => f.freq === 'monthly' && f.every === null).length;
  const n = daysIn(mk);
  const first = (new Date(Number(mk.slice(0, 4)), Number(mk.slice(5, 7)) - 1, 1).getDay() + 6) % 7; // lunes = 0
  const byDay = {};
  list.forEach((p) => { (byDay[p.day] = byDay[p.day] || []).push(p); });
  let cells = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((x) => `<span class="pg-dh">${x}</span>`).join('') + '<span></span>'.repeat(first);
  for (let i = 1; i <= n; i++) {
    const ps = byDay[i] || [];
    const dots = ps.slice(0, 3).map((p) => `<i class="pg-dot ${p.state}"></i>`).join('');
    cells += `<span class="pg-day${ps.length ? ' has' : ''}${`${mk}-${pad(i)}` === dateKey() ? ' today' : ''}">${i}<span class="pg-dots">${dots}</span></span>`;
  }
  const weeks = [[1, 7], [8, 14], [15, 21], [22, n]].map(([a, b]) => ({ a, b, v: sum(active.filter((p) => p.day >= a && p.day <= b), (p) => p.amount || 0) }));
  const top = Math.max(1, ...weeks.map((w) => w.v));
  const row = (p) => `<div class="pg-row" data-k="${p.key}">
      <button type="button" class="pg-main" data-open="${p.key}"><span class="pg-d">${p.day}</span><span class="tx"><b>${esc(p.name)}${p.moved ? ' <em>· día cambiado</em>' : ''}</b><span class="pg-st ${p.state}">${LABEL(p)}</span></span>
        <span class="am">${p.amount == null ? '—' : `${p.estimate ? '~' : ''}${moneyAuto(p.amount)}`}</span></button>
      <div class="pg-act" hidden>${p.paid ? '<span class="eco-note">Este pago ya está registrado en tus gastos.</span>' : `<button type="button" class="eco-btn" data-do="pay" data-k="${p.key}">Confirmar pago</button>`}
        ${p.kind === 'fixed' && !p.paid ? `<button type="button" class="eco-chip" data-do="skip" data-k="${p.key}" aria-pressed="${p.skipped}">${p.skipped ? 'Dejar de saltar' : 'Saltar este mes'}</button><button type="button" class="eco-chip" data-do="day" data-k="${p.key}">Cambiar día solo este mes</button>` : ''}
        ${p.kind === 'fixed' ? `<button type="button" class="eco-chip" data-do="edit" data-k="${p.key}">Editar siempre</button>` : `<button type="button" class="eco-chip" data-do="del" data-k="${p.key}">Eliminar pago</button>`}</div></div>`;

  el.innerHTML = `
    <div class="eco"><div class="eco-body">
      <header class="eco-head"><div class="grow"><span class="eco-sub">${monthTitle(mk)}</span><span class="eco-h1">Pagos</span></div>${round('prev', 'back', 'Mes anterior')}${round('next', 'next', 'Mes siguiente')}${round('newp', 'plus', 'Añadir pago previsto')}</header>
      <div class="eco-card pad"><span class="k">Previsto este mes</span><span class="v" style="font-size:28px">${money(paidSum + planSum)}</span>
        <span class="eco-note">Pagado ${moneyAuto(paidSum)} · Por pagar ${moneyAuto(planSum)} · «~» es una previsión con el importe del último mes</span></div>
      ${unsched ? `<button type="button" class="eco-info pg-warn" id="cfg">${ei('info', 18)}<span>${unsched} ${unsched === 1 ? 'gasto fijo' : 'gastos fijos'} sin día ni repetición. Toca aquí para configurarlos.</span></button>` : ''}
      <div class="eco-card pad pg-cal">${cells}</div>
      <div class="eco-card pad"><h3>Por semanas</h3><div class="pg-weeks">${weeks.map((w) => `<div class="pg-w"><i style="height:${Math.max(4, (w.v / top) * 70)}px"></i><b>${w.v ? moneyAuto(w.v) : '–'}</b><span>${w.a}–${w.b}</span></div>`).join('')}</div></div>
      <span class="eco-section">PAGOS DEL MES</span>
      ${list.length ? `<div class="eco-list" style="padding-bottom:0">${list.map(row).join('')}</div>` : '<div class="eco-card"><div class="eco-empty">No hay pagos este mes. Los gastos fijos aparecen aquí cuando les pones día y repetición; también puedes añadir un pago suelto con +.</div></div>'}
    </div>${navHtml('pagos')}</div>`;
  bindNav(el);
  el.querySelector('#prev').addEventListener('click', () => { state.mk = shiftMonthKey(mk, -1); refresh(); });
  el.querySelector('#next').addEventListener('click', () => { state.mk = shiftMonthKey(mk, 1); refresh(); });
  const cfg = el.querySelector('#cfg');
  if (cfg) cfg.addEventListener('click', () => navigate('/economia/gastos-fijos/editar'));
  el.querySelector('#newp').addEventListener('click', async () => {
    const r = await formDialog({ title: 'Pago previsto', confirmLabel: 'Guardar', fields: [
      { key: 'name', label: 'Qué es', maxLength: 40, placeholder: 'Ej.: Dentista' },
      { key: 'amount', label: 'Importe aproximado (€)', placeholder: '0,00' },
      { key: 'date', label: 'Fecha', type: 'date', value: `${mk}-${pad(Math.min(new Date().getDate(), n))}` }] });
    if (!r) return;
    const amount = parseMoney(r.amount);
    if (!r.name.trim() || !Number.isFinite(amount) || amount <= 0 || !r.date) return toast('Pon nombre, importe y fecha');
    update((data) => data.pay.extras.push({ id: uid(), name: r.name.trim(), amount, date: r.date, cat: OTROS }));
    refresh();
  });
  el.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => {
    const a = b.parentElement.querySelector('.pg-act'); a.hidden = !a.hidden;
  }));
  el.querySelectorAll('[data-do]').forEach((b) => b.addEventListener('click', async () => {
    const p = list.find((x) => x.key === b.dataset.k);
    const act = b.dataset.do;
    if (act === 'edit') return navigate('/economia/gasto-fijo/' + p.f.id);
    if (act === 'del') { update((data) => { data.pay.extras = data.pay.extras.filter((x) => x.id !== p.x.id); }); return refresh(); }
    if (act === 'skip') {
      update((data) => {
        const has = data.pay.skip.some((x) => x.fixedId === p.f.id && x.mk === mk);
        data.pay.skip = has ? data.pay.skip.filter((x) => !(x.fixedId === p.f.id && x.mk === mk)) : [...data.pay.skip, { fixedId: p.f.id, mk }];
      });
      return refresh();
    }
    if (act === 'day') {
      const r = await formDialog({ title: `${p.name}: día de ${monthTitle(mk)}`, confirmLabel: 'Guardar', fields: [{ key: 'day', label: 'Día del mes (1-31)', value: String(p.day) }] });
      if (!r) return;
      const v = Math.round(parseMoney(r.day));
      if (!Number.isFinite(v) || v < 1 || v > 31) return toast('Escribe un día entre 1 y 31');
      update((data) => { data.pay.move = data.pay.move.filter((x) => !(x.fixedId === p.f.id && x.mk === mk)); data.pay.move.push({ fixedId: p.f.id, mk, day: v }); });
      return refresh();
    }
    // Confirmar pago: crea el gasto de verdad
    const r = await formDialog({ title: `Confirmar ${p.name}`, confirmLabel: 'Registrar gasto', fields: [
      { key: 'amount', label: 'Importe real (€)', value: p.amount ? toInput(p.amount) : '', placeholder: '0,00' },
      { key: 'date', label: 'Fecha del pago', type: 'date', value: p.date }] });
    if (!r) return;
    const amount = parseMoney(r.amount);
    if (!Number.isFinite(amount) || amount <= 0) return toast('Escribe un importe mayor que 0');
    update((data) => {
      if (p.kind === 'fixed') data.expenses.push({ id: uid(), date: r.date || p.date, amount, cat: p.f.cat, note: '', fixedId: p.f.id, fixedName: '' });
      else {
        data.expenses.push({ id: uid(), date: r.date || p.date, amount, cat: p.x.cat, note: p.x.name, fixedId: null, fixedName: '' });
        data.pay.extras = data.pay.extras.filter((x) => x.id !== p.x.id);
      }
    });
    toast('Pago registrado en tus gastos');
    refresh();
  }));
}
