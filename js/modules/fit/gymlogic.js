// Lógica del gimnasio: última vez, récords, volumen y guardado de entrenos con su XP.

import { getFit, updateFit } from './data.js';
import { todayKey } from './dates.js';
import { levelInfo, totalXp } from './engine.js';

export const XP_SESSION = 50;
export const XP_PR = 15;
export const MAX_PR = 3;
export const MIN_EXERCISES = 3;

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const num = (v) => {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
export const fmt = (n) => (Math.round(n * 10) / 10).toString().replace('.', ',');
// 1RM estimado (Epley) para comparar series distintas.
export const est1rm = (kg, reps) => kg * (1 + reps / 30);

const doneSets = (ex) => (ex.sets || []).filter((s) => s.done && num(s.reps) > 0);

export function sessionVolume(sess) {
  let v = 0;
  for (const ex of sess.exercises) for (const s of doneSets(ex)) v += num(s.kg) * num(s.reps);
  return v;
}
export const sessionSets = (sess) => sess.exercises.reduce((a, ex) => a + doneSets(ex).length, 0);
export const sessionReps = (sess) => sess.exercises.reduce((a, ex) => a + doneSets(ex).reduce((b, s) => b + num(s.reps), 0), 0);

// Última sesión (anterior a hoy mismo o cualquiera) en la que se hizo este ejercicio.
export function lastSets(fit, exId, beforeId = null) {
  const list = [...fit.gym.sessions].sort((a, b) => (b.date + (b.id || '')).localeCompare(a.date + (a.id || '')));
  for (const s of list) {
    if (s.id === beforeId) continue;
    const ex = s.exercises.find((e) => e.exId === exId);
    if (ex && doneSets(ex).length) return { date: s.date, sets: doneSets(ex) };
  }
  return null;
}

// Mejor 1RM estimado hasta ahora de un ejercicio (sin contar una sesión concreta).
export function bestOf(fit, exId, exceptId = null) {
  let best = 0;
  for (const s of fit.gym.sessions) {
    if (s.id === exceptId) continue;
    const ex = s.exercises.find((e) => e.exId === exId);
    if (!ex) continue;
    for (const st of doneSets(ex)) best = Math.max(best, est1rm(num(st.kg), num(st.reps)));
  }
  return best;
}

export function sessionPRs(fit, sess) {
  const prs = [];
  for (const ex of sess.exercises) {
    const prev = bestOf(fit, ex.exId, sess.id);
    if (!prev) continue; // la primera vez es solo el punto de partida
    let top = 0;
    for (const st of doneSets(ex)) top = Math.max(top, est1rm(num(st.kg), num(st.reps)));
    if (top > prev + 1e-9) prs.push(ex.exId);
  }
  return prs;
}

export function isValid(sess) {
  return sess.exercises.filter((ex) => doneSets(ex).length > 0).length >= MIN_EXERCISES;
}

// Guarda el borrador como entreno terminado y calcula la XP. Devuelve el resumen.
export function finishDraft(minutes) {
  const before = getFit();
  const draft = before.gym.draft;
  if (!draft) return null;
  const exercises = draft.exercises
    .map((ex) => ({ exId: ex.exId, sets: doneSets(ex).map((s) => ({ kg: num(s.kg), reps: num(s.reps) })) }))
    .filter((ex) => ex.sets.length)
    .map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s, done: true })) }));
  const sess = { id: draft.id, date: draft.date, routineId: draft.routineId || null, minutes: Math.max(1, Math.round(minutes)), exercises };
  sess.valid = isValid(sess);
  const prs = sess.valid ? sessionPRs(before, sess) : [];
  const alreadyXpToday = before.gym.sessions.some((s) => s.date === sess.date && s.valid && s.xp > 0);
  const xpLog = [];
  if (sess.valid && !alreadyXpToday) {
    xpLog.push({ date: sess.date, xp: XP_SESSION, why: 'sesion', ref: sess.id });
    prs.slice(0, MAX_PR).forEach((exId) => xpLog.push({ date: sess.date, xp: XP_PR, why: 'record', ref: sess.id, ex: exId }));
  }
  sess.xp = xpLog.reduce((a, x) => a + x.xp, 0);
  sess.prs = prs;
  const lvBefore = levelInfo(totalXp(before, 'gym'));
  updateFit((f) => {
    f.gym.sessions.push(sess);
    f.gym.xpLog.push(...xpLog);
    f.gym.draft = null;
  });
  const lvAfter = levelInfo(totalXp(getFit(), 'gym'));
  return { sess, prs, xp: sess.xp, levelUp: lvAfter.level > lvBefore.level ? lvAfter : null, volume: sessionVolume(sess) };
}

export function newDraft(routineId, exIds) {
  return { id: uid(), date: todayKey(), startedAt: Date.now(), routineId: routineId || null, exercises: exIds.map((exId) => ({ exId, sets: [] })) };
}

// Series propuestas para un ejercicio: las de la última vez (o una vacía).
export function suggestedSets(fit, exId) {
  const last = lastSets(fit, exId);
  if (!last) return [{ kg: '', reps: '', done: false }];
  return last.sets.map((s) => ({ kg: String(s.kg || '').replace('.', ','), reps: String(s.reps || ''), done: false }));
}
