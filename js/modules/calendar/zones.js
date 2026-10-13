// Pestaña Zonas: lista de zonas, y pantalla para añadir (varias a la vez) o editar una.

import { navigate, back } from '../../core/router.js';
import { esc, confirmDialog, toast } from '../../core/ui.js';
import { getData, activeCal, update, uid, countDaysWith, removeZone } from './data.js';
import { ico, navHtml, bindGo } from './shell.js';
import { tabsHtml } from './shifts.js';

export function renderZoneList(el) {
  const cal = activeCal(getData());
  const rows = cal.zones.map((z) =>
    `<button type="button" class="ln" data-id="${z.id}" aria-label="Editar zona ${esc(z.name)}"><span>${esc(z.name)}</span>${ico('next', 20)}</button>`
  ).join('');
  el.innerHTML = `
    <div class="cal">
      <header class="cal-head"><div class="grow" style="padding-left:4px"><div class="cal-sub">${esc(cal.name)}</div><div class="cal-title">Tipos de turno y zonas</div></div></header>
      <main class="cal-main tight">
        ${tabsHtml('z')}
        ${rows ? `<section class="cal-lines">${rows}</section>` : '<div class="cal-empty">Aún no tienes zonas. Añade las tuyas con el botón de abajo.</div>'}
        <button type="button" class="cal-btn dashed" id="new" style="height:52px;border-radius:16px">${ico('plus', 20, 2.4)}Nueva zona</button>
        <div class="cal-note" style="padding:2px 4px 0">Las zonas solo sirven para contar. No aparecen en el mes. Si borras una zona, te avisamos y los días que la tenían quedan sin zona.</div>
      </main>
      <div class="cal-spacer"></div>
      ${navHtml('turnos')}
    </div>`;
  bindGo(el);
  el.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => navigate('/calendario/zona/' + b.dataset.id)));
  el.querySelector('#new').addEventListener('click', () => navigate('/calendario/zona/nueva'));
}

export function renderZoneEdit(el, { id }) {
  const cal = activeCal(getData());
  const isNew = id === 'nueva';
  const zone = cal.zones.find((z) => z.id === id);
  if (!isNew && !zone) { back('/calendario/turnos/zonas'); return; }
  const taken = (name, exceptId) => cal.zones.some((z) => z.id !== exceptId && z.name.toLowerCase() === name.toLowerCase());

  el.innerHTML = `
    <div class="cal">
      <header class="cal-head"><button type="button" class="cal-round" id="go-back" aria-label="Volver a las zonas">${ico('back')}</button>
        <div class="grow"><div class="cal-sub">Zonas</div><div class="cal-title">${isNew ? 'Nueva zona' : 'Editar zona'}</div></div></header>
      <main class="cal-main" style="padding-top:4px">
        <label class="cal-field"><span>${isNew ? 'Nombre (puedes escribir varias separadas por comas)' : 'Nombre'}</span>
          <input class="cal-input" id="name" type="text" maxlength="${isNew ? 300 : 30}" value="${isNew ? '' : esc(zone.name)}" ${isNew ? 'placeholder="Ej.: Zona 1, Zona 2"' : ''}></label>
      </main>
      <div class="cal-foot"><button type="button" class="cal-btn" id="save">${isNew ? 'Añadir' : 'Guardar zona'}</button>
        ${isNew ? '' : '<button type="button" class="cal-btn plain-danger" id="del">Eliminar zona</button>'}</div>
    </div>`;
  el.querySelector('#go-back').addEventListener('click', () => back('/calendario/turnos/zonas'));
  const input = el.querySelector('#name');
  el.querySelector('#save').addEventListener('click', () => {
    if (isNew) {
      const names = [...new Set(input.value.split(',').map((s) => s.trim().slice(0, 30)).filter(Boolean))].filter((n) => !taken(n, null));
      if (!names.length) return toast('Escribe al menos un nombre nuevo');
      update((d, c) => names.forEach((name) => c.zones.push({ id: uid(), name })));
    } else {
      const name = input.value.trim();
      if (!name) return toast('Escribe un nombre para la zona');
      if (taken(name, id)) return toast('Ya existe una zona con ese nombre');
      update((d, c) => { c.zones = c.zones.map((z) => (z.id === id ? { id, name } : z)); });
    }
    back('/calendario/turnos/zonas');
  });
  const del = el.querySelector('#del');
  if (del) del.addEventListener('click', async () => {
    const n = countDaysWith(cal, 'zone', id);
    const ok = await confirmDialog({
      title: 'Eliminar zona',
      text: n ? `Hay ${n} ${n === 1 ? 'día' : 'días'} con esta zona. Quedarán sin zona.` : 'Se eliminará esta zona.',
      confirmLabel: 'Eliminar', danger: true,
    });
    if (!ok) return;
    update((d, c) => removeZone(c, id));
    back('/calendario/turnos/zonas');
  });
}
