// Motor de W fit: semanas, racha, forma y niveles. Solo calcula; no guarda nada.

import { mondayKey, parseKey, addDaysKey, thisMonday, weeksBetween } from './dates.js';

export const SPORT_NAME = { gym: 'Gimnasio', run: 'Running' };

// Entrenos (gym) o carreras válidas (run) con su fecha.
export function sessionDates(fit, sport) {
  if (sport === 'gym') return fit.gym.sessions.filter((s) => s && s.date && s.valid !== false).map((s) => s.date);
  return fit.run.runs.filter((r) => r && r.date && r.valid !== false).map((r) => r.date);
}

export function countsByWeek(fit, sport) {
  const m = {};
  for (const d of sessionDates(fit, sport)) {
    const mk = mondayKey(parseKey(d));
    m[mk] = (m[mk] || 0) + 1;
  }
  return m;
}

export function firstWeek(fit, sport) {
  const ds = sessionDates(fit, sport).sort();
  return ds.length ? mondayKey(parseKey(ds[0])) : null;
}

export function isPaused(fit, sport, mk) {
  return fit.pauses[sport].some((p) => p.from <= mk && (p.to === null || mk <= p.to));
}

export function activePause(fit, sport, mk = thisMonday()) {
  return fit.pauses[sport].find((p) => p.from <= mk && (p.to === null || mk <= p.to)) || null;
}

// Objetivo de esa semana: 0 = pausa.
export function goalFor(fit, sport, mk) {
  if (isPaused(fit, sport, mk)) return 0;
  const p = fit.plans[mk];
  if (p && p[sport] !== undefined) return p[sport];
  return fit.settings[sport].goal;
}

export function hasPlan(fit, mk) {
  return !!fit.plans[mk];
}

// met | paused | future | current | unmet | comodin
export function weekStatus(fit, sport, mk, counts = countsByWeek(fit, sport), cur = thisMonday()) {
  const goal = goalFor(fit, sport, mk);
  if (goal === 0) return 'paused';
  if (mk > cur) return 'future';
  const n = counts[mk] || 0;
  if (n >= goal && n >= fit.settings[sport].minStreak) return 'met';
  if (mk === cur) return 'current';
  if (fit.comodines[sport].includes(mk)) return 'comodin';
  return 'unmet';
}

// Racha de semanas seguidas. Las pausas no la rompen ni suman.
export function streak(fit, sport) {
  const first = firstWeek(fit, sport);
  if (!first) return 0;
  const counts = countsByWeek(fit, sport);
  const cur = thisMonday();
  let n = 0;
  let mk = cur;
  for (let i = 0; i < 600 && mk >= first; i++, mk = addDaysKey(mk, -7)) {
    const st = weekStatus(fit, sport, mk, counts, cur);
    if (st === 'met') n++;
    else if (st === 'comodin' || st === 'paused') continue;
    else if (st === 'current') continue;
    else break;
  }
  return n;
}

const WEIGHTS = [0.18, 0.17, 0.15, 0.13, 0.12, 0.1, 0.08, 0.07];
export const FORMA_NAMES = [
  [80, 'A tope'],
  [60, 'En forma'],
  [40, 'En marcha'],
  [20, 'Calentando'],
  [0, 'Frío'],
];
export const formaName = (v) => FORMA_NAMES.find(([min]) => v >= min)[1];

// Forma 0–100 con las últimas 8 semanas cerradas (la más reciente pesa más).
export function forma(fit, sport) {
  const first = firstWeek(fit, sport);
  if (!first) return 0;
  const counts = countsByWeek(fit, sport);
  const habit = fit.settings[sport].goal;
  let acc = 0;
  let wsum = 0;
  for (let i = 0; i < 8; i++) {
    const mk = addDaysKey(thisMonday(), -7 * (i + 1));
    if (mk < first) continue;
    const st = weekStatus(fit, sport, mk, counts);
    const ratio = st === 'paused' || st === 'comodin' ? 1 : Math.min(1, (counts[mk] || 0) / habit);
    acc += WEIGHTS[i] * ratio;
    wsum += WEIGHTS[i];
  }
  if (!wsum) return 10;
  return Math.max(10, Math.round((acc / wsum) * 100));
}

// ---- Niveles ----
export const RANKS = ['Novato', 'Aprendiz', 'Constante', 'Atleta', 'Fuerte', 'Veterano', 'Élite', 'Maestro', 'Campeón', 'Leyenda', 'Titán'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
export const xpToReach = (n) => Math.round(60 * (Math.pow(n, 1.85) - 1));
const FOUNDER = 56;

export function levelFromXp(xp) {
  let n = Math.max(1, Math.floor(Math.pow(xp / 60 + 1, 1 / 1.85)));
  while (xpToReach(n + 1) <= xp) n++;
  while (n > 1 && xpToReach(n) > xp) n--;
  return n;
}

export function rankName(n) {
  if (n >= FOUNDER) return 'Titán Fundador';
  return `${RANKS[Math.floor((n - 1) / 5)]} ${ROMAN[(n - 1) % 5]}`;
}

export const totalXp = (fit, sport) => (fit[sport].xpLog || []).reduce((a, x) => a + (Number(x && x.xp) || 0), 0);

export function levelInfo(xp) {
  const n = levelFromXp(xp);
  const from = xpToReach(n);
  const to = xpToReach(n + 1);
  const stars = n >= FOUNDER ? Math.floor((xp - xpToReach(FOUNDER)) / 10000) : 0;
  return { level: n, name: rankName(n), xp, from, to, pct: Math.min(100, Math.round(((xp - from) / (to - from)) * 100)), stars };
}

// Semana actual: cuántas sesiones hay hechas y cuál es el objetivo.
export function weekProgress(fit, sport, mk = thisMonday()) {
  const done = countsByWeek(fit, sport)[mk] || 0;
  return { done, goal: goalFor(fit, sport, mk), paused: isPaused(fit, sport, mk) };
}

export { weeksBetween };

// Mejor racha de semanas seguidas que has tenido alguna vez, y semanas cumplidas en total.
export function streakStats(fit, sport) {
  const first = firstWeek(fit, sport);
  if (!first) return { best: 0, total: 0 };
  const counts = countsByWeek(fit, sport);
  const cur = thisMonday();
  let run = 0;
  let best = 0;
  let total = 0;
  for (let mk = first; mk <= cur; mk = addDaysKey(mk, 7)) {
    const st = weekStatus(fit, sport, mk, counts, cur);
    if (st === 'met') { run++; total++; best = Math.max(best, run); }
    else if (st === 'comodin' || st === 'paused' || st === 'current') continue;
    else run = 0;
  }
  return { best, total };
}

// Comodines de racha: 1 al mes, se pueden guardar hasta 2. Devuelve cuántos tienes ahora.
export function comodinBank(fit, sport) {
  const first = firstWeek(fit, sport);
  if (!first) return 0;
  const fd = parseKey(first);
  const now = new Date();
  const used = fit.comodines[sport].map((mk) => { const d = parseKey(mk); return d.getFullYear() * 12 + d.getMonth(); });
  let bank = 0;
  for (let k = fd.getFullYear() * 12 + fd.getMonth(); k <= now.getFullYear() * 12 + now.getMonth(); k++) {
    bank = Math.min(2, bank + 1);
    bank = Math.max(0, bank - used.filter((u) => u === k).length);
  }
  return bank;
}

// Última semana cerrada que no cumpliste y en la que aún puedes usar el comodín (últimas 8).
export function comodinCandidate(fit, sport) {
  const first = firstWeek(fit, sport);
  if (!first) return null;
  const counts = countsByWeek(fit, sport);
  for (let i = 1; i <= 8; i++) {
    const mk = addDaysKey(thisMonday(), -7 * i);
    if (mk < first) break;
    if (weekStatus(fit, sport, mk, counts) === 'unmet') return mk;
  }
  return null;
}

// ---- Tope de pausas: máximo 20 días cada 3 meses ----
// Las pausas son por semanas completas, así que en la práctica caben 2 semanas (14 días) en cualquier tramo de 13 semanas.
export const PAUSE_MAX_WEEKS = 2;
export const PAUSE_WINDOW_WEEKS = 13;

export function pausedWeeks(fit, sport) {
  const set = new Set();
  const end = thisMonday();
  for (const p of fit.pauses[sport]) {
    let mk = p.from;
    const to = p.to === null ? end : p.to;
    for (let i = 0; i < 200 && mk <= to; i++, mk = addDaysKey(mk, 7)) set.add(mk);
  }
  for (const [mk, pl] of Object.entries(fit.plans)) if (pl[sport] === 0) set.add(mk);
  return set;
}

// ¿Se puede añadir esta pausa sin pasarse del tope? Devuelve { ok, free } (free = semanas que aún caben ahora).
export function canPause(fit, sport, newMks) {
  const all = [...new Set([...pausedWeeks(fit, sport), ...newMks])].sort();
  for (let i = 0; i < all.length; i++) {
    const inWin = all.filter((mk) => mk >= all[i] && weeksBetween(all[i], mk) < PAUSE_WINDOW_WEEKS).length;
    if (inWin > PAUSE_MAX_WEEKS) return { ok: false };
  }
  return { ok: true };
}
export function pauseWeeksFree(fit, sport, startMk) {
  let n = 0;
  for (let k = 1; k <= PAUSE_MAX_WEEKS; k++) {
    const mks = Array.from({ length: k }, (_, i) => addDaysKey(startMk, 7 * i));
    if (canPause(fit, sport, mks).ok) n = k; else break;
  }
  return n;
}
