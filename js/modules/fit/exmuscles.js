// Qué músculos trabaja cada ejercicio: principales y de apoyo.
// Códigos: pe pecho · ho hombros · bi bíceps · tr tríceps · an antebrazos · ab abdomen · tp trapecio
// do dorsales · lu lumbar · gl glúteos · cu cuádriceps · ad aductores · is isquios · ge gemelos

import { BASE } from './exercises.js';

export const MUSCLE_NAMES = { pecho: 'Pecho', hombros: 'Hombros', biceps: 'Bíceps', triceps: 'Tríceps', antebrazos: 'Antebrazos', abdomen: 'Abdomen', trapecio: 'Trapecio', dorsales: 'Dorsales', lumbar: 'Lumbar', gluteos: 'Glúteos', cuadriceps: 'Cuádriceps', aductores: 'Aductores', isquios: 'Isquios', gemelos: 'Gemelos' };
const C = { pe: 'pecho', ho: 'hombros', bi: 'biceps', tr: 'triceps', an: 'antebrazos', ab: 'abdomen', tp: 'trapecio', do: 'dorsales', lu: 'lumbar', gl: 'gluteos', cu: 'cuadriceps', ad: 'aductores', is: 'isquios', ge: 'gemelos' };

// "principales|apoyo"
const T = {
  'Press banca (barra)': 'pe|tr ho', 'Press banca con mancuernas': 'pe|tr ho', 'Press banca en máquina / Smith': 'pe|tr ho',
  'Press inclinado con barra': 'pe|ho tr', 'Press inclinado con mancuernas': 'pe|ho tr', 'Press declinado': 'pe|tr',
  'Press de pecho en máquina': 'pe|tr ho', 'Aperturas con mancuernas': 'pe|ho', 'Aperturas en máquina (pec deck)': 'pe|ho',
  'Cruce de poleas': 'pe|ho', 'Fondos en paralelas (pecho)': 'pe|tr ho', 'Flexiones': 'pe|tr ho ab', 'Pullover con mancuerna': 'pe do|tr',
  'Jalón al pecho (polea)': 'do|bi an', 'Jalón agarre estrecho / neutro': 'do|bi an', 'Dominadas': 'do|bi an', 'Dominadas asistidas (máquina)': 'do|bi an',
  'Remo con barra': 'do tp|bi lu', 'Remo con mancuerna a una mano': 'do|bi tp', 'Remo en polea baja': 'do|bi tp', 'Remo en máquina': 'do|bi tp',
  'Remo en T': 'do tp|bi', 'Remo Pendlay': 'do tp|bi lu', 'Remo invertido': 'do|bi tp', 'Pull-over en polea': 'do|tr',
  'Peso muerto (barra)': 'gl is lu|cu tp an', 'Hiperextensiones': 'lu|gl is', 'Buenos días (barra)': 'lu is|gl',
  'Press militar (barra)': 'ho|tr tp', 'Press militar con mancuernas': 'ho|tr', 'Press de hombro en máquina': 'ho|tr', 'Press Arnold': 'ho|tr',
  'Elevaciones laterales (mancuernas)': 'ho|', 'Elevaciones laterales en polea': 'ho|', 'Elevaciones frontales': 'ho|pe',
  'Pájaros (mancuernas)': 'ho|tp', 'Pájaros en máquina': 'ho|tp', 'Face pull (polea)': 'ho tp|', 'Remo al mentón': 'ho tp|bi', 'Encogimientos de trapecio': 'tp|an',
  'Curl con barra': 'bi|an', 'Curl con mancuernas': 'bi|an', 'Curl alterno': 'bi|an', 'Curl martillo': 'bi an|', 'Curl en banco Scott': 'bi|',
  'Curl en polea baja': 'bi|an', 'Curl concentrado': 'bi|', 'Curl inclinado': 'bi|', 'Curl en máquina': 'bi|',
  'Extensión de tríceps en polea': 'tr|', 'Press francés (barra Z)': 'tr|', 'Press francés con mancuernas': 'tr|',
  'Extensión sobre la cabeza con mancuerna': 'tr|', 'Extensión sobre la cabeza en polea': 'tr|', 'Fondos en banco': 'tr|ho pe',
  'Fondos en paralelas (tríceps)': 'tr|pe ho', 'Patada de tríceps': 'tr|', 'Press cerrado (barra)': 'tr|pe ho', 'Fondos en máquina asistida': 'tr|pe',
  'Sentadilla con barra': 'cu gl|is lu ad', 'Sentadilla frontal': 'cu|gl ab lu', 'Sentadilla en Smith': 'cu gl|is', 'Sentadilla goblet': 'cu gl|ab',
  'Sentadilla búlgara': 'cu gl|is ad', 'Prensa de piernas': 'cu gl|is ad', 'Hack squat (máquina)': 'cu|gl', 'Zancadas': 'cu gl|is ad',
  'Zancadas caminando': 'cu gl|is ad', 'Step-up (subida a banco)': 'cu gl|ge', 'Extensión de cuádriceps (máquina)': 'cu|',
  'Peso muerto rumano': 'is gl|lu an', 'Peso muerto con piernas rígidas': 'is gl|lu', 'Curl femoral tumbado': 'is|ge', 'Curl femoral sentado': 'is|ge',
  'Curl femoral de pie': 'is|ge', 'Hip thrust': 'gl|is', 'Puente de glúteo': 'gl|is', 'Patada de glúteo en polea': 'gl|is', 'Patada de glúteo en máquina': 'gl|is',
  'Abductores (máquina)': 'gl|', 'Aductores (máquina)': 'ad|', 'Elevación de gemelos de pie': 'ge|', 'Elevación de gemelos sentado': 'ge|', 'Gemelos en prensa': 'ge|',
  'Crunch abdominal': 'ab|', 'Crunch en máquina': 'ab|', 'Crunch en polea alta': 'ab|', 'Elevación de piernas tumbado': 'ab|cu', 'Elevación de piernas colgado': 'ab|an',
  'Plancha': 'ab|ho lu', 'Plancha lateral': 'ab|ho', 'Rueda abdominal': 'ab|ho do', 'Russian twist': 'ab|', 'Leñador en polea': 'ab|ho',
  'Bicicleta abdominal': 'ab|', 'Mountain climbers': 'ab|ho cu', 'Superman (lumbar)': 'lu|gl',
};
const parse = (s) => { const [p, a] = s.split('|'); const f = (x) => x.split(' ').filter(Boolean).map((c) => C[c]); return { main: f(p), help: f(a || '') }; };
const BY_ID = {};
BASE.forEach((e) => { if (T[e.name]) BY_ID[e.id] = parse(T[e.name]); });
// Ejercicios creados por ti: se deduce solo del grupo que elegiste.
const BY_GROUP = { Pecho: 'pe|', Espalda: 'do|', Hombro: 'ho|', 'Bíceps': 'bi|', 'Tríceps': 'tr|', Piernas: 'cu|', Core: 'ab|' };

export function exMuscles(ex) {
  if (!ex) return { main: [], help: [] };
  if (BY_ID[ex.id]) return BY_ID[ex.id];
  return BY_GROUP[ex.muscle] ? parse(BY_GROUP[ex.muscle]) : { main: [], help: [] };
}
