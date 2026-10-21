// Gimnasio, parte 2: medallas, estadísticas, retos y celebraciones.

import { navigate } from '../../core/router.js';
import { esc } from '../../core/ui.js';
import { getFit } from './data.js';
import { addDaysKey, thisMonday, weekRangeText, parseKey, mondayKey } from './dates.js';
import { levelInfo, totalXp, weekProgress, streak, SPORT_NAME } from './engine.js';
import { sportNav, bindGo, header, ico } from './shell.js';
import { medalSvg, METAL_NAME, MEDAL_XP } from './medals.js';
import { GYM_FAMILIES, familyMedals, awardGym, weeklyReto, retoXp } from './gymmedals.js';
import { exerciseMap } from './exercises.js';
import { sessionVolume, sessionSets, est1rm, num, fmt } from './gymlogic.js';

const B = '/fit/gym';
const FRIKI_NIVEL = ['«Un gran poder conlleva…» una gran sentadilla.', 'Subes de nivel. Los Titanes empiezan a preocuparse.', 'Nivel nuevo desbloqueado. Gran trabajo, Soldado.'];
const FRIKI_MEDALLA = ['Eso no estaba en el manual del Hero Academy.', 'Otra para el cinturón de campeón.', 'Se acerca el invierno… y tú más fuerte.'];

const fmtNum = (n, dec = 0) => (dec ? fmt(n) : Math.round(n).toLocaleString('es-ES'));
const center = (el) => { const b = el.querySelector('#f-center'); if (b) b.onclick = () => navigate(B + '/empezar'); };

// Pantalla de celebración: primero la subida de nivel y luego cada medalla.
export async function celebrate(out) {
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
      w.className = 'f-cele in-fitg-scope';
      const k = Math.floor(Math.random() * 3);
      let body;
      if (p.kind === 'lv') body = `<div class="f-sub">¡Subes de nivel!</div><div class="f-bigger">${esc(p.lv.name)}</div><div class="f-mini">${p.lv.xp} XP en total</div>${frases ? `<div class="f-guino">${FRIKI_NIVEL[k]}</div>` : ''}`;
      else if (p.kind === 'm') body = `${medalSvg({ shape: p.m.shape, metal: p.m.metal, earned: true, glyph: p.m.glyph, size: 150 })}<div class="f-sub">Medalla de ${METAL_NAME[p.m.metal]}</div><div class="f-bigger">${esc(p.m.name)}</div><div class="f-mini">${p.m.n} ${esc(p.m.unit)} · +${MEDAL_XP[p.m.metal]} XP</div>${frases ? `<div class="f-guino">${FRIKI_MEDALLA[k]}</div>` : ''}`;
      else body = `<div class="f-sub">Reto semanal</div><div class="f-bigger">¡Completado!</div><div class="f-mini">+${p.r.xp} XP</div>`;
      w.innerHTML = `<div class="f-cele-in">${body}<button type="button" class="f-btn">${i < pages.length - 1 ? 'Siguiente' : 'Genial'}</button></div>`;
      w.querySelector('button').onclick = () => { w.remove(); resolve(); };
      document.body.appendChild(w);
    });
  }
}

// ---- Medallas ----
export function renderGymMedals(el) {
  let tab = 'perm';
  const draw = () => {
    awardGym();
    const fit = getFit();
    const fams = GYM_FAMILIES.filter((f) => f.group === tab);
    const all = GYM_FAMILIES.flatMap((f) => familyMedals(f));
    const got = all.filter((m) => fit.awarded[m.id]).length;
    const tabs = [['perm', 'Permanentes'], ['const', 'Constancia'], ['sec', 'Secretas'], ['vit', 'Vitrina']];
    let body;
    if (tab === 'sec') body = '<div class="f-note">Las medallas secretas se revelan solas al conseguirlas. Llegarán en una próxima parte.</div>';
    else if (tab === 'vit') body = '<div class="f-note">Aquí irán los trofeos de cada temporada y las medallas de cada mes. Llegarán con las temporadas.</div>';
    else body = fams.map((fam) => {
      const ms = familyMedals(fam);
      const v = fam.value(fit);
      const nextI = ms.findIndex((m) => !fit.awarded[m.id]);
      const next = nextI >= 0 ? ms[nextI] : null;
      return `<section class="f-card plain"><strong>${esc(fam.name)}</strong>
        <div class="f-mini">Llevas ${fmtNum(v, fam.decimals)} ${esc(fam.unit)}${next ? ' · siguiente: ' + fmtNum(next.n) : ' · ¡colección completa!'}</div>
        <div class="f-medals">${ms.map((m) => `<div class="f-medal">${medalSvg({ shape: m.shape, metal: m.metal, earned: !!fit.awarded[m.id], glyph: m.glyph, size: 56 })}<b>${fmtNum(m.n)}</b><span>${METAL_NAME[m.metal]}</span></div>`).join('')}</div></section>`;
    }).join('');
    el.innerHTML = `<div class="f-screen">${header('Medallas', `${got} de ${all.length} conseguidas`)}
      <main class="f-main"><div class="f-seg small tabs4">${tabs.map(([k, l]) => `<button type="button" data-t="${k}" aria-pressed="${tab === k}">${l}</button>`).join('')}</div>${body}</main>${sportNav('gym', 'medallas')}</div>`;
    bindGo(el); center(el);
    el.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { tab = b.dataset.t; draw(); }));
  };
  draw();
}

// ---- Retos ----
export function renderGymRetos(el) {
  const out = awardGym();
  const fit = getFit();
  const r = weeklyReto(fit);
  const pct = r.goal ? Math.min(100, Math.round((r.done / r.goal) * 100)) : 0;
  el.innerHTML = `<div class="f-screen">${header('Retos', 'Gimnasio')}<main class="f-main">
    <section class="f-card level"><div class="f-sub">Reto de la semana · ${weekRangeText(r.mk)}</div>
      <div class="f-big">${r.paused ? 'Semana en pausa' : 'Cumple tu objetivo semanal'}</div>
      ${r.paused ? '<div class="f-mini">Los retos no cuentan ni se fallan durante una pausa.</div>' : `<div class="f-bar"><i style="width:${pct}%"></i></div>
      <div class="f-mini">${r.done} de ${r.goal} sesiones · ${r.complete || r.claimed ? '¡completado!' : 'recompensa +' + r.xp + ' XP'}</div>`}</section>
    <section class="f-card plain"><strong>Racha</strong><div class="f-mini">${streak(fit, 'gym')} semanas seguidas cumpliendo tu objetivo.</div></section>
    <div class="f-note">Los retos mensuales, las temporadas y las metas propias llegarán en una próxima parte.</div>
  </main>${sportNav('gym', 'retos')}</div>`;
  bindGo(el); center(el);
  if (out.medals.length || out.reto || out.levelUp) celebrate(out);
}

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
