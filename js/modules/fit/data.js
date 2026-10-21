// Datos de W fit: lectura, limpieza y cambios. Todo se guarda bajo la clave "fit".
// Aquí NO hay ningún dato personal: todo empieza vacío y se llena con lo que tú vayas apuntando.
// No se escribe nada hasta que haces un cambio (solo abrir la sección no guarda nada).

import { load, save, remove } from '../../core/store.js';
import { DATE_RE } from './dates.js';

const KEY = 'fit';
export const SPORTS = ['gym', 'run'];

const int = (v, min, max, def) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};
const dateOr = (v, def = null) => (typeof v === 'string' && DATE_RE.test(v) ? v : def);

export function defaults() {
  return {
    v: 1,
    settings: {
      guinos: true,
      accent: 'red', // acento del gimnasio: 'red' o 'lima'
      bodyWeight: null, // peso corporal opcional, en kg
      gym: { goal: 3, minStreak: 1, restSecs: 90 },
      run: { goal: 2, minStreak: 1, paceLimit: 570, minRunMin: 8, stopTol: 30, reviewImport: true },
    },
    plans: {}, // lunes de la semana -> { gym: n, run: n } (0 = esa semana en pausa)
    pauses: { gym: [], run: [] }, // { from: lunes, to: lunes | null }
    comodines: { gym: [], run: [] }, // semanas en las que se ha usado el comodín
    goals: [], // metas propias (máx. 5 activas por deporte)
    awarded: {}, // id de medalla -> fecha en la que se consiguió (se guarda aparte: no se pierde)
    gym: { sessions: [], xpLog: [], routines: [], custom: [], hidden: [], renames: {}, draft: null },
    run: { runs: [], xpLog: [], plan: null },
  };
}

function normPlans(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [mk, p] of Object.entries(raw)) {
    if (!DATE_RE.test(mk) || !p || typeof p !== 'object') continue;
    const plan = {};
    for (const s of SPORTS) if (p[s] !== undefined) plan[s] = int(p[s], 0, 14, 0);
    if (Object.keys(plan).length) out[mk] = plan;
  }
  return out;
}

function normPauses(raw) {
  const out = { gym: [], run: [] };
  for (const s of SPORTS) {
    const list = raw && Array.isArray(raw[s]) ? raw[s] : [];
    for (const p of list) {
      if (!p || !dateOr(p.from)) continue;
      const to = p.to === null || p.to === undefined ? null : dateOr(p.to);
      if (p.to !== null && p.to !== undefined && !to) continue;
      out[s].push({ from: p.from, to });
    }
  }
  return out;
}

const normSet = (raw) => ({
  gym: (raw && Array.isArray(raw.gym) ? raw.gym : []).filter((d) => dateOr(d)),
  run: (raw && Array.isArray(raw.run) ? raw.run : []).filter((d) => dateOr(d)),
});

export function normalize(raw) {
  const d = defaults();
  const r = raw && typeof raw === 'object' ? raw : {};
  const s = r.settings && typeof r.settings === 'object' ? r.settings : {};
  const g = s.gym && typeof s.gym === 'object' ? s.gym : {};
  const u = s.run && typeof s.run === 'object' ? s.run : {};
  d.settings = {
    guinos: s.guinos !== false,
    accent: s.accent === 'lima' ? 'lima' : 'red',
    bodyWeight: Number.isFinite(Number(s.bodyWeight)) && Number(s.bodyWeight) > 20 && Number(s.bodyWeight) < 400 ? Number(s.bodyWeight) : null,
    gym: { goal: int(g.goal, 1, 7, 3), minStreak: 1, restSecs: int(g.restSecs, 15, 600, 90) },
    run: {
      goal: int(u.goal, 1, 7, 2),
      minStreak: 1,
      paceLimit: int(u.paceLimit, 360, 720, 570),
      minRunMin: int(u.minRunMin, 1, 60, 8),
      stopTol: int(u.stopTol, 0, 120, 30),
      reviewImport: u.reviewImport !== false,
    },
  };
  d.settings.gym.minStreak = int(g.minStreak, 1, d.settings.gym.goal, 1);
  d.settings.run.minStreak = int(u.minStreak, 1, d.settings.run.goal, 1);
  d.plans = normPlans(r.plans);
  d.pauses = normPauses(r.pauses);
  d.comodines = normSet(r.comodines);
  d.goals = (Array.isArray(r.goals) ? r.goals : []).filter((g) => g && typeof g.id === 'string' && SPORTS.includes(g.sport) && typeof g.name === 'string' && typeof g.type === 'string' && Number.isFinite(Number(g.target))).map((g) => ({ id: g.id, sport: g.sport, name: g.name.slice(0, 60), type: g.type, target: Number(g.target), exId: typeof g.exId === 'string' ? g.exId : null, deadline: dateOr(g.deadline), created: dateOr(g.created, null), done: dateOr(g.done) }));
  if (r.awarded && typeof r.awarded === 'object') {
    for (const [id, date] of Object.entries(r.awarded)) if (dateOr(date)) d.awarded[id] = date;
  }
  // Las listas de entrenos y carreras las completan las etapas siguientes; aquí solo se conservan.
  d.gym = { ...d.gym, ...(r.gym && typeof r.gym === 'object' ? r.gym : {}) };
  d.run = { ...d.run, ...(r.run && typeof r.run === 'object' ? r.run : {}) };
  d.gym.sessions = Array.isArray(d.gym.sessions) ? d.gym.sessions : [];
  d.gym.xpLog = Array.isArray(d.gym.xpLog) ? d.gym.xpLog : [];
  for (const k of ['routines', 'custom', 'hidden']) d.gym[k] = Array.isArray(d.gym[k]) ? d.gym[k] : [];
  d.gym.renames = d.gym.renames && typeof d.gym.renames === 'object' && !Array.isArray(d.gym.renames) ? d.gym.renames : {};
  d.gym.draft = d.gym.draft && typeof d.gym.draft === 'object' && Array.isArray(d.gym.draft.exercises) ? d.gym.draft : null;
  d.run.runs = Array.isArray(d.run.runs) ? d.run.runs : [];
  d.run.xpLog = Array.isArray(d.run.xpLog) ? d.run.xpLog : [];
  const pl = d.run.plan;
  d.run.plan = pl && typeof pl === 'object' && typeof pl.id === 'string' && dateOr(pl.start) ? { id: pl.id, start: pl.start, done: pl.done && typeof pl.done === 'object' ? pl.done : {} } : null;
  return d;
}

export function getFit() {
  return normalize(load(KEY));
}

export function updateFit(fn) {
  const fit = getFit();
  fn(fit);
  const clean = normalize(fit);
  save(KEY, clean);
  return clean;
}

export function resetFit() {
  remove(KEY);
}

// Borra solo los datos de un deporte (sus entrenos o carreras, XP, pausas y ajustes propios).
export function resetSport(sport) {
  updateFit((f) => {
    const d = defaults();
    f[sport] = d[sport];
    f.pauses[sport] = [];
    f.comodines[sport] = [];
    f.settings[sport] = d.settings[sport];
    for (const mk of Object.keys(f.plans)) delete f.plans[mk][sport];
    for (const id of Object.keys(f.awarded)) if (id.startsWith(sport + '.')) delete f.awarded[id];
  });
}
