// Pestaña Metas: objetivos de ahorro con anillo de progreso y fecha estimada (sin interés).

import { back, refresh, navigate } from '../../core/router.js';
import { esc, toast, confirmDialog, formDialog } from '../../core/ui.js';
import { getData, update, uid, goalSaved, removeGoal } from './data.js';
import { money, moneyAuto, parseMoney, toInput, MONTHS, currentMonthKey, shiftMonthKey } from './fmt.js';
import { ei, round, navHtml, bindNav } from './shell.js';

const eta = (left, monthly) => {
  if (left <= 0) return '¡Conseguida!';
  if (!(monthly > 0)) return 'Pon una aportación mensual para ver la fecha';
  const n = Math.ceil(left / monthly);
  const mk = shiftMonthKey(currentMonthKey(), n);
  const y = Number(mk.slice(0, 4)); const m = Number(mk.slice(5, 7)) - 1;
  return `Llegarás en ${MONTHS[m]} de ${y} (${n} ${n === 1 ? 'mes' : 'meses'})`;
};
const ring = (p) => {
  const r = 26; const c = 2 * Math.PI * r;
  return `<svg class="gl-ring" width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--dash)" stroke-width="7"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--primary)" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(c * Math.min(p, 100)) / 100} ${c}" transform="rotate(-90 32 32)"/><text x="32" y="36" text-anchor="middle" font-size="13" font-weight="800" fill="currentColor">${Math.round(p)}%</text></svg>`;
};

export function renderGoals(el) {
  const d = getData();
  const card = (g) => {
    const saved = goalSaved(d, g);
    const left = Math.max(0, g.target - saved);
    const p = g.target > 0 ? (saved / g.target) * 100 : 0;
    return `<div class="eco-card gl-card" data-g="${g.id}">
      <div class="gl-top">${ring(p)}<div class="gl-tx"><b>${esc(g.name)}</b><span>${moneyAuto(saved)} de ${moneyAuto(g.target)}</span><span class="gl-left">${left > 0 ? `Te faltan ${moneyAuto(left)}` : 'Meta cumplida'}</span></div>
        <button type="button" class="eco-round" data-edit="${g.id}" aria-label="Editar meta">${ei('gear', 18)}</button></div>
      <label class="gl-mo"><span>Aporto al mes</span><span class="eco-unit"><input class="eco-input unit" data-mo="${g.id}" inputmode="decimal" value="${g.monthly ? esc(toInput(g.monthly)) : ''}" placeholder="0"><span>€</span></span></label>
      <span class="gl-eta" data-eta="${g.id}">${eta(left, g.monthly)}</span>
      <button type="button" class="eco-btn" data-contrib="${g.id}">+ Aportar</button></div>`;
  };
  const tot = d.goals.reduce((t, g) => t + goalSaved(d, g), 0);
  el.innerHTML = `
    <div class="eco"><div class="eco-body">
      <header class="eco-head"><div class="grow"><span class="eco-sub">Economía</span><span class="eco-h1">Metas</span></div>${round('new', 'plus', 'Nueva meta')}</header>
      ${d.goals.length ? `<div class="eco-info">${ei('info', 18)}<span>Llevas ${moneyAuto(tot)} apartados en ${d.goals.length} ${d.goals.length === 1 ? 'meta' : 'metas'}. La fecha es una estimación sin contar intereses.</span></div>${d.goals.map(card).join('')}`
        : `<div class="eco-card"><b>Aún no tienes metas</b><span class="eco-note">Una meta es algo concreto para lo que ahorras: un viaje, un coche, un fondo de emergencia… Pulsa + para crear la primera.</span></div>`}
    </div>${navHtml('metas')}</div>`;
  bindNav(el);
  el.querySelector('#new').addEventListener('click', () => navigate('/economia/meta/nueva'));
  el.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => navigate('/economia/meta/' + b.dataset.edit)));
  el.querySelectorAll('[data-mo]').forEach((inp) => {
    const g = d.goals.find((x) => x.id === inp.dataset.mo);
    const upd = () => {
      const v = inp.value.trim() === '' ? 0 : parseMoney(inp.value);
      const val = Number.isFinite(v) && v >= 0 ? v : 0;
      el.querySelector(`[data-eta="${g.id}"]`).textContent = eta(Math.max(0, g.target - goalSaved(d, g)), val);
      return val;
    };
    inp.addEventListener('input', upd);
    inp.addEventListener('change', () => { const val = upd(); update((data) => { const x = data.goals.find((y) => y.id === g.id); if (x) x.monthly = val; }); });
  });
  el.querySelectorAll('[data-contrib]').forEach((b) => b.addEventListener('click', async () => {
    const g = d.goals.find((x) => x.id === b.dataset.contrib);
    const r = await formDialog({ title: `Aportar a «${g.name}»`, fields: [{ key: 'v', label: 'Importe (€)', type: 'text', placeholder: '0' }], confirmLabel: 'Aportar' });
    if (!r) return;
    const n = parseMoney(r.v);
    if (!Number.isFinite(n) || n <= 0) return toast('Escribe un importe mayor que 0');
    update((data) => { const x = data.goals.find((y) => y.id === g.id); if (x) x.base += n; });
    toast('Aportación anotada');
    refresh();
  }));
}

export function renderGoalForm(el, { id }) {
  const isNew = id === 'nueva';
  const g0 = getData().goals.find((g) => g.id === id);
  if (!isNew && !g0) { back('/economia/metas'); return; }
  const draft = g0 ? { name: g0.name, target: toInput(g0.target), base: toInput(g0.base) } : { name: '', target: '', base: '' };
  el.innerHTML = `
    <div class="eco"><div class="eco-body">
      <header class="eco-head">${round('go-back', 'back', 'Volver')}<div class="grow"><span class="eco-sub">Metas</span><span class="eco-h1">${isNew ? 'Nueva meta' : 'Editar meta'}</span></div></header>
      <div class="eco-fields"><label for="name">Nombre</label><input class="eco-input" id="name" maxlength="40" value="${esc(draft.name)}" placeholder="Ej.: Viaje a Japón"></div>
      <div class="eco-fields"><label for="target">Cuánto quiero juntar</label><div class="eco-unit"><input class="eco-input unit" id="target" inputmode="decimal" value="${esc(draft.target)}" placeholder="0,00"><span>€</span></div></div>
      <div class="eco-fields"><label for="base">${isNew ? 'Ya tengo apartado' : 'Apartado a mano'}</label><div class="eco-unit"><input class="eco-input unit" id="base" inputmode="decimal" value="${esc(draft.base)}" placeholder="0,00"><span>€</span></div>
        <span class="eco-note">${isNew ? 'Opcional: lo que ya llevas ahorrado para esta meta.' : 'Lo que apartaste con «+ Aportar». Las aportaciones de Ahorro marcadas para esta meta se suman aparte.'}</span></div>
      <div class="eco-foot">${isNew ? '' : '<button type="button" class="eco-btn text" id="del">Eliminar meta</button>'}<button type="button" class="eco-btn" id="save">${isNew ? 'Guardar meta' : 'Guardar cambios'}</button></div>
    </div></div>`;
  el.querySelector('#go-back').addEventListener('click', () => back('/economia/metas'));
  el.querySelector('#save').addEventListener('click', () => {
    const name = el.querySelector('#name').value.trim();
    const t = parseMoney(el.querySelector('#target').value);
    const bRaw = el.querySelector('#base').value.trim();
    const b = bRaw === '' ? 0 : parseMoney(bRaw);
    if (!name) return toast('Escribe un nombre');
    if (!Number.isFinite(t) || t <= 0) return toast('Escribe cuánto quieres juntar');
    if (!Number.isFinite(b) || b < 0) return toast('Revisa lo apartado');
    update((data) => {
      if (isNew) data.goals.push({ id: uid(), name, target: t, base: b, monthly: 0, icon: '🎯' });
      else { const g = data.goals.find((x) => x.id === id); if (g) Object.assign(g, { name, target: t, base: b }); }
    });
    back('/economia/metas');
  });
  const del = el.querySelector('#del');
  if (del) del.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: `¿Eliminar «${g0.name}»?`, text: 'Se borra la meta. Tus aportaciones de Ahorro no se tocan.', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    update((data) => removeGoal(data, id));
    back('/economia/metas');
  });
}
