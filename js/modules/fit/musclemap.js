// Mapa muscular: imagen del cuerpo (frente y espalda) con los músculos pintados en rojo encima.

import { PATHS } from './musclepaths.js';
import { exMuscles, MUSCLE_NAMES } from './exmuscles.js';
import { exerciseMap } from './exercises.js';

const IMG = 'img/muscle/';

// Dibuja el cuerpo. levels: { músculo: 0..1 } (0 o ausente = sin pintar).
export function muscleMapHtml(levels) {
  const view = (k, label) => `<div class="f-mm-view"><svg viewBox="0 0 490 1024" role="img" aria-label="${label}"><image href="${IMG}base_${k}.webp" width="490" height="1024"/>${Object.keys(PATHS[k]).map((m) => (levels[m] ? `<path d="${PATHS[k][m]}" style="fill-opacity:${Math.min(1, levels[m]).toFixed(2)}"/>` : '')).join('')}<image href="${IMG}lines_${k}.png" width="490" height="1024"/></svg><small>${label}</small></div>`;
  return `<div class="f-mm">${view('f', 'Frente')}${view('b', 'Espalda')}</div>`;
}

// Músculos de una lista de ejercicios (rutina o entreno en curso): principal = 0.92, apoyo = 0.4.
export function routineLevels(fit, exIds) {
  const map = exerciseMap(fit);
  const lv = {};
  for (const id of exIds) {
    const m = exMuscles(map.get(id));
    m.help.forEach((x) => { if (!lv[x]) lv[x] = 0.4; });
    m.main.forEach((x) => { lv[x] = 0.92; });
  }
  return lv;
}

// Series por músculo en un conjunto de entrenos: cada serie principal cuenta 1 y cada serie de apoyo, 0,5.
export function muscleSets(fit, sessions) {
  const map = exerciseMap(fit);
  const out = {};
  for (const s of sessions) {
    for (const ex of s.exercises) {
      const n = ex.sets.filter((x) => x.done !== false).length;
      if (!n) continue;
      const m = exMuscles(map.get(ex.exId));
      m.main.forEach((x) => { out[x] = (out[x] || 0) + n; });
      m.help.forEach((x) => { out[x] = (out[x] || 0) + n * 0.5; });
    }
  }
  return out;
}

// Pasa series a intensidad de rojo: el más trabajado = 1; el que menos, 0,28; sin series, sin pintar.
export function setsToLevels(sets) {
  const max = Math.max(0, ...Object.values(sets));
  const lv = {};
  if (!max) return lv;
  for (const [m, v] of Object.entries(sets)) if (v > 0) lv[m] = 0.28 + 0.72 * (v / max);
  return lv;
}

export const namesOf = (list) => list.map((m) => MUSCLE_NAMES[m]).join(', ');

const LEG_ROUTINE = '<div class="f-mm-leg"><span><i class="m1"></i>Principal</span><span><i class="m2"></i>Apoyo</span><span><i class="m0"></i>No se trabaja</span></div>';

// Tarjeta para rutina o entreno en curso. fold = true la muestra plegable.
export function routineMapCard(fit, exIds, title, fold = false, open = false) {
  const body = muscleMapHtml(routineLevels(fit, exIds)) + LEG_ROUTINE;
  if (fold) return `<details class="f-card plain f-fold" id="mm-fold" ${open ? 'open' : ''}><summary><strong>${title}</strong></summary>${body}</details>`;
  return `<section class="f-card plain"><strong>${title}</strong>${body}</section>`;
}

// Tarjeta de estadísticas: más rojo = más series; sin color = sin entrenar.
export function statsMapCard(fit, sessions, periodText) {
  const sets = muscleSets(fit, sessions);
  const lv = setsToLevels(sets);
  const rank = Object.keys(MUSCLE_NAMES).map((m) => [m, sets[m] || 0]).sort((a, b) => b[1] - a[1]);
  const max = rank[0][1] || 1;
  const rows = rank.map(([m, v]) => `<div class="f-mm-row${v ? '' : ' zero'}"><span>${MUSCLE_NAMES[m]}</span><span class="f-mm-bar"><i style="width:${Math.round(100 * v / max)}%"></i></span><em>${Math.round(v * 10) / 10 % 1 ? (Math.round(v * 10) / 10).toString().replace('.', ',') : Math.round(v)}</em></div>`).join('');
  return `<section class="f-card plain"><strong>Músculos trabajados</strong><div class="f-mini">${periodText}</div>
    ${Object.keys(lv).length ? muscleMapHtml(lv) : '<div class="f-note">Cuando registres entrenos verás aquí qué músculos trabajas más.</div>'}
    <div class="f-mm-leg"><span>Menos</span><span class="f-mm-ramp"></span><span>Más</span><span><i class="m0"></i>Sin entrenar</span></div>
    ${Object.keys(lv).length ? `<div class="f-mm-rank">${rows}</div><div class="f-mini">Series hechas. Las de apoyo cuentan la mitad.</div>` : ''}</section>`;
}
