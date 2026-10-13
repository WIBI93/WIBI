// Rellenar el mes con pincel: eliges un turno y tocas (o arrastras por) los días.

import { navigate, back } from '../../core/router.js';
import { readableOn } from '../../core/palette.js';
import { esc } from '../../core/ui.js';
import { getData, saveData, activeCal, setShiftOnDay } from './data.js';
import { state } from './state.js';
import { MONTHS, INK, dateKey, daysInMonth, firstOffset, weekdayLetters, monthStats, shiftMap, fmtHours } from './calc.js';
import { ico } from './shell.js';
import { cellParts } from './month.js';

export function renderBrush(el) {
  const d = getData();
  const cal = activeCal(d);
  const { y, m } = state;
  const map = shiftMap(cal);
  if (state.brush !== '' && !map.has(state.brush)) state.brush = cal.shifts.length ? cal.shifts[0].id : '';

  const cellAttrs = (key) => {
    const p = cellParts(cal, d.holidays, key, map, { notes: false });
    return { p, cls: `cal-cell ${p.painted ? 'painted' : ''}` };
  };
  let cells = '';
  for (let i = 0; i < firstOffset(y, m, d.firstDay); i++) cells += '<span class="cal-cell blank"></span>';
  for (let n = 1; n <= daysInMonth(y, m); n++) {
    const key = dateKey(y, m, n);
    const { p, cls } = cellAttrs(key);
    cells += `<div class="${cls}" data-key="${key}" style="${p.style}" aria-label="${esc(p.label)}">${p.html}</div>`;
  }

  const tiles = cal.shifts.map((s) =>
    `<button type="button" class="cal-tile" data-brush="${s.id}" aria-pressed="${state.brush === s.id}"><span class="sw" style="background:${s.color};color:${readableOn(s.color, INK)}">${esc(s.letter)}</span><span class="lab">${esc(s.name)}</span></button>`
  ).join('') +
    `<button type="button" class="cal-tile" data-brush="" aria-pressed="${state.brush === ''}"><span class="sw erase">${ico('x', 20)}</span><span class="lab">Borrar</span></button>`;

  el.innerHTML = `
    <div class="cal">
      <header class="cal-head">
        <button type="button" class="cal-round" id="go-back" aria-label="Volver al mes">${ico('back')}</button>
        <div class="grow"><div class="cal-sub">Rellenar con pincel</div><div class="cal-title">${MONTHS[m]} ${y}</div></div>
        <button type="button" class="cal-btn done" id="done">Listo</button>
      </header>
      <main class="cal-main flush">
        <div class="cal-count" id="count"></div>
        <div class="cal-week wide">${weekdayLetters(d.firstDay).map((l) => `<span>${l}</span>`).join('')}</div>
        <div class="cal-grid brush" id="grid">${cells}</div>
        <div class="cal-note" style="padding:0 16px">${cal.shifts.length ? 'Elige un turno abajo y toca los días que lo llevan, o arrastra el dedo por varios. Todos los días se pintan: trabajado, saliente o libre.' : 'Todavía no hay turnos en este calendario. Créalos en la pestaña Turnos.'}</div>
      </main>
      <section class="cal-panel" aria-label="Turno que vas a pintar">
        <h3>Turno que pintas</h3>
        <div class="cal-tiles c7">${tiles}</div>
      </section>
    </div>`;

  const grid = el.querySelector('#grid');
  const count = el.querySelector('#count');
  const updateCount = () => {
    const st = monthStats(cal, d.holidays, y, m);
    count.innerHTML = `<b>${st.worked} días · ${fmtHours(st.hours)}</b><span style="font-weight:600;color:var(--muted)">${st.unpainted} días sin rellenar</span>`;
  };
  updateCount();

  el.querySelector('#go-back').addEventListener('click', () => back('/calendario'));
  el.querySelector('#done').addEventListener('click', () => back('/calendario'));
  el.querySelectorAll('[data-brush]').forEach((b) => b.addEventListener('click', () => {
    state.brush = b.dataset.brush;
    el.querySelectorAll('[data-brush]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));

  let painting = false, last = null, dirty = false;
  const paint = (cell) => {
    const key = cell.dataset.key;
    if (!key || key === last) return;
    last = key;
    setShiftOnDay(cal, key, state.brush);
    const { p, cls } = cellAttrs(key);
    cell.className = cls;
    cell.style.cssText = p.style;
    cell.innerHTML = p.html;
    cell.setAttribute('aria-label', p.label);
    dirty = true;
    updateCount();
  };
  const end = () => {
    if (!painting) return;
    painting = false; last = null;
    if (dirty) { saveData(d); dirty = false; }
  };
  grid.addEventListener('pointerdown', (e) => {
    const c = e.target.closest('[data-key]');
    if (!c) return;
    painting = true; last = null;
    paint(c);
  });
  grid.addEventListener('pointermove', (e) => {
    if (!painting) return;
    const t = document.elementFromPoint(e.clientX, e.clientY);
    const c = t && t.closest && t.closest('[data-key]');
    if (c && grid.contains(c)) paint(c);
  });
  grid.addEventListener('pointerup', end);
  grid.addEventListener('pointercancel', end);
  window.addEventListener('pointerup', end);
}
