// Estado de pantalla que se recuerda mientras la app está abierta.
import { currentMonthKey } from './fmt.js';
export const state = {
  mk: currentMonthKey(), // mes que se está viendo
  filter: 'todos', // filtro de Movimientos
  tab: 'medio', // pestaña de Ahorro
};
