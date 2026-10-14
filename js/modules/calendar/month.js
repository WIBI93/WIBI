// Pantalla principal: el mes con sus turnos, notas, festivos y cambios de turno.

import { navigate, back, refresh } from '../../core/router.js';
import { readableOn } from '../../core/palette.js';
import { esc } from '../../core/ui.js';
import { getData, activeCal, update } from './data.js';
import { state, shiftMonth, toToday, isCurrentMonth } from './state.js';
import { MONTHS, WEEKDAYS, INK, dateKey, daysInMonth, firstOffset, weekdayLetters, weekdayOf, todayKey, monthStats, shiftMap, fmtHours } from './calc.js';
import { ico, flagIco, swapIco, roundBtn, navHtml, bindGo } from './shell.js';

// Color de relleno suavizado (más claro y mate) para la vista del mes y el pincel.
export function softColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (mx + mn) / 2;
  if (mx !== mn) {
    const dd = mx - mn;
    s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
    h = mx === r ? ((g - b) / dd + (g < b ? 6 : 0)) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
    h /= 6;
  }
  s *= 0.89;
  const l2 = l + (1 - l) * 0.15;
  const f = (p0, q0, tt) => { if (tt < 0) tt += 1; if (tt > 1) tt -= 1; return tt < 1 / 6 ? p0 + (q0 - p0) * 6 * tt : tt < 1 / 2 ? q0 : tt < 2 / 3 ? p0 + (q0 - p0) * (2 / 3 - tt) * 6 : p0; };
  const q = l2 < 0.5 ? l2 * (1 + s) : l2 + s - l2 * s, p1 = 2 * l2 - q;
  const to = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  return '#' + to(f(p1, q, h + 1 / 3)) + to(f(p1, q, h)) + to(f(p1, q, h - 1 / 3));
}
function relLum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
// Mezcla un color con blanco (para el fondo de la nota).
const lighten = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * k));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
};

// Estilo y contenido de una casilla (lo usa también el pincel).
export function cellParts(cal, holidays, key, shMap, { notes = true } = {}) {
  const day = cal.days[key];
  const sh = day && day.shift ? shMap.get(day.shift) : null;
  const fest = !!holidays[key];
  const swap = !!(day && day.swap);
  const bg = sh ? softColor(sh.color) : '';
  // Letra fina: gris oscuro sobre colores claros y blanco sobre los medios u oscuros.
  const ink = sh ? (relLum(bg) > 0.45 ? '#46535F' : '#FFFFFF') : '';
  const style = sh ? `background:${bg};color:${ink}` : '';
  const chips = (fest ? `<span class="cal-chip" role="img" aria-label="Festivo">${flagIco(8)}</span>` : '') +
    (swap && notes ? `<span class="cal-chip" role="img" aria-label="Cambio de turno">${swapIco(8)}</span>` : '');
  const d = Number(key.slice(8));
  let note = '';
  if (notes && day && day.note) {
    const nb = sh ? lighten(bg, 0.45) : '';
    note = `<span class="txt" style="${nb ? `background:${nb};color:${readableOn(nb, INK)}` : ''}">${esc(day.note)}</span>`;
  }
  const html = `<span class="tp"><span class="dn">${d}</span>${chips ? `<span class="chips">${chips}</span>` : ''}<span class="code">${sh ? esc(sh.letter) : ''}</span></span>` + note;
  const label = `${WEEKDAYS[weekdayOf(key)]} ${d}: ${sh ? sh.name : 'sin turno'}${fest ? ', festivo' : ''}${swap ? ', cambio de turno' : ''}`;
  return { style, html, painted: !!sh, label };
}

function openSelector(pill, d) {
  const root = document.getElementById('overlay-root');
  const back = document.createElement('div');
  back.className = 'cal-sel-back';
  const rect = pill.getBoundingClientRect();
  const items = d.calendars.map((c) =>
    `<button type="button" data-id="${c.id}" class="${c.id === d.activeId ? 'on' : ''}"><span class="nm"><i style="background:${c.color}"></i>${esc(c.name)}</span>${c.id === d.activeId ? ico('check', 22, 3) : ''}</button>`
  ).join('');
  back.innerHTML = `<nav class="cal-sel" style="top:${Math.round(rect.bottom + 4)}px" aria-label="Calendarios">${items}<button type="button" class="add" data-add>${ico('plus', 20, 2.6)}Añadir calendario</button></nav>`;
  const close = () => { document.removeEventListener('keydown', onKey); back.remove(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  back.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return close();
    if (btn.dataset.add !== undefined) { close(); navigate('/calendario/nuevo'); return; }
    update((data) => { data.activeId = btn.dataset.id; });
    close();
    refresh();
  });
  document.addEventListener('keydown', onKey);
  root.appendChild(back);
}

// Dirección del último cambio de mes, para animar la cuadrícula que entra (-1, 0 o 1).
let pendingDir = null;
let moving = false;

export function renderMonth(el) {
  const d = getData();
  const cal = activeCal(d);
  const { y, m } = state;
  const st = monthStats(cal, d.holidays, y, m);
  const map = shiftMap(cal);
  const today = todayKey();

  let cells = '';
  const off = firstOffset(y, m, d.firstDay), dim = daysInMonth(y, m);
  const prevDim = daysInMonth(m === 0 ? y - 1 : y, (m + 11) % 12);
  for (let i = 0; i < off; i++) cells += `<span class="cal-cell blank"><span class="tp"><span class="dn">${prevDim - off + 1 + i}</span></span></span>`;
  for (let n = 1; n <= dim; n++) {
    const key = dateKey(y, m, n);
    const p = cellParts(cal, d.holidays, key, map);
    // Línea fina que enmarca el mes: solo en los lados que dan al exterior.
    const idx = off + n - 1, col = idx % 7;
    const inM = (j) => j >= off && j < off + dim;
    const edges = [];
    if (!inM(idx - 7)) edges.push('inset 0 2px 0 0 var(--frame)');
    if (!inM(idx + 7)) edges.push('inset 0 -2px 0 0 var(--frame)');
    if (col === 0 || !inM(idx - 1)) edges.push('inset 2px 0 0 0 var(--frame)');
    if (col === 6 || !inM(idx + 1)) edges.push('inset -2px 0 0 0 var(--frame)');
    const sh = edges.length ? `box-shadow:${edges.join(',')};` : '';
    cells += `<button type="button" class="cal-cell ${p.painted ? 'painted' : ''} ${key === today ? 'today' : ''}" data-key="${key}" style="${sh}${p.style}" aria-label="${esc(p.label)}">${p.html}</button>`;
  }
  const tail = (7 - ((off + dim) % 7)) % 7;
  for (let i = 1; i <= tail; i++) cells += `<span class="cal-cell blank"><span class="tp"><span class="dn">${i}</span></span></span>`;

  el.innerHTML = `
    <div class="cal">
      <header class="cal-head-col">
        <div class="row">
          ${roundBtn('go-back', 'back', 'Volver al inicio')}
          <button type="button" class="cal-pill" id="pill" aria-label="Cambiar de calendario"><span><i style="background:${cal.color}"></i>${esc(cal.name)}</span>${ico('down', 18, 2.4)}</button>
          ${isCurrentMonth() ? '' : '<button type="button" class="cal-today-btn" id="today">Hoy</button>'}
        </div>
        <div class="row month-row">
          <div class="cal-title">${MONTHS[m]} ${y}</div>
          <button type="button" class="cal-today-btn" id="edit">Editar</button>
          ${roundBtn('prev', 'back', 'Mes anterior')}${roundBtn('next', 'next', 'Mes siguiente')}
        </div>
      </header>
      <main class="cal-main flush">
        <div class="cal-cards">
          <div class="cal-card"><b>${st.worked}</b><span>Trabajados</span></div>
          <div class="cal-card"><b>${fmtHours(st.hours)}</b><span>Horas</span></div>
          <div class="cal-card"><b>${st.off}</b><span>Libres</span></div>
        </div>
        <div class="cal-week month">${weekdayLetters(d.firstDay).map((l) => `<span>${l}</span>`).join('')}</div>
        <div class="cal-grid month">${cells}</div>
        <div class="cal-spacer"></div>
      </main>
      ${navHtml('mes')}
    </div>`;

  bindGo(el);
  el.querySelector('#go-back').addEventListener('click', () => back('/'));
  el.querySelector('#pill').addEventListener('click', (e) => openSelector(e.currentTarget, d));
  // Cambio de mes con una pequeña animación: sale la cuadrícula, entra la nueva.
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const move = (dir) => {
    if (moving) return;
    const apply = () => { shiftMonth(dir); pendingDir = dir; moving = false; refresh(); };
    moving = true;
    if (reduce) { apply(); return; }
    el.querySelectorAll('.cal-grid.month, .month-row .cal-title').forEach((n) => n.classList.add(dir > 0 ? 'out-l' : 'out-r'));
    setTimeout(apply, 110);
  };
  el.querySelector('#prev').addEventListener('click', () => move(-1));
  el.querySelector('#next').addEventListener('click', () => move(1));
  if (pendingDir !== null && !reduce) {
    const cls = pendingDir > 0 ? 'in-r' : pendingDir < 0 ? 'in-l' : 'in-f';
    el.querySelectorAll('.cal-grid.month, .month-row .cal-title').forEach((n) => n.classList.add(cls));
  }
  pendingDir = null;
  // Deslizar el dedo a izquierda o derecha cambia de mes.
  const main = el.querySelector('.cal-main');
  let sx = 0, sy = 0, tracking = false;
  main.addEventListener('touchstart', (e) => { const t0 = e.touches[0]; sx = t0.clientX; sy = t0.clientY; tracking = e.touches.length === 1; }, { passive: true });
  main.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    const t1 = e.changedTouches[0], dx = t1.clientX - sx, dy = t1.clientY - sy;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    move(dx < 0 ? 1 : -1);
  }, { passive: true });
  const t = el.querySelector('#today');
  if (t) t.addEventListener('click', () => { toToday(); pendingDir = 0; refresh(); });
  el.querySelector('#edit').addEventListener('click', () => navigate('/calendario/pincel'));
  el.querySelectorAll('[data-key]').forEach((c) => c.addEventListener('click', () => navigate('/calendario/dia/' + c.dataset.key)));
}
