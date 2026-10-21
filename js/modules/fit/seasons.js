// Medallas de mes, trofeos de temporada y vitrina. Se calculan al cerrarse cada mes o temporada,
// con todo tu historial (si ya lo merecías, te lo da con retraso).

import { getFit, updateFit } from './data.js';
import { parseKey, keyOf, addDays, addDaysKey, thisMonday, todayKey } from './dates.js';
import { countsByWeek, firstWeek, weekStatus, isPaused } from './engine.js';

export const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const SEASONS = [
  { k: 'inv', name: 'Invierno', months: [11, 0, 1], quote: 'Se acerca el invierno' },
  { k: 'pri', name: 'Primavera', months: [2, 3, 4] },
  { k: 'ver', name: 'Verano', months: [5, 6, 7] },
  { k: 'oto', name: 'Otoño', months: [8, 9, 10] },
];
const METALS = ['bronce', 'plata', 'oro'];
export const XP_MONTH_RETO = 200;
export const XP_SEASON = 150;

const sessionsOf = (f, sport) => (sport === 'gym' ? f.gym.sessions : f.run.runs).filter((s) => s.valid !== false);
const lastClosedMonday = () => addDaysKey(thisMonday(), -7);

// Lunes (clave) cuyo mes es y/m (m: 0-11).
function mondaysOf(y, m) {
  const out = [];
  let d = new Date(y, m, 1);
  d = addDays(d, (8 - (d.getDay() || 7)) % 7);
  for (; d.getMonth() === m; d = addDays(d, 7)) out.push(keyOf(d));
  return out;
}
const monthClosed = (y, m) => {
  const ms = mondaysOf(y, m);
  return new Date(y, m + 1, 0) < parseKey(todayKey()) && ms.length && ms[ms.length - 1] <= lastClosedMonday();
};

function weekStats(f, sport, mks) {
  const counts = countsByWeek(f, sport);
  const first = firstWeek(f, sport);
  let weeks = 0; let met = 0;
  for (const mk of mks) {
    if (!first || mk < first) continue;
    const st = weekStatus(f, sport, mk, counts);
    if (st === 'paused') continue;
    weeks++;
    if (st === 'met' || st === 'comodin') met++;
  }
  return { weeks, met };
}
const prsIn = (f, sport, y, m) => sessionsOf(f, sport).some((s) => { const d = parseKey(s.date); return d.getFullYear() === y && d.getMonth() === m && (s.prs || []).length; });

// Resultado de un mes: 'oro' | 'plata' | 'bronce' | null
export function monthMetal(f, sport, y, m) {
  const { weeks, met } = weekStats(f, sport, mondaysOf(y, m));
  if (!weeks) return null;
  if (met >= Math.min(3, weeks)) {
    if (met === weeks) return prsIn(f, sport, y, m) ? 'oro' : 'plata';
    return 'bronce';
  }
  return null;
}

// Objetivos de una temporada (6) con su estado, calculados con los datos actuales.
export function seasonGoals(f, sport, y, s) {
  const months = s.months.map((m, i) => ({ y: s.k === 'inv' && m < 6 ? y + 1 : y, m }));
  const mks = months.flatMap(({ y: yy, m }) => mondaysOf(yy, m));
  const { weeks, met } = weekStats(f, sport, mks);
  const sess = sessionsOf(f, sport).filter((x) => months.some(({ y: yy, m }) => { const d = parseKey(x.date); return d.getFullYear() === yy && d.getMonth() === m; }));
  const retos = mks.filter((mk) => f.awarded[`${sport}.reto.${mk}`]).length;
  const goalSess = sport === 'gym' ? 20 : 12;
  const unmet = (() => { const counts = countsByWeek(f, sport); const first = firstWeek(f, sport); return mks.filter((mk) => first && mk >= first && mk <= lastClosedMonday() && weekStatus(f, sport, mk, counts) === 'unmet').length; })();
  return {
    months,
    list: [
      { t: 'Cumplir tu objetivo en 8 semanas', v: met, n: 8, ok: met >= 8 },
      { t: 'Un mes con medalla de Plata o más', v: months.filter(({ y: yy, m }) => ['plata', 'oro'].includes(monthMetal(f, sport, yy, m))).length, n: 1, ok: months.some(({ y: yy, m }) => ['plata', 'oro'].includes(monthMetal(f, sport, yy, m))) },
      { t: sport === 'gym' ? `${goalSess} entrenos en la temporada` : `${goalSess} salidas en la temporada`, v: sess.length, n: goalSess, ok: sess.length >= goalSess },
      { t: 'Batir un récord personal', v: sess.filter((x) => (x.prs || []).length).length ? 1 : 0, n: 1, ok: sess.some((x) => (x.prs || []).length) },
      { t: 'Completar 6 retos semanales', v: retos, n: 6, ok: retos >= 6 },
      { t: 'Sin ninguna semana fallida', v: unmet, n: 0, ok: weeks > 0 && unmet === 0 },
    ],
  };
}
export const trophyMetal = (n) => (n >= 6 ? 'oro' : n >= 4 ? 'plata' : n >= 2 ? 'bronce' : null);

export function seasonOf(date = new Date()) {
  const m = date.getMonth();
  const s = SEASONS.find((x) => x.months.includes(m));
  return { s, y: s.k === 'inv' && m < 6 ? date.getFullYear() - 1 : date.getFullYear() };
}

// Concede lo que se haya cerrado. Devuelve las medallas nuevas.
export function processPeriods(sport) {
  const f0 = getFit();
  const first = firstWeek(f0, sport);
  if (!first) return [];
  const out = [];
  const today = todayKey();
  const log = [];
  const aw = {};
  const f = getFit();
  const shape = sport === 'gym' ? 'shield' : 'hex';
  const d0 = parseKey(first);
  for (let y = d0.getFullYear(), m = d0.getMonth(); new Date(y, m, 1) < parseKey(today); m++) {
    if (m > 11) { m = 0; y++; }
    if (!monthClosed(y, m)) { if (new Date(y, m, 1) > parseKey(today)) break; continue; }
    const key = `${sport}.mes.${y}-${String(m + 1).padStart(2, '0')}`;
    if (METALS.some((k) => f.awarded[`${key}.${k}`])) continue;
    const metal = monthMetal(f, sport, y, m);
    if (!metal) continue;
    aw[`${key}.${metal}`] = today;
    out.push({ id: `${key}.${metal}`, name: `${MONTH_NAMES[m]} ${y}`, desc: metal === 'oro' ? 'Mes completo y con récord: reto mensual +200 XP' : metal === 'plata' ? 'Todas las semanas cumplidas' : 'Mes de hábito', period: true, metal, shape, glyph: 'sun', n: '', unit: '' });
    if (metal === 'oro') log.push({ date: today, xp: XP_MONTH_RETO, why: 'reto-mes', ref: `${key}.oro` });
  }
  const sFirst = seasonOf(d0);
  const sNow = seasonOf(new Date());
  for (let y = sFirst.y; y <= sNow.y; y++) {
    for (const s of SEASONS) {
      const mm = s.months.map((m) => ({ y: s.k === 'inv' && m < 6 ? y + 1 : y, m }));
      if (!mm.every(({ y: yy, m }) => monthClosed(yy, m))) continue;
      const key = `${sport}.temp.${y}-${s.k}`;
      if (f.awarded[key] || f.awarded[key + '.x']) continue;
      const g = seasonGoals(f, sport, y, s);
      const metal = trophyMetal(g.list.filter((x) => x.ok).length);
      const hadData = sessionsOf(f, sport).some((x) => mm.some(({ y: yy, m }) => { const d = parseKey(x.date); return d.getFullYear() === yy && d.getMonth() === m; }));
      if (!hadData) continue;
      if (!metal) { aw[key + '.x'] = today; continue; }
      aw[key] = today; aw[`${key}.${metal}`] = today;
      out.push({ id: key, name: `${s.name} ${y}`, desc: `Trofeo de temporada de ${metal} · +${XP_SEASON} XP`, period: true, metal, shape, glyph: 'star', n: '', unit: '' });
      log.push({ date: today, xp: XP_SEASON, why: 'temporada', ref: key });
    }
  }
  if (Object.keys(aw).length || log.length) updateFit((x) => { Object.assign(x.awarded, aw); x[sport].xpLog.push(...log); });
  return out;
}

// Colecciones de medallas por temporadas y retos mensuales
export function periodFamilies(sport) {
  const count = (re) => (f) => Object.keys(f.awarded).filter((k) => re.test(k)).length;
  return [
    { id: 'retosmes', group: 'const', name: 'Retos mensuales completados', unit: 'meses de oro', glyph: 'sun', steps: [1, 3, 6, 12, 24, 36, 60], value: count(new RegExp(`^${sport}\\.mes\\..*\\.oro$`)) },
    { id: 'temporadas', group: 'const', name: 'Temporadas completadas', unit: 'trofeos', glyph: 'star', steps: [1, 2, 4, 8, 12, 16, 20], value: count(new RegExp(`^${sport}\\.temp\\.[\\d]{4}-[a-z]{3}$`)) },
  ];
}

// Para la vitrina: mes -> metal y temporadas -> metal
export function showcase(f, sport) {
  const months = [];
  const seasons = [];
  for (const k of Object.keys(f.awarded)) {
    let m = new RegExp(`^${sport}\\.mes\\.(\\d{4})-(\\d{2})\\.(bronce|plata|oro)$`).exec(k);
    if (m) months.push({ y: +m[1], m: +m[2] - 1, metal: m[3] });
    m = new RegExp(`^${sport}\\.temp\\.(\\d{4})-([a-z]{3})\\.(bronce|plata|oro)$`).exec(k);
    if (m) seasons.push({ y: +m[1], s: SEASONS.find((x) => x.k === m[2]), metal: m[3] });
  }
  return { months, seasons };
}
