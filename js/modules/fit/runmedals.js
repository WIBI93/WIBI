// Medallas de running (hexágonos), reto semanal y concesión de XP.

import { getFit, updateFit } from './data.js';
import { todayKey, thisMonday } from './dates.js';
import { rar, MEDAL_XP } from './medals.js';
import { weekProgress, streakStats, levelInfo, totalXp } from './engine.js';

const valid = (f) => f.run.runs.filter((r) => r.valid !== false);
const max = (f, k) => Math.max(0, ...valid(f).map((r) => r[k] || 0));

export const RUN_FAMILIES = [
  { id: 'km', group: 'perm', name: 'Kilómetros corridos (acumulado)', unit: 'km', glyph: 'run', steps: [5, 10, 25, 50, 100, 250, 500, 750, 1000, 1500, 2000, 2500, 3500, 5000], value: (f) => valid(f).reduce((a, r) => a + r.runM, 0) / 1000, decimals: 1 },
  { id: 'salidas', group: 'perm', name: 'Salidas completadas', unit: 'salidas', glyph: 'run', steps: [1, 3, 5, 10, 20, 35, 50, 75, 100, 150, 200, 300, 500, 750, 1000], value: (f) => valid(f).length },
  { id: 'seguidokm', group: 'perm', name: 'Corriendo seguido: distancia', unit: 'km', glyph: 'bolt', steps: [1, 2, 3, 5, 7.5, 10, 12, 15, 18, 21.1, 25, 30, 42.2], value: (f) => max(f, 'longestM') / 1000, decimals: 2 },
  { id: 'seguidomin', group: 'perm', name: 'Corriendo seguido: tiempo', unit: 'min', glyph: 'flame', steps: [2, 5, 10, 15, 20, 30, 45, 60, 90, 120], value: (f) => max(f, 'longestSec') / 60, decimals: 1 },
  { id: 'tiempo', group: 'perm', name: 'Tiempo corriendo (acumulado)', unit: 'min', glyph: 'chart', steps: [10, 30, 60, 180, 600, 1500, 3000, 6000, 15000], value: (f) => valid(f).reduce((a, r) => a + r.runSec, 0) / 60 },
  { id: 'racha', group: 'const', name: 'Semanas seguidas cumpliendo tu objetivo', unit: 'semanas', glyph: 'flame', steps: [1, 2, 3, 4, 6, 8, 12, 16, 20, 26, 39, 52, 78, 104, 156, 208, 260], value: (f) => streakStats(f, 'run').best },
  { id: 'cumplidas', group: 'const', name: 'Semanas cumplidas en total', unit: 'semanas', glyph: 'week', steps: [4, 8, 12, 26, 52, 104, 156, 208, 260, 390], value: (f) => streakStats(f, 'run').total },
  { id: 'retos', group: 'const', name: 'Retos semanales completados', unit: 'retos', glyph: 'target', steps: [1, 5, 10, 25, 50, 100, 150, 200, 300, 500], value: (f) => Object.keys(f.awarded).filter((k) => k.startsWith('run.reto.')).length },
];

export function familyMedals(fam) {
  const metals = rar(fam.steps.length);
  return fam.steps.map((n, i) => ({ id: `run.${fam.id}.${n}`, family: fam.id, n, metal: metals[i], name: fam.name, unit: fam.unit, glyph: fam.glyph, shape: 'hex' }));
}

export const retoXp = (goal) => (goal >= 3 ? 75 : goal === 2 ? 50 : 25);
export function weeklyReto(fit, mk = thisMonday()) {
  const p = weekProgress(fit, 'run', mk);
  const id = `run.reto.${mk}`;
  return { id, mk, goal: p.goal, done: p.done, paused: p.paused, xp: retoXp(p.goal), complete: !p.paused && p.goal > 0 && p.done >= Math.max(p.goal, fit.settings.run.minStreak), claimed: !!fit.awarded[id] };
}

export function awardRun() {
  const out = { medals: [], reto: null, levelUp: null };
  const before = getFit();
  const lvBefore = levelInfo(totalXp(before, 'run'));
  const today = todayKey();
  const reto = weeklyReto(before);
  updateFit((f) => {
    if (reto.complete && !reto.claimed) {
      f.awarded[reto.id] = today;
      f.run.xpLog.push({ date: today, xp: reto.xp, why: 'reto', ref: reto.id });
      out.reto = reto;
    }
    for (const fam of RUN_FAMILIES) {
      const v = fam.value(f);
      for (const m of familyMedals(fam)) {
        if (v >= m.n && !f.awarded[m.id]) {
          f.awarded[m.id] = today;
          f.run.xpLog.push({ date: today, xp: MEDAL_XP[m.metal], why: 'medalla', ref: m.id });
          out.medals.push(m);
        }
      }
    }
  });
  const lvAfter = levelInfo(totalXp(getFit(), 'run'));
  if (lvAfter.level > lvBefore.level) out.levelUp = lvAfter;
  return out;
}
