// Estado de pantalla que se recuerda mientras la app está abierta (mes visto, etc.).
const now = new Date();
export const state = {
  y: now.getFullYear(),
  m: now.getMonth(),
  zoneScope: 'mes', // 'mes' | 'anio'
  stressScope: 'mes', // 'mes' | 'anio'
  hoursYear: now.getFullYear(),
  holidayYear: now.getFullYear(),
  brush: null, // id de turno, '' = borrar, null = aún sin elegir
};
export function shiftMonth(delta) {
  const d = new Date(state.y, state.m + delta, 1);
  state.y = d.getFullYear();
  state.m = d.getMonth();
}
export function toToday() {
  const t = new Date();
  state.y = t.getFullYear();
  state.m = t.getMonth();
}
export const isCurrentMonth = () => state.y === new Date().getFullYear() && state.m === new Date().getMonth();
