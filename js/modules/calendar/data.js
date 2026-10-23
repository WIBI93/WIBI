// Datos del calendario: lectura, limpieza y cambios. Todo se guarda bajo la clave "calendar".
// Aquí NO hay ningún dato personal: solo turnos genéricos de ejemplo. Las zonas empiezan vacías.

import { load, save } from '../../core/store.js';
import { HEX_RE } from '../../core/palette.js';

const KEY = 'calendar';
const KINDS = ['work', 'off', 'out'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const CAL_COLORS = [
  { name: 'Verde azulado', hex: '#0F766E' }, { name: 'Rosa', hex: '#C2456B' }, { name: 'Azul', hex: '#2D7FB8' },
  { name: 'Violeta', hex: '#7A5AA6' }, { name: 'Naranja', hex: '#EE8B4F' }, { name: 'Gris', hex: '#6B7785' },
];

export const SHIFT_COLORS = [
  ['Amarillo', '#F6CF6B'], ['Ámbar', '#F2A65A'], ['Naranja', '#EE8B4F'], ['Rojo anaranjado', '#E4572E'], ['Rojo', '#D94F4F'], ['Rosa', '#C2456B'],
  ['Rosa claro', '#E58FB2'], ['Magenta', '#B65FCF'], ['Violeta', '#7A5AA6'], ['Índigo', '#3B3F8F'], ['Azul fuerte', '#2D5FB8'], ['Azul', '#2D7FB8'],
  ['Celeste', '#5BB5D9'], ['Turquesa', '#3AAFA9'], ['Verde', '#2F7F63'], ['Verde claro', '#5FA05A'], ['Lima', '#A3B83A'], ['Marrón', '#8C6D3F'],
  ['Lila claro', '#C9CBEE'], ['Salvia', '#D9E4DF'], ['Arena', '#F3D9B1'], ['Rosa pálido', '#F7C6C6'], ['Gris', '#6B7785'], ['Azul noche', '#14202B'],
];

export const MY_COLORS = 6;
export const DEFAULT_MY_COLORS = ['#F6CF6B', '#EE8B4F', '#D94F4F', '#C2456B', '#7A5AA6', '#3B3F8F', '#2D7FB8', '#5BB5D9', '#3AAFA9', '#2F7F63', '#A3B83A', '#6B7785'];

// Causas de estrés que se ofrecen al puntuar un día con 7 o más (se pueden cambiar en Ajustes).
export const STRESS_MIN_CAUSE = 7;
export function defaultCauses() {
  return [['medicos', 'Médicos'], ['pacientes', 'Pacientes'], ['companeros', 'Compañeros'], ['organizacion', 'Organización'], ['supervisores', 'Supervisores'], ['dificultad', 'Dificultad de las tareas'], ['carga', 'Carga de trabajo']]
    .map(([id, name]) => ({ id, name, hidden: false }));
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function defaultShifts() {
  return [
    { id: 'm', name: 'Mañana', letter: 'M', start: '08:00', end: '14:00', color: '#F6CF6B', kind: 'work' },
    { id: 't', name: 'Tarde', letter: 'T', start: '14:00', end: '20:00', color: '#EE8B4F', kind: 'work' },
    { id: 'n', name: 'Noche', letter: 'N', start: '20:00', end: '08:00', color: '#3B3F8F', kind: 'work' },
    { id: 'd', name: 'Día', letter: 'D', start: '08:00', end: '20:00', color: '#2F7F63', kind: 'work' },
    { id: 's', name: 'Saliente', letter: 'S', start: '08:00', end: '08:00', color: '#C9CBEE', kind: 'out' },
    { id: 'l', name: 'Libre', letter: 'L', start: '08:00', end: '08:00', color: '#D9E4DF', kind: 'off' },
  ];
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function normShift(s, i, seen) {
  if (!s || typeof s !== 'object') return null;
  let id = str(s.id, 40) || 's' + i;
  if (seen.has(id)) return null;
  seen.add(id);
  const name = str(s.name, 30) || 'Turno';
  return {
    id,
    name,
    letter: str(s.letter, 2) || name.slice(0, 1).toUpperCase(),
    start: TIME_RE.test(s.start) ? s.start : '08:00',
    end: TIME_RE.test(s.end) ? s.end : '14:00',
    color: typeof s.color === 'string' && HEX_RE.test(s.color) ? s.color.toUpperCase() : '#6B7785',
    kind: KINDS.includes(s.kind) ? s.kind : 'work',
  };
}

// ---- Cambios de turno (bloc de notas): estados find → send → sent → ok ----
export const SWAP_STATES = ['find', 'send', 'sent', 'ok'];
function normSwaps(raw, kindOf) {
  const okDay = (o) => (o && typeof o === 'object' && DATE_RE.test(o.date) ? { date: o.date, shift: kindOf.has(o.shift) ? o.shift : null } : null);
  const seen = new Set();
  const uniq = (id, pre) => { let x = str(id, 40) || pre + uid(); while (seen.has(x)) x = pre + uid(); seen.add(x); return x; };
  return (Array.isArray(raw) ? raw : []).slice(0, 200).map((w) => {
    if (!w || typeof w !== 'object') return null;
    const free = okDay(w.free);
    if (!free) return null;
    const offers = (Array.isArray(w.offers) ? w.offers : []).slice(0, 20).map((o) => {
      const d = okDay(o);
      if (!d) return null;
      const people = (Array.isArray(o.people) ? o.people : []).slice(0, 60).map((q) => {
        const name = q && typeof q === 'object' ? str(q.name, 40) : '';
        return name ? { id: uniq(q.id, 'p'), name, s: ['ask', 'no', 'yes'].includes(q.s) ? q.s : 'ask' } : null;
      }).filter(Boolean);
      return { id: uniq(o.id, 'o'), ...d, people };
    }).filter(Boolean);
    const dd = w.deal && typeof w.deal === 'object' ? okDay(w.deal) : null;
    const who = dd ? str(w.deal.who, 40) : '';
    const deal = dd && who ? { who, ...dd } : null;
    const st = SWAP_STATES.includes(w.st) ? w.st : 'find';
    return { id: uniq(w.id, 'w'), free, st: st !== 'find' && !deal ? 'find' : st, offers, deal };
  }).filter(Boolean);
}

function normCalendar(c, i, seen, causeIds = new Set()) {
  if (!c || typeof c !== 'object') return null;
  const id = str(c.id, 40) || 'c' + i;
  if (seen.has(id)) return null;
  seen.add(id);
  const shiftIds = new Set();
  const shifts = (Array.isArray(c.shifts) ? c.shifts : []).map((s, k) => normShift(s, k, shiftIds)).filter(Boolean);
  const zoneIds = new Set();
  const zones = [];
  (Array.isArray(c.zones) ? c.zones : []).forEach((z, k) => {
    if (!z || typeof z !== 'object') return;
    const zid = str(z.id, 40) || 'z' + k;
    const name = str(z.name, 30);
    if (!name || zoneIds.has(zid)) return;
    zoneIds.add(zid);
    zones.push({ id: zid, name });
  });
  const kindOf = new Map(shifts.map((s) => [s.id, s.kind]));
  const swaps = normSwaps(c.swaps, kindOf);
  const days = {};
  if (c.days && typeof c.days === 'object') {
    for (const [key, v] of Object.entries(c.days)) {
      if (!DATE_RE.test(key) || !v || typeof v !== 'object') continue;
      const shift = kindOf.has(v.shift) ? v.shift : null;
      const zone = shift && kindOf.get(shift) === 'work' && zoneIds.has(v.zone) ? v.zone : null;
      const swap = v.swap === true;
      const note = typeof v.note === 'string' ? v.note.slice(0, 500) : '';
      const st = Number(v.stress);
      const stress = shift && kindOf.get(shift) === 'work' && Number.isInteger(st) && st >= 1 && st <= 10 ? st : null;
      const causes = stress && stress >= STRESS_MIN_CAUSE && Array.isArray(v.causes) ? [...new Set(v.causes.filter((x) => causeIds.has(x)))] : [];
      if (shift || swap || note.trim()) days[key] = { shift, zone, swap, note, stress, causes };
    }
  }
  return {
    id,
    name: str(c.name, 40) || 'Calendario',
    color: typeof c.color === 'string' && HEX_RE.test(c.color) ? c.color.toUpperCase() : CAL_COLORS[0].hex,
    shifts, zones, days, swaps,
  };
}

export function normalize(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const seen = new Set();
  const causeSeen = new Set();
  let stressCauses = (Array.isArray(r.stressCauses) ? r.stressCauses : []).map((x) => {
    const id = x && typeof x.id === 'string' ? x.id.slice(0, 40) : '';
    const name = x && typeof x.name === 'string' ? x.name.trim().slice(0, 30) : '';
    if (!id || !name || causeSeen.has(id)) return null;
    causeSeen.add(id);
    return { id, name, hidden: x.hidden === true };
  }).filter(Boolean);
  if (!Array.isArray(r.stressCauses)) stressCauses = defaultCauses();
  const causeIds = new Set(stressCauses.map((x) => x.id));
  let calendars = (Array.isArray(r.calendars) ? r.calendars : []).map((c, i) => normCalendar(c, i, seen, causeIds)).filter(Boolean);
  if (!calendars.length) {
    calendars = [{ id: 'main', name: 'Calendario de trabajo', color: CAL_COLORS[0].hex, shifts: defaultShifts(), zones: [], days: {}, swaps: [] }];
  }
  const holidays = {};
  if (r.holidays && typeof r.holidays === 'object') {
    for (const [k, v] of Object.entries(r.holidays)) if (DATE_RE.test(k)) holidays[k] = str(v, 60) || 'Festivo';
  }
  const hex = (x) => typeof x === 'string' && /^#[0-9a-fA-F]{6}$/.test(x);
  // Versión anterior guardaba 12 colores de ejemplo mezclados con los propios: se quitan los de ejemplo.
  const mine = Array.isArray(r.myColors) ? r.myColors.filter(hex).map((x) => x.toUpperCase()).filter((x) => !DEFAULT_MY_COLORS.includes(x)).slice(0, MY_COLORS) : [];
  return {
    version: 1,
    myColors: mine,
    stressCauses,
    activeId: calendars.some((c) => c.id === r.activeId) ? r.activeId : calendars[0].id,
    firstDay: r.firstDay === 0 ? 0 : 1,
    holidays,
    calendars,
  };
}

export const getData = () => normalize(load(KEY));
export const saveData = (d) => save(KEY, d);
export const activeCal = (d) => d.calendars.find((c) => c.id === d.activeId) || d.calendars[0];

// Aplica un cambio y lo guarda.
export function update(fn) {
  const d = getData();
  fn(d, activeCal(d));
  saveData(d);
  return d;
}

// ---- Cambios sobre días (trabajan sobre el calendario en memoria; luego se guarda) ----

function put(cal, key, day) {
  if (day.shift || day.swap || (day.note && day.note.trim()) || day.stress) cal.days[key] = day;
  else delete cal.days[key];
}
const blank = () => ({ shift: null, zone: null, swap: false, note: '', stress: null, causes: [] });

// shiftId vacío o null = dejar el día sin rellenar.
export function setShiftOnDay(cal, key, shiftId) {
  const day = { ...blank(), ...(cal.days[key] || {}) };
  const sh = cal.shifts.find((s) => s.id === shiftId);
  day.shift = sh ? sh.id : null;
  if (!sh || sh.kind !== 'work') { day.zone = null; day.stress = null; day.causes = []; }
  put(cal, key, day);
}

export function saveDay(cal, key, { shift, zone, swap, note, stress, causes }) {
  const sh = cal.shifts.find((s) => s.id === shift);
  const work = !!sh && sh.kind === 'work';
  const st = work && Number.isInteger(stress) && stress >= 1 && stress <= 10 ? stress : null;
  put(cal, key, {
    stress: st,
    causes: st && st >= STRESS_MIN_CAUSE && Array.isArray(causes) ? [...new Set(causes)] : [],
    shift: sh ? sh.id : null,
    zone: sh && sh.kind === 'work' && cal.zones.some((z) => z.id === zone) ? zone : null,
    swap: !!swap,
    note: note || '',
  });
}

export function countDaysWith(cal, field, id) {
  return Object.values(cal.days).filter((d) => d[field] === id).length;
}

export function removeShift(cal, id) {
  cal.shifts = cal.shifts.filter((s) => s.id !== id);
  for (const key of Object.keys(cal.days)) if (cal.days[key].shift === id) setShiftOnDay(cal, key, null);
}

export function removeZone(cal, id) {
  cal.zones = cal.zones.filter((z) => z.id !== id);
  for (const day of Object.values(cal.days)) if (day.zone === id) day.zone = null;
}

// ---- Causas de estrés (comunes a todos los calendarios) ----
export function addCause(d, name) {
  const clean = String(name || '').trim().slice(0, 30);
  if (!clean) return null;
  const hit = d.stressCauses.find((c) => c.name.toLowerCase() === clean.toLowerCase());
  if (hit) { hit.hidden = false; return hit; }
  const c = { id: uid(), name: clean, hidden: false };
  d.stressCauses.push(c);
  return c;
}
// Quitar solo la oculta de la lista: los días ya puntuados conservan su historial.
export function hideCause(d, id) {
  const c = d.stressCauses.find((x) => x.id === id);
  if (c) c.hidden = true;
}

// ---- Cambios de turno ----
export function newSwap(cal, date, shift) {
  const w = { id: 'w' + uid(), free: { date, shift: shift || null }, st: 'find', offers: [], deal: null };
  cal.swaps.unshift(w);
  return w;
}

// Nombres ya usados en este calendario (para sugerirlos al escribir).
export function swapNames(cal) {
  const set = new Set();
  cal.swaps.forEach((w) => { w.offers.forEach((o) => o.people.forEach((q) => set.add(q.name))); if (w.deal) set.add(w.deal.who); });
  return [...set].sort((a, b) => a.localeCompare(b, 'es'));
}

// Refleja un cambio aceptado en el calendario: el día que libras pasa a «libre» y el que devuelves a tu turno, ambos con la marca de cambio.
export function applySwapToCalendar(cal, w) {
  if (!w.deal) return;
  const off = cal.shifts.find((s) => s.kind === 'off');
  const mark = (key, shift) => {
    const cur = cal.days[key] || {};
    saveDay(cal, key, { shift, zone: null, swap: true, note: cur.note || '', stress: null, causes: [] });
  };
  mark(w.free.date, off ? off.id : null);
  mark(w.deal.date, w.deal.shift);
}
