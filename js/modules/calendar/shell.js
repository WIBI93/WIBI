// Piezas comunes de las pantallas del calendario: iconos y barra inferior.

import { go } from '../../core/router.js';

const P = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3"/>',
  mes: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  resumen: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  turnos: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  ajustes: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
};

export function ico(name, size = 22, sw = 2) {
  return `<svg class="ci" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name]}</svg>`;
}
export const flagIco = (size = 10) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="#D32F2F" stroke="#D32F2F" stroke-width="2.5" stroke-linejoin="round" aria-hidden="true"><path d="M6 3v18M6 4h12l-3 4 3 4H6z"/></svg>`;
export const swapIco = (size = 10) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#1B8A4B" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/></svg>`;

export const roundBtn = (id, icon, label) =>
  `<button type="button" class="cal-round" id="${id}" aria-label="${label}">${ico(icon)}</button>`;

const TABS = [
  { id: 'mes', label: 'Mes', path: '/calendario' },
  { id: 'resumen', label: 'Resumen', path: '/calendario/resumen' },
  { id: 'turnos', label: 'Turnos', path: '/calendario/turnos' },
  { id: 'ajustes', label: 'Ajustes', path: '/calendario/ajustes' },
];

export function navHtml(active) {
  return `<nav class="cal-nav" aria-label="Secciones del calendario">${TABS.map(
    (t) => `<button type="button" class="cal-tab" data-go="${t.path}" ${t.id === active ? 'aria-current="page"' : ''}>${ico(t.id, 24)}${t.label}</button>`
  ).join('')}</nav>`;
}

// Hace que los botones con data-go cambien de pestaña.
export function bindGo(el) {
  el.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
}
