// Ajustes generales: apariencia, color de las secciones y copia de seguridad.
// Los ajustes propios de cada sección (festivos, categorías...) irán dentro de cada sección.

import { ICONS } from '../core/icons.js';
import { MODULES } from '../core/modules.js';
import { getSettings, setSettings, applyTheme, sectionColor } from '../core/settings.js';
import { exportBackup, readBackupFile, applyBackup, backupDateText, lastBackupText, APP_VERSION } from '../core/backup.js';
import { navigate, back, refresh } from '../core/router.js';
import { toast, confirmDialog } from '../core/ui.js';

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'auto', label: 'Automático' },
];

export function renderSettings(container) {
  const { theme } = getSettings();
  const dots = MODULES.map((m) => `<span style="background:${sectionColor(m.id)}"></span>`).join('');
  const themeButtons = THEME_OPTIONS.map(
    (o) => `<button type="button" data-theme-value="${o.value}" aria-pressed="${o.value === theme}">${o.label}</button>`
  ).join('');

  container.innerHTML = `
    <header class="top">
      <button type="button" class="icon-btn filled" id="go-back" aria-label="Volver">${ICONS.back}</button>
      <h1>Ajustes</h1>
    </header>

    <section class="card">
      <div class="head">
        <h2>Apariencia</h2>
        <p class="hint">Elige el aspecto oscuro para usar la app de noche</p>
      </div>
      <div class="segmented" role="group" aria-label="Apariencia">${themeButtons}</div>
      <p class="hint">Automático sigue el ajuste de tu móvil</p>
    </section>

    <button type="button" class="card row-card" id="open-colors">
      <span class="grow">
        <h2>Color de las secciones</h2>
        <span class="dots" aria-hidden="true">${dots}</span>
      </span>
      <span class="chev">${ICONS.chevron}</span>
    </button>

    <section class="card">
      <div class="head">
        <h2>Copia de seguridad</h2>
        <p class="hint">Guarda todo lo de W economy y W calendar en un solo archivo</p>
      </div>
      <div class="btn-row">
        <button type="button" class="btn primary" id="do-export">${ICONS.download} Exportar</button>
        <button type="button" class="btn outline" id="do-import">${ICONS.upload} Importar</button>
      </div>
      <input type="file" id="import-file" accept=".json,application/json" hidden>
      <div class="lines">
        <span>${lastBackupText()}</span>
        <span>Importar sustituye los datos que hay ahora en el móvil</span>
        <span>Para guardarla en Drive, elige Drive en el menú que se abre al exportar</span>
      </div>
    </section>

    <div class="spacer"></div>
    <p class="footnote">WIBI · versión ${APP_VERSION}</p>`;

  container.querySelector('#go-back').addEventListener('click', () => back('/'));
  container.querySelector('#open-colors').addEventListener('click', () => navigate('/ajustes/colores'));

  container.querySelectorAll('[data-theme-value]').forEach((btn) =>
    btn.addEventListener('click', () => {
      setSettings({ theme: btn.dataset.themeValue });
      applyTheme();
      refresh();
    })
  );

  const exportBtn = container.querySelector('#do-export');
  exportBtn.addEventListener('click', async () => {
    exportBtn.disabled = true;
    try {
      const result = await exportBackup();
      if (result === 'shared') toast('Copia guardada');
      if (result === 'downloaded') toast('Copia descargada en tu móvil. Súbela a tu Drive para tenerla a salvo.');
    } catch {
      toast('No se ha podido crear la copia. Inténtalo de nuevo.');
    }
    refresh();
  });

  const fileInput = container.querySelector('#import-file');
  container.querySelector('#do-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    let payload;
    try {
      payload = await readBackupFile(file);
    } catch (err) {
      toast(err.message);
      return;
    }
    const ok = await confirmDialog({
      title: 'Importar copia',
      text: `Se sustituirán los datos actuales de este móvil por los de la copia del ${backupDateText(payload)}. Esto no se puede deshacer.`,
      confirmLabel: 'Importar',
      danger: true,
    });
    if (!ok) return;
    applyBackup(payload);
    applyTheme();
    toast('Copia importada');
    refresh();
  });
}
