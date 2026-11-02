// Pantalla principal: el mes con sus turnos, notas, festivos y cambios de turno.

import { navigate, back, refresh } from '../../core/router.js';
import { readableOn } from '../../core/palette.js';
import { esc } from '../../core/ui.js';
import { getData, activeCal, update } from './data.js';
import { state, shiftMonth, toToday, isCurrentMonth } from './state.js';
import { MONTHS, WEEKDAYS, INK, dateKey, daysInMonth, firstOffset, weekdayLetters, weekdayOf, todayKey, monthStats, shiftMap, fmtHours, stressStats, stressColor, fmtAvg } from './calc.js';
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

// Un mes entero (cuadrícula y barra de burnout), para poder dibujar también el anterior y el siguiente.
function monthPanel(cal, d, map, today, y, m) {
  const ss = stressStats(cal, y, m);
  const stressBar = ss.count ? `<div class="cal-stressbar" role="img" aria-label="Burnout medio del mes: ${fmtAvg(ss.avg)}"><span class="l">Burnout</span><span class="tr"><i class="fl" style="width:${ss.avg * 10}%;background:${stressColor(ss.avg)}"></i><i class="tk" style="left:50%"></i><i class="tk" style="left:70%"></i><i class="tk" style="left:80%"></i></span><b style="color:${stressColor(ss.avg)}">${fmtAvg(ss.avg)}</b></div>` : '';
  const ghost = (key, n) => {
    const p = cellParts(cal, d.holidays, key, map, { notes: false });
    return `<span class="cal-cell blank ${p.painted ? 'ghost' : ''}" style="${p.painted ? p.style : ''}"><span class="tp"><span class="dn">${n}</span><span class="code">${p.painted ? p.html.match(/<span class="code">(.*?)<\/span>/)[1] : ''}</span></span></span>`;
  };
  let cells = '';
  const off = firstOffset(y, m, d.firstDay), dim = daysInMonth(y, m);
  const pm = m === 0 ? 11 : m - 1, py = m === 0 ? y - 1 : y;
  const nm = m === 11 ? 0 : m + 1, ny = m === 11 ? y + 1 : y;
  const prevDim = daysInMonth(py, pm);
  for (let i = 0; i < off; i++) { const n = prevDim - off + 1 + i; cells += ghost(dateKey(py, pm, n), n); }
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
  for (let i = 1; i <= tail; i++) cells += ghost(dateKey(ny, nm, i), i);
  return `<div class="pg-panel"><div class="cal-grid month">${cells}</div>${stressBar}</div>`;
}

export function renderMonth(el) {
  const d = getData();
  const cal = activeCal(d);
  const { y, m } = state;
  const st = monthStats(cal, d.holidays, y, m);
  const map = shiftMap(cal);
  const today = todayKey();
  el.innerHTML = `
    <div class="cal">
      <header class="cal-head-col">
        <div class="row">
          ${roundBtn('go-back', 'back', 'Volver al inicio')}
          <button type="button" class="cal-pill" id="pill" aria-label="Cambiar de calendario"><span><i style="background:${cal.color}"></i>${esc(cal.name)}</span>${ico('down', 18, 2.4)}</button>
          ${roundBtn('compare', 'comparar', 'Comparar con otro calendario')}
          ${isCurrentMonth() ? '' : '<button type="button" class="cal-today-btn" id="today">Hoy</button>'}
        </div>
        <div class="row month-row">
          <div class="cal-title ttl"><div class="tt-track">${[-1, 0, 1].map((k) => { const t = new Date(y, m + k, 1); return `<span><b class="mn">${MONTHS[t.getMonth()]}</b><small class="yr">${t.getFullYear()}</small></span>`; }).join('')}</div></div>
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
        <div class="cal-pager"><div class="pg-track">${[-1, 0, 1].map((k) => { const t = new Date(y, m + k, 1); return monthPanel(cal, d, map, today, t.getFullYear(), t.getMonth()); }).join('')}</div></div>
        <div class="cal-spacer"></div>
      </main>
      ${navHtml('mes')}
    </div>`;

  bindGo(el);
  el.querySelector('#go-back').addEventListener('click', () => back('/'));
  el.querySelector('#pill').addEventListener('click', (e) => openSelector(e.currentTarget, d));
  // Cambio de mes: la cuadrícula y el título siguen al dedo y se ve entrar el mes de al lado.
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pager = el.querySelector('.cal-pager'), track = el.querySelector('.pg-track');
  const ttl = el.querySelector('.tt-track');
  const panels = [...track.children];
  const hts = panels.map((n) => n.offsetHeight);
  // frac: -1 (mes anterior a la vista) .. 0 .. 1 (mes siguiente a la vista)
  const place = (frac, anim) => {
    const tr = anim ? 'transform .22s cubic-bezier(.2,.7,.2,1)' : 'none';
    const x = (-1 / 3 - frac / 3) * 100;
    track.style.transition = tr; ttl.style.transition = tr;
    track.style.transform = `translateX(${x}%)`; ttl.style.transform = `translateX(${x}%)`;
    const to = frac < 0 ? hts[0] : hts[2];
    pager.style.height = Math.round(hts[1] + (to - hts[1]) * Math.min(1, Math.abs(frac))) + 'px';
    pager.style.transition = anim ? 'height .22s ease' : 'none';
  };
  place(0, false);
  const finish = (dir) => {
    shiftMonth(dir); pendingDir = null; moving = false; refresh();
  };
  const settle = (dir) => {
    // dir: -1, 0 (volver) o 1
    if (reduce) { if (dir) finish(dir); else place(0, false); moving = false; return; }
    place(dir, true);
    if (dir) setTimeout(() => finish(dir), 230); else setTimeout(() => { moving = false; }, 230);
  };
  const move = (dir) => { if (moving) return; moving = true; settle(dir); };
  el.querySelector('#prev').addEventListener('click', () => move(-1));
  el.querySelector('#next').addEventListener('click', () => move(1));
  if (pendingDir !== null && !reduce) {
    const cls = 'in-f';
    if (pendingDir === 0) el.querySelectorAll('.pg-panel:nth-child(2), .tt-track span:nth-child(2)').forEach((n) => n.classList.add(cls));
  }
  pendingDir = null;
  // Arrastrar con el dedo a izquierda o derecha.
  const main = el.querySelector('.cal-main');
  let sx = 0, sy = 0, st0 = 0, mode = '', lastX = 0, lastT = 0, vel = 0;
  const width = () => pager.clientWidth || 360;
  main.addEventListener('touchstart', (e) => {
    if (moving || e.touches.length !== 1) { mode = 'no'; return; }
    const t0 = e.touches[0]; sx = lastX = t0.clientX; sy = t0.clientY; st0 = lastT = Date.now(); mode = ''; vel = 0;
  }, { passive: true });
  main.addEventListener('touchmove', (e) => {
    if (mode === 'no' || mode === 'v') return;
    const t1 = e.touches[0], dx = t1.clientX - sx, dy = t1.clientY - sy;
    if (!mode) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      mode = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'h' : 'v';
      if (mode === 'v') return;
    }
    const now2 = Date.now();
    vel = (t1.clientX - lastX) / Math.max(1, now2 - lastT); lastX = t1.clientX; lastT = now2;
    // Un poco de resistencia si se arrastra más allá de un mes.
    const f = Math.max(-1, Math.min(1, -dx / width()));
    place(f, false);
  }, { passive: true });
  const end = (e) => {
    if (mode !== 'h') { mode = ''; return; }
    mode = '';
    const t1 = e.changedTouches[0], dx = t1.clientX - sx;
    const frac = -dx / width();
    moving = true;
    if (Math.abs(frac) > 0.28 || Math.abs(vel) > 0.5) settle(frac > 0 ? 1 : -1); else settle(0);
  };
  main.addEventListener('touchend', end, { passive: true });
  main.addEventListener('touchcancel', () => { if (mode === 'h') { mode = ''; moving = true; settle(0); } }, { passive: true });
  const t = el.querySelector('#today');
  if (t) t.addEventListener('click', () => { toToday(); pendingDir = 0; refresh(); });
  el.querySelector('#compare').addEventListener('click', () => navigate('/calendario/comparar'));
  el.querySelector('#edit').addEventListener('click', () => navigate('/calendario/pincel'));
  el.querySelectorAll('[data-key]').forEach((c) => c.addEventListener('click', () => navigate('/calendario/dia/' + c.dataset.key)));
}
