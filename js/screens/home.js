// Pantalla de inicio: cabecera, aviso de copia y cuadrados de las secciones.

import { ICONS, LOGO } from '../core/icons.js';
import { MODULES } from '../core/modules.js';
import { sectionColor } from '../core/settings.js';
import { readableOn } from '../core/palette.js';
import { needsBackupReminder, exportBackup, downloadedMessage } from '../core/backup.js';
import { navigate, refresh } from '../core/router.js';
import { toast } from '../core/ui.js';

function todayText() {
  const t = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function tileHtml(mod) {
  const color = sectionColor(mod.id);
  const style = `--c:${color};--on:${readableOn(color)}`;
  if (mod.ready) {
    return `<button type="button" class="tile active" style="${style}" data-route="${mod.route}">
      <span class="tile-icon">${mod.icon}</span>
      <span class="tile-name">${mod.name}</span>
    </button>`;
  }
  return `<div class="tile pending" style="${style}">
    <span class="tile-icon">${mod.icon}</span>
    <span class="tile-name">${mod.name}</span>
    <span class="tile-soon">Próximamente</span>
  </div>`;
}

export function renderHome(container) {
  const banner = needsBackupReminder()
    ? `<div class="banner">
         <p>Llevas más de 30 días sin hacer una copia de seguridad</p>
         <button type="button" id="banner-backup">Hacer copia</button>
       </div>`
    : '';

  container.innerHTML = `
    <header class="home-top">
      <div class="brand">
        ${LOGO}
        <div class="brand-text">
          <span class="wordmark">WIBI</span>
          <span class="today">${todayText()}</span>
        </div>
      </div>
      <button type="button" class="icon-btn" id="open-settings" aria-label="Ajustes">${ICONS.gear}</button>
    </header>
    ${banner}
    <div class="grid">${MODULES.map(tileHtml).join('')}</div>
    <div class="spacer"></div>
    <p class="footnote">Tus datos se guardan solo en este móvil</p>`;

  container.querySelector('#open-settings').addEventListener('click', () => navigate('/ajustes'));
  container.querySelectorAll('[data-route]').forEach((btn) =>
    btn.addEventListener('click', () => navigate(btn.dataset.route))
  );

  const bannerBtn = container.querySelector('#banner-backup');
  if (bannerBtn) {
    bannerBtn.addEventListener('click', async () => {
      const result = await exportBackup();
      if (result === 'cancelled') return;
      toast(result === 'shared' ? 'Copia guardada' : downloadedMessage());
      refresh();
    });
  }
}
