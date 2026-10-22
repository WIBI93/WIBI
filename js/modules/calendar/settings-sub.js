// Ajustes del calendario: pantallas interiores (calendarios y causas de estrés).

import { back, refresh, navigate } from '../../core/router.js';
import { esc, toast, confirmDialog, formDialog } from '../../core/ui.js';
import { getData, activeCal, update, addCause, hideCause } from './data.js';
import { roundBtn, navHtml, bindGo } from './shell.js';
import { shareCalendar } from './share.js';

export function renderCalendarsSettings(el) {
  const d = getData();
  el.innerHTML = `
    <div class="cal">
      <header class="cal-head">${roundBtn('go-back', 'back', 'Volver a Ajustes')}<div class="grow"><div class="cal-sub">Ajustes</div><div class="cal-title">Calendarios</div></div></header>
      <main class="cal-main" style="gap:14px">
        <section class="cal-section" style="padding:14px 16px;gap:4px">
          ${d.calendars.map((c) => `<div class="cal-cause-row" style="flex-wrap:wrap;row-gap:0"><span class="nm" style="flex:1 1 100%;padding-top:6px">${esc(c.name)}</span><button type="button" data-rencal="${esc(c.id)}">Renombrar</button><button type="button" data-sharecal="${esc(c.id)}">Compartir</button>${d.calendars.length > 1 ? `<button type="button" class="del" data-delcal="${esc(c.id)}">Borrar</button>` : ''}</div>`).join('')}
          ${d.calendars.length === 1 ? '<div class="cal-note small">No se puede borrar el único calendario.</div>' : ''}
          <button type="button" class="cal-btn dashed" id="importcal" style="margin-top:8px">Importar calendario recibido</button>
        </section>
      </main>
      <div class="cal-spacer"></div>
      ${navHtml('ajustes')}
    </div>`;
  bindGo(el);
  el.querySelector('#go-back').addEventListener('click', () => back('/calendario/ajustes'));
  el.querySelector('#importcal').addEventListener('click', () => navigate('/calendario/importar'));
  el.querySelectorAll('[data-sharecal]').forEach((b) => b.addEventListener('click', () => shareCalendar(d.calendars.find((x) => x.id === b.dataset.sharecal))));
  el.querySelectorAll('[data-rencal]').forEach((b) => b.addEventListener('click', async () => {
    const c = d.calendars.find((x) => x.id === b.dataset.rencal);
    const r = await formDialog({ title: 'Renombrar calendario', fields: [{ key: 'name', label: 'Nombre', type: 'text', value: c.name, maxLength: 40 }], confirmLabel: 'Guardar' });
    const name = r && String(r.name).trim();
    if (!name) return;
    update((data) => { const k = data.calendars.find((x) => x.id === c.id); if (k) k.name = name.slice(0, 40); });
    refresh();
  }));
  el.querySelectorAll('[data-delcal]').forEach((b) => b.addEventListener('click', async () => {
    const c = d.calendars.find((x) => x.id === b.dataset.delcal);
    const ok = await confirmDialog({ title: `Borrar «${c.name}»`, text: 'Se borrarán todos sus días, notas y estrés. No se puede deshacer. Si dudas, exporta antes una copia en este mismo Ajustes.', confirmLabel: 'Borrar', danger: true });
    if (!ok) return;
    update((data) => {
      if (data.calendars.length < 2) return;
      data.calendars = data.calendars.filter((x) => x.id !== c.id);
      if (data.activeId === c.id) data.activeId = data.calendars[0].id;
    });
    refresh();
  }));
}

export function renderCausesSettings(el) {
  const d = getData();
  el.innerHTML = `
    <div class="cal">
      <header class="cal-head">${roundBtn('go-back', 'back', 'Volver a Ajustes')}<div class="grow"><div class="cal-sub">Ajustes</div><div class="cal-title">Causas de estrés</div></div></header>
      <main class="cal-main" style="gap:14px">
        <section class="cal-section" style="padding:14px 16px;gap:4px">
          <div class="cal-note small">Aparecen al puntuar un día con 7 o más.</div>
          ${d.stressCauses.filter((c) => !c.hidden).map((c) => `<div class="cal-cause-row"><span class="nm">${esc(c.name)}</span><button type="button" data-ren="${esc(c.id)}">Renombrar</button><button type="button" class="del" data-del="${esc(c.id)}">Quitar</button></div>`).join('')}
          <button type="button" class="cal-btn dashed" id="newcause" style="margin-top:8px">+ Añadir causa</button>
        </section>
      </main>
      <div class="cal-spacer"></div>
      ${navHtml('ajustes')}
    </div>`;
  bindGo(el);
  el.querySelector('#go-back').addEventListener('click', () => back('/calendario/ajustes'));
  el.querySelector('#newcause').addEventListener('click', async () => {
    const r = await formDialog({ title: 'Nueva causa', fields: [{ key: 'name', label: 'Nombre', type: 'text', value: '', maxLength: 30 }], confirmLabel: 'Añadir' });
    if (!r || !String(r.name).trim()) return;
    update((data) => { addCause(data, r.name); });
    refresh();
  });
  el.querySelectorAll('[data-ren]').forEach((b) => b.addEventListener('click', async () => {
    const c = d.stressCauses.find((x) => x.id === b.dataset.ren);
    const r = await formDialog({ title: 'Renombrar causa', fields: [{ key: 'name', label: 'Nombre', type: 'text', value: c.name, maxLength: 30 }], confirmLabel: 'Guardar' });
    const name = r && String(r.name).trim();
    if (!name) return;
    if (d.stressCauses.some((x) => x.id !== c.id && !x.hidden && x.name.toLowerCase() === name.toLowerCase())) { toast('Ya existe esa causa'); return; }
    update((data) => { const k = data.stressCauses.find((x) => x.id === c.id); if (k) k.name = name.slice(0, 30); });
    refresh();
  }));
  el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    const c = d.stressCauses.find((x) => x.id === b.dataset.del);
    const ok = await confirmDialog({ title: `Quitar «${c.name}»`, text: 'Dejará de aparecer en la lista, pero los días ya puntuados conservan su historial.', confirmLabel: 'Quitar', danger: true });
    if (!ok) return;
    update((data) => hideCause(data, c.id));
    refresh();
  }));
}
