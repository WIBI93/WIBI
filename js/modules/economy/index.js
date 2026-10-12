// Sección W economy. Aquí irá todo lo de gastos, ahorro y simuladores.
// Sus datos se guardarán bajo la clave "economy" (ver js/core/store.js).

import { MODULES } from '../../core/modules.js';
import { renderUnderConstruction } from '../../screens/placeholder.js';

export function render(container) {
  renderUnderConstruction(container, MODULES.find((m) => m.id === 'economy'));
}
