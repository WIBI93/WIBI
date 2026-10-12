// Pantalla provisional para las secciones que todavía se están construyendo.

import { ICONS } from '../core/icons.js';
import { sectionColor } from '../core/settings.js';
import { back } from '../core/router.js';

export function renderUnderConstruction(container, mod) {
  container.innerHTML = `
    <header class="top">
      <button type="button" class="icon-btn filled" id="go-back" aria-label="Volver">${ICONS.back}</button>
      <h1>${mod.name}</h1>
    </header>
    <section class="card construction" style="--c:${sectionColor(mod.id)}">
      <span class="tile-icon">${mod.icon}</span>
      <h2>Esta sección se está construyendo</h2>
      <p class="hint">Pronto estará lista.</p>
    </section>`;
  container.querySelector('#go-back').addEventListener('click', () => back('/'));
}
