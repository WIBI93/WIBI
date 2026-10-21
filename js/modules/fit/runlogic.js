// Lógica de running: guardar una carrera importada, XP y récords.

import { getFit, updateFit } from './data.js';
import { keyOf } from './dates.js';
import { summarize } from './gpx.js';
import { levelInfo, totalXp } from './engine.js';
import { uid } from './gymlogic.js';

export const XP_RUN = 50;
export const XP_PR = 15;
export const MAX_PR = 3;

// Récords de la carrera frente a tus carreras anteriores (la primera vez es solo el punto de partida).
export function runPRs(fit, run, exceptId = null) {
  const prev = fit.run.runs.filter((r) => r.valid !== false && r.id !== exceptId);
  const prs = [];
  if (!prev.length) return prs;
  const maxPrev = (k) => Math.max(0, ...prev.map((r) => r[k] || 0));
  if (run.longestM > maxPrev('longestM')) prs.push('longestM');
  if (run.longestSec > maxPrev('longestSec')) prs.push('longestSec');
  for (const k of [1, 3, 5, 10]) {
    const t = run.best && run.best[k];
    if (!t) continue;
    const before = prev.map((r) => r.best && r.best[k]).filter(Boolean);
    if (before.length && t < Math.min(...before)) prs.push('best' + k);
  }
  return prs;
}

export function isDuplicate(fit, startedAt) {
  return fit.run.runs.some((r) => r.startedAt === startedAt);
}

// Guarda la carrera con sus tramos (ya revisados) y concede la XP.
export function saveRun({ analysis, segs, name, paceLimit }) {
  const before = getFit();
  const set = before.settings.run;
  const sum = summarize(segs, set.stopTol);
  const date = keyOf(new Date(analysis.startedAt));
  const run = {
    id: uid(), date, startedAt: analysis.startedAt, name: name || 'Carrera', paceLimit,
    ...sum, hrMax: analysis.hrMax, segs, splits: analysis.splits, best: analysis.best, route: analysis.route,
  };
  run.valid = run.runSec >= set.minRunMin * 60;
  const prs = run.valid ? runPRs(before, run) : [];
  const xpToday = before.run.runs.some((r) => r.date === date && r.valid && r.xp > 0);
  const log = [];
  if (run.valid && !xpToday) {
    log.push({ date, xp: XP_RUN, why: 'sesion', ref: run.id });
    prs.slice(0, MAX_PR).forEach((k) => log.push({ date, xp: XP_PR, why: 'record', ref: run.id, pr: k }));
  }
  run.xp = log.reduce((a, x) => a + x.xp, 0);
  run.prs = prs;
  const lvBefore = levelInfo(totalXp(before, 'run'));
  updateFit((f) => { f.run.runs.push(run); f.run.xpLog.push(...log); });
  const lvAfter = levelInfo(totalXp(getFit(), 'run'));
  return { run, levelUp: lvAfter.level > lvBefore.level ? lvAfter : null };
}

export const PR_NAMES = { longestM: 'Más distancia corriendo seguido', longestSec: 'Más tiempo corriendo seguido', best1: 'Mejor 1 km', best3: 'Mejor 3 km', best5: 'Mejor 5 km', best10: 'Mejor 10 km' };
