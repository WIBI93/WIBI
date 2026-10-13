// Pantalla principal: el mes con sus turnos, notas, festivos y cambios de turno.

import { navigate, back, refresh } from '../../core/router.js';
import { readableOn } from '../../core/palette.js';
import { esc } from '../../core/ui.js';
import { getData, activeCal, update } from './data.js';
import { state, shiftMonth, toToday, isCurrentMonth } from './state.js';
import { MONTHS, WEEKDAYS, INK, dateKey, daysInMonth, firstOffset, weekdayLetters, weekdayOf, todayKey, monthStats, shiftMap, fmtHours } from './calc.js';
import { ico, flagIco, swapIco, roundBtn, navHtml, bindGo } from './shell.js';

// Estilo y contenido de una casilla (lo usa también el pincel).
export function cellParts(cal, holidays, key, shMap, { notes = true } = {}) {
  const day = cal.days[key];
  const sh = day && day.shift ? shMap.get(day.shift) : null;
  const fest = !!holidays[key];
  const swap = !!(day && day.swap);
  const style = sh ? `background:${sh.color};color:${readableOn(sh.color, INK)}` : '';
  const chips = (fest ? `<span class="cal-chip" role="img" aria-label="Festivo">${flagIco()}</span>` : '') +
    (swap && notes ? `<span class="cal-chip" role="img" aria-label="Cambio de turno">${swapIco()}</span>` : '');
  const d = Number(key.slice(8));
  const html = `<span class="top"><span class="dn">${d}</span><span class="code">${sh ? esc(sh.letter) : ''}</span></span>` +
    (chips ? `<span class="chips">${chips}</span>` : '') +
    (notes && day && day.note ? `<span class="txt">${esc(day.note)}</span>` : '');
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

export function renderMonth(el) {
  const d = getData();
  const cal = activeCal(d);
  const { y, m } = state;
  const st = monthStats(cal, d.holidays, y, m);
  const map = shiftMap(cal);
  const today = todayKey();

  let cells = '';
  for (let i = 0; i < firstOffset(y, m, d.firstDay); i++) cells += '<span class="cal-cell blank"></span>';
  for (let n = 1; n <= daysInMonth(y, m); n++) {
    const key = dateKey(y, m, n);
    const p = cellParts(cal, d.holidays, key, map);
    cells += `<button type="button" class="cal-cell ${p.painted ? 'painted' : ''} ${key === today ? 'today' : ''}" data-key="${key}" style="${p.style}" aria-label="${esc(p.label)}">${p.html}</button>`;
  }

  el.innerHTML = `
    <div class="cal">
      <header class="cal-head-col">
        <div class="row">
          ${roundBtn('go-back', 'back', 'Volver al inicio')}
          <button type="button" class="cal-pill" id="pill" aria-label="Cambiar de calendario"><span><i style="background:${cal.color}"></i>${esc(cal.name)}</span>${ico('down', 18, 2.4)}</button>
        </div>
        <div class="row between">
          <div class="cal-title">${MONTHS[m]} ${y}</div>
          <div class="row">
            ${isCurrentMonth() ? '' : '<button type="button" class="cal-today-btn" id="today">Hoy</button>'}
            ${roundBtn('prev', 'back', 'Mes anterior')}${roundBtn('next', 'next', 'Mes siguiente')}
          </div>
        </div>
      </header>
      <main class="cal-main flush">
        <div class="cal-cards">
          <div class="cal-card"><b>${st.worked}</b><span>Días trabajados</span></div>
          <div class="cal-card"><b>${fmtHours(st.hours)}</b><span>Horas del mes</span></div>
          <div class="cal-card"><b>${st.off}</b><span>Días libres</span></div>
        </div>
        <div class="cal-week">${weekdayLetters(d.firstDay).map((l) => `<span>${l}</span>`).join('')}</div>
        <div class="cal-grid">${cells}</div>
        <div class="cal-pad"><button type="button" class="cal-btn slim" id="brush">Rellenar mes con pincel</button></div>
        <div class="cal-spacer"></div>
      </main>
      ${navHtml('mes')}
    </div>`;

  bindGo(el);
  el.querySelector('#go-back').addEventListener('click', () => back('/'));
  el.querySelector('#pill').addEventListener('click', (e) => openSelector(e.currentTarget, d));
  el.querySelector('#prev').addEventListener('click', () => { shiftMonth(-1); refresh(); });
  el.querySelector('#next').addEventListener('click', () => { shiftMonth(1); refresh(); });
  const t = el.querySelector('#today');
  if (t) t.addEventListener('click', () => { toToday(); refresh(); });
  el.querySelector('#brush').addEventListener('click', () => navigate('/calendario/pincel'));
  el.querySelectorAll('[data-key]').forEach((c) => c.addEventListener('click', () => navigate('/calendario/dia/' + c.dataset.key)));
}
