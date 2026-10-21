// Resumen anual de cada deporte: «Tu año de gimnasio» / «Tu año de running».

import { esc } from '../../core/ui.js';
import { getFit } from './data.js';
import { parseKey } from './dates.js';
import { levelInfo, streakStats } from './engine.js';
import { sportNav, backHeader, bindGo } from './shell.js';
import { sessionVolume, sessionSets, fmt } from './gymlogic.js';
import { MONTH_NAMES } from './seasons.js';
import { paceText, durText } from './gpx.js';
import { METAL_NAME } from './medals.js';

const GUINOS = {
  gym: ['«No soy un héroe, solo levanto mucho»… y este año se nota.', 'Tu año tiene más series que un maratón de Netflix.'],
  run: ['Este año has corrido más que cualquier Hobbit camino de Mordor.', 'Más kilómetros que una cuenta atrás de Mario Kart.'],
};

export const renderAnnual = (sport) => (el) => {
  const base = sport === 'gym' ? '/fit/gym' : '/fit/running';
  const st = { year: new Date().getFullYear() };
  const draw = () => {
    const f = getFit();
    const all = (sport === 'gym' ? f.gym.sessions : f.run.runs).filter((x) => x.valid !== false);
    const years = [...new Set([new Date().getFullYear(), ...all.map((x) => parseKey(x.date).getFullYear())])].sort((a, b) => b - a);
    const inY = (y) => all.filter((x) => parseKey(x.date).getFullYear() === y);
    const cur = inY(st.year);
    const prev = inY(st.year - 1);
    const xpTo = (y) => f[sport].xpLog.filter((x) => parseKey(x.date).getFullYear() < y).reduce((a, x) => a + (x.xp || 0), 0);
    const lv0 = levelInfo(xpTo(st.year));
    const lv1 = levelInfo(xpTo(st.year + 1));
    const gym = sport === 'gym';
    const main = (l) => (gym ? l.reduce((a, s) => a + sessionVolume(s), 0) / 1000 : l.reduce((a, r) => a + r.runM, 0) / 1000);
    const months = Array.from({ length: 12 }, (_, m) => cur.filter((x) => parseKey(x.date).getMonth() === m).length);
    const maxM = Math.max(1, ...months);
    const bestMonth = months.indexOf(Math.max(...months));
    const awardedYear = Object.entries(f.awarded).filter(([k, d]) => k.startsWith(sport + '.') && !k.includes('.reto.') && d.startsWith(st.year + '-')).length;
    const records = cur.reduce((a, x) => a + (x.prs ? x.prs.length : 0), 0);
    const diff = (a, b, dec = 0, u = '') => (b ? `${a >= b ? '+' : '−'}${Math.abs(Math.round((a - b) * 10 ** dec) / 10 ** dec).toLocaleString('es-ES')}${u} que en ${st.year - 1}` : 'sin datos del año anterior');
    const totals = gym
      ? [['Entrenos', cur.length], ['Volumen', fmt(main(cur)) + ' t'], ['Series', cur.reduce((a, s) => a + sessionSets(s), 0)], ['Horas', fmt(Math.round(cur.reduce((a, s) => a + (s.minutes || 0), 0) / 6) / 10)]]
      : [['Salidas', cur.length], ['Corrido', fmt(main(cur)) + ' km'], ['Tiempo', durText(cur.reduce((a, r) => a + r.runSec, 0))], ['Ritmo', cur.length ? paceText(Math.round(cur.reduce((a, r) => a + r.paceRun, 0) / cur.length)) : '—']];
    const best = gym
      ? (cur.length ? `Sesión más grande: ${fmt(Math.max(...cur.map(sessionVolume)) / 1000)} t` : '')
      : (cur.length ? `Tramo seguido más largo: ${(Math.max(...cur.map((r) => r.longestM)) / 1000).toFixed(2).replace('.', ',')} km` : '');
    const g = f.settings.guinos ? `<div class="f-guino">${GUINOS[sport][st.year % 2]}</div>` : '';
    el.innerHTML = `<div class="f-screen">${backHeader(gym ? 'Tu año de gimnasio' : 'Tu año de running', base + '/estadisticas')}<main class="f-main">
      <div class="f-chips yr">${years.map((y) => `<button type="button" data-y="${y}" aria-pressed="${st.year === y}">${y}</button>`).join('')}</div>
      <section class="f-card level"><div class="f-sub">Nivel</div><div class="f-big">${esc(lv0.name)} → ${esc(lv1.name)}</div><div class="f-mini">${Math.round(lv1.xp - lv0.xp)} XP ganados en ${st.year}</div></section>
      <div class="f-grid2 four">${totals.map(([l, v]) => `<section class="f-card plain"><div class="f-sub">${l}</div><div class="f-num sm">${v}</div></section>`).join('')}</div>
      <section class="f-card plain"><strong>${gym ? 'Entrenos' : 'Salidas'} por mes</strong><div class="f-bars">${months.map((v, m) => `<div class="f-bcol"><i style="height:${Math.round((v / maxM) * 100)}%"></i><span>${MONTH_NAMES[m][0]}</span></div>`).join('')}</div></section>
      <section class="f-card plain"><strong>Lo mejor del año</strong>
        <div class="f-mini">${cur.length ? 'Mejor mes: ' + MONTH_NAMES[bestMonth] + ' (' + months[bestMonth] + ')' : 'Aún no hay datos de este año.'}</div>
        <div class="f-mini">${best}</div><div class="f-mini">Récords: ${records} · Mejor racha: ${streakStats(f, sport).best} semanas · Medallas ganadas: ${awardedYear}</div></section>
      <section class="f-card plain"><strong>Frente al año pasado</strong><div class="f-mini">${gym ? 'Entrenos' : 'Salidas'}: ${diff(cur.length, prev.length)}</div><div class="f-mini">${gym ? 'Volumen' : 'Kilómetros'}: ${diff(main(cur), main(prev), 1, gym ? ' t' : ' km')}</div></section>
      ${g}
      <div class="f-mini center">Guardar como imagen llegará más adelante. Mientras tanto puedes hacer una captura de pantalla.</div>
    </main>${sportNav(sport, 'estadisticas')}</div>`;
    bindGo(el);
    el.querySelectorAll('[data-y]').forEach((b) => (b.onclick = () => { st.year = +b.dataset.y; draw(); }));
    const c = el.querySelector('#f-center');
    if (c) c.onclick = () => { location.hash = '#' + (gym ? '/fit/gym/empezar' : '/fit/running/importar'); };
  };
  draw();
};
