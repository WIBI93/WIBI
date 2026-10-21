// Planes de running: progresiones de correr-caminar. La app no avisa durante la carrera:
// al importar el GPX comprueba si has cumplido la siguiente sesión y la marca sola.
// OJO: las progresiones son un ejemplo razonable, no una pauta médica validada.

import { navigate } from '../../core/router.js';
import { esc, toast, confirmDialog } from '../../core/ui.js';
import { getFit, updateFit } from './data.js';
import { todayKey, thisMonday, weekRangeText, addDaysKey } from './dates.js';
import { sportNav, bindGo, header, ico } from './shell.js';

export const PLAN_XP = 100;

// Cada sesión pide: tramo seguido mínimo y total corriendo. Unidades: seguido en minutos (min) o en km.
const w = (sessions) => sessions;
export const PLANS = [
  {
    id: 'c0a5', name: 'De cero a 5 km sin parar', desc: '8 semanas, 3 sesiones por semana. Vas alargando el tiempo que corres seguido, caminando entre medias.',
    weeks: [
      w([[2, 8], [2, 8], [3, 9]]), w([[3, 9], [3, 12], [4, 12]]), w([[5, 15], [5, 15], [6, 15]]), w([[6, 18], [8, 16], [8, 16]]),
      w([[8, 20], [10, 20], [10, 20]]), w([[12, 24], [12, 24], [15, 25]]), w([[15, 25], [18, 27], [20, 28]]), w([[20, 30], [22, 30], [25, 30]]),
    ],
    unit: 'min', goal: 'Correr unos 30 minutos seguidos (≈ 5 km).',
  },
  {
    id: 'c5a10', name: 'De 5 a 10 km sin parar', desc: '8 semanas, 2 sesiones por semana. Una sesión larga que va subiendo de distancia y otra cómoda.',
    weeks: [
      [[5.5, 20], [4, 20]], [[6, 22], [4, 20]], [[6.5, 25], [5, 22]], [[7, 28], [5, 25]],
      [[8, 32], [5, 25]], [[8.5, 35], [6, 28]], [[9, 38], [6, 30]], [[10, 42], [5, 25]],
    ],
    unit: 'km', goal: 'Correr 10 km seguidos.',
  },
];
export const planById = (id) => PLANS.find((p) => p.id === id);

const sessionText = (plan, [seg, total]) => (plan.unit === 'min'
  ? `Corre ${seg} min seguidos (${Math.ceil(total / seg)}×${seg} min si hace falta) hasta sumar ${total} min corriendo; camina entre tramos.`
  : `Corre ${String(seg).replace('.', ',')} km seguidos y suma al menos ${total} min corriendo.`);

// Lista plana de sesiones con su clave "semana-sesión".
export function flat(plan) {
  return plan.weeks.flatMap((ws, wi) => ws.map((req, si) => ({ key: `${wi + 1}-${si + 1}`, week: wi + 1, n: si + 1, req })));
}
export function nextSession(plan, st) {
  return flat(plan).find((s) => !st.done[s.key]) || null;
}
const meets = (plan, req, run) => (plan.unit === 'min' ? run.longestSec >= req[0] * 60 : run.longestM >= req[0] * 1000) && run.runSec >= req[1] * 60;

// Tras guardar una carrera: marca la siguiente sesión del plan si la has cumplido.
export function checkPlan(run) {
  const fit = getFit();
  const st = fit.run.plan;
  if (!st || run.valid === false) return null;
  const plan = planById(st.id);
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
  const plan = st && planById(st.id);
  let body;
  if (!plan) {
    body = `<div class="f-note">Elige un plan y haz tus carreras con tu reloj como siempre. Al importar el GPX, la app mira si has cumplido la siguiente sesión.</div>
      ${PLANS.map((p) => `<section class="f-card plain"><strong>${esc(p.name)}</strong><div class="f-mini">${esc(p.desc)}</div><div class="f-mini">Meta: ${esc(p.goal)}${fit.awarded['run.plan.' + p.id] ? ' · ✓ ya completado' : ''}</div><button type="button" class="f-btn" data-start="${p.id}">Empezar este plan</button></section>`).join('')}
      <div class="f-note">Las progresiones son orientativas, no una pauta médica: si algo te duele, para y adapta.</div>`;
  } else {
    const list = flat(plan);
    const done = list.filter((s) => st.done[s.key]).length;
    const next = nextSession(plan, st);
    body = `<section class="f-card level"><div class="f-sub">Plan activo</div><div class="f-big">${esc(plan.name)}</div>
      <div class="f-bar"><i style="width:${Math.round((done / list.length) * 100)}%"></i></div><div class="f-mini">${done} de ${list.length} sesiones · empezaste la semana del ${weekRangeText(st.start)}</div></section>
      ${next ? `<section class="f-card plain"><div class="f-sub">Siguiente sesión · semana ${next.week}, sesión ${next.n}</div><div class="f-mini">${esc(sessionText(plan, next.req))}</div></section>` : '<div class="f-note">¡Has completado todas las sesiones!</div>'}
      ${plan.weeks.map((ws, wi) => `<section class="f-card plain"><strong>Semana ${wi + 1}</strong>${ws.map((req, si) => { const k = `${wi + 1}-${si + 1}`; return `<div class="f-exrow ${st.done[k] ? '' : ''}"><span class="grow">${st.done[k] ? '✓' : '○'} ${esc(sessionText(plan, req))}</span></div>`; }).join('')}</section>`).join('')}
      <button type="button" class="f-btn danger" id="drop">Dejar este plan</button>`;
  }
  el.innerHTML = `<div class="f-screen">${header('Planes', 'Running')}<main class="f-main">${body}</main>${sportNav('run', 'planes')}</div>`;
  bindGo(el);
  const c = el.querySelector('#f-center');
  if (c) c.onclick = () => navigate('/fit/running/importar');
  el.querySelectorAll('[data-start]').forEach((b) => (b.onclick = () => { updateFit((f) => { f.run.plan = { id: b.dataset.start, start: thisMonday(), done: {} }; }); renderPlans(el); }));
  const drop = el.querySelector('#drop');
  if (drop) drop.onclick = async () => {
    if (!(await confirmDialog({ title: 'Dejar el plan', text: 'Tus carreras se conservan; solo se quita el seguimiento del plan.', confirmLabel: 'Dejar plan', danger: true }))) return;
    updateFit((f) => { f.run.plan = null; }); renderPlans(el);
  };
}
