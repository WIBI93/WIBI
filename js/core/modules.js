// Lista de secciones de WIBI.
// Para añadir una sección nueva: se añade una línea aquí, se crea su carpeta en
// js/modules/ y se pasa "ready: true" cuando esté lista. El inicio la mostrará solo.

import { ICONS } from './icons.js';

export const MODULES = [
  { id: 'economy', name: 'W economy', icon: ICONS.wallet, color: '#17594A', ready: true, route: '/economia' },
  { id: 'calendar', name: 'W calendar', icon: ICONS.calendar, color: '#2F5D78', ready: true, route: '/calendario' },
  { id: 'fit', name: 'W fit', icon: ICONS.dumbbell, color: '#9A5A45', ready: true, route: '/fit' },
  { id: 'cart', name: 'W cart', icon: ICONS.cart, color: '#8A6A1F', ready: false },
  { id: 'car', name: 'W car', icon: ICONS.car, color: '#5E557F', ready: false },
];
