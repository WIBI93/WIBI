// Medallas secretas: se ven como «???» hasta que las consigues. Cada una da +50 XP.

import { parseKey, keyOf, addDays } from './dates.js';
import { sessionSets } from './gymlogic.js';

export const SECRET_XP = 50;
const dm = (k) => { const d = parseKey(k); return [d.getMonth() + 1, d.getDate()]; };
const dayN = (k) => Math.round(parseKey(k).getTime() / 86400000);
const hour = (ms) => new Date(ms).getHours() + new Date(ms).getMinutes() / 60;

// Entradas comunes: lista de {date, startedAt?, endedAt?, ...}
const consecutive3 = (dates) => { const s = new Set([...new Set(dates)].map(dayN)); return [...s].some((n) => s.has(n + 1) && s.has(n + 2)); };
const weekendBoth = (dates) => { const s = new Set(dates); return [...s].some((k) => parseKey(k).getDay() === 6 && s.has(keyOf(addDays(parseKey(k), 1)))); };
const onDay = (dates, m, d) => dates.some((k) => { const x = dm(k); return x[0] === m && x[1] === d; });

function base(e, get) {
  return [
    { id: 'anonuevo', name: 'Año nuevo', desc: 'Entrenar el 1 de enero', test: (f) => onDay(get(f).map((x) => x.date), 1, 1) },
    { id: 'navidad', name: 'Nochebuena o Navidad', desc: 'Entrenar el 24 o el 25 de diciembre', test: (f) => onDay(get(f).map((x) => x.date), 12, 24) || onDay(get(f).map((x) => x.date), 12, 25) },
    { id: 'madrugador', name: 'Madrugador', desc: 'Empezar antes de las 7:00', test: (f) => get(f).some((x) => x.startedAt && hour(x.startedAt) < 7) },
    { id: 'noctambulo', name: 'Noctámbulo', desc: 'Terminar después de las 22:00', test: (f) => get(f).some((x) => x.endedAt && hour(x.endedAt) >= 22) },
    { id: 'tres', name: 'Tres en tres', desc: '3 sesiones en 3 días seguidos', test: (f) => consecutive3(get(f).map((x) => x.date)) },
    { id: 'finde', name: 'Fin de semana completo', desc: 'Sábado y domingo seguidos', test: (f) => weekendBoth(get(f).map((x) => x.date)) },
    { id: 'viernes13', name: 'Viernes 13', desc: 'Entrenar un viernes 13', test: (f) => get(f).some((x) => { const d = parseKey(x.date); return d.getDay() === 5 && d.getDate() === 13; }) },
    { id: 'siete', name: 'Siete de la suerte', desc: 'Tu sesión número 77', test: (f) => get(f).length >= 77 },
  ];
}

const gymList = (f) => f.gym.sessions.filter((s) => s.valid !== false);
const runList = (f) => f.run.runs.filter((r) => r.valid !== false).map((r) => ({ ...r, endedAt: r.startedAt + (r.movingSec + r.stopSec) * 1000 }));

export const GYM_SECRETS = [
  ...base('gym', gymList),
  { id: 'bisiesto', name: '29 de febrero', desc: 'Entrenar un día bisiesto', test: (f) => onDay(gymList(f).map((x) => x.date), 2, 29) },
  { id: 'relampago', name: 'Sesión relámpago', desc: 'Sesión completa en menos de 25 minutos', test: (f) => gymList(f).some((s) => s.minutes < 25) },
  { id: 'maraton', name: 'Maratón de series', desc: '40 series en una sola sesión', test: (f) => gymList(f).some((s) => sessionSets(s) >= 40) },
  { id: 'triple', name: 'Récord triple', desc: '3 récords en una misma sesión', test: (f) => gymList(f).some((s) => (s.prs || []).length >= 3) },
  { id: 'todas', name: 'Todas las rutinas', desc: 'Hacer todas tus rutinas en una semana', test: (f) => {
    const rs = f.gym.routines.map((r) => r.id); if (rs.length < 2) return false;
    const by = {}; for (const s of gymList(f)) if (s.routineId) { const mk = keyOf(addDays(parseKey(s.date), -((parseKey(s.date).getDay() + 6) % 7))); (by[mk] = by[mk] || new Set()).add(s.routineId); }
    return Object.values(by).some((set) => rs.every((id) => set.has(id))); } },
];

export const RUN_SECRETS = [
  ...base('run', runList),
  { id: 'pi', name: 'Pi', desc: 'Una carrera de 3,14 km', test: (f) => runList(f).some((r) => r.distM >= 3120 && r.distM <= 3170) },
  { id: 'triple7', name: 'Triple 7', desc: '777 km acumulados corriendo', test: (f) => runList(f).reduce((a, r) => a + r.runM, 0) >= 777000 },
  { id: 'capicua', name: 'Capicúa', desc: '121 o 202 km acumulados', test: (f) => { const t = runList(f).reduce((a, r) => a + r.runM, 0) / 1000; return t >= 121 || t >= 202; } },
  { id: 'negative', name: 'Negative split', desc: 'Segunda mitad más rápida que la primera', test: (f) => runList(f).some((r) => { const s = r.splits || []; if (s.length < 2) return false; const h = Math.floor(s.length / 2); const a = s.slice(0, h).reduce((x, y) => x + y, 0) / h; const b = s.slice(s.length - h).reduce((x, y) => x + y, 0) / h; return b < a; }) },
];

export const COMMON_SECRETS = [
  { id: 'navidad2', name: 'Navidad en doble', desc: 'Gym y carrera el 24 o 25 de diciembre', test: (f) => ['12-24', '12-25'].some((x) => { const [m, d] = x.split('-').map(Number); return onDay(gymList(f).map((s) => s.date), m, d) && onDay(runList(f).map((s) => s.date), m, d); }) },
  { id: 'anonuevo2', name: 'Año nuevo en doble', desc: 'Gym y carrera el 1 de enero', test: (f) => onDay(gymList(f).map((s) => s.date), 1, 1) && onDay(runList(f).map((s) => s.date), 1, 1) },
  { id: 'semanaperfecta', name: 'Semana perfecta', desc: 'Cumplir los objetivos de los dos deportes en la misma semana', test: (f) => {
    const w = (list) => new Set(list.map((x) => keyOf(addDays(parseKey(x.date), -((parseKey(x.date).getDay() + 6) % 7)))));
    const g = w(gymList(f)); const r = w(runList(f)); return [...g].some((k) => r.has(k) && (f.plans[k] ? true : true)); } },
  { id: 'aniversario', name: 'Un año después', desc: 'Entrenar el mismo día que empezaste, un año más tarde', test: (f) => {
    const all = [...gymList(f), ...runList(f)].map((x) => x.date).sort(); if (!all.length) return false; const [m, d] = dm(all[0]); const y0 = parseKey(all[0]).getFullYear();
    return all.some((k) => { const x = parseKey(k); return x.getFullYear() > y0 && x.getMonth() + 1 === m && x.getDate() === d; }); } },
];
