// Gimnasio, parte 2: medallas, estadísticas, retos y celebraciones.

import { navigate } from '../../core/router.js';
import { esc } from '../../core/ui.js';
import { getFit } from './data.js';
import { addDaysKey, thisMonday, weekRangeText, parseKey, mondayKey } from './dates.js';
import { levelInfo, totalXp, weekProgress, streak, SPORT_NAME } from './engine.js';

const CFG = {
  gym: { sec: gymSec, fams: GYM_FAMILIES, fm: familyMedals, award: awardGym, reto: weeklyReto, base: '/fit/gym', name: 'Gimnasio', cls: 'gym' },
  run: { sec: RM.secretMedals, fams: RM.RUN_FAMILIES, fm: RM.familyMedals, award: RM.awardRun, reto: RM.weeklyReto, base: '/fit/running', name: 'Running', cls: 'run' },
};
import { sportNav, bindGo, header, ico } from './shell.js';
import { medalSvg, METAL_NAME, MEDAL_XP } from './medals.js';
import { GYM_FAMILIES, familyMedals, awardGym, weeklyReto } from './gymmedals.js';
import * as RM from './runmedals.js';
import { secretMedals as gymSec } from './gymmedals.js';
import { exerciseMap } from './exercises.js';
import { goalsHtml, bindGoals } from './goals.js';
import { SEASONS, MONTH_NAMES, seasonOf, seasonGoals, monthMetal, showcase, trophyMetal } from './seasons.js';
import { sessionVolume, sessionSets, est1rm, num, fmt } from './gymlogic.js';

const B = '/fit/gym';
const FRIKI_NIVEL = ['«Un gran poder conlleva…» una gran sentadilla.', 'Subes de nivel. Los Titanes empiezan a preocuparse.', 'Nivel nuevo desbloqueado. Gran trabajo, Soldado.'];
const FRIKI_MEDALLA = ['Eso no estaba en el manual del Hero Academy.', 'Otra para el cinturón de campeón.', 'Se acerca el invierno… y tú más fuerte.'];

const fmtNum = (n, dec = 0) => (dec ? fmt(n) : Math.round(n).toLocaleString('es-ES'));
const center = (el) => { const b = el.querySelector('#f-center'); if (b) b.onclick = () => navigate(el.querySelector('.f-nav.sport[aria-label="Running"]') ? '/fit/running/importar' : B + '/empezar'); };

// Pantalla de celebración: primero la subida de nivel y luego cada medalla.
export async function celebrate(out, sport = 'gym') {
  const fit = getFit();
  const frases = fit.settings.guinos;
  const pages = [];
  if (out.levelUp) pages.push({ kind: 'lv', lv: out.levelUp });
  for (const m of out.medals) pages.push({ kind: 'm', m });
  if (out.reto) pages.push({ kind: 'r', r: out.reto });
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    await new Promise((resolve) => {
      const w = document.createElement('div');
      w.className = 'f-cele ' + sport;
      const k = Math.floor(Math.random() * 3);
      let body;
      if (p.kind === 'lv') body = `<div class="f-sub">¡Subes de nivel!</div><div class="f-bigger">${esc(p.lv.name)}</div><div class="f-mini">${p.lv.xp} XP en total</div>${frases ? `<div class="f-guino">${FRIKI_NIVEL[k]}</div>` : ''}`;
      else if (p.kind === 'm') body = `${medalSvg({ shape: p.m.shape, metal: p.m.metal, earned: true, glyph: p.m.glyph, size: 150 })}<div class="f-sub">${p.m.period ? 'Medalla de ' + METAL_NAME[p.m.metal] : p.m.goal ? '¡Meta cumplida!' : p.m.secret ? '¡Medalla secreta!' : 'Medalla de ' + METAL_NAME[p.m.metal]}</div><div class="f-bigger">${esc(p.m.name)}</div><div class="f-mini">${p.m.period ? esc(p.m.desc) : p.m.goal ? esc(p.m.desc) + ' · +100 XP' : p.m.secret ? esc(p.m.desc) + ' · +50 XP' : p.m.n + ' ' + esc(p.m.unit) + ' · +' + MEDAL_XP[p.m.metal] + ' XP'}</div>${frases ? `<div class="f-guino">${FRIKI_MEDALLA[k]}</div>` : ''}`;
      else body = `<div class="f-sub">Reto semanal</div><div class="f-bigger">¡Completado!</div><div class="f-mini">+${p.r.xp} XP</div>`;
      w.innerHTML = `<div class="f-cele-in">${body}<button type="button" class="f-btn">${i < pages.length - 1 ? 'Siguiente' : 'Genial'}</button></div>`;
      w.querySelector('button').onclick = () => { w.remove(); resolve(); };
      document.body.appendChild(w);
    });
  }
}

// ---- Medallas ----
export const renderGymMedals = (el) => renderSportMedals('gym')(el);
export const renderRunMedals = (el) => renderSportMedals('run')(el);
export const renderGymRetos = (el) => renderSportRetos('gym')(el);
export const renderRunRetos = (el) => renderSportRetos('run')(el);

const renderSportMedals = (sport) => (el) => {
  const C = CFG[sport];
  let tab = 'perm';
  const draw = () => {
    C.award();
    const fit = getFit();
    const fams = C.fams.filter((f) => f.group === tab);
    const all = [...C.fams.flatMap((f) => C.fm(f)), ...C.sec()];
    const got = all.filter((m) => fit.awarded[m.id]).length;
    const tabs = [['perm', 'Permanentes'], ['const', 'Constancia'], ['sec', 'Secretas'], ['vit', 'Vitrina']];
    let body;
    if (tab === 'sec') {
      const sm = C.sec();
      const n = sm.filter((m) => fit.awarded[m.id]).length;
      body = `<div class="f-note">Se revelan solas al conseguirlas (+50 XP cada una). Llevas ${n} de ${sm.length}.</div><div class="f-medals big">${sm.map((m) => { const e = !!fit.awarded[m.id]; return `<div class="f-medal wide">${medalSvg({ shape: m.shape, metal: m.metal, earned: e, glyph: m.glyph, size: 56 })}<b>${e ? esc(m.name) : '???'}</b><span>${e ? esc(m.desc) : 'Secreta'}</span></div>`; }).join('')}</div>`;
    }
    else if (tab === 'vit') {
      const sc = showcase(fit, sport);
      const shape = sport === 'gym' ? 'shield' : 'hex';
      const years = [...new Set([...sc.months.map((x) => x.y), ...sc.seasons.map((x) => x.y)])].sort((a, b) => b - a);
      body = years.map((y) => `<section class="f-card plain"><strong>${y}</strong>
        <div class="f-sub">Trofeos de temporada</div><div class="f-medals">${sc.seasons.filter((x) => x.y === y).map((x) => `<div class="f-medal wide">${medalSvg({ shape, metal: x.metal, earned: true, glyph: 'star', size: 56 })}<b>${x.s.name}</b><span>${METAL_NAME[x.metal]}</span></div>`).join('') || '<div class="f-mini">Ninguno todavía</div>'}</div>
        <div class="f-sub">Medallas de mes</div><div class="f-medals">${sc.months.filter((x) => x.y === y).sort((a, b) => a.m - b.m).map((x) => `<div class="f-medal">${medalSvg({ shape, metal: x.metal, earned: true, glyph: 'sun', size: 48 })}<b>${MONTH_NAMES[x.m].slice(0, 3)}</b><span>${METAL_NAME[x.metal]}</span></div>`).join('') || '<div class="f-mini">Ninguna todavía</div>'}</div></section>`).join('')
        || '<div class="f-note">Aquí se irán guardando los trofeos de cada temporada y las medallas de cada mes en cuanto se cierren. Un mes cuenta si cumples tu objetivo en al menos 3 de sus semanas.</div>';
    }
    else body = fams.map((fam) => {
      const ms = C.fm(fam);
      const v = fam.value(fit);
      const nextI = ms.findIndex((m) => !fit.awarded[m.id]);
      const next = nextI >= 0 ? ms[nextI] : null;
      return `<section class="f-card plain"><strong>${esc(fam.name)}</strong>
        <div class="f-mini">Llevas ${fmtNum(v, fam.decimals)} ${esc(fam.unit)}${next ? ' · siguiente: ' + fmtNum(next.n) : ' · ¡colección completa!'}</div>
        <div class="f-medals">${ms.map((m) => `<div class="f-medal">${medalSvg({ shape: m.shape, metal: m.metal, earned: !!fit.awarded[m.id], glyph: m.glyph, size: 56 })}<b>${fmtNum(m.n)}</b><span>${METAL_NAME[m.metal]}</span></div>`).join('')}</div></section>`;
    }).join('');
    el.innerHTML = `<div class="f-screen">${header('Medallas', `${got} de ${all.length} conseguidas · ${C.name}`)}
      <main class="f-main"><div class="f-seg small tabs4">${tabs.map(([k, l]) => `<button type="button" data-t="${k}" aria-pressed="${tab === k}">${l}</button>`).join('')}</div>${body}</main>${sportNav(sport, 'medallas')}</div>`;
    bindGo(el); center(el);
    el.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { tab = b.dataset.t; draw(); }));
  };
  draw();
};

function seasonCard(fit, sport) {
  const { s, y } = seasonOf();
  const g = seasonGoals(fit, sport, y, s);
  const n = g.list.filter((x) => x.ok).length;
  const mm = seasonOf().s.months.map((m) => ({ m, y: s.k === 'inv' && m < 6 ? y + 1 : y }));
  const now = new Date();
  const metal = trophyMetal(n);
  return `<section class="f-card plain"><div class="rowh"><strong class="grow">${s.name} ${y}</strong><span class="f-mini">${n} de 6 objetivos${metal ? ' · ' + METAL_NAME[metal] : ''}</span></div>
    ${g.list.map((x) => `<div class="f-mini">${x.ok ? '✓' : '○'} ${esc(x.t)}${x.n > 1 ? ` (${Math.min(x.v, x.n)}/${x.n})` : ''}</div>`).join('')}
    <div class="f-mini">Trofeo: Bronce con 2, Plata con 4, Oro con 6. Se entrega al cerrar la temporada.</div>
    <div class="f-mini">Meses de esta temporada: ${mm.map((x) => `${MONTH_NAMES[x.m].slice(0, 3)}${x.y === now.getFullYear() && x.m === now.getMonth() ? ' (en curso)' : ''}`).join(' · ')}. Reto mensual: cierra el mes con todas las semanas cumplidas y un récord (+200 XP).</div></section>`;
}

// ---- Retos ----
const renderSportRetos = (sport) => (el) => {
  const C = CFG[sport];
  const out = C.award();
  const fit = getFit();
  if (out.medals.length || out.reto || out.levelUp) setTimeout(() => celebrate(out, sport), 0);
  const r = C.reto(fit);
  const pct = r.goal ? Math.min(100, Math.round((r.done / r.goal) * 100)) : 0;
  el.innerHTML = `<div class="f-screen">${header('Retos', C.name)}<main class="f-main">
    <section class="f-card level"><div class="f-sub">Reto de la semana · ${weekRangeText(r.mk)}</div>
      <div class="f-big">${r.paused ? 'Semana en pausa' : 'Cumple tu objetivo semanal'}</div>
      ${r.paused ? '<div class="f-mini">Los retos no cuentan ni se fallan durante una pausa.</div>' : `<div class="f-bar"><i style="width:${pct}%"></i></div>
      <div class="f-mini">${r.done} de ${r.goal} sesiones · ${r.complete || r.claimed ? '¡completado!' : 'recompensa +' + r.xp + ' XP'}</div>`}</section>
    <section class="f-card plain"><strong>Racha</strong><div class="f-mini">${streak(fit, sport)} semanas seguidas cumpliendo tu objetivo.</div></section>
    ${seasonCard(fit, sport)}
    ${goalsHtml(fit, sport)}
  </main>${sportNav(sport, 'retos')}</div>`;
  bindGo(el); center(el);
  bindGoals(el, sport, () => renderSportRetos(sport)(el), celebrate);
};

// ---- Estadísticas ----
export function renderGymStats(el) {
  let range = 'mes';
  let exId = '';
  const draw = () => {
    const fit = getFit();
    const map = exerciseMap(fit);
    const now = new Date();
    const all = fit.gym.sessions.filter((s) => s.valid !== false);
    const inRange = (s) => {
      if (range === 'todo') return true;
      const d = parseKey(s.date);
      return range === 'mes' ? d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() : d.getFullYear() === now.getFullYear();
    };
    const sel = all.filter(inRange);
    const vol = sel.reduce((a, s) => a + sessionVolume(s), 0);
    const sets = sel.reduce((a, s) => a + sessionSets(s), 0);
    const mins = sel.reduce((a, s) => a + (s.minutes || 0), 0);
    // Volumen por semana (últimas 8)
    const bars = [];
    for (let i = 7; i >= 0; i--) {
      const mk = addDaysKey(thisMonday(), -7 * i);
      bars.push({ mk, v: all.filter((s) => mondayKey(parseKey(s.date)) === mk).reduce((a, s) => a + sessionVolume(s), 0) });
    }
    const maxV = Math.max(1, ...bars.map((b) => b.v));
    const used = [...new Set(all.flatMap((s) => s.exercises.map((e) => e.exId)))];
    if (!exId || !used.includes(exId)) exId = used[0] || '';
    const pts = exId ? all.filter((s) => s.exercises.some((e) => e.exId === exId)).sort((a, b) => a.date.localeCompare(b.date)).map((s) => {
      const ex = s.exercises.find((e) => e.exId === exId);
      return { d: s.date, v: Math.max(...ex.sets.map((st) => est1rm(num(st.kg), num(st.reps)))) };
    }) : [];
    const minP = Math.min(...pts.map((p) => p.v));
    const maxP = Math.max(...pts.map((p) => p.v));
    const line = pts.length > 1 ? `<svg viewBox="0 0 300 90" class="f-line" preserveAspectRatio="none"><polyline fill="none" stroke="var(--f-acc)" stroke-width="3" stroke-linejoin="round" points="${pts.map((p, i) => `${(i / (pts.length - 1)) * 290 + 5},${80 - ((p.v - minP) / Math.max(1, maxP - minP)) * 70}`).join(' ')}"/></svg>` : '<div class="f-mini">Hacen falta al menos dos entrenos con este ejercicio para ver la curva.</div>';
    el.innerHTML = `<div class="f-screen">${header('Estadísticas', 'Gimnasio')}<main class="f-main">
      <div class="f-seg">${[['mes', 'Mes'], ['año', 'Año'], ['todo', 'Todo']].map(([k, l]) => `<button type="button" data-r="${k}" aria-pressed="${range === k}">${l}</button>`).join('')}</div>
      <div class="f-grid">
        <section class="f-card plain"><div class="f-sub">Sesiones</div><div class="f-num">${sel.length}</div></section>
        <section class="f-card plain"><div class="f-sub">Volumen</div><div class="f-num">${fmt(vol / 1000)}</div><div class="f-mini">toneladas</div></section>
        <section class="f-card plain"><div class="f-sub">Series</div><div class="f-num">${sets}</div><div class="f-mini">${Math.round(mins / 60 * 10) / 10} h</div></section>
      </div>
      <section class="f-card plain"><strong>Volumen por semana</strong><div class="f-bars">${bars.map((b) => `<div class="f-bcol"><i style="height:${Math.round((b.v / maxV) * 100)}%"></i><span>${parseKey(b.mk).getDate()}</span></div>`).join('')}</div></section>
      <button type="button" class="f-card level" data-go="${B}/anual"><strong>Tu año de gimnasio</strong><div class="f-mini">Resumen anual: totales, mejores momentos y comparación con el año pasado</div></button>
      <section class="f-card plain"><strong>Evolución de un ejercicio</strong>
        ${used.length ? `<select id="ex" class="f-select">${used.map((id) => `<option value="${id}" ${id === exId ? 'selected' : ''}>${esc((map.get(id) || { name: '?' }).name)}</option>`).join('')}</select>${line}
        <div class="f-mini">Fuerza estimada (1 repetición) en cada entreno.</div>` : '<div class="f-mini">Cuando hagas entrenos verás aquí tu progreso.</div>'}</section>
    </main>${sportNav('gym', 'estadisticas')}</div>`;
    bindGo(el); center(el);
    el.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { range = b.dataset.r; draw(); }));
    const s = el.querySelector('#ex');
    if (s) s.onchange = () => { exId = s.value; draw(); };
  };
  draw();
}
