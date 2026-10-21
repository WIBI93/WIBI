// Medallas del gimnasio (permanentes y de constancia), retos semanales y concesión de XP.

import { getFit, updateFit } from './data.js';
import { todayKey, thisMonday } from './dates.js';
import { rar, MEDAL_XP } from './medals.js';
import { weekProgress, streakStats, levelInfo, totalXp } from './engine.js';
import { sessionVolume, sessionSets, sessionReps } from './gymlogic.js';

const valid = (fit) => fit.gym.sessions.filter((s) => s.valid !== false);

// Cada familia: nombre, qué mide, escalones y cómo se calcula el valor con tu historial.
export const GYM_FAMILIES = [
  { id: 'entrenos', group: 'perm', name: 'Entrenamientos completados', unit: 'sesiones', glyph: 'two', steps: [1, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 750, 1000], value: (f) => valid(f).length },
  { id: 'volumen', group: 'perm', name: 'Volumen levantado (acumulado)', unit: 't', glyph: 'chart', steps: [1, 5, 10, 25, 50, 100, 200, 350, 500, 750, 1000, 2500, 5000], value: (f) => valid(f).reduce((a, s) => a + sessionVolume(s), 0) / 1000, decimals: 1 },
  { id: 'series', group: 'perm', name: 'Series totales', unit: 'series', glyph: 'bolt', steps: [50, 250, 500, 1000, 2500, 5000, 10000], value: (f) => valid(f).reduce((a, s) => a + sessionSets(s), 0) },
  { id: 'reps', group: 'perm', name: 'Repeticiones totales', unit: 'repeticiones', glyph: 'flame', steps: [500, 2500, 5000, 10000, 25000, 50000, 100000], value: (f) => valid(f).reduce((a, s) => a + sessionReps(s), 0) },
  { id: 'records', group: 'perm', name: 'Récords personales', unit: 'récords', glyph: 'star', steps: [1, 3, 5, 10, 20, 35, 50, 75, 100, 150, 200, 300, 500], value: (f) => valid(f).reduce((a, s) => a + (s.prs ? s.prs.length : 0), 0) },
  { id: 'distintos', group: 'perm', name: 'Ejercicios distintos probados', unit: 'ejercicios', glyph: 'target', steps: [5, 10, 20, 35, 50, 75, 100], value: (f) => new Set(valid(f).flatMap((s) => s.exercises.map((e) => e.exId))).size },
  { id: 'mejorses', group: 'perm', name: 'Sesión de más volumen', unit: 't', glyph: 'chart', steps: [3, 5, 8, 10, 15], value: (f) => Math.max(0, ...valid(f).map((s) => sessionVolume(s))) / 1000, decimals: 1 },
  { id: 'racha', group: 'const', name: 'Semanas seguidas cumpliendo tu objetivo', unit: 'semanas', glyph: 'flame', steps: [1, 2, 3, 4, 6, 8, 12, 16, 20, 26, 39, 52, 78, 104, 156, 208, 260], value: (f) => streakStats(f, 'gym').best },
  { id: 'cumplidas', group: 'const', name: 'Semanas cumplidas en total', unit: 'semanas', glyph: 'two', steps: [4, 8, 12, 26, 52, 104, 156, 208, 260, 390], value: (f) => streakStats(f, 'gym').total },
  { id: 'retos', group: 'const', name: 'Retos semanales completados', unit: 'retos', glyph: 'target', steps: [1, 5, 10, 25, 50, 100, 150, 200, 300, 500], value: (f) => Object.keys(f.awarded).filter((k) => k.startsWith('gym.reto.')).length },
];

export function familyMedals(fam) {
  const metals = rar(fam.steps.length);
  return fam.steps.map((n, i) => ({ id: `gym.${fam.id}.${n}`, family: fam.id, n, metal: metals[i], name: fam.name, unit: fam.unit, glyph: fam.glyph, shape: 'shield' }));
}
export const allGymMedals = () => GYM_FAMILIES.flatMap(familyMedals);

// ---- Reto semanal: cumplir el objetivo planificado (25 / 50 / 75 XP según el objetivo) ----
export const retoXp = (goal) => (goal >= 3 ? 75 : goal === 2 ? 50 : 25);
export function weeklyReto(fit, mk = thisMonday()) {
  const p = weekProgress(fit, 'gym', mk);
  const id = `gym.reto.${mk}`;
  return { id, mk, goal: p.goal, done: p.done, paused: p.paused, xp: retoXp(p.goal), complete: !p.paused && p.goal > 0 && p.done >= Math.max(p.goal, fit.settings.gym.minStreak), claimed: !!fit.awarded[id] };
}

// Concede lo que corresponda (reto de la semana y medallas nuevas) con su XP. Devuelve lo nuevo.
export function awardGym() {
  const out = { medals: [], reto: null, levelUp: null };
  const before = getFit();
  const lvBefore = levelInfo(totalXp(before, 'gym'));
  const today = todayKey();
  const reto = weeklyReto(before);
  updateFit((f) => {
    if (reto.complete && !reto.claimed) {
      f.awarded[reto.id] = today;
      f.gym.xpLog.push({ date: today, xp: reto.xp, why: 'reto', ref: reto.id });
      out.reto = reto;
    }
    // Un solo paso por vuelta: la XP de una medalla no cambia ninguna cifra de las familias.
    for (const fam of GYM_FAMILIES) {
      const v = fam.value(f);
      for (const m of familyMedals(fam)) {
        if (v >= m.n && !f.awarded[m.id]) {
          f.awarded[m.id] = today;
          f.gym.xpLog.push({ date: today, xp: MEDAL_XP[m.metal], why: 'medalla', ref: m.id });
          out.medals.push(m);
        }
      }
    }
  });
  const lvAfter = levelInfo(totalXp(getFit(), 'gym'));
  if (lvAfter.level > lvBefore.level) out.levelUp = lvAfter;
  return out;
}
