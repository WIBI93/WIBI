// Planes de running: los creas y editas tú. La app no avisa durante la carrera:
// al importar el GPX comprueba si has cumplido la siguiente sesión del plan y la marca sola.

import { navigate } from '../../core/router.js';
import { esc, toast, confirmDialog } from '../../core/ui.js';
import { getFit, updateFit } from './data.js';
import { todayKey, thisMonday, weekRangeText } from './dates.js';
import { sportNav, bindGo, header, backHeader, ico } from './shell.js';
import { uid } from './gymlogic.js';

export const PLAN_XP = 100;
const B = '/fit/running';

export const planById = (fit, id) => fit.run.plans.find((p) => p.id === id) || null;
const fmtN = (n) => String(n).replace('.', ',');
const num = (v) => { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : 0; };

const sessionText = (plan, [seg, total]) => (plan.unit === 'min'
  ? `Corre ${fmtN(seg)} min seguidos y suma ${fmtN(total)} min corriendo en total (caminando entre tramos).`
  : `Corre ${fmtN(seg)} km seguidos y suma al menos ${fmtN(total)} min corriendo.`);

export function flat(plan) {
  return plan.weeks.flatMap((ws, wi) => ws.map((req, si) => ({ key: `${wi + 1}-${si + 1}`, week: wi + 1, n: si + 1, req })));
}
export const nextSession = (plan, st) => flat(plan).find((s) => !st.done[s.key]) || null;
const meets = (plan, req, run) => (plan.unit === 'min' ? run.longestSec >= req[0] * 60 : run.longestM >= req[0] * 1000) && run.runSec >= req[1] * 60;

// Tras guardar una carrera: marca la siguiente sesión del plan si la has cumplido.
export function checkPlan(run) {
  const fit = getFit();
  const st = fit.run.plan;
  if (!st || run.valid === false) return null;
  const plan = planById(fit, st.id);
  const next = plan && nextSession(plan, st);
  if (!next || !meets(plan, next.req, run)) return null;
  let finished = false;
  updateFit((f) => {
    f.run.plan.done[next.key] = run.id;
    if (!nextSession(plan, f.run.plan) && !f.awarded[`run.plan.${plan.id}`]) {
      f.awarded[`run.plan.${plan.id}`] = todayKey();
      f.run.xpLog.push({ date: todayKey(), xp: PLAN_XP, why: 'plan', ref: plan.id });
      finished = true;
    }
  });
  return finished ? `¡Plan completado! +${PLAN_XP} XP` : `Sesión del plan cumplida (semana ${next.week}, sesión ${next.n})`;
}

export function renderPlans(el) {
  const fit = getFit();
  const st = fit.run.plan;
  const active = st && planById(fit, st.id);
  let body = '';
  if (active) {
    const list = flat(active);
    const done = list.filter((s) => st.done[s.key]).length;
    const next = nextSession(active, st);
    body += `<section class="f-card level"><div class="f-sub">Plan activo</div><div class="f-big">${esc(active.name)}</div>
      <div class="f-bar"><i style="width:${Math.round((done / list.length) * 100)}%"></i></div><div class="f-mini">${done} de ${list.length} sesiones · empezaste la semana del ${weekRangeText(st.start)}</div></section>
      ${next ? `<section class="f-card plain"><div class="f-sub">Siguiente sesión · semana ${next.week}, sesión ${next.n}</div><div class="f-mini">${esc(sessionText(active, next.req))}</div></section>` : '<div class="f-note">¡Has completado todas las sesiones!</div>'}
      <button type="button" class="f-btn danger" id="drop">Dejar el plan activo</button>`;
  }
  body += `<section class="f-card plain"><div class="rowh"><strong class="grow">Mis planes</strong><span class="f-mini">${fit.run.plans.length}</span></div>
    ${fit.run.plans.map((p) => `<div class="f-plan"><div class="grow"><b>${esc(p.name)}</b><div class="f-mini">${p.weeks.length} semana${p.weeks.length === 1 ? "" : "s"} · ${p.weeks.reduce((a, w) => a + w.length, 0)} sesiones${fit.awarded['run.plan.' + p.id] ? ' · ✓ completado' : ''}</div></div>
      <button type="button" class="f-link" data-edit="${p.id}">Editar</button>${active && active.id === p.id ? '' : `<button type="button" class="f-link" data-start="${p.id}">Empezar</button>`}</div>`).join('') || '<div class="f-mini">Aún no tienes ningún plan. Crea el tuyo: eliges las semanas y lo que corres en cada sesión.</div>'}
    <button type="button" class="f-btn ghost" data-go="${B}/plan/nuevo">+ Crear un plan</button></section>
    <div class="f-note">En cada sesión indicas el tramo que quieres correr seguido y el total corriendo. Al importar el GPX, la app mira si has cumplido la siguiente sesión y la marca sola.</div>`;
  el.innerHTML = `<div class="f-screen">${header('Planes', 'Running')}<main class="f-main">${body}</main>${sportNav('run', 'planes')}</div>`;
  bindGo(el);
  const c = el.querySelector('#f-center');
  if (c) c.onclick = () => navigate(B + '/importar');
  el.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => navigate(`${B}/plan/${b.dataset.edit}`)));
  el.querySelectorAll('[data-start]').forEach((b) => (b.onclick = async () => {
    if (st && !(await confirmDialog({ title: 'Cambiar de plan', text: 'Dejas el plan activo y empiezas este desde cero. Tus carreras se conservan.', confirmLabel: 'Cambiar' }))) return;
    updateFit((f) => { f.run.plan = { id: b.dataset.start, start: thisMonday(), done: {} }; });
    renderPlans(el);
  }));
  const drop = el.querySelector('#drop');
  if (drop) drop.onclick = async () => {
    if (!(await confirmDialog({ title: 'Dejar el plan', text: 'Tus carreras se conservan; solo se quita el seguimiento del plan.', confirmLabel: 'Dejar plan', danger: true }))) return;
    updateFit((f) => { f.run.plan = null; }); renderPlans(el);
  };
}

// ---- Crear / editar un plan ----
export function renderPlanEdit(el, { id }) {
  const fit = getFit();
  const existing = planById(fit, id);
  if (id !== 'nuevo' && !existing) { navigate(B + '/planes'); return; }
  const p = existing ? JSON.parse(JSON.stringify(existing)) : { id: uid(), name: '', unit: 'min', weeks: [[[2, 8], [2, 8], [3, 9]]] };
  const draw = () => {
    el.innerHTML = `<div class="f-screen">${backHeader(existing ? 'Editar plan' : 'Nuevo plan', B + '/planes')}<main class="f-main">
      <label class="f-field"><span>Nombre</span><input id="name" maxlength="50" value="${esc(p.name)}" placeholder="Por ejemplo: Mis primeros 5 km"></label>
      <section class="f-card plain"><strong>¿Cómo mides el tramo seguido?</strong>
        <div class="f-seg"><button type="button" data-u="min" aria-pressed="${p.unit === 'min'}">En minutos</button><button type="button" data-u="km" aria-pressed="${p.unit === 'km'}">En kilómetros</button></div></section>
      ${p.weeks.map((w, wi) => `<section class="f-card plain"><div class="rowh"><strong class="grow">Semana ${wi + 1}</strong>${p.weeks.length > 1 ? `<button type="button" class="f-x" data-rmw="${wi}" aria-label="Quitar semana">✕</button>` : ''}</div>
        ${w.map((q, si) => `<div class="f-plan-row"><span class="n">${si + 1}</span>
          <label><input inputmode="decimal" data-w="${wi}" data-s="${si}" data-k="0" value="${esc(String(q[0]).replace('.', ','))}"><em>${p.unit === 'min' ? 'min seguidos' : 'km seguidos'}</em></label>
          <label><input inputmode="decimal" data-w="${wi}" data-s="${si}" data-k="1" value="${esc(String(q[1]).replace('.', ','))}"><em>min en total</em></label>
          ${w.length > 1 ? `<button type="button" class="f-x" data-rms="${wi}:${si}" aria-label="Quitar sesión">✕</button>` : '<span style="width:34px"></span>'}</div>`).join('')}
        <button type="button" class="f-link" data-adds="${wi}">+ Sesión</button></section>`).join('')}
      <button type="button" class="f-btn ghost" id="addw">+ Añadir semana</button>
      <div class="f-mini">Consejo: para que cuente como salida, cada sesión debería sumar al menos 8 min corriendo.</div>
      <button type="button" class="f-btn" id="save">Guardar plan</button>
      ${existing ? '<button type="button" class="f-btn danger" id="del">Borrar plan</button>' : ''}</main></div>`;
    bindGo(el);
    const name = el.querySelector('#name');
    name.oninput = () => { p.name = name.value; };
    el.querySelectorAll('[data-u]').forEach((b) => (b.onclick = () => { p.unit = b.dataset.u; draw(); }));
    el.querySelectorAll('input[data-k]').forEach((i) => (i.oninput = () => { const v = num(i.value); p.weeks[+i.dataset.w][+i.dataset.s][+i.dataset.k] = v || 0; }));
    el.querySelectorAll('[data-rmw]').forEach((b) => (b.onclick = () => { p.weeks.splice(+b.dataset.rmw, 1); draw(); }));
    el.querySelectorAll('[data-rms]').forEach((b) => (b.onclick = () => { const [w, s] = b.dataset.rms.split(':').map(Number); p.weeks[w].splice(s, 1); draw(); }));
    el.querySelectorAll('[data-adds]').forEach((b) => (b.onclick = () => { const w = p.weeks[+b.dataset.adds]; w.push([...(w[w.length - 1] || [2, 8])]); draw(); }));
    el.querySelector('#addw').onclick = () => { const l = p.weeks[p.weeks.length - 1]; p.weeks.push(l.map((q) => [...q])); draw(); };
    el.querySelector('#save').onclick = () => {
      if (!p.name.trim()) { toast('Ponle un nombre al plan'); return; }
      if (p.weeks.some((w) => w.some((q) => !(q[0] > 0) || !(q[1] > 0)))) { toast('Todas las sesiones necesitan un tramo y un total mayores que 0'); return; }
      updateFit((f) => { const i = f.run.plans.findIndex((x) => x.id === p.id); const c = { ...p, name: p.name.trim() }; if (i >= 0) f.run.plans[i] = c; else f.run.plans.push(c); });
      toast('Plan guardado');
      navigate(B + '/planes');
    };
    const del = el.querySelector('#del');
    if (del) del.onclick = async () => {
      if (!(await confirmDialog({ title: 'Borrar plan', text: 'Se borra el plan (y su seguimiento si estaba activo). Tus carreras se conservan.', confirmLabel: 'Borrar', danger: true }))) return;
      updateFit((f) => { f.run.plans = f.run.plans.filter((x) => x.id !== p.id); if (f.run.plan && f.run.plan.id === p.id) f.run.plan = null; });
      navigate(B + '/planes');
    };
  };
  draw();
}
