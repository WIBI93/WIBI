// Pantalla para elegir el color de cada sección.

import { ICONS } from '../core/icons.js';
import { MODULES } from '../core/modules.js';
import { PALETTE, readableOn } from '../core/palette.js';
import { getSettings, setSettings, sectionColor } from '../core/settings.js';
import { back, refresh } from '../core/router.js';

function swatchesHtml(mod, current) {
  const known = PALETTE.some((p) => p.hex.toUpperCase() === current);
  const fixed = PALETTE.map((p) => {
    const selected = p.hex.toUpperCase() === current;
    return `<button type="button" class="swatch" data-id="${mod.id}" data-hex="${p.hex}" aria-label="${p.name}" aria-pressed="${selected}" style="--s:${p.hex}">
      <span class="dot">${selected ? ICONS.check : ''}</span>
    </button>`;
  }).join('');
  const custom = `<label class="swatch custom ${known ? '' : 'chosen'}" style="--s:${current};--on:${readableOn(current)}">
    <input type="color" value="${current.toLowerCase()}" data-id="${mod.id}" aria-label="Color personalizado de ${mod.name}">
    <span class="dot">${known ? ICONS.plus : ICONS.check}</span>
  </label>`;
  return fixed + custom;
}

export function renderColors(container) {
  const cards = MODULES.map((mod) => {
    const current = sectionColor(mod.id).toUpperCase();
    return `<section class="card color-card" data-card="${mod.id}">
      <div class="color-head">
        <span class="mini-tile" style="--c:${current};--on:${readableOn(current)}">${mod.icon}</span>
        <span class="color-name">${mod.name}</span>
      </div>
      <div class="swatches" role="group" aria-label="Color de ${mod.name}">${swatchesHtml(mod, current)}</div>
    </section>`;
  }).join('');

  container.innerHTML = `
    <header class="top">
      <button type="button" class="icon-btn filled" id="go-back" aria-label="Volver">${ICONS.back}</button>
      <h1>Color de las secciones</h1>
    </header>
    <p class="hint footnote" style="text-align:left;padding:0 4px">Elige un color para cada sección. Con el botón + puedes poner un color propio.</p>
    ${cards}
    <button type="button" class="text-btn" id="reset-colors">Volver a los colores originales</button>`;

  container.querySelector('#go-back').addEventListener('click', () => back('/ajustes'));

  const saveColor = (id, hex) => {
    const colors = { ...getSettings().colors, [id]: hex.toUpperCase() };
    setSettings({ colors });
  };

  container.querySelectorAll('button.swatch').forEach((btn) =>
    btn.addEventListener('click', () => {
      saveColor(btn.dataset.id, btn.dataset.hex);
      refresh();
    })
  );

  container.querySelectorAll('.swatch.custom input').forEach((input) => {
    // Mientras se mueve el selector se ve el resultado en la miniatura...
    input.addEventListener('input', () => {
      const tile = input.closest('[data-card]').querySelector('.mini-tile');
      tile.style.setProperty('--c', input.value);
      tile.style.setProperty('--on', readableOn(input.value));
    });
    // ...y al cerrarlo se guarda.
    input.addEventListener('change', () => {
      saveColor(input.dataset.id, input.value);
      refresh();
    });
  });

  container.querySelector('#reset-colors').addEventListener('click', () => {
    setSettings({ colors: {} });
    refresh();
  });
}
