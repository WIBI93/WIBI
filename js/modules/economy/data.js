// Datos de economía: lectura, limpieza y cambios. Se guardan bajo la clave "economy".
// IMPORTANTE: aquí NO hay ninguna cantidad de dinero. Todo empieza en 0 / vacío y se
// rellena solo con lo que la persona escribe al usar la app. Las categorías y los
// gastos fijos son solo nombres genéricos de ejemplo, sin importes.

import { load, save } from '../../core/store.js';
import { HEX_RE } from '../../core/palette.js';

const KEY = 'economy';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const OTROS = 'otros';
export const CAT_COLORS = ['#17594A', '#E0A33A', '#4A9DB5', '#7A6AA8', '#C76B8A', '#9A5A45', '#3F5650', '#2F5D78', '#8A6A1F', '#5E557F'];
export const ACCOUNT_TYPES = { remunerada: 'Cuenta remunerada', fondo: 'Fondo', pensiones: 'Plan de pensiones', otro: 'Otro' };
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const DEFAULT_CATS = [
  ['vivienda', 'Vivienda', '#17594A'], ['coche', 'Coche', '#2F5D78'], ['supermercado', 'Supermercado', '#7A6AA8'], ['ocio', 'Ocio', '#C76B8A'],
  ['ropa', 'Ropa', '#E0A33A'], ['otras-compras', 'Otras compras', '#4A9DB5'], ['seguros', 'Seguros', '#3F5650'],
  ['suscripciones', 'Suscripciones', '#9A5A45'], ['salud', 'Salud', '#8A6A1F'], ['viajes', 'Viajes', '#5E557F'],
];
const DEFAULT_FIXED = [
  ['Alquiler', 'vivienda', 'monthly'], ['Agua', 'vivienda', 'monthly'], ['Luz', 'vivienda', 'monthly'], ['Gas', 'vivienda', 'monthly'],
  ['Internet', 'vivienda', 'monthly'], ['Comunidad', 'vivienda', 'monthly'], ['Seguro hogar', 'vivienda', 'monthly'], ['Móvil', 'vivienda', 'monthly'],
  ['Seguro', 'coche', 'monthly'], ['Averías', 'coche', 'occasional'], ['ITV', 'coche', 'occasional'],
];

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v, dec = 2) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** dec;
  return Math.round(n * f) / f;
};
const pos = (v) => Math.max(0, num(v));
const arr = (v) => (Array.isArray(v) ? v : []);

function defaults() {
  return {
    version: 1,
    setupDone: false,
    categories: [...DEFAULT_CATS.map(([id, name, color]) => ({ id, name, color })), { id: OTROS, name: 'Otros', color: '#B9C7C1' }],
    fixed: DEFAULT_FIXED.map(([name, cat, freq], i) => ({ id: 'fx' + i, name, cat, freq })), // ids fijos: así no cambian entre lecturas
    incomeTypes: ['Sueldo', 'Otros ingresos'],
    expenses: [], incomes: [], accounts: [], movements: [], cushion: 0,
    sim: {},
  };
}

export function normalize(raw) {
  if (!raw || typeof raw !== 'object') return defaults();
  const base = defaults();
  // Si en lo guardado faltan las categorías o los fijos (nunca se tocaron), se usan los de ejemplo.
  const r = { ...raw, categories: raw.categories === undefined ? base.categories : raw.categories, fixed: raw.fixed === undefined ? base.fixed : raw.fixed };
  const seen = new Set();
  let categories = arr(r.categories).map((c) => {
    if (!c || typeof c !== 'object') return null;
    const id = str(c.id, 40);
    const name = str(c.name, 30);
    if (!id || !name || seen.has(id)) return null;
    seen.add(id);
    return { id, name, color: typeof c.color === 'string' && HEX_RE.test(c.color) ? c.color.toUpperCase() : CAT_COLORS[0] };
  }).filter(Boolean);
  if (!seen.has(OTROS)) categories.push({ id: OTROS, name: 'Otros', color: '#B9C7C1' });
  const catId = (v) => (seen.has(v) ? v : OTROS);

  const ids = new Set();
  const uniq = (v) => { const id = str(v, 40); if (!id || ids.has(id)) return null; ids.add(id); return id; };

  const fixed = arr(r.fixed).map((f) => {
    const id = f && uniq(f.id);
    const name = f && str(f.name, 40);
    return id && name ? { id, name, cat: catId(f.cat), freq: f.freq === 'occasional' ? 'occasional' : 'monthly' } : null;
  }).filter(Boolean);
  const fixedIds = new Set(fixed.map((f) => f.id));

  const expenses = arr(r.expenses).map((e) => {
    const id = e && uniq(e.id);
    if (!id || !DATE_RE.test(e.date)) return null;
    return { id, date: e.date, amount: pos(e.amount), cat: catId(e.cat), note: str(e.note, 80), fixedId: fixedIds.has(e.fixedId) ? e.fixedId : null, fixedName: str(e.fixedName, 40) };
  }).filter(Boolean);

  const incomes = arr(r.incomes).map((e) => {
    const id = e && uniq(e.id);
    if (!id || !DATE_RE.test(e.date)) return null;
    return { id, date: e.date, amount: pos(e.amount), type: str(e.type, 30) || 'Ingreso', note: str(e.note, 80) };
  }).filter(Boolean);

  const accounts = arr(r.accounts).map((a) => {
    const id = a && uniq(a.id);
    const name = a && str(a.name, 40);
    if (!id || !name) return null;
    return {
      id, name,
      type: Object.keys(ACCOUNT_TYPES).includes(a.type) ? a.type : 'otro',
      term: a.term === 'largo' ? 'largo' : 'medio',
      balance: num(a.balance), contributed: num(a.contributed), rate: num(a.rate, 4), monthly: pos(a.monthly),
    };
  }).filter(Boolean);
  const accIds = new Set(accounts.map((a) => a.id));

  const movements = arr(r.movements).map((m) => {
    const id = m && uniq(m.id);
    if (!id || !DATE_RE.test(m.date) || !accIds.has(m.accId)) return null;
    const kind = ['contrib', 'withdraw', 'adjust', 'value'].includes(m.kind) ? m.kind : 'contrib';
    return {
      id, date: m.date, accId: m.accId,
      kind,
      amount: num(m.amount), delta: num(m.delta), dContrib: num(m.dContrib), note: str(m.note, 80),
      fromSalary: m.fromSalary === true && kind === 'contrib',
    };
  }).filter(Boolean);

  const incomeTypes = [...new Set(arr(r.incomeTypes).map((t) => str(t, 30)).filter(Boolean))];
  const sim = r.sim && typeof r.sim === 'object' ? r.sim : {};
  return {
    version: 1, setupDone: r.setupDone === true, categories, fixed, expenses, incomes, accounts, movements,
    incomeTypes: incomeTypes.length ? incomeTypes : ['Sueldo', 'Otros ingresos'],
    cushion: pos(r.cushion), sim,
  };
}

export const getData = () => normalize(load(KEY));
export const saveData = (d) => save(KEY, d);
export function update(fn) {
  const d = getData();
  fn(d);
  saveData(d);
  return d;
}
// ¿Es un gasto fijo? (aunque el fijo ya se haya quitado de la lista)
export const isFixedExp = (e) => !!(e.fixedId || e.fixedName);
export function removeFixed(d, id) {
  const f = d.fixed.find((x) => x.id === id);
  if (!f) return;
  d.expenses.forEach((e) => { if (e.fixedId === id) { e.fixedName = f.name; e.fixedId = null; } });
  d.fixed = d.fixed.filter((x) => x.id !== id);
}
export const catOf = (d, id) => d.categories.find((c) => c.id === id) || d.categories.find((c) => c.id === OTROS);

export function addCategory(d, name) {
  const clean = str(name, 30);
  if (!clean) return null;
  const hit = d.categories.find((c) => c.name.toLowerCase() === clean.toLowerCase());
  if (hit) return hit;
  const cat = { id: uid(), name: clean, color: CAT_COLORS[d.categories.length % CAT_COLORS.length] };
  d.categories.splice(d.categories.length - 1, 0, cat); // "Otros" siempre al final
  return cat;
}
export function removeCategory(d, id) {
  if (id === OTROS) return;
  d.categories = d.categories.filter((c) => c.id !== id);
  d.expenses.forEach((e) => { if (e.cat === id) e.cat = OTROS; });
  d.fixed.forEach((f) => { if (f.cat === id) f.cat = OTROS; });
}

// ---- Movimientos de ahorro: cada uno recuerda cuánto cambió el saldo para poder deshacerse ----

function apply(acc, m) { acc.balance = num(acc.balance + m.delta); acc.contributed = num(acc.contributed + m.dContrib); }
function revert(acc, m) { acc.balance = num(acc.balance - m.delta); acc.contributed = num(acc.contributed - m.dContrib); }

// kind: contrib | withdraw | adjust (medio: amount = saldo nuevo) | value (largo: amount = valor nuevo)
export function addMovement(d, { accId, kind, amount, date, note, fromSalary }) {
  const acc = d.accounts.find((a) => a.id === accId);
  if (!acc) return null;
  const m = { id: uid(), date, accId, kind, amount: num(amount), delta: 0, dContrib: 0, note: str(note, 80), fromSalary: kind === 'contrib' && fromSalary === true };
  if (kind === 'contrib') { m.delta = m.amount; m.dContrib = m.amount; }
  else if (kind === 'withdraw') { m.delta = -m.amount; m.dContrib = -Math.min(m.amount, Math.max(0, acc.contributed)); }
  else { m.delta = num(m.amount - acc.balance); }
  apply(acc, m);
  d.movements.push(m);
  return m;
}
export function removeMovement(d, id) {
  const m = d.movements.find((x) => x.id === id);
  if (!m) return;
  const acc = d.accounts.find((a) => a.id === m.accId);
  if (acc) revert(acc, m);
  d.movements = d.movements.filter((x) => x.id !== id);
}
// Solo aportaciones y retiradas pueden cambiar de importe; de los ajustes solo la fecha y la nota.
export function editMovement(d, id, { amount, date, note, fromSalary }) {
  const m = d.movements.find((x) => x.id === id);
  if (!m) return;
  const acc = d.accounts.find((a) => a.id === m.accId);
  if (m.kind === 'contrib' || m.kind === 'withdraw') {
    if (acc) revert(acc, m);
    m.amount = num(amount);
    m.delta = m.kind === 'contrib' ? m.amount : -m.amount;
    m.dContrib = m.kind === 'contrib' ? m.amount : -Math.min(m.amount, Math.max(0, acc ? acc.contributed : 0));
    if (acc) apply(acc, m);
  }
  if (m.kind === 'contrib' && typeof fromSalary === 'boolean') m.fromSalary = fromSalary;
  m.date = date;
  m.note = str(note, 80);
}
export function removeAccount(d, id) {
  d.accounts = d.accounts.filter((a) => a.id !== id);
  d.movements = d.movements.filter((m) => m.accId !== id);
}
export function resetAll() {
  save(KEY, defaults());
}
