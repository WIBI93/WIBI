// Ajustes del calendario: copia de seguridad, primer día de la semana y festivos.

import { navigate, refresh } from '../../core/router.js';
import { esc, toast, confirmDialog, formDialog } from '../../core/ui.js';
import { lastBackupText } from '../../core/backup.js';
import { runExport, runImport } from '../../core/backup-ui.js';
import { getData, activeCal, update, addCause, hideCause } from './data.js';
import { ico, navHtml, bindGo } from './shell.js';

export function renderSettings(el) {
  const d = getData();
  const cal = activeCal(d);
  const year = new Date().getFullYear();
  const n = Object.keys(d.holidays).filter((k) => k.startsWith(year + '-')).length;
  el.innerHTML = `
    <div class="cal">
      <header class="cal-head"><div class="grow" style="padding-left:4px"><div class="cal-sub">${esc(cal.name)}</div><div class="cal-title">Ajustes</div></div></header>
      <main class="cal-main" style="gap:14px">
        <section class="cal-section" style="padding:16px;gap:12px">
          <h3 style="font-size:16px">Copia de seguridad</h3>
          <div class="cal-note">Tus datos están solo en este móvil. Guarda una copia de vez en cuando para no perderlos si cambias de móvil o borras la app.</div>
          <button type="button" class="cal-btn" id="export">Exportar copia (archivo)</button>
          <button type="button" class="cal-btn outline" id="import">Importar copia</button>
          <input type="file" id="file" accept=".json,.txt,application/json,text/plain" hidden>
          <div class="cal-note small">Importar sustituye todos los datos de WIBI (calendarios y economía). ${lastBackupText()}</div>
        </section>
        <section class="cal-lines roomy" style="padding:6px 16px">
          <div class="ln"><span>Primer día de la semana</span>
            <div class="cal-tabs small" role="group"><button type="button" data-fd="1" aria-pressed="${d.firstDay === 1}">Lunes</button><button type="button" data-fd="0" aria-pressed="${d.firstDay === 0}">Domingo</button></div></div>
          <button type="button" class="ln" id="fest"><span>Festivos</span><span class="r">${year} · ${n} ${n === 1 ? 'añadido' : 'añadidos'}${ico('next', 20)}</span></button>
        </section>
        <section class="cal-section" style="padding:14px 16px;gap:4px">
          <h3 style="font-size:16px">Causas de estrés</h3>
          <div class="cal-note small">Aparecen al puntuar un día con 7 o más.</div>
          ${d.stressCauses.filter((c) => !c.hidden).map((c) => `<div class="cal-cause-row"><span class="nm">${esc(c.name)}</span><button type="button" data-ren="${esc(c.id)}">Renombrar</button><button type="button" class="del" data-del="${esc(c.id)}">Quitar</button></div>`).join('')}
          <button type="button" class="cal-btn dashed" id="newcause" style="margin-top:8px">+ Añadir causa</button>
        </section>
        <div class="cal-note" style="padding:0 4px">Los festivos los añades tú una vez al año y salen marcados en el mes.</div>
      </main>
      <div class="cal-spacer"></div>
      ${navHtml('ajustes')}
    </div>`;
  bindGo(el);
  const ex = el.querySelector('#export');
  ex.addEventListener('click', async () => { ex.disabled = true; await runExport(); refresh(); });
  const file = el.querySelector('#file');
  el.querySelector('#import').addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0];
    file.value = '';
    if (await runImport(f)) refresh();
  });
  el.querySelectorAll('[data-fd]').forEach((b) => b.addEventListener('click', () => { update((data) => { data.firstDay = Number(b.dataset.fd); }); refresh(); }));
  el.querySelector('#fest').addEventListener('click', () => navigate('/calendario/festivos'));
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

