// Sección W calendar. Aquí irá el calendario de trabajo (turnos, horas y zonas).
// Sus datos se guardarán bajo la clave "calendar" (ver js/core/store.js).

import { MODULES } from '../../core/modules.js';
import { renderUnderConstruction } from '../../screens/placeholder.js';

export function render(container) {
  renderUnderConstruction(container, MODULES.find((m) => m.id === 'calendar'));
}
