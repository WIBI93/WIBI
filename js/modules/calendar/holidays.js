// Festivos: los añade el usuario a mano. Son comunes a todos los calendarios.

import { back, refresh } from '../../core/router.js';
import { esc, confirmDialog, formDialog, toast } from '../../core/ui.js';
import { getData, update } from './data.js';
import { state } from './state.js';
import { WEEKDAYS, MONTHS, pad, parseKey, weekdayOf } from './calc.js';
import { ico, roundBtn } from './shell.js';

export function renderHolidays(el) {
  const d = getData();
  const y = state.holidayYear;
  const keys = Object.keys(d.holidays).filter((k) => k.startsWith(y + '-')).sort();
  const rows = keys.map((k) => {
    const p = parseKey(k);
    return `<div class="cal-fest"><span class="dt"><b>${p.d}</b><span>${MONTHS[p.m].slice(0, 3).toLowerCase()}</span></span>
      <span class="tx"><b>${esc(d.holidays[k])}</b><span>${WEEKDAYS[weekdayOf(k)]}</span></span>
      <button type="button" class="del" data-del="${k}" aria-label="Quitar festivo ${p.d} de ${MONTHS[p.m].toLowerCase()}">${ico('trash')}</button></div>`;
  }).join('');
  el.innerHTML = `
    <div class="cal">
      <header class="cal-head">${roundBtn('go-back', 'back', 'Volver a ajustes')}
        <div class="grow"><div class="cal-sub">Ajustes</div><div class="cal-title">Festivos</div></div>
        ${roundBtn('py', 'back', 'Año anterior')}<span style="min-width:44px;text-align:center;font-size:18px;font-weight:700">${y}</span>${roundBtn('ny', 'next', 'Año siguiente')}</header>
      <main class="cal-main tight">
        <div class="cal-note">Los festivos que añadas salen marcados con una banderita roja en el mes. Si pintas un turno de trabajo en uno de ellos, cuenta como festivo trabajado.</div>
        ${rows ? `<section class="cal-section" style="padding:4px 16px;gap:0">${rows}</section>` : `<div class="cal-empty">No hay festivos en ${y}.</div>`}
      </main>
      <div class="cal-foot"><button type="button" class="cal-btn" id="add">${ico('plus', 20, 2.4)}Añadir festivo</button></div>
    </div>`;
  el.querySelector('#go-back').addEventListener('click', () => back('/calendario/ajustes'));
  el.querySelector('#py').addEventListener('click', () => { state.holidayYear--; refresh(); });
  el.querySelector('#ny').addEventListener('click', () => { state.holidayYear++; refresh(); });
  el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    const k = b.dataset.del;
    const ok = await confirmDialog({ title: 'Quitar festivo', text: `Se quitará "${d.holidays[k]}" de la lista.`, confirmLabel: 'Quitar', danger: true });
    if (!ok) return;
    update((data) => { delete data.holidays[k]; });
    refresh();
  }));
  el.querySelector('#add').addEventListener('click', async () => {
    const res = await formDialog({
      title: 'Añadir festivo',
      confirmLabel: 'Añadir',
      fields: [
        { key: 'date', label: 'Fecha', type: 'date', value: `${y}-01-01` },
        { key: 'name', label: 'Nombre', placeholder: 'Ej.: Navidad', maxLength: 60 },
      ],
    });
    if (!res) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(res.date)) return toast('Elige una fecha');
    update((data) => { data.holidays[res.date] = res.name.trim() || 'Festivo'; });
    state.holidayYear = Number(res.date.slice(0, 4));
    refresh();
  });
}
