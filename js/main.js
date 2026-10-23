// Punto de entrada de WIBI.

import { ensureInstalledAt, applyTheme } from './core/settings.js';
import { route, start } from './core/router.js';
import { renderHome } from './screens/home.js';
import { renderSettings } from './screens/settings.js';
import { renderColors } from './screens/colors.js';
import { registerEconomy } from './modules/economy/index.js';
import { registerCalendar } from './modules/calendar/index.js';
import { registerFit } from './modules/fit/index.js';

ensureInstalledAt();
applyTheme();

route('/', renderHome);
route('/ajustes', renderSettings);
route('/ajustes/colores', renderColors);
registerEconomy(route);
registerCalendar(route);
registerFit(route);

start(document.getElementById('app'));

// Pide al móvil que no borre los datos de WIBI por falta de espacio (puede que no lo conceda).
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* sin permiso */ }

// Permite usar la app sin conexión y que se pueda instalar en el móvil.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
