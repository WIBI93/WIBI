// Detalle de un día: turno, zona (opcional), cambio de turno y nota.

import { back } from '../../core/router.js';
import { readableOn } from '../../core/palette.js';
import { esc } from '../../core/ui.js';
import { getData, activeCal, update, saveDay } from './data.js';
import { INK, longDate, shiftDescription, shiftMap, parseKey } from './calc.js';
import { ico, flagIco, swapIco } from './shell.js';

export function renderDay(el, { key }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || isNaN(new Date(key + 'T00:00:00'))) { back('/calendario'); return; }
  const d = getData();
  const cal = activeCal(d);
  const map = shiftMap(cal);
  const cur = cal.days[key] || {};
  const draft = { shift: cur.shift || null, zone: cur.zone || null, swap: !!cur.swap, note: cur.note || '' };
  const holiday = d.holidays[key];

  const draw = () => {
    const sh = draft.shift ? map.get(draft.shift) : null;
    const tiles = cal.shifts.map((s) =>
      `<button type="button" class="cal-tile" data-shift="${s.id}" aria-pressed="${draft.shift === s.id}"><span class="sw" style="background:${s.color};color:${readableOn(s.color, INK)}">${esc(s.letter)}</span><span class="lab">${esc(s.name)}</span></button>`
    ).join('');
    let zones = '';
    if (sh && sh.kind === 'work') {
      zones = cal.zones.length
        ? `<section class="cal-section"><div class="rowh"><h3>Zona</h3><span class="opt">Opcional · puedes apuntarla después</span></div>
            <div class="cal-zones">${cal.zones.map((z) => `<button type="button" class="cal-choice" data-zone="${z.id}" aria-pressed="${draft.zone === z.id}">${esc(z.name)}</button>`).join('')}</div></section>`
        : `<section class="cal-section"><div class="cal-note small">Si añades zonas en Turnos → Zonas, podrás apuntar aquí dónde trabajaste.</div></section>`;
    }
    el.innerHTML = `
      <div class="cal">
        <header class="cal-head">
          <button type="button" class="cal-round" id="go-back" aria-label="Volver al mes">${ico('back')}</button>
          <div class="grow"><div class="cal-sub">Detalle del día</div><div class="cal-title">${longDate(key)}</div></div>
        </header>
        <main class="cal-main">
          ${holiday ? `<div class="cal-festbanner">${flagIco(16)}<span>Festivo: ${esc(holiday)}</span></div>` : ''}
          <section class="cal-section" style="padding:14px 10px">
            <h3 style="padding:0 6px">Turno</h3>
            ${cal.shifts.length ? `<div class="cal-tiles c6">${tiles}</div>` : '<div class="cal-note small" style="padding:0 6px">Todavía no hay turnos. Créalos en la pestaña Turnos.</div>'}
            <div class="cal-note" style="padding:0 6px">${sh ? esc(sh.name) + ' · ' + shiftDescription(sh) : 'Sin turno. Toca uno para ponerlo (tócalo otra vez para quitarlo).'}</div>
          </section>
          ${zones}
          <div class="cal-switch-row"><span class="l"><span class="cal-chip" style="width:28px;height:28px;border-radius:8px">${swapIco(18)}</span>Cambio de turno</span>
            <button type="button" class="cal-switch" id="swap" role="switch" aria-checked="${draft.swap}" aria-label="Cambio de turno"><i></i></button></div>
          <section class="cal-section"><label for="note" style="font-size:14px;font-weight:700">Nota del día</label>
            <textarea id="note" class="cal-textarea" rows="3" maxlength="500" placeholder="Escribe una nota. Se verá también en el mes.">${esc(draft.note)}</textarea></section>
        </main>
        <div class="cal-foot"><button type="button" class="cal-btn" id="save">Guardar día</button></div>
      </div>`;

    el.querySelector('#go-back').addEventListener('click', () => back('/calendario'));
    el.querySelectorAll('[data-shift]').forEach((b) => b.addEventListener('click', () => {
      draft.note = el.querySelector('#note').value;
      draft.shift = draft.shift === b.dataset.shift ? null : b.dataset.shift;
      const s = draft.shift ? map.get(draft.shift) : null;
      if (!s || s.kind !== 'work') draft.zone = null;
      draw();
    }));
    el.querySelectorAll('[data-zone]').forEach((b) => b.addEventListener('click', () => {
      draft.note = el.querySelector('#note').value;
      draft.zone = draft.zone === b.dataset.zone ? null : b.dataset.zone;
      draw();
    }));
    el.querySelector('#swap').addEventListener('click', () => { draft.note = el.querySelector('#note').value; draft.swap = !draft.swap; draw(); });
    el.querySelector('#save').addEventListener('click', () => {
      draft.note = el.querySelector('#note').value;
      update((data, c) => saveDay(c, key, draft));
      back('/calendario');
    });
  };
  draw();
}
