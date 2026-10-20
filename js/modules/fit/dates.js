// Fechas de W fit. Las fechas se guardan como texto "AAAA-MM-DD" (hora local del móvil).
// Las semanas empiezan en lunes.

export const pad = (n) => String(n).padStart(2, '0');
export const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseKey(k) {
  const [y, m, d] = String(k).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const addDaysKey = (k, n) => keyOf(addDays(parseKey(k), n));

export function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
export const mondayKey = (d) => keyOf(mondayOf(d));
export const todayKey = () => keyOf(new Date());
export const thisMonday = () => mondayKey(new Date());

// Semanas completas entre dos lunes (negativo si b es anterior).
export function weeksBetween(aKey, bKey) {
  return Math.round((parseKey(bKey) - parseKey(aKey)) / (7 * 86400000));
}

const monthShort = (d) => d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');

// "19 – 25 oct" o "28 sep – 4 oct"
export function weekRangeText(mk) {
  const a = parseKey(mk);
  const b = addDays(a, 6);
  if (a.getMonth() === b.getMonth()) return `${a.getDate()} – ${b.getDate()} ${monthShort(b)}`;
  return `${a.getDate()} ${monthShort(a)} – ${b.getDate()} ${monthShort(b)}`;
}

export function longDateText(d = new Date()) {
  const t = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function shortDateText(k) {
  const d = parseKey(k);
  const t = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/[.,]/g, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function monthTitle(y, m) {
  const t = new Date(y, m, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
