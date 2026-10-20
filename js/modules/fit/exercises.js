// Lista base de ejercicios del gimnasio. Todo es editable: se pueden ocultar, renombrar y añadir los tuyos.
// (Los dibujos de monigote llegarán más adelante; de momento cada ejercicio lleva músculo y material.)

export const MUSCLES = ['Pecho', 'Espalda', 'Hombro', 'Bíceps', 'Tríceps', 'Piernas', 'Core', 'Cardio', 'Otros'];

const RAW = {
  Pecho: ['Press banca (barra)', 'Press banca con mancuernas', 'Press banca en máquina / Smith', 'Press inclinado con barra', 'Press inclinado con mancuernas', 'Press declinado', 'Press de pecho en máquina', 'Aperturas con mancuernas', 'Aperturas en máquina (pec deck)', 'Cruce de poleas', 'Fondos en paralelas (pecho)', 'Flexiones', 'Pullover con mancuerna'],
  Espalda: ['Jalón al pecho (polea)', 'Jalón agarre estrecho / neutro', 'Dominadas', 'Dominadas asistidas (máquina)', 'Remo con barra', 'Remo con mancuerna a una mano', 'Remo en polea baja', 'Remo en máquina', 'Remo en T', 'Remo Pendlay', 'Remo invertido', 'Pull-over en polea', 'Peso muerto (barra)', 'Hiperextensiones', 'Buenos días (barra)'],
  Hombro: ['Press militar (barra)', 'Press militar con mancuernas', 'Press de hombro en máquina', 'Press Arnold', 'Elevaciones laterales (mancuernas)', 'Elevaciones laterales en polea', 'Elevaciones frontales', 'Pájaros (mancuernas)', 'Pájaros en máquina', 'Face pull (polea)', 'Remo al mentón', 'Encogimientos de trapecio'],
  Bíceps: ['Curl con barra', 'Curl con mancuernas', 'Curl alterno', 'Curl martillo', 'Curl en banco Scott', 'Curl en polea baja', 'Curl concentrado', 'Curl inclinado', 'Curl en máquina'],
  Tríceps: ['Extensión de tríceps en polea', 'Press francés (barra Z)', 'Press francés con mancuernas', 'Extensión sobre la cabeza con mancuerna', 'Extensión sobre la cabeza en polea', 'Fondos en banco', 'Fondos en paralelas (tríceps)', 'Patada de tríceps', 'Press cerrado (barra)', 'Fondos en máquina asistida'],
  Piernas: ['Sentadilla con barra', 'Sentadilla frontal', 'Sentadilla en Smith', 'Sentadilla goblet', 'Sentadilla búlgara', 'Prensa de piernas', 'Hack squat (máquina)', 'Zancadas', 'Zancadas caminando', 'Step-up (subida a banco)', 'Extensión de cuádriceps (máquina)', 'Peso muerto rumano', 'Peso muerto con piernas rígidas', 'Curl femoral tumbado', 'Curl femoral sentado', 'Curl femoral de pie', 'Hip thrust', 'Puente de glúteo', 'Patada de glúteo en polea', 'Patada de glúteo en máquina', 'Abductores (máquina)', 'Aductores (máquina)', 'Elevación de gemelos de pie', 'Elevación de gemelos sentado', 'Gemelos en prensa'],
  Core: ['Crunch abdominal', 'Crunch en máquina', 'Crunch en polea alta', 'Elevación de piernas tumbado', 'Elevación de piernas colgado', 'Plancha', 'Plancha lateral', 'Rueda abdominal', 'Russian twist', 'Leñador en polea', 'Bicicleta abdominal', 'Mountain climbers', 'Superman (lumbar)'],
  Cardio: ['Cinta de correr', 'Bicicleta estática', 'Elíptica', 'Remo ergómetro', 'Escaladora', 'Comba', 'Battle ropes'],
};

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const BASE = Object.entries(RAW).flatMap(([muscle, names]) => names.map((name) => ({ id: 'b-' + slug(name), name, muscle, base: true })));

// Lista completa con tus cambios: sin los ocultos, con los renombrados y con los tuyos.
export function exerciseList(fit, { withHidden = false } = {}) {
  const g = fit.gym;
  const hidden = new Set(g.hidden);
  const base = BASE.map((e) => ({ ...e, name: g.renames[e.id] || e.name, hidden: hidden.has(e.id) }));
  const mine = g.custom.map((e) => ({ ...e, name: g.renames[e.id] || e.name, hidden: hidden.has(e.id) }));
  const all = [...base, ...mine];
  return withHidden ? all : all.filter((e) => !e.hidden);
}

export function exerciseMap(fit) {
  const m = new Map();
  for (const e of exerciseList(fit, { withHidden: true })) m.set(e.id, e);
  return m;
}
