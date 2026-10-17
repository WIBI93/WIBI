// Piezas comunes de las pantallas de economía: iconos, barra inferior y cabeceras.

import { go, navigate } from '../../core/router.js';

const P = {
  back: '<path d="M15 6l-6 6 6 6"/>',
  next: '<path d="M9 6l6 6-6 6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  resumen: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  gastos: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  ahorro: '<path d="M4.5 12.8c0-3.6 3-6.3 7-6.3h3c1.1 0 2.1.3 3 .9L19.6 6v3.3c.8.8 1.4 1.8 1.4 3.1 0 1.6-.8 3-2.1 3.8V19h-3v-1.6h-5V19h-3v-3.1c-1.5-.9-2.4-2.2-2.4-3.1z"/><circle cx="16.3" cy="11.4" r=".6" fill="currentColor"/><path d="M9.5 6.5V5.2M12.5 6.5V4.6"/><path d="M3 11.5h1.5"/>',
  estadisticas: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  metas: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  simular: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2"/>',
  bag: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  down: '<path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  chat: '<path d="M5 5h14v10H9l-4 4V5z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
};

export function ei(name, size = 22, sw = 2) {
  return `<svg class="ei" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name]}</svg>`;
}
export const round = (id, icon, label, cls = '') =>
  `<button type="button" class="eco-round ${cls}" id="${id}" aria-label="${label}">${ei(icon, 20)}</button>`;

export function navHtml(active) {
  const tab = (id, label, path) =>
    `<button type="button" class="eco-tab" data-go="${path}" ${id === active ? 'aria-current="page"' : ''} aria-label="${label}">${ei(id, 22)}${label}</button>`;
  return `<nav class="eco-nav" aria-label="Secciones de economía">
    ${tab('resumen', 'Resumen', '/economia')}${tab('gastos', 'Gastos', '/economia/gastos')}
    <button type="button" class="eco-plus" data-add aria-label="Añadir movimiento">${ei('plus', 24, 2.4)}</button>
    ${tab('ahorro', 'Ahorro', '/economia/ahorro')}${tab('metas', 'Metas', '/economia/metas')}${tab('estadisticas', 'Estadíst.', '/economia/estadisticas')}</nav>`;
}
export function bindNav(el) {
  el.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
  const add = el.querySelector('[data-add]');
  if (add) add.addEventListener('click', () => navigate('/economia/anadir'));
}
