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
          <button type="button" class="ln" id="cals"><span>Calendarios</span><span class="r">${d.calendars.length} · renombrar o borrar${ico('next', 20)}</span></button>
          <button type="button" class="ln" id="causes"><span>Causas de estrés</span><span class="r">${d.stressCauses.filter((c) => !c.hidden).length} causas${ico('next', 20)}</span></button>
          <button type="button" class="ln" id="fest"><span>Festivos</span><span class="r">${year} · ${n} ${n === 1 ? 'añadido' : 'añadidos'}${ico('next', 20)}</span></button>
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
  el.querySelector('#cals').addEventListener('click', () => navigate('/calendario/ajustes/calendarios'));
  el.querySelector('#causes').addEventListener('click', () => navigate('/calendario/ajustes/causas'));
}

