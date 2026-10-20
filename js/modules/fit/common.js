// Pantallas comunes de W fit: Inicio, Semana (planificar), Medallas y Ajustes.

import { navigate, refresh } from '../../core/router.js';
import { esc, toast, confirmDialog } from '../../core/ui.js';
import { lastBackupText } from '../../core/backup.js';
import { runExport, runImport } from '../../core/backup-ui.js';
import { getFit, updateFit, resetFit } from './data.js';
import { thisMonday, addDaysKey, weekRangeText, longDateText, parseKey, keyOf, mondayKey } from './dates.js';
import { weekProgress, goalFor, hasPlan, streak, forma, formaName, levelInfo, totalXp, firstWeek, countsByWeek, SPORT_NAME } from './engine.js';
import { commonNav, bindGo, header, backHeader, ico, stepper, bindSteppers } from './shell.js';
import { medalSvg, commonMedals, METAL_NAME } from './medals.js';

const GUINOS = ['Hoy el hierro no se mueve solo.', 'Un kilómetro más, una excusa menos.', 'La constancia gana al talento.'];

function sportCard(fit, sport) {
  const p = weekProgress(fit, sport);
  const lv = levelInfo(totalXp(fit, sport));
  const path = sport === 'gym' ? '/fit/gym' : '/fit/running';
  const status = p.paused ? 'En pausa' : `${p.done} de ${p.goal} esta semana`;
  return `<button type="button" class="f-card sport-${sport}" data-go="${path}">
    <div class="rowh"><span class="f-ico">${ico(sport)}</span><strong>${SPORT_NAME[sport]}</strong><span class="grow"></span>${ico('next', 18)}</div>
    <div class="f-big">${lv.name}</div>
    <div class="f-mini">${status} · racha ${streak(fit, sport)} · forma ${formaName(forma(fit, sport))}</div></button>`;
}

// Valores para las medallas comunes.
export function commonValues(fit) {
  const gd = new Set(fit.gym.sessions.map((s) => s && s.date).filter(Boolean));
  const rd = new Set(fit.run.runs.filter((r) => r && r.date && r.valid !== false).map((r) => r.date));
  const both = [...gd].filter((d) => rd.has(d)).length;
  const days = new Set([...gd, ...rd]);
  const gw = countsByWeek(fit, 'gym');
  const rw = countsByWeek(fit, 'run');
  const weeks = Object.keys(gw).filter((k) => rw[k]).length;
  const first = [...days].sort()[0];
  let years = 0;
  if (first) {
    const f = parseKey(first);
    const now = new Date();
    years = now.getFullYear() - f.getFullYear() - (now < new Date(now.getFullYear(), f.getMonth(), f.getDate()) ? 1 : 0);
  }
  return { doble: both, semanas: weeks, dias: days.size, aniv: Math.max(0, years) };
}

// Guarda las medallas nuevas (solo escribe si hay alguna nueva).
function awardCommon(fit) {
  const v = commonValues(fit);
  const fresh = commonMedals().filter((m) => !fit.awarded[m.id] && v[m.family] >= m.n);
  if (fresh.length) {
    const today = keyOf(new Date());
    updateFit((f) => fresh.forEach((m) => { f.awarded[m.id] = today; }));
    return getFit();
  }
  return fit;
}

export function renderHome(el) {
  const fit = awardCommon(getFit());
  const mk = thisMonday();
  const empty = !firstWeek(fit, 'gym') && !firstWeek(fit, 'run');
  const guino = fit.settings.guinos ? `<div class="f-guino">${esc(GUINOS[new Date().getDate() % GUINOS.length])}</div>` : '';
  const planned = hasPlan(fit, mk);
  el.innerHTML = `<div class="f-screen">
    ${header('W fit', esc(longDateText()))}
    <main class="f-main">
      ${guino}
      <section class="f-card plain"><div class="rowh"><strong>Semana ${weekRangeText(mk)}</strong><span class="grow"></span>
        <button type="button" class="f-link" data-go="/fit/semana">${planned ? 'Cambiar' : 'Planificar'}</button></div>
        <div class="f-mini">${planned ? 'Tu semana está planificada.' : 'Aún no has planificado esta semana: se usa tu objetivo habitual.'}</div></section>
      ${sportCard(fit, 'gym')}
      ${sportCard(fit, 'run')}
      ${empty ? '<div class="f-note">Todo empieza en cero. Cuando hagas tu primer entreno aparecerán tu nivel, tu racha y tus medallas.</div>' : ''}
    </main>${commonNav('inicio')}</div>`;
  bindGo(el);
}

// ---- Semana ----
export function renderWeek(el) {
  const fit = getFit();
  const cur = thisMonday();
  const next = addDaysKey(cur, 7);
  const st = { mk: next, gym: 0, run: 0, preset: 'normal' };
  const load = () => {
    st.gym = goalFor(fit, 'gym', st.mk) || (hasPlan(fit, st.mk) ? 0 : fit.settings.gym.goal);
    st.run = goalFor(fit, 'run', st.mk) || (hasPlan(fit, st.mk) ? 0 : fit.settings.run.goal);
    if (fit.plans[st.mk]) { st.gym = fit.plans[st.mk].gym ?? st.gym; st.run = fit.plans[st.mk].run ?? st.run; }
  };
  const apply = (p) => {
    st.preset = p;
    const g = fit.settings.gym.goal;
    const r = fit.settings.run.goal;
    if (p === 'normal') { st.gym = g; st.run = r; }
    if (p === 'ligera') { st.gym = Math.max(1, g - 1); st.run = Math.max(1, r - 1); }
    if (p === 'sin') { st.gym = 0; st.run = 0; }
  };
  load();
  const draw = () => {
    el.innerHTML = `<div class="f-screen">
      ${header('Semana', 'Planifica tus entrenos')}
      <main class="f-main">
        <div class="f-seg">${[[cur, 'Esta semana'], [next, 'Próxima']].map(([k, l]) => `<button type="button" data-wk="${k}" aria-pressed="${st.mk === k}">${l}</button>`).join('')}</div>
        <div class="f-mini center">${weekRangeText(st.mk)}</div>
        <div class="f-presets">${[['normal', 'Normal'], ['ligera', 'Ligera'], ['sin', 'Sin entrenar'], ['custom', 'A medida']].map(([k, l]) => `<button type="button" data-pre="${k}" aria-pressed="${st.preset === k}">${l}</button>`).join('')}</div>
        <section class="f-card plain">
          <div class="rowh"><strong>${ico('gym', 20)} Gimnasio</strong><span class="grow"></span>${stepper('gym', st.gym, 0, 7)}</div>
          <div class="rowh"><strong>${ico('run', 20)} Running</strong><span class="grow"></span>${stepper('run', st.run, 0, 7)}</div>
          <div class="f-mini">Un 0 significa que ese deporte descansa esa semana: no rompe tu racha.</div>
        </section>
        <button type="button" class="f-btn" id="save">Guardar semana</button>
      </main>${commonNav('semana')}</div>`;
    bindGo(el);
    el.querySelectorAll('[data-wk]').forEach((b) => b.addEventListener('click', () => { st.mk = b.dataset.wk; st.preset = 'custom'; load(); draw(); }));
    el.querySelectorAll('[data-pre]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.pre !== 'custom') apply(b.dataset.pre); else st.preset = 'custom'; draw(); }));
    bindSteppers(el, (id, v) => { st[id] = v; st.preset = 'custom'; el.querySelectorAll('[data-pre]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.pre === 'custom')); });
    el.querySelector('#save').addEventListener('click', () => {
      updateFit((f) => { f.plans[st.mk] = { gym: st.gym, run: st.run }; });
      toast('Semana guardada');
      navigate('/fit');
    });
  };
  draw();
}

// ---- Medallas comunes ----
export function renderCommonMedals(el) {
  const fit = awardCommon(getFit());
  const v = commonValues(fit);
  const list = commonMedals();
  const got = list.filter((m) => fit.awarded[m.id]).length;
  const fam = [...new Set(list.map((m) => m.family))];
  el.innerHTML = `<div class="f-screen">
    ${header('Medallas', `${got} de ${list.length} conseguidas · comunes`)}
    <main class="f-main">
      ${fam.map((id) => {
        const ms = list.filter((m) => m.family === id);
        return `<section class="f-card plain"><strong>${esc(ms[0].name)}</strong><div class="f-mini">${esc(ms[0].desc)} · llevas ${v[id]}</div>
          <div class="f-medals">${ms.map((m) => `<div class="f-medal">${medalSvg({ shape: m.shape, metal: m.metal, earned: !!fit.awarded[m.id], glyph: m.glyph, size: 60 })}<b>${m.n}</b><span>${METAL_NAME[m.metal]}</span></div>`).join('')}</div></section>`;
      }).join('')}
      <div class="f-note">Las medallas de cada deporte están dentro de Gym y Running.</div>
    </main>${commonNav('medallas')}</div>`;
  bindGo(el);
}

// ---- Ajustes comunes ----
export function renderCommonSettings(el) {
  const fit = getFit();
  el.innerHTML = `<div class="f-screen">
    ${header('Ajustes', 'W fit')}
    <main class="f-main">
      <section class="f-card plain">
        <div class="rowh"><span>Guiños frikis</span><span class="grow"></span><button type="button" class="f-switch" id="guinos" aria-pressed="${fit.settings.guinos}"></button></div>
        <div class="f-mini">Frases cortas de texto en las pantallas de inicio.</div>
        <div class="rowh"><span>Color del gimnasio</span><span class="grow"></span>
          <div class="f-seg small"><button type="button" data-acc="red" aria-pressed="${fit.settings.accent === 'red'}">Rojo</button><button type="button" data-acc="lima" aria-pressed="${fit.settings.accent === 'lima'}">Lima</button></div></div>
      </section>
      <section class="f-card plain">
        <strong>Copia de seguridad</strong>
        <div class="f-mini">Tus datos están solo en este móvil. W fit va dentro de la copia única de WIBI. ${esc(lastBackupText())}</div>
        <button type="button" class="f-btn" id="export">Exportar copia</button>
        <button type="button" class="f-btn ghost" id="import">Importar copia</button>
        <input type="file" id="file" accept=".json,.txt,application/json,text/plain" hidden>
      </section>
      <section class="f-card plain">
        <strong>Borrar W fit</strong>
        <div class="f-mini">Borra todos los datos de gimnasio y running de este móvil. No toca economía ni calendario.</div>
        <button type="button" class="f-btn danger" id="reset">Borrar todo W fit</button>
      </section>
    </main>${commonNav('ajustes')}</div>`;
  bindGo(el);
  el.querySelector('#guinos').addEventListener('click', () => { updateFit((f) => { f.settings.guinos = !f.settings.guinos; }); refresh(); });
  el.querySelectorAll('[data-acc]').forEach((b) => b.addEventListener('click', () => { updateFit((f) => { f.settings.accent = b.dataset.acc; }); refresh(); }));
  el.querySelector('#export').addEventListener('click', () => runExport());
  const file = el.querySelector('#file');
  el.querySelector('#import').addEventListener('click', () => file.click());
  file.addEventListener('change', async () => { if (await runImport(file.files[0])) refresh(); file.value = ''; });
  el.querySelector('#reset').addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Borrar W fit', text: 'Se borrarán todos tus entrenos, carreras, niveles y medallas. No se puede deshacer.', confirmLabel: 'Borrar', danger: true });
    if (ok) { resetFit(); toast('W fit borrado'); refresh(); }
  });
}
