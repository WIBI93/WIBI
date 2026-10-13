// Añadir y editar: elegir qué añadir, gasto puntual/fijo (editar) e ingreso.

import { go, back } from '../../core/router.js';
import { esc, toast, confirmDialog, formDialog } from '../../core/ui.js';
import { getData, update, uid, addCategory, catOf } from './data.js';
import { money, parseMoney, toInput, dateKey, dayLabel, monthKeyOf, monthTitle } from './fmt.js';
import { ei, round } from './shell.js';
import { sum } from './calc.js';

export function renderChoose(el) {
  const opt = (path, icon, bg, fg, title, sub) =>
    `<button type="button" class="eco-card" data-go="${path}" style="flex-direction:row;align-items:center;gap:14px;padding:16px;border-radius:22px;text-align:left">
      <span style="width:52px;height:52px;border-radius:26px;background:${bg};color:${fg};display:flex;align-items:center;justify-content:center;flex:none">${ei(icon, 26)}</span>
      <span style="flex:1;display:flex;flex-direction:column;gap:3px"><b style="font-size:17px;font-weight:800">${title}</b><span class="eco-note">${sub}</span></span>
      <span style="color:var(--muted)">${ei('next', 20)}</span></button>`;
  el.innerHTML = `
    <div class="eco"><div class="eco-body">
      <header class="eco-head"><div class="grow"><span class="eco-h1">¿Qué quieres añadir?</span></div>${round('close', 'x', 'Cerrar')}</header>
      <div style="height:8px"></div>
      ${opt('/economia/gasto/nuevo', 'bag', 'var(--green-soft)', 'var(--accent-text)', 'Gasto puntual', 'Un jersey, el cine, la compra del súper')}
      ${opt('/economia/gastos-fijos', 'home', 'var(--amber-soft)', '#8A5A0B', 'Gasto fijo', 'Alquiler, luz, agua, seguros, suscripciones')}
      ${opt('/economia/ingreso/nuevo', 'down', 'var(--blue-soft)', 'var(--blue)', 'Ingreso', 'Tu sueldo del mes u otros ingresos')}
      <div style="flex:1"></div>
      <div class="eco-info">${ei('info', 18)}<span>Las aportaciones al ahorro se añaden desde la pestaña Ahorro, para que no dependan de tus gastos.</span></div>
    </div></div>`;
  el.querySelector('#close').addEventListener('click', () => back('/economia'));
  // reemplaza la pantalla (no suma otro paso al historial) para que "guardar" vuelva al resumen
  el.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
}

export const amountCard = (label, value, green = false) =>
  `<div class="eco-amount"><label for="amount">${label}</label><div class="line"><input id="amount" inputmode="decimal" autocomplete="off" value="${esc(value)}" placeholder="0" class="${green ? 'green' : ''}"><span class="eur">€</span></div></div>`;

export const dateRow = (date) =>
  `<label class="eco-formrow">${ei('cal', 22)}<span class="l">${dayLabel(date)}</span><span class="r">Cambiar</span><input type="date" id="date" value="${date}" aria-label="Cambiar la fecha"></label>`;
export const noteRow = (note) =>
  `<div class="eco-formrow">${ei('chat', 22)}<input type="text" id="note" maxlength="80" aria-label="Nota (opcional)" placeholder="Nota (opcional)" value="${esc(note)}"></div>`;

export function readAmount(el) {
  const v = parseMoney(el.querySelector('#amount').value);
  return Number.isFinite(v) && v > 0 ? v : NaN;
}

// ---------- Gasto (nuevo o editar) ----------
export function renderExpense(el, { id }) {
  const isNew = id === 'nuevo';
  let d = getData();
  const ex = d.expenses.find((e) => e.id === id);
  if (!isNew && !ex) { back('/economia/gastos'); return; }
  const fixed = ex && (ex.fixedId || ex.fixedName) ? { name: (d.fixed.find((f) => f.id === ex.fixedId) || {}).name || ex.fixedName } : null;
  const draft = ex ? { amount: toInput(ex.amount), cat: ex.cat, date: ex.date, note: ex.note } : { amount: '', cat: '', date: dateKey(), note: '' };

  const draw = () => {
    d = getData();
    el.innerHTML = `
      <div class="eco"><div class="eco-body">
        <header class="eco-head">${round('go-back', 'back', 'Volver')}<div class="grow">${isNew ? '' : '<span class="eco-sub">Movimientos</span>'}<span class="eco-h1">${isNew ? 'Gasto puntual' : fixed ? esc(fixed.name) : 'Editar gasto'}</span></div></header>
        ${amountCard('Importe', draft.amount)}
        <div class="eco-card pad" style="border-radius:24px"><h3>Categoría</h3>
          <div class="eco-chips">${d.categories.map((c) => `<button type="button" class="eco-chip" data-cat="${c.id}" aria-pressed="${draft.cat === c.id}">${esc(c.name)}</button>`).join('')}
            <button type="button" class="eco-chip new" id="newcat">+ Nueva</button></div></div>
        <div class="eco-rows">${dateRow(draft.date)}${noteRow(draft.note)}</div>
        <div class="eco-foot">
          ${isNew ? '' : '<button type="button" class="eco-btn text" id="del">Eliminar gasto</button>'}
          <button type="button" class="eco-btn" id="save">${isNew ? 'Guardar gasto' : 'Guardar cambios'}</button></div>
      </div></div>`;
    const grab = () => { draft.amount = el.querySelector('#amount').value; draft.note = el.querySelector('#note').value; };
    el.querySelector('#go-back').addEventListener('click', () => back('/economia'));
    el.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { grab(); draft.cat = b.dataset.cat; draw(); }));
    el.querySelector('#date').addEventListener('change', (e) => { grab(); if (e.target.value) draft.date = e.target.value; draw(); });
    el.querySelector('#newcat').addEventListener('click', async () => {
      grab();
      const r = await formDialog({ title: 'Nueva categoría', confirmLabel: 'Crear', fields: [{ key: 'name', label: 'Nombre', maxLength: 30 }] });
      if (!r || !r.name.trim()) return;
      let created;
      update((data) => { created = addCategory(data, r.name); });
      if (created) draft.cat = created.id;
      draw();
    });
    el.querySelector('#save').addEventListener('click', () => {
      grab();
      const amount = readAmount(el);
      if (!Number.isFinite(amount)) return toast('Escribe un importe mayor que 0');
      if (!draft.cat) return toast('Elige una categoría');
      update((data) => {
        if (isNew) data.expenses.push({ id: uid(), date: draft.date, amount, cat: draft.cat, note: draft.note.trim(), fixedId: null, fixedName: '' });
        else { const e = data.expenses.find((x) => x.id === id); if (e) Object.assign(e, { date: draft.date, amount, cat: draft.cat, note: draft.note.trim() }); }
      });
      back('/economia');
    });
    const del = el.querySelector('#del');
    if (del) del.addEventListener('click', async () => {
      const ok = await confirmDialog({ title: '¿Eliminar este gasto?', text: `Se eliminarán ${money(ex.amount)} de ${fixed ? fixed.name : (ex.note || catOf(d, ex.cat).name)}. Esto no se puede deshacer.`, confirmLabel: 'Sí, eliminar', danger: true });
      if (!ok) return;
      update((data) => { data.expenses = data.expenses.filter((x) => x.id !== id); });
      back('/economia/gastos');
    });
  };
  draw();
}

// ---------- Ingreso (nuevo o editar) ----------
export function renderIncome(el, { id }) {
  const isNew = id === 'nuevo';
  let d = getData();
  const inc = d.incomes.find((e) => e.id === id);
  if (!isNew && !inc) { back('/economia/gastos'); return; }
  const draft = inc ? { amount: toInput(inc.amount), type: inc.type, date: inc.date, note: inc.note } : { amount: '', type: d.incomeTypes[0], date: dateKey(), note: '' };

  const draw = () => {
    d = getData();
    const mk = monthKeyOf(draft.date);
    const others = d.incomes.filter((i) => i.id !== id && i.date.startsWith(mk));
    const info = () => {
      const now = parseMoney(el.querySelector('#amount') ? el.querySelector('#amount').value : draft.amount);
      const total = sum(others, (i) => i.amount) + (Number.isFinite(now) && now > 0 ? now : 0);
      return `<span class="eco-section" style="padding:0">INGRESOS DE ${esc(monthTitle(mk).toUpperCase())}</span>
          ${others.length ? others.map((i) => `<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600;width:100%"><span>${esc(i.type)} · ${Number(i.date.slice(8))} ${monthTitle(mk).slice(0, 3).toLowerCase()}</span><b>${money(i.amount)}</b></div>`).join('') : '<span class="eco-note">Todavía no hay otros ingresos este mes.</span>'}
          <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600;width:100%"><span>Con este ingreso</span><b>${money(total)}</b></div>`;
    };
    const types = [...new Set([...d.incomeTypes, draft.type])];
    el.innerHTML = `
      <div class="eco"><div class="eco-body">
        <header class="eco-head">${round('go-back', 'back', 'Volver')}<div class="grow">${isNew ? '' : '<span class="eco-sub">Movimientos</span>'}<span class="eco-h1">${isNew ? 'Ingreso' : 'Editar ingreso'}</span></div></header>
        ${amountCard('Importe', draft.amount, true)}
        <div class="eco-card pad" style="border-radius:24px"><h3>Tipo de ingreso</h3>
          <div class="eco-chips">${types.map((t) => `<button type="button" class="eco-chip" data-type="${esc(t)}" aria-pressed="${draft.type === t}">${esc(t)}</button>`).join('')}
            <button type="button" class="eco-chip new" id="newtype">+ Nuevo</button></div></div>
        <div class="eco-rows">${dateRow(draft.date)}${noteRow(draft.note)}</div>
        <div class="eco-info" id="info" style="flex-direction:column;gap:8px">${info()}</div>
        <div class="eco-foot">
          ${isNew ? '' : '<button type="button" class="eco-btn text" id="del">Eliminar ingreso</button>'}
          <button type="button" class="eco-btn" id="save">${isNew ? 'Guardar ingreso' : 'Guardar cambios'}</button></div>
      </div></div>`;
    const grab = () => { draft.amount = el.querySelector('#amount').value; draft.note = el.querySelector('#note').value; };
    el.querySelector('#go-back').addEventListener('click', () => back('/economia'));
    el.querySelector('#amount').addEventListener('input', () => { el.querySelector('#info').innerHTML = info(); });
    el.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => { grab(); draft.type = b.dataset.type; draw(); }));
    el.querySelector('#date').addEventListener('change', (e) => { grab(); if (e.target.value) draft.date = e.target.value; draw(); });
    el.querySelector('#newtype').addEventListener('click', async () => {
      grab();
      const r = await formDialog({ title: 'Nuevo tipo de ingreso', confirmLabel: 'Crear', fields: [{ key: 'name', label: 'Nombre', maxLength: 30 }] });
      const name = r && r.name.trim();
      if (!name) return;
      update((data) => { if (!data.incomeTypes.some((t) => t.toLowerCase() === name.toLowerCase())) data.incomeTypes.push(name); });
      draft.type = name;
      draw();
    });
    el.querySelector('#save').addEventListener('click', () => {
      grab();
      const amount = readAmount(el);
      if (!Number.isFinite(amount)) return toast('Escribe un importe mayor que 0');
      update((data) => {
        if (isNew) data.incomes.push({ id: uid(), date: draft.date, amount, type: draft.type, note: draft.note.trim() });
        else { const e = data.incomes.find((x) => x.id === id); if (e) Object.assign(e, { date: draft.date, amount, type: draft.type, note: draft.note.trim() }); }
      });
      back('/economia');
    });
    const del = el.querySelector('#del');
    if (del) del.addEventListener('click', async () => {
      const ok = await confirmDialog({ title: '¿Eliminar este ingreso?', text: `Se eliminarán ${money(inc.amount)} de ${inc.type}. Esto no se puede deshacer.`, confirmLabel: 'Sí, eliminar', danger: true });
      if (!ok) return;
      update((data) => { data.incomes = data.incomes.filter((x) => x.id !== id); });
      back('/economia/gastos');
    });
  };
  draw();
}
