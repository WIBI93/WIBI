// Pantallas del gimnasio: rutinas, entrenos, empezar entreno y mis ejercicios.

import { navigate, back } from '../../core/router.js';
import { esc, toast, confirmDialog, formDialog } from '../../core/ui.js';
import { getFit, updateFit } from './data.js';
import { shortDateText, todayKey } from './dates.js';
import { MUSCLES, exerciseList, exerciseMap } from './exercises.js';
import { exFig } from './stickfigs.js';
import { sportNav, bindGo, header, backHeader, ico } from './shell.js';
import { awardGym } from './gymmedals.js';
import { celebrate } from './gym2.js';
import { uid, num, fmt, lastSets, newDraft, suggestedSets, finishDraft, sessionVolume, sessionSets, isValid, MIN_EXERCISES } from './gymlogic.js';

const B = '/fit/gym';
const SCREEN = (inner, nav) => `<div class="f-screen">${inner}${nav || ''}</div>`;

// ---- Selector de ejercicios (pantalla completa) ----
export function pickExercises(preselected = []) {
  return new Promise((resolve) => {
    const fit = getFit();
    const sel = [...preselected];
    let q = '';
    let muscle = 'Todos';
    const wrap = document.createElement('div');
    wrap.className = 'f-picker in-fitg-scope';
    document.body.appendChild(wrap);
    const close = (r) => { wrap.remove(); resolve(r); };
    const draw = () => {
      const list = exerciseList(getFit()).filter((e) => (muscle === 'Todos' || e.muscle === muscle) && e.name.toLowerCase().includes(q.toLowerCase()));
      wrap.innerHTML = `
        <div class="f-picker-top"><button type="button" class="f-round" data-x="cancel" aria-label="Cerrar">${ico('back')}</button><input id="q" type="search" placeholder="Buscar ejercicio" value="${esc(q)}"></div>
        <div class="f-chips">${['Todos', ...MUSCLES].map((m) => `<button type="button" data-m="${m}" aria-pressed="${muscle === m}">${m}</button>`).join('')}</div>
        <div class="f-picker-list">${list.map((e) => `<button type="button" class="f-ex ${sel.includes(e.id) ? 'on' : ''}" data-id="${e.id}">${exFig(e, 34)}<span class="grow">${esc(e.name)}<small>${e.muscle}</small></span><i>${sel.includes(e.id) ? '✓' : '+'}</i></button>`).join('') || '<div class="f-note">Nada con ese nombre.</div>'}
          ${q.trim() ? `<button type="button" class="f-btn ghost" data-x="new">Crear «${esc(q.trim())}» como ejercicio propio</button>` : ''}</div>
        <div class="f-picker-bar"><button type="button" class="f-btn" data-x="done">Listo · ${sel.length} elegidos</button></div>`;
      wrap.querySelector('[data-x="cancel"]').onclick = () => close(null);
      wrap.querySelector('[data-x="done"]').onclick = () => close(sel);
      const input = wrap.querySelector('#q');
      input.oninput = () => { q = input.value; const pos = input.selectionStart; draw(); const i2 = wrap.querySelector('#q'); i2.focus(); i2.setSelectionRange(pos, pos); };
      wrap.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { muscle = b.dataset.m; draw(); }));
      wrap.querySelectorAll('[data-id]').forEach((b) => (b.onclick = () => { const i = sel.indexOf(b.dataset.id); if (i >= 0) sel.splice(i, 1); else sel.push(b.dataset.id); draw(); }));
      const nb = wrap.querySelector('[data-x="new"]');
      if (nb) nb.onclick = () => {
        const id = 'c-' + uid();
        updateFit((f) => { f.gym.custom.push({ id, name: q.trim(), muscle: muscle === 'Todos' ? 'Otros' : muscle }); });
        sel.push(id); q = ''; draw();
      };
    };
    draw();
  });
}

// ---- Rutinas ----
export function renderRoutines(el) {
  const fit = getFit();
  const map = exerciseMap(fit);
  const last = (r) => {
    const s = [...fit.gym.sessions].filter((x) => x.routineId === r.id).sort((a, b) => b.date.localeCompare(a.date))[0];
    return s ? 'Última vez: ' + shortDateText(s.date) : 'Sin hacer todavía';
  };
  el.innerHTML = SCREEN(
    header('Rutinas', 'Gimnasio', `<button type="button" class="f-round" data-go="${B}/ejercicios" aria-label="Mis ejercicios">${ico('list')}</button>`) +
    `<main class="f-main">
      ${fit.gym.routines.map((r) => `<button type="button" class="f-card" data-go="${B}/rutina/${r.id}"><div class="rowh"><strong>${esc(r.name)}</strong><span class="grow"></span>${ico('next', 18)}</div>
        <div class="f-mini">${r.exIds.length} ejercicios · ${esc(last(r))}</div>
        <div class="f-mini">${esc(r.exIds.slice(0, 4).map((id) => (map.get(id) || { name: '?' }).name).join(' · '))}${r.exIds.length > 4 ? '…' : ''}</div></button>`).join('')}
      ${fit.gym.routines.length ? '' : '<div class="f-note">Aún no tienes ninguna rutina. Crea la primera eligiendo ejercicios de la lista.</div>'}
      <button type="button" class="f-btn" data-go="${B}/rutina/nueva">+ Nueva rutina</button>
    </main>`, sportNav('gym', 'rutinas'));
  bindGo(el);
  center(el);
}

export function renderRoutineEdit(el, { id }) {
  const fit = getFit();
  const existing = fit.gym.routines.find((r) => r.id === id);
  if (id !== 'nueva' && !existing) { navigate(B + '/rutinas'); return; }
  const r = existing ? { ...existing, exIds: [...existing.exIds] } : { id: uid(), name: '', exIds: [] };
  const draw = () => {
    const map = exerciseMap(getFit());
    el.innerHTML = SCREEN(backHeader(existing ? 'Editar rutina' : 'Nueva rutina', B + '/rutinas') + `<main class="f-main">
      <label class="f-field"><span>Nombre</span><input id="name" maxlength="40" placeholder="Por ejemplo: Pecho y tríceps" value="${esc(r.name)}"></label>
      <section class="f-card plain"><strong>Ejercicios</strong>
        ${r.exIds.map((x, i) => `<div class="f-exrow">${exFig(map.get(x) || { name: '' }, 28)}<span class="grow">${esc((map.get(x) || { name: 'Ejercicio borrado' }).name)}</span>
          <button type="button" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button><button type="button" data-down="${i}" ${i === r.exIds.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button><button type="button" data-rm="${i}" aria-label="Quitar">✕</button></div>`).join('') || '<div class="f-mini">Todavía sin ejercicios.</div>'}
        <button type="button" class="f-btn ghost" id="add">+ Añadir ejercicios</button></section>
      <button type="button" class="f-btn" id="save">Guardar rutina</button>
      ${existing ? '<button type="button" class="f-btn danger" id="del">Borrar rutina</button>' : ''}
    </main>`);
    bindGo(el);
    const name = el.querySelector('#name');
    name.oninput = () => { r.name = name.value; };
    el.querySelectorAll('[data-up]').forEach((b) => (b.onclick = () => { const i = +b.dataset.up; [r.exIds[i - 1], r.exIds[i]] = [r.exIds[i], r.exIds[i - 1]]; draw(); }));
    el.querySelectorAll('[data-down]').forEach((b) => (b.onclick = () => { const i = +b.dataset.down; [r.exIds[i + 1], r.exIds[i]] = [r.exIds[i], r.exIds[i + 1]]; draw(); }));
    el.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { r.exIds.splice(+b.dataset.rm, 1); draw(); }));
    el.querySelector('#add').onclick = async () => { const res = await pickExercises(r.exIds); if (res) { r.exIds = res; draw(); } };
    el.querySelector('#save').onclick = () => {
      if (!r.name.trim()) { toast('Ponle un nombre a la rutina'); return; }
      if (!r.exIds.length) { toast('Añade al menos un ejercicio'); return; }
      updateFit((f) => {
        const i = f.gym.routines.findIndex((x) => x.id === r.id);
        const clean = { id: r.id, name: r.name.trim(), exIds: r.exIds };
        if (i >= 0) f.gym.routines[i] = clean; else f.gym.routines.push(clean);
      });
      toast('Rutina guardada');
      navigate(B + '/rutinas');
    };
    const del = el.querySelector('#del');
    if (del) del.onclick = async () => {
      if (!(await confirmDialog({ title: 'Borrar rutina', text: 'Los entrenos que ya hiciste con ella se conservan.', confirmLabel: 'Borrar', danger: true }))) return;
      updateFit((f) => { f.gym.routines = f.gym.routines.filter((x) => x.id !== r.id); });
      navigate(B + '/rutinas');
    };
  };
  draw();
}

// ---- Entrenos ----
export function renderSessions(el) {
  const fit = getFit();
  const map = exerciseMap(fit);
  const list = [...fit.gym.sessions].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  const rname = (s) => (fit.gym.routines.find((r) => r.id === s.routineId) || {}).name || 'Entreno libre';
  el.innerHTML = SCREEN(header('Entrenos', 'Gimnasio') + `<main class="f-main">
    ${list.map((s) => `<button type="button" class="f-card" data-go="${B}/entreno/${s.id}"><div class="rowh"><strong>${esc(rname(s))}</strong><span class="grow"></span><span class="f-mini">${shortDateText(s.date)}</span></div>
      <div class="f-mini">${sessionSets(s)} series · ${fmt(sessionVolume(s) / 1000)} t · ${s.minutes} min${s.valid === false ? ' · no cuenta (menos de ' + MIN_EXERCISES + ' ejercicios)' : ''}${s.xp ? ' · +' + s.xp + ' XP' : ''}</div></button>`).join('')}
    ${list.length ? '' : '<div class="f-note">Aquí aparecerán tus entrenos. Pulsa la mancuerna para empezar el primero.</div>'}
  </main>`, sportNav('gym', 'entrenos'));
  bindGo(el);
  center(el);
}

export function renderSessionDetail(el, { id }) {
  const fit = getFit();
  const s = fit.gym.sessions.find((x) => x.id === id);
  if (!s) { navigate(B + '/entrenos'); return; }
  const map = exerciseMap(fit);
  const rname = (fit.gym.routines.find((r) => r.id === s.routineId) || {}).name || 'Entreno libre';
  el.innerHTML = SCREEN(backHeader(esc(rname), B + '/entrenos') + `<main class="f-main">
    <section class="f-card level"><div class="f-sub">${shortDateText(s.date)}</div>
      <div class="f-grid2"><div><div class="f-num">${fmt(sessionVolume(s) / 1000)} t</div><div class="f-mini">volumen</div></div><div><div class="f-num">${sessionSets(s)}</div><div class="f-mini">series</div></div><div><div class="f-num">${s.minutes}</div><div class="f-mini">minutos</div></div></div>
      <div class="f-mini">${s.valid === false ? 'No cuenta como sesión válida (mínimo ' + MIN_EXERCISES + ' ejercicios): sin XP.' : '+' + (s.xp || 0) + ' XP' + (s.prs && s.prs.length ? ' · ' + s.prs.length + ' récord' + (s.prs.length > 1 ? 's' : '') : '')}</div></section>
    ${s.exercises.map((ex) => `<section class="f-card plain"><div class="rowh">${exFig(map.get(ex.exId) || { name: '' }, 30)}<strong>${esc((map.get(ex.exId) || { name: 'Ejercicio borrado' }).name)}${(s.prs || []).includes(ex.exId) ? ' 🏆' : ''}</strong></div>
      ${ex.sets.map((st, i) => `<div class="f-mini">Serie ${i + 1}: ${fmt(st.kg)} kg × ${st.reps}</div>`).join('')}</section>`).join('')}
    <button type="button" class="f-btn danger" id="del">Borrar entreno</button></main>`);
  bindGo(el);
  el.querySelector('#del').onclick = async () => {
    if (!(await confirmDialog({ title: 'Borrar entreno', text: 'Se quitará también su XP.', confirmLabel: 'Borrar', danger: true }))) return;
    updateFit((f) => { f.gym.sessions = f.gym.sessions.filter((x) => x.id !== id); f.gym.xpLog = f.gym.xpLog.filter((x) => x.ref !== id); });
    navigate(B + '/entrenos');
  };
}

// ---- Empezar entreno ----
export function renderStart(el) {
  const fit = getFit();
  if (fit.gym.draft) return renderActive(el);
  el.innerHTML = SCREEN(backHeader('Empezar entreno', B) + `<main class="f-main">
    <div class="f-note">Elige qué haces hoy. Los pesos y repeticiones salen rellenados con los de la última vez.</div>
    ${fit.gym.routines.map((r) => `<button type="button" class="f-card" data-r="${r.id}"><div class="rowh"><strong>${esc(r.name)}</strong><span class="grow"></span>${ico('next', 18)}</div><div class="f-mini">${r.exIds.length} ejercicios</div></button>`).join('')}
    <button type="button" class="f-btn" id="free">Entreno libre (sin rutina)</button></main>`);
  bindGo(el);
  const start = (routineId, exIds) => {
    updateFit((f) => { const d = newDraft(routineId, exIds); d.exercises.forEach((ex) => { ex.sets = suggestedSets(f, ex.exId); }); f.gym.draft = d; });
    renderActive(el);
  };
  el.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => start(b.dataset.r, fit.gym.routines.find((r) => r.id === b.dataset.r).exIds)));
  el.querySelector('#free').onclick = () => start(null, []);
}

function renderActive(el) {
  const fit0 = getFit();
  const d = fit0.gym.draft;
  const map = exerciseMap(fit0);
  const rest = fit0.settings.gym.restSecs;
  let timerEnd = 0;
  const save = () => updateFit((f) => { f.gym.draft = d; });
  const rname = (fit0.gym.routines.find((r) => r.id === d.routineId) || {}).name || 'Entreno libre';
  const draw = () => {
    const fit = getFit();
    el.innerHTML = SCREEN(`<header class="f-head"><button type="button" class="f-round" data-go="${B}" aria-label="Salir (se guarda)">${ico('back')}</button>
      <div class="grow"><div class="f-sub">En curso · se guarda solo</div><h1>${esc(rname)}</h1></div><span class="f-timer" id="rest"></span></header>
      <main class="f-main">
      ${d.exercises.map((ex, xi) => {
        const last = lastSets(fit, ex.exId, d.id);
        return `<section class="f-card plain"><div class="rowh">${exFig(map.get(ex.exId) || { name: '' }, 34)}<strong class="grow">${esc((map.get(ex.exId) || { name: 'Ejercicio borrado' }).name)}</strong><button type="button" class="f-x" data-rmex="${xi}" aria-label="Quitar ejercicio">✕</button></div>
          <div class="f-mini">${last ? 'Última vez (' + shortDateText(last.date) + '): ' + last.sets.map((s) => fmt(s.kg) + '×' + s.reps).join(' · ') : 'Primera vez: sin referencia'}</div>
          ${ex.sets.map((s, si) => `<div class="f-set ${s.done ? 'done' : ''}"><span class="n">${si + 1}</span>
            <input inputmode="decimal" data-k="kg" data-x="${xi}" data-s="${si}" placeholder="kg" value="${esc(s.kg)}"><em>kg</em>
            <input inputmode="numeric" data-k="reps" data-x="${xi}" data-s="${si}" placeholder="rep" value="${esc(s.reps)}"><em>rep</em>
            <button type="button" class="f-ok" data-ok="${xi}:${si}" aria-label="Serie hecha">${ico('check', 20, 3)}</button></div>`).join('')}
          <button type="button" class="f-link" data-addset="${xi}">+ Serie</button></section>`;
      }).join('')}
      <button type="button" class="f-btn ghost" id="addex">+ Ejercicio</button>
      <button type="button" class="f-btn" id="finish">Terminar entreno</button>
      <button type="button" class="f-btn danger" id="discard">Descartar entreno</button></main>`);
    bindGo(el);
    el.querySelectorAll('input[data-k]').forEach((i) => (i.oninput = () => { d.exercises[+i.dataset.x].sets[+i.dataset.s][i.dataset.k] = i.value; save(); }));
    el.querySelectorAll('[data-ok]').forEach((b) => (b.onclick = () => {
      const [x, s] = b.dataset.ok.split(':').map(Number);
      const st = d.exercises[x].sets[s];
      if (!st.done && num(st.reps) <= 0) { toast('Apunta las repeticiones'); return; }
      st.done = !st.done; save();
      if (st.done) timerEnd = Date.now() + rest * 1000;
      draw();
    }));
    el.querySelectorAll('[data-addset]').forEach((b) => (b.onclick = () => {
      const sets = d.exercises[+b.dataset.addset].sets; const l = sets[sets.length - 1] || { kg: '', reps: '' };
      sets.push({ kg: l.kg, reps: l.reps, done: false }); save(); draw();
    }));
    el.querySelectorAll('[data-rmex]').forEach((b) => (b.onclick = () => { d.exercises.splice(+b.dataset.rmex, 1); save(); draw(); }));
    el.querySelector('#addex').onclick = async () => {
      const res = await pickExercises(d.exercises.map((e) => e.exId));
      if (!res) return;
      const keep = d.exercises.filter((e) => res.includes(e.exId));
      for (const id of res) if (!keep.some((e) => e.exId === id)) keep.push({ exId: id, sets: suggestedSets(getFit(), id) });
      d.exercises = keep; save(); draw();
    };
    el.querySelector('#discard').onclick = async () => {
      if (!(await confirmDialog({ title: 'Descartar entreno', text: 'Se perderá lo que has apuntado en este entreno.', confirmLabel: 'Descartar', danger: true }))) return;
      updateFit((f) => { f.gym.draft = null; }); navigate(B);
    };
    el.querySelector('#finish').onclick = finish;
    tick();
  };
  const tick = () => {
    const t = el.querySelector('#rest');
    if (!t) return;
    const left = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
    t.textContent = left ? `Descanso ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : '';
    t.classList.toggle('on', !!left);
    if (t.isConnected) setTimeout(tick, 500);
  };
  const finish = async () => {
    const fit = getFit();
    const tmp = { exercises: d.exercises };
    const hasSets = d.exercises.some((e) => e.sets.some((s) => s.done));
    if (!hasSets) { toast('Marca alguna serie como hecha con ✓'); return; }
    if (!isValid(tmp)) {
      const ok = await confirmDialog({ title: 'Entreno corto', text: `Hacen falta al menos ${MIN_EXERCISES} ejercicios con series para que cuente como sesión (y dé XP). ¿Guardarlo igualmente, sin XP?`, confirmLabel: 'Guardar sin XP' });
      if (!ok) return;
    }
    const res = finishDraft((Date.now() - d.startedAt) / 60000);
    if (!res) return;
    toast(res.sess.valid ? `Entreno guardado · +${res.xp} XP${res.prs.length ? ' · ' + res.prs.length + ' récord' + (res.prs.length > 1 ? 's' : '') + ' 🏆' : ''}${res.levelUp ? ' · ¡Subes a ' + res.levelUp.name + '!' : ''}` : 'Entreno guardado (sin XP)');
    const extra = awardGym();
    navigate(`${B}/entreno/${res.sess.id}`);
    extra.levelUp = extra.levelUp || res.levelUp;
    if (extra.medals.length || extra.reto || extra.levelUp) celebrate(extra);
  };
  draw();
}

// ---- Mis ejercicios ----
export function renderMyExercises(el) {
  let q = '';
  const draw = () => {
    const fit = getFit();
    const all = exerciseList(fit, { withHidden: true }).filter((e) => e.name.toLowerCase().includes(q.toLowerCase()));
    el.innerHTML = SCREEN(backHeader('Mis ejercicios', B + '/ajustes') + `<main class="f-main">
      <input id="q" type="search" class="f-search" placeholder="Buscar" value="${esc(q)}">
      <div class="f-mini">Toca un ejercicio para renombrarlo. Los ocultos no salen al crear rutinas.</div>
      ${MUSCLES.map((m) => { const l = all.filter((e) => e.muscle === m); return l.length ? `<section class="f-card plain"><strong>${m}</strong>${l.map((e) => `<div class="f-exrow ${e.hidden ? 'off' : ''}"><button type="button" class="grow link" data-ren="${e.id}">${esc(e.name)}</button><button type="button" data-hide="${e.id}">${e.hidden ? 'Mostrar' : 'Ocultar'}</button></div>`).join('')}</section>` : ''; }).join('')}
    </main>`);
    bindGo(el);
    const input = el.querySelector('#q');
    input.oninput = () => { q = input.value; const p = input.selectionStart; draw(); const i = el.querySelector('#q'); i.focus(); i.setSelectionRange(p, p); };
    el.querySelectorAll('[data-hide]').forEach((b) => (b.onclick = () => { updateFit((f) => { const h = f.gym.hidden; const i = h.indexOf(b.dataset.hide); if (i >= 0) h.splice(i, 1); else h.push(b.dataset.hide); }); draw(); }));
    el.querySelectorAll('[data-ren]').forEach((b) => (b.onclick = async () => {
      const cur = exerciseMap(getFit()).get(b.dataset.ren);
      const r = await formDialog({ title: 'Renombrar ejercicio', fields: [{ key: 'name', label: 'Nombre', value: cur.name, maxLength: 60 }] });
      if (r && r.name.trim()) { updateFit((f) => { f.gym.renames[b.dataset.ren] = r.name.trim(); }); draw(); }
    }));
  };
  draw();
}

function center(el) {
  const b = el.querySelector('#f-center');
  if (b) b.onclick = () => navigate(B + '/empezar');
}
