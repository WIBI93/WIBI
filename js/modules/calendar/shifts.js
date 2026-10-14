// Pestaña Turnos: lista de tipos de turno, y pantalla para crear/editar uno.

import { navigate, back, go } from '../../core/router.js';
import { readableOn } from '../../core/palette.js';
import { esc, confirmDialog, toast } from '../../core/ui.js';
import { getData, activeCal, update, uid, countDaysWith, removeShift, MY_COLORS, SHIFT_COLORS } from './data.js';
import { INK, shiftDescription, shiftHours, fmtHours, endsNextDay } from './calc.js';
import { ico, navHtml, bindGo } from './shell.js';

export function tabsHtml(active) {
  return `<div class="cal-tabs" role="tablist"><button type="button" role="tab" data-go="/calendario/turnos" aria-selected="${active === 't'}">Turnos</button><button type="button" role="tab" data-go="/calendario/turnos/zonas" aria-selected="${active === 'z'}">Zonas</button></div>`;
}

export function renderShifts(el) {
  const cal = activeCal(getData());
  const rows = cal.shifts.map((s) =>
    `<button type="button" class="cal-row" data-id="${s.id}"><span class="sw" style="background:${s.color};color:${readableOn(s.color, INK)}">${esc(s.letter)}</span>
      <span class="tx"><b>${esc(s.name)}</b><span>${shiftDescription(s)}</span></span><span class="chev">${ico('next', 20)}</span></button>`
  ).join('');
  el.innerHTML = `
    <div class="cal">
      <header class="cal-head"><div class="grow" style="padding-left:4px"><div class="cal-sub">${esc(cal.name)}</div><div class="cal-title">Tipos de turno y zonas</div></div></header>
      <main class="cal-main tight">
        ${tabsHtml('t')}
        <div class="cal-list">${rows}</div>
        <button type="button" class="cal-btn dashed" id="new" style="height:56px;border-radius:16px">${ico('plus', 20, 2.4)}Nuevo tipo de turno</button>
        <div class="cal-note" style="padding:4px 4px 0">Las horas de cada turno se usan para contar. Si cambias las horas de un turno, se recalculan los meses donde lo usas. Todos los días del mes llevan un turno, también los libres y los salientes.</div>
      </main>
      <div class="cal-spacer"></div>
      ${navHtml('turnos')}
    </div>`;
  bindGo(el);
  el.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => navigate('/calendario/turno/' + b.dataset.id)));
  el.querySelector('#new').addEventListener('click', () => navigate('/calendario/turno/nuevo'));
}

const KIND_LABELS = { work: 'Trabajo', off: 'Libre', out: 'Saliente' };

export function renderShiftEdit(el, { id }) {
  const cal = activeCal(getData());
  const isNew = id === 'nuevo';
  const found = cal.shifts.find((s) => s.id === id);
  if (!isNew && !found) { back('/calendario/turnos'); return; }
  const draft = found ? { ...found } : { name: '', letter: '', start: '08:00', end: '14:00', color: '#2D7FB8', kind: 'work' };

  const duration = () => {
    if (draft.kind !== 'work') return '0 h';
    return fmtHours(shiftHours(draft)) + (endsNextDay(draft) ? ' · acaba al día siguiente' : '');
  };

  const draw = () => {
    const mine = getData().myColors;
    const btn = (hex, label) => {
      const sel = hex.toUpperCase() === draft.color.toUpperCase();
      return `<button type="button" class="cal-color" data-color="${hex}" aria-label="${label}" aria-pressed="${sel}" style="background:${hex};color:${readableOn(hex, INK)}">${sel ? ico('check', 18, 3) : ''}</button>`;
    };
    const colors = SHIFT_COLORS.map(([name, hex]) => btn(hex, name)).join('');
    const saved = Array.from({ length: MY_COLORS }, (_, i) => (mine[i] ? btn(mine[i], 'Color propio ' + (i + 1)) : '<span class="cal-color empty" aria-hidden="true"></span>')).join('');
    el.innerHTML = `
      <div class="cal">
        <header class="cal-head"><button type="button" class="cal-round" id="go-back" aria-label="Volver a los tipos de turno">${ico('back')}</button>
          <div class="grow"><div class="cal-sub">Tipos de turno</div><div class="cal-title">${isNew ? 'Nuevo turno' : 'Editar turno'}</div></div></header>
        <main class="cal-main" style="padding-top:4px">
          <div class="cal-grid2 wide-left">
            <label class="cal-field"><span>Nombre</span><input class="cal-input" id="name" type="text" maxlength="30" value="${esc(draft.name)}"></label>
            <label class="cal-field"><span>Letra</span><input class="cal-input" id="letter" type="text" maxlength="2" value="${esc(draft.letter)}"></label>
          </div>
          <div class="cal-field"><span>Cuenta como</span>
            <div class="cal-tabs" role="group">${Object.entries(KIND_LABELS).map(([k, l]) => `<button type="button" data-kind="${k}" aria-pressed="${draft.kind === k}">${l}</button>`).join('')}</div></div>
          ${draft.kind === 'work' ? `
          <div class="cal-grid2">
            <label class="cal-field"><span>Hora de inicio</span><input class="cal-input" id="start" type="time" value="${draft.start}"></label>
            <label class="cal-field"><span>Hora de fin</span><input class="cal-input" id="end" type="time" value="${draft.end}"></label>
          </div>` : ''}
          <div class="cal-info"><span>Duración (sale sola)</span><b id="dur">${duration()}</b></div>
          <div class="cal-field"><span>Color</span><div class="cal-colors">${colors}</div></div>
          <div class="cal-field"><span>Mis colores personalizados</span><div class="cal-colors">${saved}</div><span class="cal-note">Los colores que crees abajo se guardan aquí (hasta ${MY_COLORS}; el más antiguo se sustituye).</span></div>
          <label class="cal-colorpick" for="custom">Color personalizado<input id="custom" type="color" value="${draft.color.toLowerCase()}"></label>
        </main>
        <div class="cal-foot"><button type="button" class="cal-btn" id="save">Guardar turno</button>
          ${isNew ? '' : '<button type="button" class="cal-btn plain-danger" id="del">Eliminar turno</button>'}</div>
      </div>`;

    const grab = () => {
      draft.name = el.querySelector('#name').value;
      draft.letter = el.querySelector('#letter').value;
      const s = el.querySelector('#start'), e = el.querySelector('#end');
      if (s && s.value) draft.start = s.value;
      if (e && e.value) draft.end = e.value;
    };
    el.querySelector('#go-back').addEventListener('click', () => back('/calendario/turnos'));
    el.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => { grab(); draft.color = b.dataset.color; draw(); }));
    el.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => { grab(); draft.kind = b.dataset.kind; draw(); }));
    el.querySelector('#custom').addEventListener('change', (e) => { grab(); draft.color = e.target.value.toUpperCase();
      update((d) => { if (!d.myColors.includes(draft.color)) d.myColors = [draft.color, ...d.myColors].slice(0, MY_COLORS); });
      draw(); });
    ['#start', '#end'].forEach((q) => { const i = el.querySelector(q); if (i) i.addEventListener('input', () => { grab(); el.querySelector('#dur').textContent = duration(); }); });

    el.querySelector('#save').addEventListener('click', () => {
      grab();
      const name = draft.name.trim();
      const letter = draft.letter.trim();
      if (!name) return toast('Escribe un nombre para el turno');
      if (!letter) return toast('Escribe una letra para el turno');
      update((data, c) => {
        const next = { ...draft, name, letter, color: draft.color.toUpperCase() };
        if (isNew) c.shifts.push({ ...next, id: uid() });
        else c.shifts = c.shifts.map((s) => (s.id === id ? { ...next, id } : s));
        // Si el turno deja de ser de trabajo, las zonas de esos días ya no valen.
        if (!isNew && next.kind !== 'work') for (const day of Object.values(c.days)) if (day.shift === id) day.zone = null;
      });
      back('/calendario/turnos');
    });
    const del = el.querySelector('#del');
    if (del) del.addEventListener('click', async () => {
      const n = countDaysWith(cal, 'shift', id);
      const ok = await confirmDialog({
        title: 'Eliminar turno',
        text: n ? `Hay ${n} ${n === 1 ? 'día' : 'días'} con este turno en este calendario. Quedarán sin rellenar.` : 'Se eliminará este tipo de turno.',
        confirmLabel: 'Eliminar', danger: true,
      });
      if (!ok) return;
      update((data, c) => removeShift(c, id));
      back('/calendario/turnos');
    });
  };
  draw();
}
