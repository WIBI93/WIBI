// Metas propias: tú pones el objetivo y, al cumplirlo, recibes una medalla dorada y +100 XP.

import { navigate } from '../../core/router.js';
import { esc, toast, confirmDialog } from '../../core/ui.js';
import { getFit, updateFit } from './data.js';
import { todayKey, shortDateText } from './dates.js';
import { exerciseList, exerciseMap } from './exercises.js';
import { backHeader, bindGo } from './shell.js';
import { num, uid, fmt } from './gymlogic.js';
import { paceText } from './gpx.js';

export const GOAL_XP = 100;
export const MAX_ACTIVE = 5;
export const GOAL_TYPES = {
  gym: [['peso', 'Peso en un ejercicio', 'kg'], ['reps', 'Repeticiones seguidas en un ejercicio', 'repeticiones'], ['volumen', 'Volumen total acumulado', 'toneladas'], ['otra', 'Otra cosa (la marcas tú)', '']],
  run: [['seguido', 'Correr sin parar', 'km'], ['km', 'Kilómetros corridos en total', 'km'], ['ritmo', 'Ritmo medio por km', 'min/km (ej. 6:30)'], ['otra', 'Otra cosa (la marcas tú)', '']],
};
const valid = (f, sport) => (sport === 'gym' ? f.gym.sessions : f.run.runs).filter((x) => x.valid !== false);

// Valor actual de la meta y porcentaje de avance. null = se marca a mano.
export function goalProgress(f, g) {
  if (g.type === 'otra') return null;
  let cur = 0;
  let pct = 0;
  if (g.sport === 'gym') {
    const sess = valid(f, 'gym');
    if (g.type === 'peso') cur = Math.max(0, ...sess.flatMap((s) => s.exercises.filter((e) => e.exId === g.exId).flatMap((e) => e.sets.map((st) => num(st.kg)))));
    if (g.type === 'reps') cur = Math.max(0, ...sess.flatMap((s) => s.exercises.filter((e) => e.exId === g.exId).flatMap((e) => e.sets.map((st) => num(st.reps)))));
    if (g.type === 'volumen') cur = sess.reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets.reduce((c, st) => c + num(st.kg) * num(st.reps), 0), 0), 0) / 1000;
    pct = g.target ? (cur / g.target) * 100 : 0;
  } else {
    const runs = valid(f, 'run');
    if (g.type === 'seguido') cur = Math.max(0, ...runs.map((r) => r.longestM || 0)) / 1000;
    if (g.type === 'km') cur = runs.reduce((a, r) => a + r.runM, 0) / 1000;
    if (g.type === 'ritmo') { const p = runs.map((r) => r.paceRun).filter(Boolean); cur = p.length ? Math.min(...p) : 0; pct = cur ? (g.target / cur) * 100 : 0; }
    else pct = g.target ? (cur / g.target) * 100 : 0;
  }
  const done = g.type === 'ritmo' ? cur > 0 && cur <= g.target : cur >= g.target;
  return { cur, pct: Math.max(0, Math.min(100, Math.round(pct))), done };
}

export function goalText(g, f) {
  const ex = g.exId ? (exerciseMap(f).get(g.exId) || { name: '?' }).name : '';
  const t = g.target;
  return { peso: `${fmt(t)} kg en ${ex}`, reps: `${t} repeticiones en ${ex}`, volumen: `${fmt(t)} t en total`, seguido: `${fmt(t)} km sin parar`, km: `${fmt(t)} km en total`, ritmo: `ritmo de ${paceText(t)} /km`, otra: 'Meta marcada a mano' }[g.type];
}

// Concede las metas cumplidas (se llama desde las funciones de medallas de cada deporte).
export function checkGoals(sport) {
  const f = getFit();
  const hit = f.goals.filter((g) => g.sport === sport && !g.done).filter((g) => { const p = goalProgress(f, g); return p && p.done; });
  if (!hit.length) return [];
  const today = todayKey();
  updateFit((x) => {
    for (const h of hit) {
      const g = x.goals.find((y) => y.id === h.id);
      g.done = today;
      x.awarded['goal.' + g.id] = today;
      x[sport].xpLog.push({ date: today, xp: GOAL_XP, why: 'meta', ref: 'goal.' + g.id });
    }
  });
  return hit.map((g) => ({ id: 'goal.' + g.id, name: g.name, desc: goalText(g, f), goal: true, shape: sport === 'gym' ? 'shield' : 'hex', glyph: 'target', metal: 'oro', n: '', unit: '' }));
}

// Bloque «Mis metas» para la pantalla de Retos.
export function goalsHtml(f, sport) {
  const list = f.goals.filter((g) => g.sport === sport);
  const active = list.filter((g) => !g.done);
  const base = sport === 'gym' ? '/fit/gym' : '/fit/running';
  return `<section class="f-card plain"><div class="rowh"><strong class="grow">Mis metas</strong><span class="f-mini">${active.length} de ${MAX_ACTIVE}</span></div>
    ${list.map((g) => { const p = goalProgress(f, g); return `<div class="f-goal ${g.done ? 'done' : ''}"><div class="rowh"><b class="grow">${g.done ? '🏅 ' : ''}${esc(g.name)}</b><button type="button" class="f-x" data-delgoal="${g.id}" aria-label="Borrar meta">✕</button></div>
      <div class="f-mini">${esc(goalText(g, f))}${g.deadline ? ' · hasta ' + shortDateText(g.deadline) : ''}${g.done ? ' · cumplida ' + shortDateText(g.done) : ''}</div>
      ${p && !g.done ? `<div class="f-bar"><i style="width:${p.pct}%"></i></div>` : ''}
      ${!p && !g.done ? `<button type="button" class="f-link" data-markgoal="${g.id}">Marcar como cumplida</button>` : ''}</div>`; }).join('') || '<div class="f-mini">Aún no tienes metas. Crea una con tu nombre y tu objetivo.</div>'}
    ${active.length < MAX_ACTIVE ? `<button type="button" class="f-btn ghost" data-go="${base}/meta">+ Crear una meta</button>` : '<div class="f-mini">Has llegado al máximo de metas activas. Cumple o borra una.</div>'}</section>`;
}

export function bindGoals(el, sport, redraw, celebrate) {
  el.querySelectorAll('[data-delgoal]').forEach((b) => (b.onclick = async () => {
    if (!(await confirmDialog({ title: 'Borrar meta', text: 'Se borra la meta (y su medalla si ya la tenías).', confirmLabel: 'Borrar', danger: true }))) return;
    updateFit((f) => { f.goals = f.goals.filter((g) => g.id !== b.dataset.delgoal); delete f.awarded['goal.' + b.dataset.delgoal]; });
    redraw();
  }));
  el.querySelectorAll('[data-markgoal]').forEach((b) => (b.onclick = () => {
    const id = b.dataset.markgoal;
    const today = todayKey();
    const g = getFit().goals.find((x) => x.id === id);
    updateFit((f) => { const x = f.goals.find((y) => y.id === id); x.done = today; f.awarded['goal.' + id] = today; f[sport].xpLog.push({ date: today, xp: GOAL_XP, why: 'meta', ref: 'goal.' + id }); });
    redraw();
    celebrate({ medals: [{ id: 'goal.' + id, name: g.name, desc: 'Meta cumplida', goal: true, shape: sport === 'gym' ? 'shield' : 'hex', glyph: 'target', metal: 'oro', n: '', unit: '' }], reto: null, levelUp: null }, sport);
  }));
}

// Pantalla de nueva meta.
export const renderGoalNew = (sport) => (el) => {
  const f0 = getFit();
  const types = GOAL_TYPES[sport];
  const st = { type: types[0][0], name: '', target: '', exId: '', deadline: '' };
  const base = sport === 'gym' ? '/fit/gym' : '/fit/running';
  const exs = exerciseList(f0);
  const draw = () => {
    const t = types.find((x) => x[0] === st.type);
    const needEx = st.type === 'peso' || st.type === 'reps';
    el.innerHTML = `<div class="f-screen">${backHeader('Nueva meta', base + '/retos')}<main class="f-main">
      <div class="f-seg vertical">${types.map(([k, l]) => `<button type="button" data-t="${k}" aria-pressed="${st.type === k}">${l}</button>`).join('')}</div>
      ${needEx ? `<label class="f-field"><span>Ejercicio</span><select id="ex" class="f-select"><option value="">Elige uno</option>${exs.map((e) => `<option value="${e.id}" ${e.id === st.exId ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label>` : ''}
      ${st.type !== 'otra' ? `<label class="f-field"><span>Objetivo (${esc(t[2])})</span><input id="target" inputmode="decimal" value="${esc(st.target)}" placeholder="${st.type === 'ritmo' ? '6:30' : 'número'}"></label>` : ''}
      <label class="f-field"><span>Nombre de la meta (saldrá en la medalla)</span><input id="name" maxlength="50" value="${esc(st.name)}" placeholder="Por ejemplo: Mi primer 10K"></label>
      <label class="f-field"><span>Fecha límite (opcional)</span><input id="deadline" type="date" value="${esc(st.deadline)}"></label>
      <div class="f-mini">Al cumplirla ganas una medalla dorada y +${GOAL_XP} XP.</div>
      <button type="button" class="f-btn" id="save">Guardar meta</button></main></div>`;
    bindGo(el);
    el.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { st.type = b.dataset.t; draw(); }));
    const bind = (id, k) => { const i = el.querySelector('#' + id); if (i) i.oninput = i.onchange = () => { st[k] = i.value; }; };
    bind('ex', 'exId'); bind('target', 'target'); bind('name', 'name'); bind('deadline', 'deadline');
    el.querySelector('#save').onclick = () => {
      let target = 0;
      if (st.type === 'ritmo') { const m = /^(\d{1,2}):(\d{2})$/.exec(st.target.trim()); if (!m) { toast('Escribe el ritmo así: 6:30'); return; } target = +m[1] * 60 + +m[2]; }
      else if (st.type !== 'otra') { target = num(st.target); if (target <= 0) { toast('Pon un objetivo mayor que 0'); return; } }
      if (needEx && !st.exId) { toast('Elige un ejercicio'); return; }
      if (!st.name.trim()) { toast('Ponle un nombre a la meta'); return; }
      if (getFit().goals.filter((g) => g.sport === sport && !g.done).length >= MAX_ACTIVE) { toast('Ya tienes 5 metas activas'); return; }
      updateFit((f) => { f.goals.push({ id: uid(), sport, name: st.name.trim(), type: st.type, target, exId: needEx ? st.exId : null, deadline: st.deadline || null, created: todayKey(), done: null }); });
      toast('Meta creada');
      navigate(base + '/retos');
    };
  };
  draw();
};
