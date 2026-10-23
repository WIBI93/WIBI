// Pantallas comunes de W fit: Inicio, Semana (planificar), Medallas y Ajustes.

import { navigate, refresh } from '../../core/router.js';
import { esc, toast, confirmDialog } from '../../core/ui.js';
import { lastBackupText } from '../../core/backup.js';
import { runExport, runImport } from '../../core/backup-ui.js';
import { getFit, updateFit, resetFit } from './data.js';
import { thisMonday, addDaysKey, weekRangeText, longDateText, parseKey, keyOf, mondayKey, shortDateText, monthTitle, todayKey } from './dates.js';
import { canPause, weekProgress, goalFor, hasPlan, streak, forma, formaName, levelInfo, totalXp, firstWeek, countsByWeek, SPORT_NAME } from './engine.js';
import { commonNav, bindGo, header, backHeader, ico, stepper, bindSteppers } from './shell.js';
import { medalSvg, commonMedals, METAL_NAME } from './medals.js';
import { COMMON_SECRETS } from './secrets.js';
import { getData as getCal, activeCal } from '../calendar/data.js';
import { readableOn } from '../../core/palette.js';

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
  const gd = new Set(fit.gym.sessions.filter((s) => s && s.date && s.valid !== false).map((s) => s.date));
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
  const freshSec = COMMON_SECRETS.filter((m) => !fit.awarded['com.sec.' + m.id] && m.test(fit));
  if (fresh.length || freshSec.length) {
    const today = keyOf(new Date());
    updateFit((f) => { fresh.forEach((m) => { f.awarded[m.id] = today; }); freshSec.forEach((m) => { f.awarded['com.sec.' + m.id] = today; }); });
    return getFit();
  }
  return fit;
}

// Turnos de trabajo del calendario activo (solo lectura): fecha -> { color, letter, name, kind }.
function shiftsByDate() {
  try {
    const cal = activeCal(getCal());
    const map = new Map(cal.shifts.map((x) => [x.id, x]));
    const out = {};
    for (const [k, d] of Object.entries(cal.days)) { const sh = d.shift && map.get(d.shift); if (sh) out[k] = sh; }
    return out;
  } catch (e) { return {}; }
}
const WD = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const plannedDays = (fit, sp) => new Set(Object.values(fit.plans).flatMap((p) => (p.days && p.days[sp]) || []));

// Calendario del mes: cada día marcado con gym (rojo), running (turquesa) o los dos.
function monthGrid(fit, y, m) {
  const g = new Set(fit.gym.sessions.filter((s) => s.valid !== false).map((s) => s.date));
  const r = new Set(fit.run.runs.filter((x) => x.valid !== false).map((x) => x.date));
  const first = new Date(y, m, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const today = todayKey();
  const pg = plannedDays(fit, 'gym'); const pr = plannedDays(fit, 'run');
  const sh = shiftsByDate();
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<i class="empty"></i>';
  for (let d = 1; d <= days; d++) {
    const k = keyOf(new Date(y, m, d));
    const cls = g.has(k) && r.has(k) ? 'both' : g.has(k) ? 'g' : r.has(k) ? 'r' : '';
    const ring = (pg.has(k) && !g.has(k) ? 'pg ' : '') + (pr.has(k) && !r.has(k) ? 'pr' : '');
    const s0 = sh[k] && sh[k].kind === 'work' ? sh[k] : null;
    cells += `<span class="day ${cls} ${ring} ${k === today ? 'today' : ''}">${d}${s0 ? `<i class="sd" style="background:${s0.color}" title="${esc(s0.name)}"></i>` : ''}</span>`;
  }
  return `<div class="f-cal"><div class="hd">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((x) => `<b>${x}</b>`).join('')}</div><div class="bd">${cells}</div></div>
    <div class="f-legend"><span><i class="g"></i>Gym</span><span><i class="r"></i>Running</span><span><i class="both"></i>Los dos</span><span><i class="ring"></i>Planificado</span><span><i class="sdl"></i>Tu turno</span></div>`;
}

function lastActivities(fit) {
  const a = [
    ...fit.gym.sessions.filter((s) => s.valid !== false).map((s) => ({ sport: 'gym', date: s.date, ts: s.startedAt || parseKey(s.date).getTime(), id: s.id, title: (fit.gym.routines.find((r) => r.id === s.routineId) || {}).name || 'Entreno libre', sub: `${s.minutes} min` })),
    ...fit.run.runs.filter((r) => r.valid !== false).map((r) => ({ sport: 'run', date: r.date, ts: r.startedAt, id: r.id, title: r.name, sub: `${(r.runM / 1000).toFixed(1).replace('.', ',')} km` })),
  ];
  return a.sort((x, y) => y.ts - x.ts).slice(0, 5);
}

function planDaysText(fit, mk) {
  const p = fit.plans[mk];
  if (!p || !p.days) return '';
  const nm = (k) => WD[(parseKey(k).getDay() + 6) % 7];
  return ['gym', 'run'].filter((sp) => p.days[sp]).map((sp) => `${sp === 'gym' ? 'Gym' : 'Running'}: ${p.days[sp].map(nm).join(', ')}`).join(' · ');
}

export function renderHome(el) {
  const fit = awardCommon(getFit());
  const now = new Date();
  let cy = now.getFullYear();
  let cm = now.getMonth();
  const mk = thisMonday();
  const empty = !firstWeek(fit, 'gym') && !firstWeek(fit, 'run');
  const guino = fit.settings.guinos ? `<div class="f-guino">${esc(GUINOS[new Date().getDate() % GUINOS.length])}</div>` : '';
  const planned = hasPlan(fit, mk);
  el.innerHTML = `<div class="f-screen">
    ${header('W fit', esc(longDateText()))}
    <main class="f-main">
      <section class="f-card plain"><div class="rowh"><button type="button" class="f-x" id="prevm" aria-label="Mes anterior">‹</button><strong class="grow center" id="mt">${monthTitle(cy, cm)}</strong><button type="button" class="f-x" id="nextm" aria-label="Mes siguiente">›</button></div><div id="grid">${monthGrid(fit, cy, cm)}</div></section>
      ${guino}
      <section class="f-card plain"><div class="rowh"><strong>Semana ${weekRangeText(mk)}</strong><span class="grow"></span>
        <button type="button" class="f-link" data-go="/fit/semana">${planned ? 'Cambiar' : 'Planificar'}</button></div>
        <div class="f-mini">${planDaysText(fit, mk) || (planned ? 'Tu semana está planificada.' : 'Aún no has planificado esta semana: se usa tu objetivo habitual.')}</div></section>
      ${sportCard(fit, 'gym')}
      ${sportCard(fit, 'run')}
      ${lastActivities(fit).length ? `<section class="f-card plain"><strong>Últimas actividades</strong>${lastActivities(fit).map((a) => `<button type="button" class="f-act ${a.sport}" data-go="/fit/${a.sport === 'gym' ? 'gym/entreno' : 'running/carrera'}/${a.id}"><span class="dot"></span><span class="grow">${esc(a.title)}<small>${esc(shortDateText(a.date))} · ${esc(a.sub)}</small></span>${ico('next', 16)}</button>`).join('')}</section>` : ''}
      ${empty ? '<div class="f-note">Todo empieza en cero. Cuando hagas tu primer entreno aparecerán tu nivel, tu racha y tus medallas.</div>' : ''}
    </main>${commonNav('inicio')}</div>`;
  bindGo(el);
  const upd = () => { el.querySelector('#mt').textContent = monthTitle(cy, cm); el.querySelector('#grid').innerHTML = monthGrid(fit, cy, cm); };
  el.querySelector('#prevm').onclick = () => { cm--; if (cm < 0) { cm = 11; cy--; } upd(); };
  el.querySelector('#nextm').onclick = () => { cm++; if (cm > 11) { cm = 0; cy++; } upd(); };
}

// ---- Semana ----
export function renderWeek(el) {
  const fit = getFit();
  const cur = thisMonday();
  const next = addDaysKey(cur, 7);
  const today = todayKey();
  const st = { mk: next, gym: 0, run: 0, preset: 'normal', days: { gym: [], run: [] } };
  const load = () => {
    st.gym = goalFor(fit, 'gym', st.mk) || (hasPlan(fit, st.mk) ? 0 : fit.settings.gym.goal);
    st.run = goalFor(fit, 'run', st.mk) || (hasPlan(fit, st.mk) ? 0 : fit.settings.run.goal);
    if (fit.plans[st.mk]) { st.gym = fit.plans[st.mk].gym ?? st.gym; st.run = fit.plans[st.mk].run ?? st.run; }
    const pd = (fit.plans[st.mk] && fit.plans[st.mk].days) || {};
    st.days = { gym: [...(pd.gym || [])], run: [...(pd.run || [])] };
  };
  const apply = (p) => {
    st.preset = p;
    st.days = { gym: [], run: [] };
    const g = fit.settings.gym.goal;
    const r = fit.settings.run.goal;
    if (p === 'normal') { st.gym = g; st.run = r; }
    if (p === 'ligera') { st.gym = Math.max(1, g - 1); st.run = Math.max(1, r - 1); }
    if (p === 'sin') { st.gym = 0; st.run = 0; }
  };
  load();
  const doneSet = (sp) => new Set((sp === 'gym' ? fit.gym.sessions : fit.run.runs).filter((x) => x.valid !== false).map((x) => x.date));
  const draw = () => {
    const sh = shiftsByDate();
    const dg = doneSet('gym'); const dr = doneSet('run');
    for (const sp of ['gym', 'run']) if (st.days[sp].length) st[sp] = st.days[sp].length;
    const rows = Array.from({ length: 7 }, (_, i) => {
      const k = addDaysKey(st.mk, i);
      const past = k < today;
      const s0 = sh[k];
      const badge = s0 ? (s0.kind === 'work' ? `<span class="f-sb" style="background:${s0.color};color:${readableOn(s0.color, '#14202B')}" title="${esc(s0.name)}">${esc(s0.letter)}</span>` : `<span class="f-mini">${esc(s0.name)}</span>`) : '';
      const btn = (sp, label) => {
        const on = st.days[sp].includes(k);
        const done = (sp === 'gym' ? dg : dr).has(k);
        return `<button type="button" class="f-dayb ${sp}" data-pd="${sp}:${k}" aria-pressed="${on}" ${past && !on ? 'disabled' : ''}>${done ? '✓ ' : ''}${label}</button>`;
      };
      return `<div class="f-wd ${k === today ? 'today' : ''}"><span class="d">${WD[i]} ${parseKey(k).getDate()}</span><span class="b">${badge}</span>${btn('gym', 'Gym')}${btn('run', 'Running')}</div>`;
    }).join('');
    const ctl = (sp, name) => (st.days[sp].length
      ? `<div class="rowh"><strong>${ico(sp, 20)} ${name}</strong><span class="grow"></span><span class="f-num small">${st[sp]}</span><span class="f-mini">${st[sp] === 1 ? 'día' : 'días'} marcados</span></div>`
      : `<div class="rowh"><strong>${ico(sp, 20)} ${name}</strong><span class="grow"></span>${stepper(sp, st[sp], 0, 7)}</div>`);
    el.innerHTML = `<div class="f-screen">
      ${header('Semana', 'Planifica tus entrenos')}
      <main class="f-main">
        <div class="f-seg">${[[cur, 'Esta semana'], [next, 'Próxima']].map(([k, l]) => `<button type="button" data-wk="${k}" aria-pressed="${st.mk === k}">${l}</button>`).join('')}</div>
        <div class="f-mini center">${weekRangeText(st.mk)}</div>
        <section class="f-card plain"><strong>Elige los días</strong>
          <div class="f-mini">Marca qué día haces cada deporte. Tus turnos de trabajo salen al lado para elegir con calma.</div>
          ${rows}</section>
        <div class="f-presets">${[['normal', 'Objetivo habitual'], ['ligera', 'Ligera'], ['sin', 'Sin entrenar'], ['custom', 'A medida']].map(([k, l]) => `<button type="button" data-pre="${k}" aria-pressed="${st.preset === k}">${l}</button>`).join('')}</div>
        <section class="f-card plain">
          ${ctl('gym', 'Gimnasio')}
          ${ctl('run', 'Running')}
          <div class="f-mini">Si no eliges días, cuenta el número de sesiones de la semana. Un 0 significa que ese deporte descansa esa semana: no rompe tu racha. Los presets quitan los días elegidos.</div>
        </section>
        <button type="button" class="f-btn" id="save">Guardar semana</button>
      </main>${commonNav('semana')}</div>`;
    bindGo(el);
    el.querySelectorAll('[data-wk]').forEach((b) => b.addEventListener('click', () => { st.mk = b.dataset.wk; st.preset = 'custom'; load(); draw(); }));
    el.querySelectorAll('[data-pre]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.pre !== 'custom') apply(b.dataset.pre); else st.preset = 'custom'; draw(); }));
    el.querySelectorAll('[data-pd]').forEach((b) => b.addEventListener('click', () => {
      const [sp, k] = b.dataset.pd.split(':');
      const a = st.days[sp];
      st.days[sp] = a.includes(k) ? a.filter((x) => x !== k) : [...a, k].sort();
      
      st.preset = 'custom';
      draw();
    }));
    bindSteppers(el, (id, v) => { st[id] = v; st.preset = 'custom'; el.querySelectorAll('[data-pre]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.pre === 'custom')); });
    el.querySelector('#save').addEventListener('click', () => {
      const fit2 = getFit();
      for (const sp of ['gym', 'run']) {
        if (st[sp] === 0 && !(fit2.plans[st.mk] && fit2.plans[st.mk][sp] === 0) && !canPause(fit2, sp, [st.mk]).ok) { toast(`${SPORT_NAME[sp]}: te pasas del tope de pausas (3 semanas cada 3 meses)`); return; }
      }
      const days = {};
      for (const sp of ['gym', 'run']) if (st.days[sp].length) days[sp] = st.days[sp];
      updateFit((f) => { f.plans[st.mk] = { gym: st.gym, run: st.run, ...(Object.keys(days).length ? { days } : {}) }; });
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
  const got = list.filter((m) => fit.awarded[m.id]).length + COMMON_SECRETS.filter((m) => fit.awarded['com.sec.' + m.id]).length;
  const fam = [...new Set(list.map((m) => m.family))];
  el.innerHTML = `<div class="f-screen">
    ${header('Medallas', `${got} de ${list.length + COMMON_SECRETS.length} conseguidas · comunes`)}
    <main class="f-main">
      ${fam.map((id) => {
        const ms = list.filter((m) => m.family === id);
        return `<section class="f-card plain"><strong>${esc(ms[0].name)}</strong><div class="f-mini">${esc(ms[0].desc)} · llevas ${v[id]}</div>
          <div class="f-medals">${ms.map((m) => `<div class="f-medal">${medalSvg({ shape: m.shape, metal: m.metal, earned: !!fit.awarded[m.id], glyph: m.glyph, size: 60 })}<b>${m.n}</b><span>${METAL_NAME[m.metal]}</span></div>`).join('')}</div></section>`;
      }).join('')}
      <section class="f-card plain"><strong>Secretas</strong><div class="f-mini">${COMMON_SECRETS.filter((m) => fit.awarded['com.sec.' + m.id]).length} de ${COMMON_SECRETS.length} descubiertas</div>
        <div class="f-medals">${COMMON_SECRETS.map((m) => { const e = !!fit.awarded['com.sec.' + m.id]; return `<div class="f-medal wide">${medalSvg({ shape: 'coin', metal: 'oro', earned: e, glyph: 'star', size: 56 })}<b>${e ? esc(m.name) : '???'}</b><span>${e ? esc(m.desc) : 'Secreta'}</span></div>`; }).join('')}</div></section>
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
  el.querySelector('#export').addEventListener('click', () => runExport());
  const file = el.querySelector('#file');
  el.querySelector('#import').addEventListener('click', () => file.click());
  file.addEventListener('change', async () => { if (await runImport(file.files[0])) refresh(); file.value = ''; });
  el.querySelector('#reset').addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Borrar W fit', text: 'Se borrarán todos tus entrenos, carreras, niveles y medallas. No se puede deshacer.', confirmLabel: 'Borrar', danger: true });
    if (ok) { resetFit(); toast('W fit borrado'); refresh(); }
  });
}
