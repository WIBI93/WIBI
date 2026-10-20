// Medallas: dibujo (escudo, hexágono, moneda, trofeo) y lista de las medallas comunes.

export const METALS = ['bronce', 'plata', 'oro', 'platino', 'diamante'];
export const METAL_NAME = { bronce: 'Bronce', plata: 'Plata', oro: 'Oro', platino: 'Platino', diamante: 'Diamante' };
const STOPS = {
  bronce: [[0, '#F0A868'], [1, '#9A5626']],
  plata: [[0, '#F4F6FA'], [1, '#8F97A3']],
  oro: [[0, '#FFE680'], [1, '#D19815']],
  platino: [[0, '#F7F9FC'], [0.45, '#A9B8C9'], [0.55, '#E6EDF5'], [1, '#7A8CA0']],
  diamante: [[0, '#EAFDFF'], [0.35, '#7FE3F5'], [0.65, '#3FB0E0'], [1, '#8E8CFF']],
};
const EDGE = { bronce: '#F7C79B', plata: '#FFFFFF', oro: '#FFF3B8', platino: '#FFFFFF', diamante: '#FFFFFF' };
const INK = { bronce: '#2B1606', plata: '#1B1F26', oro: '#2A1E00', platino: '#1B2430', diamante: '#06303D' };
const DIM = { bronce: '#7A4A22', plata: '#8A8F98', oro: '#8A6D1A', platino: '#7A8CA0', diamante: '#2F7E90' };

// Reparto de metales según la posición del escalón: 30 / 25 / 20 / 15 / 10 %.
export function rar(n) {
  const split = [0.3, 0.25, 0.2, 0.15, 0.1];
  let acc = 0;
  const cuts = [0];
  for (const s of split) { acc += s; cuts.push(Math.round(acc * n)); }
  const out = [];
  for (let i = 0; i < 5; i++) for (let k = cuts[i]; k < cuts[i + 1]; k++) out.push(METALS[i]);
  return out.slice(0, n);
}

const SHAPE = {
  hex: 'M40 4 L72 22 V58 L40 76 L8 58 V22 Z',
  shield: 'M40 4 L70 15 V42 C70 60 56 72 40 80 C24 72 10 60 10 42 V15 Z',
};
// Dibujos sencillos para el centro de la medalla (cuadrícula 24x24).
const GLYPH = {
  two: '<path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12" />',
  week: '<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 11h16M8 3v4M16 3v4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  year: '<path d="M12 4v16M7 8l5-4 5 4M7 14l5-4 5 4"/>',
  lock: '<rect x="6" y="11" width="12" height="9" rx="2"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
};

export function medalSvg({ shape = 'coin', metal = 'bronce', earned = false, glyph = 'two', size = 56 }) {
  const id = `g${shape}${metal}${earned ? 'e' : 'l'}${glyph}`;
  const stops = STOPS[metal].map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
  const fill = earned ? `url(#${id})` : 'transparent';
  const ink = earned ? INK[metal] : DIM[metal];
  const line = earned ? '' : ` stroke="${DIM[metal]}" stroke-width="3" stroke-dasharray="6 4"`;
  let body;
  if (shape === 'coin') {
    body = `<circle cx="40" cy="40" r="35" fill="${fill}"${line}/>` +
      (earned ? `<circle cx="40" cy="40" r="35" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="3" stroke-dasharray="2 2.6"/><circle cx="40" cy="40" r="27" fill="none" stroke="${EDGE[metal]}" stroke-width="1.8" opacity=".75"/>` : '');
  } else {
    const d = SHAPE[shape === 'hex' ? 'hex' : 'shield'];
    body = `<path d="${d}" fill="${fill}"${line} stroke-linejoin="round"/>` +
      (earned ? `<path d="${d}" transform="translate(40 40) scale(.8) translate(-40 -40)" fill="none" stroke="${EDGE[metal]}" stroke-width="1.6" opacity=".7"/>` : '');
  }
  const gl = `<g transform="translate(26 26) scale(1.17)" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${earned ? GLYPH[glyph] : GLYPH.lock}</g>`;
  return `<svg class="medal" width="${size}" height="${size}" viewBox="0 0 80 84" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient></defs>${body}${gl}</svg>`;
}

// Medallas comunes (sin XP). Cada familia tiene escalones; el metal sale de rar().
export const COMMON_FAMILIES = [
  { id: 'doble', name: 'Doble jornada', desc: 'Gimnasio y running el mismo día', steps: [1, 10, 25], unit: 'veces', glyph: 'two' },
  { id: 'semanas', name: 'Semanas con los dos deportes', desc: 'Semanas en las que haces gimnasio y running', steps: [1, 5, 10, 25, 50], unit: 'semanas', glyph: 'week' },
  { id: 'dias', name: 'Días activos', desc: 'Días en los que has entrenado', steps: [30, 100, 365, 730, 1000], unit: 'días', glyph: 'sun' },
  { id: 'aniv', name: 'Aniversarios', desc: 'Años desde tu primer entreno', steps: [1, 2, 3, 5, 10], unit: 'años', glyph: 'year' },
];

export function commonMedals() {
  const out = [];
  for (const f of COMMON_FAMILIES) {
    const metals = rar(f.steps.length);
    f.steps.forEach((n, i) => out.push({ id: `com.${f.id}.${n}`, family: f.id, name: f.name, desc: f.desc, n, unit: f.unit, glyph: f.glyph, metal: metals[i], shape: 'coin' }));
  }
  return out;
}
