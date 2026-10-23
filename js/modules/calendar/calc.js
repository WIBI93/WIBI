// Cálculos del calendario: fechas, horas y recuentos. No toca la pantalla ni guarda nada.

export const INK = '#14202B'; // texto oscuro sobre colores claros
export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const pad = (n) => String(n).padStart(2, '0');
export const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m: m - 1, d };
}
export function todayKey() {
  const t = new Date();
  return dateKey(t.getFullYear(), t.getMonth(), t.getDate());
}
export const weekdayOf = (key) => { const p = parseKey(key); return new Date(p.y, p.m, p.d).getDay(); };
export function longDate(key) {
  const p = parseKey(key);
  return `${WEEKDAYS[weekdayOf(key)]} ${p.d} de ${MONTHS[p.m].toLowerCase()}`;
}
export function weekdayLetters(firstDay) {
  const l = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  return firstDay === 1 ? [...l.slice(1), l[0]] : l;
}
// Cuántas casillas vacías hay antes del día 1.
export function firstOffset(y, m, firstDay) {
  const wd = new Date(y, m, 1).getDay();
  return firstDay === 1 ? (wd + 6) % 7 : wd;
}

const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export function endsNextDay(shift) { return shift.kind === 'work' && toMin(shift.end) <= toMin(shift.start); }
// Horas de un turno (solo cuenta si es de trabajo). Inicio = fin significa 24 h.
export function shiftHours(shift) {
  if (!shift || shift.kind !== 'work') return 0;
  let diff = toMin(shift.end) - toMin(shift.start);
  if (diff <= 0) diff += 1440;
  return Math.round((diff / 60) * 100) / 100;
}
export function fmtHours(h) {
  const r = Math.round(h * 100) / 100;
  return `${String(r).replace('.', ',')} h`;
}
export function fmtTime(t) { const [h, m] = t.split(':'); return `${Number(h)}:${m}`; }
export function shiftDescription(s) {
  if (s.kind === 'off') return 'Día sin trabajar · 0 h';
  if (s.kind === 'out') return 'Saliente · 0 h (ya cuentan en el turno anterior)';
  return `${fmtTime(s.start)} – ${fmtTime(s.end)} · ${fmtHours(shiftHours(s))}`;
}

export const shiftMap = (cal) => new Map(cal.shifts.map((s) => [s.id, s]));

export function monthStats(cal, holidays, y, m) {
  const map = shiftMap(cal);
  const byShift = {};
  cal.shifts.forEach((s) => { byShift[s.id] = { days: 0, hours: 0 }; });
  const st = { worked: 0, hours: 0, off: 0, out: 0, unpainted: 0, fest: 0, byShift };
  for (let d = 1; d <= daysInMonth(y, m); d++) {
    const key = dateKey(y, m, d);
    const day = cal.days[key];
    const sh = day && day.shift ? map.get(day.shift) : null;
    if (!sh) { st.unpainted++; continue; }
    byShift[sh.id].days++;
    if (sh.kind === 'work') {
      const h = shiftHours(sh);
      st.worked++; st.hours += h; byShift[sh.id].hours += h;
      if (holidays[key]) st.fest++;
    } else if (sh.kind === 'off') st.off++;
    else st.out++;
  }
  st.hours = Math.round(st.hours * 100) / 100;
  return st;
}

// Estadísticas de un mes, o del año entero si m es null (suma los 12 meses).
export function periodStats(cal, holidays, y, m) {
  if (m != null) return monthStats(cal, holidays, y, m);
  const all = { worked: 0, hours: 0, off: 0, out: 0, unpainted: 0, fest: 0, byShift: {} };
  cal.shifts.forEach((s) => { all.byShift[s.id] = { days: 0, hours: 0 }; });
  for (let i = 0; i < 12; i++) {
    const s = monthStats(cal, holidays, y, i);
    ['worked', 'hours', 'off', 'out', 'fest'].forEach((k) => { all[k] += s[k]; });
    Object.keys(s.byShift).forEach((id) => { all.byShift[id].days += s.byShift[id].days; all.byShift[id].hours += s.byShift[id].hours; });
  }
  all.hours = Math.round(all.hours * 100) / 100;
  Object.values(all.byShift).forEach((b) => { b.hours = Math.round(b.hours * 100) / 100; });
  return all;
}

const prefix = (y, m) => (m == null ? `${y}-` : `${y}-${pad(m + 1)}-`);

// Veces en cada zona (mes, o año entero si m es null).
export function zoneCounts(cal, y, m) {
  const map = shiftMap(cal);
  const counts = {};
  cal.zones.forEach((z) => { counts[z.id] = 0; });
  const p = prefix(y, m);
  for (const [key, day] of Object.entries(cal.days)) {
    if (!key.startsWith(p) || !day.zone) continue;
    const sh = map.get(day.shift);
    if (sh && sh.kind === 'work' && key in cal.days && counts[day.zone] !== undefined) counts[day.zone]++;
  }
  return counts;
}

// Días trabajados que aún no tienen zona.
export function pendingDays(cal, y, m) {
  const map = shiftMap(cal);
  const p = prefix(y, m);
  return Object.keys(cal.days)
    .filter((key) => {
      const day = cal.days[key];
      const sh = map.get(day.shift);
      return key.startsWith(p) && sh && sh.kind === 'work' && !day.zone;
    })
    .sort();
}

// ---- Estrés ----
// Verde por debajo de 5, amarillo de 5 a menos de 7, naranja de 7 a menos de 8 y rojo desde 8.
export const STRESS_HEX = { g: '#4CAF7A', y: '#E8B63A', o: '#EE8B4F', r: '#D9483B' };
export function stressColor(v) { return v < 5 ? STRESS_HEX.g : v < 7 ? STRESS_HEX.y : v < 8 ? STRESS_HEX.o : STRESS_HEX.r; }
export const fmtAvg = (v) => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');

// Estadísticas de estrés de un mes (m = 0..11) o de un año entero (m = null).
export function stressStats(cal, y, m) {
  const p = prefix(y, m);
  const st = { count: 0, sum: 0, avg: 0, max: 0, high: 0, bands: [0, 0, 0, 0], causes: {}, byMonth: Array(12).fill(null).map(() => ({ n: 0, sum: 0 })) };
  for (const [key, day] of Object.entries(cal.days)) {
    if (!key.startsWith(p) || !day.stress) continue;
    st.count++; st.sum += day.stress; st.max = Math.max(st.max, day.stress);
    st.bands[day.stress < 5 ? 0 : day.stress < 7 ? 1 : day.stress < 8 ? 2 : 3]++;
    const mi = Number(key.slice(5, 7)) - 1;
    st.byMonth[mi].n++; st.byMonth[mi].sum += day.stress;
    if (day.stress >= 7) { st.high++; (day.causes || []).forEach((c) => { st.causes[c] = (st.causes[c] || 0) + 1; }); }
  }
  st.avg = st.count ? st.sum / st.count : 0;
  return st;
}

// Estrés por zona: media de los días con zona y estrés, y causas de los días de 7 o más.
export const ZONE_MIN_DAYS = 3;
export function zoneStress(cal, y, m) {
  const p = prefix(y, m);
  const out = {};
  for (const [key, day] of Object.entries(cal.days)) {
    if (!key.startsWith(p) || !day.stress || !day.zone) continue;
    const z = out[day.zone] || (out[day.zone] = { n: 0, sum: 0, high: 0, causes: {} });
    z.n++; z.sum += day.stress;
    if (day.stress >= 7) { z.high++; (day.causes || []).forEach((c) => { z.causes[c] = (z.causes[c] || 0) + 1; }); }
  }
  return out;
}

// Horas programadas en un año entero (los turnos de noche cuentan el día que empiezan).
export function yearHours(cal, y) {
  const map = shiftMap(cal);
  let hours = 0; let days = 0;
  for (const [key, day] of Object.entries(cal.days)) {
    if (!key.startsWith(`${y}-`)) continue;
    const sh = day.shift ? map.get(day.shift) : null;
    if (sh && sh.kind === 'work') { hours += shiftHours(sh); days++; }
  }
  return { hours: Math.round(hours * 100) / 100, days };
}

// ---------- Comparar dos calendarios ----------
export const COMPARE_KINDS = {
  free: { label: 'Libres juntos', color: '#2F9E6B' },
  same: { label: 'Mismo turno', color: '#3F6FD1' },
  one: { label: 'Uno libre', color: '#E0A020' },
  time: { label: 'Tiempo juntos', color: '#8A5AC8' },
};
const WAKE_FROM = 8 * 60, WAKE_TO = 23 * 60, MIN_SHARED = 120;

// Rato libre que comparten (de 8:00 a 23:00, mínimo 2 h) si al menos uno trabaja.
// Los turnos de noche y los salientes cuentan como descanso, no como tiempo libre.
function sharedWindow(a, b) {
  const rest = (s) => s.kind === 'out' || endsNextDay(s);
  if (rest(a) || rest(b)) return null;
  let free = [[WAKE_FROM, WAKE_TO]];
  [a, b].forEach((s) => {
    if (s.kind !== 'work') return;
    const st = toMin(s.start), en = toMin(s.end);
    free = free.flatMap(([f0, f1]) => {
      const out = [];
      if (st > f0) out.push([f0, Math.min(f1, st)]);
      if (en < f1) out.push([Math.max(f0, en), f1]);
      return out.filter((r) => r[1] > r[0]);
    });
  });
  const best = free.sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]))[0];
  return best && best[1] - best[0] >= MIN_SHARED ? { from: best[0], to: best[1] } : null;
}
// a y b son turnos (o null si el día no está rellenado). Devuelve { kind, win? }.
export function compareShifts(a, b) {
  if (!a || !b) return { kind: null };
  const aw = a.kind === 'work', bw = b.kind === 'work';
  if (a.kind === 'off' && b.kind === 'off') return { kind: 'free' };
  if (aw && bw && a.letter === b.letter && a.start === b.start && a.end === b.end) return { kind: 'same' };
  if ((aw && b.kind === 'off') || (bw && a.kind === 'off')) return { kind: 'one' };
  const win = aw || bw ? sharedWindow(a, b) : null;
  return win ? { kind: 'time', win } : { kind: null };
}
export const fmtMin = (x) => `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`;
