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
