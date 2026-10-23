// W calendar: registra todas las pantallas de la sección.

import { renderMonth } from './month.js';
import { renderBrush } from './brush.js';
import { renderDay } from './day.js';
import { renderHours, renderStress, renderZones, renderPending } from './summary.js';
import { renderShifts, renderShiftEdit } from './shifts.js';
import { renderZoneList, renderZoneEdit } from './zones.js';
import { renderSettings } from './settings.js';
import { renderCalendarsSettings, renderCausesSettings } from './settings-sub.js';
import { renderHolidays } from './holidays.js';
import { renderNewCalendar } from './newcal.js';
import { renderCompare } from './compare.js';
import { renderImport } from './share.js';
import { renderSwaps, renderNewSwap, renderSwap } from './swaps.js';

export function registerCalendar(route) {
  const o = { cal: true };
  route('/calendario', renderMonth, o);
  route('/calendario/importar', renderImport, o);
  route('/calendario/comparar', renderCompare, o);
  route('/calendario/cambios', renderSwaps, o);
  route('/calendario/cambios/nuevo', renderNewSwap, o);
  route('/calendario/cambio/:id', renderSwap, o);
  route('/calendario/pincel', renderBrush, o);
  route('/calendario/dia/:key', renderDay, o);
  route('/calendario/resumen', renderHours, o);
  route('/calendario/resumen/estres', renderStress, o);
  route('/calendario/resumen/zonas', renderZones, o);
  route('/calendario/zonas-pendientes/:scope', renderPending, o);
  route('/calendario/turnos', renderShifts, o);
  route('/calendario/turnos/zonas', renderZoneList, o);
  route('/calendario/turno/:id', renderShiftEdit, o);
  route('/calendario/zona/:id', renderZoneEdit, o);
  route('/calendario/ajustes', renderSettings, o);
  route('/calendario/ajustes/calendarios', renderCalendarsSettings, o);
  route('/calendario/ajustes/causas', renderCausesSettings, o);
  route('/calendario/festivos', renderHolidays, o);
  route('/calendario/nuevo', renderNewCalendar, o);
}
