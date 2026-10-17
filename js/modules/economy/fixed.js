// Gastos fijos: lista del mes (rellenar importes), modo editar y crear/editar uno.

import { navigate, back, refresh } from '../../core/router.js';
import { esc, toast, confirmDialog, formDialog } from '../../core/ui.js';
import { getData, update, uid, addCategory, removeFixed } from './data.js';
import { state } from './state.js';
import { money, monthTitle, parseMoney, defaultDateFor, dateKey } from './fmt.js';
import { fixedStatus, sum } from './calc.js';
import { ei, round } from './shell.js';
import { EVERY } from './pagos.js';

function groups(d, rows) {
  return d.categories.map((c) => ({ cat: c, rows: rows.filter((r) => (r.fixed || r).cat === c.id) })).filter((g) => g.rows.length);
}

export function renderFixed(el) {
  const d = getData();
  const mk = state.mk;
  const st = fixedStatus(d, mk);
  const total = sum(st.filter((r) => r.filled), (r) => r.amount);
  const filled = st.filter((r) => r.filled).length;
  const pending = st.filter((r) => !r.filled && r.fixed.freq === 'monthly').length;
  const rowHtml = (r) => `<div class="eco-item" style="min-height:56px">
      <span class="tx"><b>${esc(r.fixed.name)}${r.fixed.freq === 'occasional' ? '<span class="eco-tag">Ocasional</span>' : ''}</b></span>
      ${r.filled ? `<button type="button" class="am" data-edit="${r.ids[0]}" style="min-height:44px">${money(r.amount)}</button>`
        : `<button type="button" data-fill="${r.fixed.id}" style="min-height:44px;font-size:13px;font-weight:800;color:${r.fixed.freq === 'monthly' ? 'var(--accent-text)' : 'var(--muted)'}">${r.fixed.freq === 'monthly' ? 'Rellenar' : 'Cuando toque'}</button>`}</div>`;
  const body = groups(d, st).map((g) => `<span class="eco-section">${esc(g.cat.name.toUpperCase())}</span><div class="eco-list" style="padding-bottom:0">${g.rows.map(rowHtml).join('')}</div>`).join('');

  el.innerHTML = `
    <div class="eco"><div class="eco-body">
      <header class="eco-head">${round('go-back', 'back', 'Volver')}<div class="grow"><span class="eco-sub">${monthTitle(mk)}</span><span class="eco-h1">Gastos fijos</span></div>
        <button type="button" class="eco-pill-btn" id="edit">Editar</button></header>
      <div class="eco-card pad"><span class="k">Fijos este mes</span><span class="v" style="font-size:28px">${money(total)}</span>
        <span class="eco-note">${filled} ${filled === 1 ? 'rellenado' : 'rellenados'} · ${pending} ${pending === 1 ? 'pendiente' : 'pendientes'} del mes</span></div>
      ${body || '<div class="eco-card"><div class="eco-empty">No tienes gastos fijos. Añade el primero.</div></div>'}
      <button type="button" class="eco-dashbtn" id="new">${ei('plus', 20, 2.4)}Añadir otro gasto fijo</button>
    </div></div>`;
  el.querySelector('#go-back').addEventListener('click', () => back('/economia/gastos'));
  el.querySelector('#edit').addEventListener('click', () => navigate('/economia/gastos-fijos/editar'));
  el.querySelector('#new').addEventListener('click', () => navigate('/economia/gasto-fijo/nuevo'));
  el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => navigate('/economia/gasto/' + b.dataset.edit)));
  el.querySelectorAll('[data-fill]').forEach((b) => b.addEventListener('click', async () => {
    const f = d.fixed.find((x) => x.id === b.dataset.fill);
    const r = await formDialog({ title: f.name, confirmLabel: 'Guardar', fields: [
      { key: 'amount', label: 'Importe (€)', placeholder: '0,00' },
      { key: 'date', label: 'Fecha', type: 'date', value: defaultDateFor(mk) }] });
    if (!r) return;
    const amount = parseMoney(r.amount);
    if (!Number.isFinite(amount) || amount <= 0) return toast('Escribe un importe mayor que 0');
    const when = r.date || dateKey();
    update((data) => data.expenses.push({ id: uid(), date: when, amount, cat: f.cat, note: '', fixedId: f.id, fixedName: '' }));
    if (f.every === null) {
      const s = await formDialog({ title: `¿Cuándo toca «${f.name}»?`, confirmLabel: 'Guardar en Pagos', cancelLabel: 'Ahora no', fields: [
        { key: 'day', label: 'Día habitual del mes (1-31)', value: String(Number(when.slice(8, 10))) },
        { key: 'every', label: 'Cada cuántos meses (1, 2, 3, 12 · 0 = no se repite)', value: '1' }] });
      const day = s ? Math.round(parseMoney(s.day)) : NaN;
      const every = s ? Math.round(parseMoney(s.every)) : NaN;
      if (s && day >= 1 && day <= 31 && [0, 1, 2, 3, 12].includes(every)) {
        update((data) => { const x = data.fixed.find((y) => y.id === f.id); if (x) Object.assign(x, { day, every, start: when.slice(0, 7) }); });
        toast('Añadido al calendario de Pagos');
      } else if (s) toast('No se guardó la repetición: revisa día y meses');
    }
    refresh();
  }));
}

export function renderFixedEdit(el) {
  const d = getData();
  const body = groups(d, d.fixed.map((f) => ({ fixed: f }))).map((g) => `<span class="eco-section">${esc(g.cat.name.toUpperCase())}</span>
    <div class="eco-list" style="padding-bottom:0">${g.rows.map(({ fixed: f }) => `<div class="eco-item" style="min-height:56px">
      <button type="button" class="tx" data-open="${f.id}" style="text-align:left"><b>${esc(f.name)}</b></button>
      <button type="button" data-toggle="${f.id}" style="height:36px;padding:0 12px;border-radius:18px;background:var(--soft);font-size:12px;font-weight:800">${f.freq === 'monthly' ? 'Mensual' : 'Ocasional'}</button>
      <button type="button" data-del="${f.id}" aria-label="Eliminar ${esc(f.name)}" style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--danger)">${ei('x', 18)}</button></div>`).join('')}</div>`).join('');
  el.innerHTML = `
    <div class="eco"><div class="eco-body">
      <header class="eco-head"><div class="grow"><span class="eco-sub">Modo edición</span><span class="eco-h1">Editar fijos</span></div><button type="button" class="eco-pill-btn" id="done">Listo</button></header>
      <div class="eco-info">${ei('info', 18)}<span>Si eliminas un gasto, los meses anteriores se quedan como están. Toca Mensual u Ocasional para cambiarlo.</span></div>
      ${body}
      <button type="button" class="eco-dashbtn" id="new">${ei('plus', 20, 2.4)}Añadir gasto fijo</button>
    </div></div>`;
  el.querySelector('#done').addEventListener('click', () => back('/economia/gastos-fijos'));
  el.querySelector('#new').addEventListener('click', () => navigate('/economia/gasto-fijo/nuevo'));
  el.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => navigate('/economia/gasto-fijo/' + b.dataset.open)));
  el.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => {
    update((data) => { const f = data.fixed.find((x) => x.id === b.dataset.toggle); if (f) f.freq = f.freq === 'monthly' ? 'occasional' : 'monthly'; });
    refresh();
  }));
  el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    const f = d.fixed.find((x) => x.id === b.dataset.del);
    const ok = await confirmDialog({ title: `¿Eliminar "${f.name}"?`, text: 'Los meses anteriores se quedan como están. Desde ahora no aparecerá en la lista.', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    update((data) => removeFixed(data, f.id));
    refresh();
  }));
}

export function renderFixedForm(el, { id }) {
  const isNew = id === 'nuevo';
  const f0 = getData().fixed.find((f) => f.id === id);
  if (!isNew && !f0) { back('/economia/gastos-fijos/editar'); return; }
  const draft = f0 ? { name: f0.name, cat: f0.cat, freq: f0.freq, every: f0.every, day: String(f0.day || 1) } : { name: '', cat: '', freq: 'monthly', every: null, day: '1' };
  const draw = () => {
    const d = getData();
    el.innerHTML = `
      <div class="eco"><div class="eco-body">
        <header class="eco-head">${round('go-back', 'back', 'Volver')}<div class="grow"><span class="eco-h1">${isNew ? 'Nuevo gasto fijo' : 'Editar gasto fijo'}</span></div></header>
        <div class="eco-fields"><label for="name">Nombre</label><input class="eco-input" id="name" maxlength="40" value="${esc(draft.name)}" placeholder="Ej.: Hipoteca"></div>
        <div class="eco-card pad" style="border-radius:24px"><h3>Categoría</h3><div class="eco-chips">${d.categories.map((c) => `<button type="button" class="eco-chip" data-cat="${c.id}" aria-pressed="${draft.cat === c.id}">${esc(c.name)}</button>`).join('')}<button type="button" class="eco-chip new" id="newcat">+ Nueva</button></div></div>
        <div class="eco-card pad" style="border-radius:24px"><h3>¿Cada cuánto lo pagas?</h3>
          <div class="eco-seg" style="background:var(--soft)"><button type="button" data-freq="monthly" aria-pressed="${draft.freq === 'monthly'}">Mensual</button><button type="button" data-freq="occasional" aria-pressed="${draft.freq === 'occasional'}">Ocasional</button></div>
          <span class="eco-note">Mensual: aparece como pendiente cada mes hasta que lo rellenes. Ocasional: lo rellenas solo cuando toca y nunca cuenta como pendiente.</span></div>
        <div class="eco-card pad" style="border-radius:24px"><h3>En el calendario de Pagos</h3>
          <div class="eco-chips"><button type="button" class="eco-chip" data-every="" aria-pressed="${draft.every === null}">Sin calendario</button>${Object.entries(EVERY).map(([k, l]) => `<button type="button" class="eco-chip" data-every="${k}" aria-pressed="${draft.every === Number(k)}">${l}</button>`).join('')}</div>
          ${draft.every === null ? '' : `<label for="day" style="margin-top:8px;font-weight:700;font-size:14px">Día habitual del mes</label><input class="eco-input" id="day" inputmode="numeric" maxlength="2" value="${esc(draft.day)}">`}
          <span class="eco-note">El calendario calcula cada mes cuándo toca; no hace falta rellenar nada por adelantado.</span></div>
        <div class="eco-foot"><button type="button" class="eco-btn" id="save">Guardar gasto fijo</button></div>
      </div></div>`;
    const grab = () => { draft.name = el.querySelector('#name').value; const dy = el.querySelector('#day'); if (dy) draft.day = dy.value; };
    el.querySelectorAll('[data-every]').forEach((b) => b.addEventListener('click', () => { grab(); draft.every = b.dataset.every === '' ? null : Number(b.dataset.every); draw(); }));
    el.querySelector('#go-back').addEventListener('click', () => back('/economia/gastos-fijos'));
    el.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { grab(); draft.cat = b.dataset.cat; draw(); }));
    el.querySelectorAll('[data-freq]').forEach((b) => b.addEventListener('click', () => { grab(); draft.freq = b.dataset.freq; draw(); }));
    el.querySelector('#newcat').addEventListener('click', async () => {
      grab();
      const r = await formDialog({ title: 'Nueva categoría', confirmLabel: 'Crear', fields: [{ key: 'name', label: 'Nombre', maxLength: 30 }] });
      if (!r || !r.name.trim()) return;
      let c; update((data) => { c = addCategory(data, r.name); });
      if (c) draft.cat = c.id;
      draw();
    });
    el.querySelector('#save').addEventListener('click', () => {
      grab();
      const name = draft.name.trim();
      if (!name) return toast('Escribe un nombre');
      if (!draft.cat) return toast('Elige una categoría');
      const day = Math.round(parseMoney(draft.day));
      if (draft.every !== null && !(day >= 1 && day <= 31)) return toast('El día debe estar entre 1 y 31');
      const sched = draft.every === null ? { every: null, day: 1, start: '' } : { every: draft.every, day };
      update((data) => {
        if (isNew) data.fixed.push({ id: uid(), name, cat: draft.cat, freq: draft.freq, start: draft.every === null ? '' : state.mk, ...sched });
        else {
          const f = data.fixed.find((x) => x.id === id);
          if (f) {
            Object.assign(f, { name, cat: draft.cat, freq: draft.freq, ...sched });
            if (draft.every !== null && !f.start) f.start = state.mk;
            if (draft.every === null) f.start = '';
          }
        }
      });
      back('/economia/gastos-fijos');
    });
  };
  draw();
}
