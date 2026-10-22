// Comparar dos calendarios en un mismo mes: dónde coincidís (libres, mismo turno, uno libre, tiempo juntos).

import { navigate, back, refresh } from '../../core/router.js';
import { readableOn } from '../../core/palette.js';
import { esc } from '../../core/ui.js';
import { getData, activeCal } from './data.js';
import { state, shiftMonth } from './state.js';
import { MONTHS, WEEKDAYS, INK, dateKey, daysInMonth, firstOffset, weekdayLetters, weekdayOf, todayKey, shiftMap, compareShifts, COMPARE_KINDS as K, fmtMin, fmtTime } from './calc.js';
import { softColor } from './month.js';
import { roundBtn, navHtml, bindGo } from './shell.js';

const shiftLine = (s) => (s.kind === 'work' ? `${s.name} · ${fmtTime(s.start)}–${fmtTime(s.end)}` : s.name);

export function renderCompare(el) {
  const d = getData();
  const head = (inner) => `<header class="cal-head">${roundBtn('go-back', 'back', 'Volver al mes')}<div class="grow"><div class="cal-sub">Calendario de trabajo</div><div class="cal-title">Comparar</div></div>${inner}</header>`;
  if (d.calendars.length < 2) {
    el.innerHTML = `<div class="cal">${head('')}<main class="cal-main"><section class="cal-section"><h3>Necesitas dos calendarios</h3>
      <div class="cal-note">Crea el calendario de la otra persona como un calendario más y pinta sus turnos. Luego podrás compararlo con el tuyo aquí.</div>
      <button type="button" class="cal-btn" id="newcal">Crear otro calendario</button></section></main><div class="cal-spacer"></div>${navHtml('mes')}</div>`;
    bindGo(el);
    el.querySelector('#go-back').addEventListener('click', () => back('/calendario'));
    el.querySelector('#newcal').addEventListener('click', () => navigate('/calendario/nuevo'));
    return;
  }
  const ids = d.calendars.map((c) => c.id);
  if (!ids.includes(state.cmpA)) state.cmpA = activeCal(d).id;
  if (!ids.includes(state.cmpB) || state.cmpB === state.cmpA) state.cmpB = ids.find((x) => x !== state.cmpA);
  const A = d.calendars.find((c) => c.id === state.cmpA), B = d.calendars.find((c) => c.id === state.cmpB);
  const mapA = shiftMap(A), mapB = shiftMap(B);
  const { y, m } = state;
  const dim = daysInMonth(y, m);
  const days = [];
  for (let n = 1; n <= dim; n++) {
    const key = dateKey(y, m, n);
    const da = A.days[key], db = B.days[key];
    const a = da && da.shift ? mapA.get(da.shift) : null, b = db && db.shift ? mapB.get(db.shift) : null;
    days.push({ n, key, a, b, ...compareShifts(a, b) });
  }
  const counts = { free: 0, same: 0, one: 0, time: 0 };
  let sharedMin = 0;
  days.forEach((x) => { if (x.kind) counts[x.kind]++; if (x.kind === 'time') sharedMin += x.win.to - x.win.from; });
  const filter = state.cmpFilter;
  const today = todayKey();
  const off = firstOffset(y, m, d.firstDay);
  const cellRow = (s, cls) => {
    if (!s) return `<span class="cmp-row ${cls}"></span>`;
    const bg = softColor(s.color);
    return `<span class="cmp-row ${cls}" style="background:${bg};color:${readableOn(bg, INK)}">${esc(s.letter)}</span>`;
  };
  let cells = '';
  for (let i = 0; i < off; i++) cells += '<span class="cmp-cell blank"></span>';
  days.forEach((x) => {
    const dim2 = filter !== 'all' && x.kind !== filter;
    cells += `<button type="button" class="cmp-cell ${x.kind || ''} ${dim2 ? 'dim' : ''} ${x.key === today ? 'today' : ''} ${state.cmpDay === x.n ? 'sel' : ''}" data-day="${x.n}" aria-label="${WEEKDAYS[weekdayOf(x.key)]} ${x.n}: ${esc(A.name)} ${x.a ? esc(x.a.name) : 'sin turno'}, ${esc(B.name)} ${x.b ? esc(x.b.name) : 'sin turno'}${x.kind ? ', ' + K[x.kind].label : ''}">
      <span class="dn">${x.n}</span>${cellRow(x.a, 'mine')}${cellRow(x.b, 'hers')}</button>`;
  });

  const sel = days.find((x) => x.n === state.cmpDay) || days.find((x) => x.kind === 'free') || days[0];
  const detailShift = (c, s) => `<div class="cmp-sh"><span class="sw" style="background:${s ? softColor(s.color) : 'var(--track)'};color:${s ? readableOn(softColor(s.color), INK) : 'var(--muted)'}">${s ? esc(s.letter) : '–'}</span>
      <span class="tx"><span>${esc(c.name)}</span><b>${s ? esc(shiftLine(s)) : 'Sin rellenar'}</b></span></div>`;
  let msg = 'Este día no coincidís en nada.';
  if (!sel.a || !sel.b) msg = 'Falta rellenar el día en alguno de los dos calendarios.';
  else if (sel.kind === 'free') msg = 'Los dos libres. Día entero para vosotros.';
  else if (sel.kind === 'same') msg = 'Mismo turno: entráis y salís a la vez.';
  else if (sel.kind === 'one') msg = `${sel.a.kind === 'off' ? esc(A.name) : esc(B.name)} libre y el otro trabaja.`;
  else if (sel.kind === 'time') msg = `Libres a la vez de ${fmtMin(sel.win.from)} a ${fmtMin(sel.win.to)} (${String(Math.round(((sel.win.to - sel.win.from) / 60) * 10) / 10).replace('.', ',')} h).`;
  const detail = `<section class="cal-section"><div class="rowh"><h3 style="font-size:17px">${WEEKDAYS[weekdayOf(sel.key)]} ${sel.n}</h3>${sel.kind ? `<span class="cmp-tag" style="background:${K[sel.kind].color}">${K[sel.kind].label}</span>` : ''}</div>
    <div class="cmp-two">${detailShift(A, sel.a)}${detailShift(B, sel.b)}</div><div class="cal-note small" style="font-size:13px">${msg}</div></section>`;

  const best = days.filter((x) => x.kind === 'free' || x.kind === 'time')
    .sort((p, q) => { const sc = (x) => (x.kind === 'free' ? 10000 : x.win.to - x.win.from); return sc(q) - sc(p) || p.n - q.n; }).slice(0, 6).sort((p, q) => p.n - q.n);
  const bestHtml = best.length ? best.map((x) => `<button type="button" class="cmp-best" data-day="${x.n}"><span class="d"><b>${x.n}</b><span>${WEEKDAYS[weekdayOf(x.key)].slice(0, 3)}</span></span>
      <span class="t"><b>${x.kind === 'free' ? 'Los dos libres' : 'Tiempo juntos'}</b><span>${x.kind === 'free' ? '' : `${fmtMin(x.win.from)}–${fmtMin(x.win.to)} · `}${esc(x.a.name)} / ${esc(x.b.name)}</span></span><i style="background:${K[x.kind].color}"></i></button>`).join('')
    : '<div class="cal-note small">Este mes no hay coincidencias. Si faltan días por rellenar, no cuentan.</div>';
  const opt = (c, other) => `<option value="${c.id}" ${c.id === (other) ? 'selected' : ''} >${esc(c.name)}</option>`;
  el.innerHTML = `
    <div class="cal">
      ${head(`${roundBtn('prev', 'back', 'Mes anterior')}${roundBtn('next', 'next', 'Mes siguiente')}`)}
      <main class="cal-main">
        <div class="cmp-who">
          <label class="cmp-sel"><span>Arriba</span><select id="selA" aria-label="Calendario de arriba">${d.calendars.map((c) => opt(c, A.id)).join('')}</select></label>
          <label class="cmp-sel"><span>Abajo</span><select id="selB" aria-label="Calendario de abajo">${d.calendars.map((c) => opt(c, B.id)).join('')}</select></label>
        </div>
        <div class="cal-sub" style="padding-left:2px">${MONTHS[m]} ${y}</div>
        <div class="cmp-chips" role="group" aria-label="Qué coincidencias ver"><button type="button" class="cmp-chip" data-f="all" aria-pressed="${filter === 'all'}">Todo</button>${Object.entries(K).map(([k, v]) => `<button type="button" class="cmp-chip" data-f="${k}" aria-pressed="${filter === k}"><i style="background:${v.color}"></i>${v.label} <span class="n">${counts[k]}</span></button>`).join('')}</div>
        <div class="cal-week" style="padding:0">${weekdayLetters(d.firstDay).map((l) => `<span>${l}</span>`).join('')}</div>
        <div class="cmp-grid">${cells}</div>
        <div class="cal-note small">En cada casilla, arriba «${esc(A.name)}» y abajo «${esc(B.name)}». El borde de color marca cómo coincidís.</div>
        ${detail}
        <div class="cmp-sum">
          <div><b>${counts.free}</b><span><i style="background:${K.free.color}"></i>días libres juntos</span></div>
          <div><b>${String(Math.round(sharedMin / 6) / 10).replace('.', ',')} h</b><span><i style="background:${K.time.color}"></i>libres juntos en días de trabajo</span></div>
          <div><b>${counts.same}</b><span><i style="background:${K.same.color}"></i>días con el mismo turno</span></div>
          <div><b>${counts.one}</b><span><i style="background:${K.one.color}"></i>días con uno libre</span></div>
        </div>
        <section class="cal-section"><h3>Mejores días del mes</h3><div>${bestHtml}</div></section>
        <div class="cal-note small" style="padding:0 4px">Cuenta como tiempo libre juntos el rato entre las 8:00 y las 23:00 sin trabajar ninguno, de 2 horas o más. Los turnos de noche y los salientes cuentan como descanso. Los días sin rellenar no se comparan.</div>
      </main>
      <div class="cal-spacer"></div>
      ${navHtml('mes')}
    </div>`;
  bindGo(el);
  el.querySelector('#go-back').addEventListener('click', () => back('/calendario'));
  el.querySelector('#prev').addEventListener('click', () => { shiftMonth(-1); state.cmpDay = null; refresh(); });
  el.querySelector('#next').addEventListener('click', () => { shiftMonth(1); state.cmpDay = null; refresh(); });
  el.querySelector('#selA').addEventListener('change', (e) => { state.cmpA = e.target.value; refresh(); });
  el.querySelector('#selB').addEventListener('change', (e) => { state.cmpB = e.target.value; refresh(); });
  el.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { state.cmpFilter = b.dataset.f; refresh(); }));
  el.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', () => { state.cmpDay = Number(b.dataset.day); refresh(); }));
}
