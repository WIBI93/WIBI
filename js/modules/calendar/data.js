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

export const MY_COLORS = 12;
export const DEFAULT_MY_COLORS = ['#F6CF6B', '#EE8B4F', '#D94F4F', '#C2456B', '#7A5AA6', '#3B3F8F', '#2D7FB8', '#5BB5D9', '#3AAFA9', '#2F7F63', '#A3B83A', '#6B7785'];

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

function normCalendar(c, i, seen) {
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
  const days = {};
  if (c.days && typeof c.days === 'object') {
    for (const [key, v] of Object.entries(c.days)) {
      if (!DATE_RE.test(key) || !v || typeof v !== 'object') continue;
      const shift = kindOf.has(v.shift) ? v.shift : null;
      const zone = shift && kindOf.get(shift) === 'work' && zoneIds.has(v.zone) ? v.zone : null;
      const swap = v.swap === true;
      const note = typeof v.note === 'string' ? v.note.slice(0, 500) : '';
      if (shift || swap || note.trim()) days[key] = { shift, zone, swap, note };
    }
  }
  return {
    id,
    name: str(c.name, 40) || 'Calendario',
    color: typeof c.color === 'string' && HEX_RE.test(c.color) ? c.color.toUpperCase() : CAL_COLORS[0].hex,
    shifts, zones, days,
  };
}

export function normalize(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const seen = new Set();
  let calendars = (Array.isArray(r.calendars) ? r.calendars : []).map((c, i) => normCalendar(c, i, seen)).filter(Boolean);
  if (!calendars.length) {
    calendars = [{ id: 'main', name: 'Calendario de trabajo', color: CAL_COLORS[0].hex, shifts: defaultShifts(), zones: [], days: {} }];
  }
  const holidays = {};
  if (r.holidays && typeof r.holidays === 'object') {
    for (const [k, v] of Object.entries(r.holidays)) if (DATE_RE.test(k)) holidays[k] = str(v, 60) || 'Festivo';
  }
  const hex = (x) => typeof x === 'string' && /^#[0-9a-fA-F]{6}$/.test(x);
  const mine = Array.isArray(r.myColors) ? r.myColors.filter(hex).map((x) => x.toUpperCase()).slice(0, MY_COLORS) : null;
  return {
    version: 1,
    myColors: mine && mine.length ? mine : DEFAULT_MY_COLORS.slice(),
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
  if (day.shift || day.swap || (day.note && day.note.trim())) cal.days[key] = day;
  else delete cal.days[key];
}
const blank = () => ({ shift: null, zone: null, swap: false, note: '' });

// shiftId vacío o null = dejar el día sin rellenar.
export function setShiftOnDay(cal, key, shiftId) {
  const day = { ...blank(), ...(cal.days[key] || {}) };
  const sh = cal.shifts.find((s) => s.id === shiftId);
  day.shift = sh ? sh.id : null;
  if (!sh || sh.kind !== 'work') day.zone = null;
  put(cal, key, day);
}

export function saveDay(cal, key, { shift, zone, swap, note }) {
  const sh = cal.shifts.find((s) => s.id === shift);
  put(cal, key, {
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
