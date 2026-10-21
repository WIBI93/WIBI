// Piezas comunes de W fit: iconos, barras inferiores y cabeceras.

import { go } from '../../core/router.js';

const P = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  home: '<path d="M4 11l8-7 8 7v9H4z"/>',
  week: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  gym: '<path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12"/>',
  run: '<circle cx="14" cy="4.5" r="1.8"/><path d="M12 8l-3 4 3 2 1 5M9 12l-3 1M12 8l3 3 3 .5M13 14l4 2"/>',
  medal: '<circle cx="12" cy="9" r="5"/><path d="M9 13.5L7 21l5-3 5 3-2-7.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  routines: '<path d="M5 6h14M5 12h14M5 18h9"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  chart: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
  bolt: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
  plan: '<path d="M4 5h16v14H4zM4 10h16M9 10v9"/>',
  flag: '<path d="M6 3v18M6 4h12l-3 4 3 4H6"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
};
export function ico(name, size = 22, sw = 2) {
  return `<svg class="fi" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name]}</svg>`;
}

const tab = (t, active) =>
  `<button type="button" class="f-tab ${t.cls || ''}" data-go="${t.path}" ${t.id === active ? 'aria-current="page"' : ''}>${ico(t.icon, 22)}<span>${t.label}</span></button>`;

export function commonNav(active) {
  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: 'home', path: '/fit' },
    { id: 'semana', label: 'Semana', icon: 'week', path: '/fit/semana' },
    { id: 'gym', label: 'Gym', icon: 'gym', path: '/fit/gym', cls: 'frame-gym' },
    { id: 'run', label: 'Running', icon: 'run', path: '/fit/running', cls: 'frame-run' },
    { id: 'medallas', label: 'Medallas', icon: 'medal', path: '/fit/medallas' },
    { id: 'ajustes', label: 'Ajustes', icon: 'gear', path: '/fit/ajustes' },
  ];
  return `<nav class="f-nav" aria-label="W fit">${tabs.map((t) => tab(t, active)).join('')}</nav>`;
}

// Barra de un deporte: 3 pestañas · botón central · 3 pestañas.
export function sportNav(sport, active) {
  const base = sport === 'gym' ? '/fit/gym' : '/fit/running';
  const L = sport === 'gym'
    ? [['inicio', 'Inicio', 'home', base], ['rutinas', 'Rutinas', 'routines', base + '/rutinas'], ['entrenos', 'Entrenos', 'list', base + '/entrenos']]
    : [['inicio', 'Inicio', 'home', base], ['planes', 'Planes', 'plan', base + '/planes'], ['carreras', 'Carreras', 'list', base + '/carreras']];
  const R = [['estadisticas', 'Estadísticas', 'chart', base + '/estadisticas'], ['medallas', 'Medallas', 'medal', base + '/medallas'], ['retos', 'Retos', 'target', base + '/retos']];
  const t = ([id, label, icon, path]) => tab({ id, label, icon, path }, active);
  const center = sport === 'gym'
    ? `<button type="button" class="f-center" id="f-center" aria-label="Empezar entreno">${ico('gym', 26, 2.2)}</button>`
    : `<button type="button" class="f-center" id="f-center" aria-label="Importar carrera">${ico('bolt', 26, 2.2)}</button>`;
  return `<nav class="f-nav sport" aria-label="${sport === 'gym' ? 'Gimnasio' : 'Running'}">${L.map(t).join('')}${center}${R.map(t).join('')}</nav>`;
}

export function bindGo(el) {
  el.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));
}

export function header(title, sub = '', right = '') {
  return `<header class="f-head"><div class="grow"><div class="f-sub">${sub}</div><h1>${title}</h1></div>${right}</header>`;
}

export function backHeader(title, backPath) {
  return `<header class="f-head"><button type="button" class="f-round" data-go="${backPath}" aria-label="Volver">${ico('back')}</button><h1 class="grow">${title}</h1></header>`;
}

export function stepper(id, value, min, max) {
  return `<div class="f-step" data-step="${id}" data-min="${min}" data-max="${max}"><button type="button" data-d="-1" aria-label="Menos">${ico('minus', 18, 2.6)}</button><output>${value}</output><button type="button" data-d="1" aria-label="Más">${ico('plus', 18, 2.6)}</button></div>`;
}

// Hace funcionar los contadores (+/−). Llama a onChange(id, valor).
export function bindSteppers(el, onChange) {
  el.querySelectorAll('.f-step').forEach((s) => {
    const out = s.querySelector('output');
    s.querySelectorAll('button').forEach((b) =>
      b.addEventListener('click', () => {
        const v = Math.min(+s.dataset.max, Math.max(+s.dataset.min, +out.textContent + +b.dataset.d));
        out.textContent = v;
        onChange(s.dataset.step, v);
      })
    );
  });
}
