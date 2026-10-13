// Formato de dinero y fechas (estilo español: 1.234,56 €).

export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pad = (n) => String(n).padStart(2, '0');

function group(intStr) {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// 1573.98 -> "1.573,98 €"
export function money(n, { sign = false } = {}) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  const abs = Math.abs(v);
  const [i, d] = abs.toFixed(2).split('.');
  const prefix = v < 0 ? '−' : sign && v > 0 ? '+' : '';
  return `${prefix}${group(i)},${d} €`;
}
// Sin decimales si es un número entero (1.000 €), con decimales si no.
export function moneyAuto(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return Number.isInteger(v) ? `${v < 0 ? '−' : ''}${group(String(Math.abs(v)))} €` : money(v);
}
export function pct(n, dec = 0) {
  return `${(Number(n) || 0).toFixed(dec).replace('.', ',')} %`;
}
// Texto escrito por la persona -> número. Admite "1.234,56", "1234.56", "24,5". Devuelve NaN si no es válido.
export function parseMoney(text) {
  let s = String(text ?? '').replace(/[€\s]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  if (!/^-?\d*\.?\d+$/.test(s)) return NaN;
  return Number(s);
}
// Número -> texto para meter en un campo ("24,5"; vacío si es 0).
export function toInput(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return v === 0 ? '' : String(v).replace('.', ',');
}

export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const monthKeyOf = (key) => key.slice(0, 7);
export const currentMonthKey = () => monthKeyOf(dateKey());
export function shiftMonthKey(mk, delta) {
  const [y, m] = mk.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
export function monthTitle(mk) {
  const [y, m] = mk.split('-').map(Number);
  return `${cap(MONTHS[m - 1])} ${y}`;
}
export function monthName(mk) { return MONTHS[Number(mk.slice(5, 7)) - 1]; }
const parts = (key) => { const [y, m, d] = key.split('-').map(Number); return { y, m, d }; };
// "9 de octubre"
export function dayLong(key) { const p = parts(key); return `${p.d} de ${MONTHS[p.m - 1]}`; }
// "Hoy, 12 de octubre" si es hoy
export function dayLabel(key) { return key === dateKey() ? `Hoy, ${dayLong(key)}` : dayLong(key); }
// "HOY · 12 OCT" / "9 OCT"
export function dayHeader(key) {
  const p = parts(key);
  const s = `${p.d} ${MONTHS[p.m - 1].slice(0, 3).toUpperCase()}`;
  return key === dateKey() ? `HOY · ${s}` : s;
}
export function lastDayOfMonth(mk) {
  const [y, m] = mk.split('-').map(Number);
  return `${mk}-${pad(new Date(y, m, 0).getDate())}`;
}
// Fecha por defecto al añadir algo mientras se mira el mes mk: hoy si es el mes actual, si no el último día de ese mes.
export function defaultDateFor(mk) {
  return mk === currentMonthKey() ? dateKey() : lastDayOfMonth(mk);
}
