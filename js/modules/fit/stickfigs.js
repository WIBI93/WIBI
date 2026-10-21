// Dibujos de monigote: uno por movimiento (27 familias). Cada ejercicio usa el de su movimiento.

const head = (x, y, r = 4.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none"/>`;
const L = (d) => `<path d="${d}"/>`;
const plate = (x, y) => `<circle cx="${x}" cy="${y}" r="3" fill="currentColor" stroke="none"/>`;
const floor = '<path d="M4 58H60" opacity=".35"/>';

export const FIGS = {
  1: `${L('M6 46H54M12 46v10M48 46v10')}${head(10, 40)}${L('M15 42H40L50 48V56M26 42V22M14 22H38')}${plate(14, 22)}${plate(38, 22)}`,
  2: `${L('M6 50L30 38M40 52H52M12 50v6')}${head(12, 26)}${L('M16 29L36 46H48V56M24 34L28 16M18 14H38')}${plate(18, 14)}${plate(38, 14)}`,
  3: `${L('M6 46H54M12 46v10M48 46v10')}${head(10, 40)}${L('M15 42H40L50 48V56M24 42L12 28M24 42L36 28')}${plate(12, 28)}${plate(36, 28)}`,
  4: `${L('M8 34H24M40 34H56M16 34v24M48 34v24')}${head(32, 10)}${L('M32 15V36M32 18L22 34M32 18L42 34M32 36L27 50M32 36L37 50')}`,
  5: `${L('M12 6H52M32 18V38M32 38L27 56M32 38L37 56M32 19L22 12L20 6M32 19L42 12L44 6')}${head(32, 12)}${plate(12, 6)}${plate(52, 6)}`,
  6: `${head(32, 10)}${L('M32 15V36M32 36L27 56M32 36L37 56M32 18L10 22M32 18L54 22')}${plate(9, 22)}${plate(55, 22)}`,
  7: `${L('M10 6H54M32 6V12M18 40H46')}${head(32, 22)}${L('M32 27V42M32 42H44V56M32 30L20 18L16 6M32 30L44 18L48 6')}`,
  8: `${L('M8 6H56')}${head(32, 18)}${L('M32 23V42M32 26L22 6M32 26L42 6M32 42L27 56M32 42L38 54')}`,
  9: `${head(14, 22)}${L('M19 24L40 34M40 34V46L36 58M26 28L28 46M14 46H38')}${plate(14, 46)}${plate(38, 46)}${floor}`,
  10: `${head(32, 10)}${L('M32 15V36M32 36L27 56M32 36L37 56M32 19L18 17L14 8M32 19L46 17L50 8')}${plate(14, 8)}${plate(50, 8)}`,
  11: `${head(28, 12)}${L('M30 17L34 32L46 36L42 54M20 17H40M34 32L24 46L28 56')}${plate(20, 17)}${plate(40, 17)}${floor}`,
  12: `${L('M6 58L22 44M40 14L52 28')}${head(8, 50)}${L('M12 53L22 46L36 34L44 22')}${floor}`,
  13: `${head(32, 10)}${L('M32 15V34M32 34L46 40L46 56M32 34L22 46L12 56M32 20L24 30M32 20L40 30')}${floor}`,
  14: `${head(16, 18)}${L('M21 21L40 34M40 34V46V58M26 26L28 48M16 48H38')}${plate(16, 48)}${plate(38, 48)}${floor}`,
  15: `${L('M4 44H22V58H4')}${head(8, 38)}${L('M13 40L34 34L46 42L46 56M13 40H22')}${floor}`,
  16: `${L('M12 16V40M12 40H34')}${head(20, 8)}${L('M20 13V38L38 38L56 30M44 44V56')}${plate(56, 30)}`,
  17: `${L('M4 44H44')}${head(8, 38)}${L('M13 40H36L52 40L46 24')}${plate(46, 24)}`,
  18: `${head(32, 10)}${L('M32 15V36M32 36L30 52M32 36L36 52M30 52L32 57M36 52L38 57M20 58H44')}`,
  19: `${head(32, 10)}${L('M32 15V36M32 36L27 56M32 36L37 56M32 18L32 32L44 20')}${plate(46, 18)}`,
  20: `${head(28, 14)}${L('M30 19V40M30 40L26 56M30 40L36 56M30 22L36 6L44 12')}${plate(46, 13)}`,
  21: `${head(52, 30)}${L('M4 56H60M48 35L36 50M36 50L28 38L20 50M52 36L56 28')}${floor}`,
  22: `${head(8, 36)}${L('M13 38L56 46M14 38V50M4 50H30')}${floor}`,
  23: `${head(6, 46)}${L('M11 49H34L34 20M4 56H40')}${floor}`,
  24: `${head(30, 10)}${L('M30 15L32 38L46 30L50 42M30 20L46 28M30 20L18 28')}${plate(48, 28)}${floor}`,
  25: `${head(32, 12)}${L('M32 17V38M32 38L27 56M32 38L37 56M26 19L24 38M38 19L40 38M20 12V6M44 12V6')}${plate(24, 40)}${plate(40, 40)}`,
  26: `${head(36, 10)}${L('M34 16L30 34M30 34L40 44L38 56M30 34L20 42L12 52M34 20L44 26M34 20L24 26')}${floor}`,
  27: `${L('M32 15V38M32 38L18 54M32 38L46 54M10 46L4 46M54 46L60 46')}${head(32, 10)}`,
};

const RULES = [
  [/cinta|bicicleta est|elíptica|ergómetro|escaladora|comba|battle/, 26],
  [/fondos/, 4],
  [/inclinado/, 2],
  [/press de banca|press banca|press de pecho|press cerrado|press declinado|flexiones/, 1],
  [/aperturas|cruce de poleas|pullover con mancuerna/, 3],
  [/press militar|press de hombro|arnold/, 5],
  [/elevaciones (laterales|frontales)|remo al mentón/, 6],
  [/jalón|pull-over/, 7],
  [/dominadas/, 8],
  [/pájaros|face pull/, 10],
  [/remo/, 9],
  [/búlgara|zancada|step-up/, 13],
  [/gemelos/, 18],
  [/sentadilla|sissy/, 11],
  [/prensa de piernas|hack squat/, 12],
  [/peso muerto|buenos días|hiperextensiones|superman/, 14],
  [/hip thrust|puente de glúteo|patada de glúteo/, 15],
  [/extensión de cuádriceps/, 16],
  [/curl femoral/, 17],
  [/patada de tríceps|tríceps|press francés|sobre la cabeza/, 20],
  [/curl/, 19],
  [/encogimientos/, 25],
  [/crunch|bicicleta abdominal/, 21],
  [/plancha|rueda abdominal|mountain/, 22],
  [/elevación de piernas/, 23],
  [/russian|leñador/, 24],
  [/abductores|aductores/, 27],
];
const BY_MUSCLE = { Pecho: 1, Espalda: 9, Hombro: 5, 'Bíceps': 19, 'Tríceps': 20, Piernas: 11, Core: 21, Cardio: 26, Otros: 22 };

export function figFor(name, muscle) {
  const n = String(name).toLowerCase();
  for (const [re, f] of RULES) if (re.test(n)) return f;
  return BY_MUSCLE[muscle] || 22;
}

// Dibujo listo para meter en la pantalla. ex = { name, muscle }
export function exFig(ex, size = 40) {
  const f = figFor(ex.name, ex.muscle);
  return `<svg class="f-fig" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${FIGS[f]}</svg>`;
}
