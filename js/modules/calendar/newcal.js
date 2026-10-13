// Crear otro calendario (por ejemplo, el de otra persona).

import { back } from '../../core/router.js';
import { toast } from '../../core/ui.js';
import { getData, activeCal, update, uid, CAL_COLORS } from './data.js';
import { ico } from './shell.js';
import { esc } from '../../core/ui.js';

export function renderNewCalendar(el) {
  const cur = activeCal(getData());
  const draft = { name: '', color: CAL_COLORS[1].hex, copy: true };
  const draw = () => {
    el.innerHTML = `
      <div class="cal">
        <header class="cal-head"><button type="button" class="cal-round" id="go-back" aria-label="Volver">${ico('back')}</button>
          <div class="grow"><div class="cal-sub">Calendarios</div><div class="cal-title">Nuevo calendario</div></div></header>
        <main class="cal-main">
          <label class="cal-field"><span>Nombre</span><input class="cal-input" id="name" type="text" maxlength="40" value="${esc(draft.name)}" placeholder="Ej.: Turnos de mi pareja"></label>
          <div class="cal-field"><span>Color del calendario</span><div class="cal-colors">${CAL_COLORS.map((c) =>
            `<button type="button" class="cal-color big" data-color="${c.hex}" aria-label="${c.name}" aria-pressed="${draft.color === c.hex}" style="background:${c.hex};color:#fff">${draft.color === c.hex ? ico('check', 20, 3) : ''}</button>`).join('')}</div></div>
          <div class="cal-field"><span>Tipos de turno</span>
            <button type="button" class="cal-radio ${draft.copy ? 'on' : ''}" data-copy="1"><i class="dot"></i><span>Empezar con los mismos turnos que ${esc(cur.name)}</span></button>
            <button type="button" class="cal-radio ${draft.copy ? '' : 'on'}" data-copy="0"><i class="dot"></i><span>Empezar sin turnos y crearlos yo</span></button></div>
          <div class="cal-note">Cada calendario tiene sus propios turnos, notas y resumen. Los festivos son comunes a todos.</div>
        </main>
        <div class="cal-foot"><button type="button" class="cal-btn" id="create">Crear calendario</button></div>
      </div>`;
    const grab = () => { draft.name = el.querySelector('#name').value; };
    el.querySelector('#go-back').addEventListener('click', () => back('/calendario'));
    el.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => { grab(); draft.color = b.dataset.color; draw(); }));
    el.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () => { grab(); draft.copy = b.dataset.copy === '1'; draw(); }));
    el.querySelector('#create').addEventListener('click', () => {
      grab();
      const name = draft.name.trim();
      if (!name) return toast('Escribe un nombre para el calendario');
      update((d, c) => {
        const id = uid();
        d.calendars.push({ id, name, color: draft.color, shifts: draft.copy ? c.shifts.map((s) => ({ ...s })) : [], zones: [], days: {} });
        d.activeId = id;
      });
      back('/calendario');
    });
  };
  draw();
}
