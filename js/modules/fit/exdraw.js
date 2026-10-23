// Dibujos de ejercicios hechos con código: un mismo muñeco de perfil (mira a la derecha) con el músculo principal en rojo.
// Sin imágenes: todo son líneas SVG. Los colores salen de las variables CSS --fd-* (claro y oscuro).

const L = { torso: 44, neck: 6, head: 8, ua: 24, fa: 22, th: 30, sh: 30, foot: 9 };
const rad = (a) => (a * Math.PI) / 180;
const add = (p, a, l) => [p[0] + Math.cos(rad(a)) * l, p[1] + Math.sin(rad(a)) * l];
const n1 = (n) => Math.round(n * 10) / 10;
const seg = (p, q, w, cls) => `<line x1="${n1(p[0])}" y1="${n1(p[1])}" x2="${n1(q[0])}" y2="${n1(q[1])}" stroke-width="${w}" class="${cls}"/>`;
const cir = (x, y, r, cls = 'fd-plate') => `<circle cx="${n1(x)}" cy="${n1(y)}" r="${r}" class="${cls}"/>`;
const rect = (x, y, w, h, rx = 2, rot = '') => `<rect x="${n1(x)}" y="${n1(y)}" width="${w}" height="${h}" rx="${rx}" class="fd-eq"${rot ? ` transform="rotate(${rot})"` : ''}/>`;
const ln = (a, b, c, d, w = 5) => `<line x1="${n1(a)}" y1="${n1(b)}" x2="${n1(c)}" y2="${n1(d)}" stroke-width="${w}" class="fd-eqln"/>`;
const floor = (a = 14, b = 150) => `<line x1="${a}" y1="140" x2="${b}" y2="140" class="fd-floor"/>`;
const flatBench = (x1 = 30, x2 = 142) => rect(x1, 104, x2 - x1, 9, 3) + ln(x1 + 10, 113, x1 + 10, 140) + ln(x2 - 12, 113, x2 - 12, 140);

// Muñeco. P: hip, torso, head, ua, fa, th, sh, foot (grados, sentido horario desde +x), far (desplazamiento del lado lejano),
// fa2 = [ua, fa] del brazo lejano, fl = [th, sh] de la pierna lejana, hl = [[segmento, t0, t1, desplazamiento, grosor]]
function fig(P) {
  const hip = P.hip, sho = add(hip, P.torso, L.torso), neck = add(sho, P.head, L.neck), hd = add(sho, P.head, L.neck + L.head);
  const elb = add(sho, P.ua, L.ua), han = add(elb, P.fa, L.fa), kne = add(hip, P.th, L.th), ank = add(kne, P.sh, L.sh), toe = add(ank, P.foot ?? 0, L.foot);
  const sf = P.far || [0, 0];
  const mv = (p) => [p[0] + sf[0], p[1] + sf[1]];
  let fk = mv(kne), fa = mv(ank), ft = mv(toe);
  if (P.fl) { fk = add(hip, P.fl[0], L.th); fa = add(fk, P.fl[1], L.sh); ft = add(fa, P.foot ?? 0, L.foot); }
  let fe = mv(elb), fh = mv(han);
  if (P.fa2) { fe = add(sho, P.fa2[0], L.ua); fh = add(fe, P.fa2[1], L.fa); }
  let s = seg(hip, fk, 9.5, 'fd-far') + seg(fk, fa, 7, 'fd-far') + seg(fa, ft, 5, 'fd-far') + seg(sho, fe, 7, 'fd-far') + seg(fe, fh, 5.5, 'fd-far');
  s += seg(hip, sho, 13, 'fd-body') + seg(sho, neck, 5, 'fd-body') + cir(hd[0], hd[1], L.head, 'fd-bodyfill');
  s += seg(hip, kne, 11, 'fd-near') + seg(kne, ank, 8, 'fd-near') + seg(ank, toe, 6, 'fd-near') + seg(sho, elb, 8, 'fd-near') + seg(elb, han, 6.5, 'fd-near') + cir(han[0], han[1], 3.6, 'fd-nearfill');
  const pts = { torso: [hip, sho], ua: [sho, elb], fa: [elb, han], th: [hip, kne], sh: [kne, ank] };
  for (const h of P.hl || []) {
    const [a, b] = pts[h[0]];
    const x = (t) => [a[0] + (b[0] - a[0]) * t + h[3][0], a[1] + (b[1] - a[1]) * t + h[3][1]];
    s += seg(x(h[1]), x(h[2]), h[4], 'fd-hl');
  }
  return { s, han, elb, sho, hip, kne, ank, toe, hd };
}
const BAR = (h, r = 13) => cir(h[0], h[1], r) + cir(h[0], h[1], 3, 'fd-eqfill');
const DB = (h, r = 6) => cir(h[0], h[1], r);
const V = (h) => `<path d="M${n1(h[0] - 6)} ${n1(h[1] + 4)} L${n1(h[0])} ${n1(h[1] - 3)} L${n1(h[0] + 6)} ${n1(h[1] + 4)}" class="fd-line"/>`;

// --- Presets por familia de ejercicio ---
const lying = (o = {}) => fig({ hip: [52, 96], torso: 0, head: 0, ua: -92, fa: -90, th: 170, sh: 92, foot: 180, hl: [['torso', 0.62, 0.97, [0, -2], 11]], ...o });
const pressFlat = (end) => { const f = lying(); return flatBench() + f.s + end(f.han); };
const pressIncline = (end, o = {}) => {
  const f = fig({ hip: [52, 100], torso: -32, head: -32, ua: -92, fa: -90, th: 175, sh: 92, foot: 180, hl: [['torso', 0.6, 0.97, [-2, -2], 11]], ...o });
  return rect(30, 108, 36, 8, 3) + ln(40, 116, 40, 140) + ln(96, 116, 96, 140) + ln(48, 106, 100, 76, 9) + f.s + end(f.han);
};
const seatedMachine = (o) => fig({ hip: [66, 100], torso: -94, head: -94, th: 0, sh: 90, foot: 0, ...o });
const bentRow = (o = {}) => fig({ hip: [70, 82], torso: -20, head: -28, ua: 128, fa: 90, th: 72, sh: 108, foot: 0, far: [-3, 0], hl: [['torso', 0.4, 0.95, [0, -3], 12]], ...o });
const hang = (o = {}) => fig({ hip: [82, 100], torso: -90, head: -95, ua: -112, fa: -62, th: 95, sh: 158, foot: 90, far: [3, 0], hl: [['torso', 0.35, 0.92, [-4, 0], 12]], ...o });

export const DRAW = {
  // ---------- PECHO ----------
  'press-banca-barra': () => pressFlat((h) => BAR([h[0], h[1] - 2])),
  'press-banca-con-mancuernas': () => pressFlat((h) => DB([h[0], h[1] - 4], 8)),
  'press-banca-en-maquina-smith': () => { const f = lying(); return flatBench() + ln(f.han[0] + 22, 20, f.han[0] + 22, 140, 4) + ln(f.han[0], f.han[1] - 2, f.han[0] + 22, f.han[1] - 2, 2) + f.s + cir(f.han[0], f.han[1] - 2, 5); },
  'press-inclinado-con-barra': () => pressIncline((h) => BAR([h[0], h[1] - 2])),
  'press-inclinado-con-mancuernas': () => pressIncline((h) => DB([h[0], h[1] - 4], 8)),
  'press-declinado': () => {
    const f = fig({ hip: [76, 84], torso: 20, head: 20, ua: -92, fa: -90, th: -160, sh: 100, foot: 180, hl: [['torso', 0.6, 0.97, [0, -3], 11]] });
    return ln(44, 92, 128, 118, 9) + ln(50, 98, 50, 140) + ln(118, 118, 118, 140) + f.s + BAR([f.han[0], f.han[1] - 2]);
  },
  'press-de-pecho-en-maquina': () => {
    const f = seatedMachine({ ua: 6, fa: 0, hl: [['torso', 0.62, 0.97, [3, 0], 11]] });
    return rect(46, 108, 38, 8, 3) + ln(60, 116, 60, 140) + ln(46, 40, 46, 100, 6) + ln(f.han[0], f.han[1], 130, f.han[1], 3) + ln(130, f.han[1], 130, 140, 5) + f.s + cir(f.han[0], f.han[1], 4, 'fd-eqfill');
  },
  'aperturas-con-mancuernas': () => { const f = lying({ ua: -75, fa: -100 }); return flatBench() + f.s + DB([f.han[0], f.han[1] - 4], 8); },
  'aperturas-en-maquina-pec-deck': () => {
    const f = seatedMachine({ ua: 0, fa: -90, hl: [['torso', 0.62, 0.97, [3, 0], 11]] });
    return rect(46, 108, 38, 8, 3) + ln(60, 116, 60, 140) + ln(46, 40, 46, 100, 6) + ln(f.elb[0], f.elb[1], f.elb[0] + 18, f.elb[1], 3) + ln(f.elb[0], f.elb[1] - 4, f.han[0], f.han[1] - 6, 8) + f.s;
  },
  'cruce-de-poleas': () => {
    const f = fig({ hip: [80, 80], torso: -78, head: -80, ua: 62, fa: 30, th: 70, sh: 110, foot: 0, far: [-4, 0], hl: [['torso', 0.55, 0.95, [3, 0], 12]] });
    return floor() + ln(138, 10, 138, 140, 6) + ln(138, 10, 122, 10, 5) + cir(120, 10, 5, 'fd-eqfill') + `<line x1="120" y1="15" x2="${n1(f.han[0])}" y2="${n1(f.han[1])}" class="fd-cable"/>` + f.s;
  },
  'fondos-en-paralelas-pecho': () => {
    const f = fig({ hip: [78, 94], torso: -62, head: -50, ua: 82, fa: 98, th: 95, sh: 165, foot: 180, hl: [['torso', 0.6, 0.97, [3, 0], 12]] });
    return ln(60, 100, 124, 100, 4) + ln(64, 100, 64, 140) + ln(120, 100, 120, 140) + f.s;
  },
  'flexiones': () => {
    const f = fig({ hip: [83.4, 111], torso: -22.6, head: -30, ua: 90, fa: 90, th: 157.4, sh: 157.4, foot: -80, hl: [['torso', 0.62, 0.97, [0, 3], 11]] });
    return floor() + f.s;
  },
  'pullover-con-mancuerna': () => {
    const f = lying({ ua: 5, fa: -15, hl: [['torso', 0.45, 0.97, [0, -2], 12]] });
    return flatBench(30, 128) + f.s + DB([f.han[0], f.han[1]], 8);
  },
  // ---------- ESPALDA ----------
  'jalon-al-pecho-polea': () => {
    const f = fig({ hip: [72, 102], torso: -98, head: -95, ua: 100, fa: -48, th: -5, sh: 88, foot: 0, far: [3, 0], hl: [['torso', 0.35, 0.92, [-4, 0], 12]] });
    return rect(56, 108, 40, 8, 3) + ln(76, 116, 76, 140) + rect(92, 88, 30, 7, 3, '-4 107 91') + ln(136, 8, 136, 140, 6) + ln(96, 8, 136, 8, 6) + cir(92, 8, 6, 'fd-eqfill') + `<line x1="92" y1="14" x2="${n1(f.han[0])}" y2="${n1(f.han[1])}" class="fd-cable"/>` + f.s + rect(f.han[0] - 3, f.han[1] - 5, 6, 10);
  },
  'jalon-agarre-estrecho-neutro': () => {
    const f = fig({ hip: [72, 102], torso: -98, head: -95, ua: 105, fa: -55, th: -5, sh: 88, foot: 0, far: [3, 0], hl: [['torso', 0.35, 0.92, [-4, 0], 12]] });
    return rect(56, 108, 40, 8, 3) + ln(76, 116, 76, 140) + rect(92, 88, 30, 7, 3, '-4 107 91') + ln(136, 8, 136, 140, 6) + ln(96, 8, 136, 8, 6) + cir(92, 8, 6, 'fd-eqfill') + `<line x1="92" y1="14" x2="${n1(f.han[0])}" y2="${n1(f.han[1] - 4)}" class="fd-cable"/>` + f.s + V([f.han[0], f.han[1] - 2]);
  },
  'dominadas': () => { const f = hang(); return ln(40, 14, 124, 14, 5) + ln(40, 14, 40, 30, 4) + ln(124, 14, 124, 30, 4) + f.s; },
  'dominadas-asistidas-maquina': () => {
    const f = hang({ th: 90, sh: 165 });
    return ln(40, 14, 124, 14, 5) + ln(138, 14, 138, 140, 7) + rect(f.kne[0] - 8, f.kne[1] + 4, 22, 6, 3) + ln(f.kne[0] + 3, f.kne[1] + 10, 138, f.kne[1] + 10, 4) + f.s;
  },
  'remo-con-barra': () => { const f = bentRow(); return floor() + f.s + BAR([f.han[0], f.han[1]], 11); },
  'remo-con-mancuerna-a-una-mano': () => {
    const f = fig({ hip: [74, 80], torso: -12, head: -20, ua: 148, fa: 92, th: 90, sh: 90, foot: 0, far: [8, 0], fa2: [90, 90], fl: [60, 105], hl: [['torso', 0.4, 0.95, [0, -3], 12]] });
    return floor() + rect(102, 117, 52, 8, 3) + ln(110, 125, 110, 140) + ln(146, 125, 146, 140) + f.s + DB(f.han, 7);
  },
  'remo-en-polea-baja': () => {
    const f = fig({ hip: [60, 110], torso: -100, head: -97, ua: 150, fa: 8, th: -5, sh: 4, foot: -85, hl: [['torso', 0.35, 0.92, [-4, 0], 12]] });
    return rect(40, 116, 40, 8, 3) + ln(52, 124, 52, 140) + floor() + rect(124, 92, 5, 34) + `<line x1="${n1(f.han[0] + 4)}" y1="${n1(f.han[1])}" x2="132" y2="128" class="fd-cable"/>` + f.s + V(f.han);
  },
  'remo-en-maquina': () => {
    const f = fig({ hip: [66, 104], torso: -88, head: -90, ua: 148, fa: 14, th: 0, sh: 90, foot: 0, hl: [['torso', 0.35, 0.92, [-4, 0], 12]] });
    return rect(46, 110, 38, 8, 3) + ln(60, 118, 60, 140) + ln(110, 44, 110, 96, 7) + ln(f.han[0], f.han[1], 130, f.han[1], 3) + ln(130, f.han[1], 130, 140, 5) + f.s + cir(f.han[0], f.han[1], 4, 'fd-eqfill');
  },
  'remo-en-t': () => {
    const f = bentRow({ torso: -24, ua: 135, fa: 96 });
    return floor() + ln(128, 134, f.han[0], f.han[1] + 2, 3) + cir(130, 130, 10) + f.s + `<path d="M${n1(f.han[0] - 5)} ${n1(f.han[1] + 4)} h10" class="fd-line"/>`;
  },
  'remo-pendlay': () => {
    const f = fig({ hip: [70, 83], torso: -3, head: -15, ua: 120, fa: 90, th: 75, sh: 105, foot: 0, far: [-3, 0], hl: [['torso', 0.4, 0.95, [0, -3], 12]] });
    return floor() + f.s + BAR([f.han[0], f.han[1]], 11);
  },
  'remo-invertido': () => {
    const f = fig({ hip: [78, 116], torso: -10, head: -22, ua: -105, fa: -78, th: 170, sh: 170, foot: -90, hl: [['torso', 0.4, 0.95, [0, 3], 12]] });
    return floor() + ln(140, 40, 140, 140, 6) + ln(f.han[0], f.han[1], 140, f.han[1], 3) + f.s + cir(f.han[0], f.han[1], 4, 'fd-eqfill');
  },
  'pull-over-en-polea': () => {
    const f = fig({ hip: [80, 80], torso: -82, head: -85, ua: 32, fa: 30, th: 88, sh: 92, foot: 0, far: [-3, 0], hl: [['torso', 0.4, 0.95, [-4, 0], 12]] });
    return floor() + ln(138, 8, 138, 140, 6) + ln(112, 8, 138, 8, 5) + cir(110, 8, 5, 'fd-eqfill') + `<line x1="110" y1="13" x2="${n1(f.han[0])}" y2="${n1(f.han[1])}" class="fd-cable"/>` + f.s;
  },
  'peso-muerto-barra': () => {
    const f = fig({ hip: [60, 90], torso: -40, head: -45, ua: 94, fa: 90, th: 50, sh: 100, foot: 0, far: [-3, 0], hl: [['torso', 0.1, 0.9, [-1, -3], 11]] });
    return floor() + f.s + BAR(f.han, 13);
  },
  'hiperextensiones': () => {
    const f = fig({ hip: [78, 70], torso: 38, head: 34, ua: 80, fa: 85, th: -142, sh: -146, foot: -146, hl: [['torso', 0.1, 0.55, [0, -3], 12]] });
    return floor() + ln(26, 38, 94, 80, 9) + ln(36, 44, 36, 140) + ln(88, 84, 88, 140) + f.s;
  },
  'buenos-dias-barra': () => {
    const f = fig({ hip: [62, 84], torso: -40, head: -42, ua: 125, fa: -80, th: 82, sh: 98, foot: 0, far: [-3, 0], hl: [['torso', 0.1, 0.55, [-1, -3], 12]] });
    return floor() + f.s + BAR([f.sho[0] - 3, f.sho[1] - 4], 11);
  },
};


// --- Familias de pie / sentado ---
const stand = (o = {}) => fig({ hip: [80, 76], torso: -90, head: -90, th: 90, sh: 90, foot: 0, far: [-3, 0], ...o });
const dhl = [['ua', 0, 0.5, [0, 0], 11]]; // deltoides
const bhl = [['ua', 0.1, 0.85, [3, 0], 8]]; // bíceps (delante del brazo)
const thl = [['ua', 0.1, 0.85, [-3, 0], 8]]; // tríceps (detrás del brazo)
const hbar = (h, r = 8) => cir(h[0], h[1], r) + cir(h[0], h[1], 2.5, 'fd-eqfill');
const hrect = (h) => rect(h[0] - 9, h[1] - 3, 18, 6, 3);
const cableTo = (x1, y1, h) => `<line x1="${x1}" y1="${y1}" x2="${n1(h[0])}" y2="${n1(h[1])}" class="fd-cable"/>`;
const highTower = (x = 138) => ln(x, 8, x, 140, 6) + ln(x - 26, 8, x, 8, 5) + cir(x - 28, 8, 5, 'fd-eqfill');
const lowTower = (x = 140) => ln(x, 90, x, 140, 6) + cir(x - 2, 132, 5, 'fd-eqfill');
const seatBack = (x = 46) => rect(x, 108, 38, 8, 3) + ln(x + 14, 116, x + 14, 140) + ln(x, 40, x, 104, 6);
const seated = (o) => fig({ hip: [66, 100], torso: -94, head: -94, th: 0, sh: 90, foot: 0, ...o });

Object.assign(DRAW, {
  // ---------- HOMBRO ----------
  'press-militar-barra': () => { const f = stand({ ua: 32, fa: -86, hl: dhl }); return floor() + f.s + BAR([f.han[0], f.han[1]], 8); },
  'press-militar-con-mancuernas': () => { const f = stand({ ua: 32, fa: -86, hl: dhl }); return floor() + f.s + DB([f.han[0], f.han[1]], 7); },
  'press-de-hombro-en-maquina': () => { const f = seated({ ua: 32, fa: -86, hl: dhl }); return seatBack() + ln(f.han[0], f.han[1], 128, f.han[1] + 8, 3) + ln(128, f.han[1] + 8, 128, 140, 5) + f.s + cir(f.han[0], f.han[1], 4, 'fd-eqfill'); },
  'press-arnold': () => { const f = seated({ ua: 42, fa: -70, hl: dhl }); return seatBack() + f.s + DB(f.han, 7); },
  'elevaciones-laterales-mancuernas': () => { const f = stand({ ua: 68, fa: 58, hl: dhl }); return floor() + f.s + DB(f.han, 6); },
  'elevaciones-laterales-en-polea': () => { const f = stand({ ua: 68, fa: 58, hl: dhl }); return floor() + lowTower() + cableTo(138, 132, f.han) + f.s; },
  'elevaciones-frontales': () => { const f = stand({ ua: 8, fa: 5, hl: dhl }); return floor() + f.s + DB(f.han, 6); },
  'pajaros-mancuernas': () => { const f = fig({ hip: [70, 82], torso: -22, head: -30, ua: 100, fa: 90, th: 72, sh: 108, foot: 0, far: [-3, 0], hl: dhl }); return floor() + f.s + DB(f.han, 6); },
  'pajaros-en-maquina': () => { const f = seated({ ua: 0, fa: 0, hl: dhl }); return seatBack(40) + ln(f.sho[0] + 12, 40, f.sho[0] + 12, 96, 7) + ln(f.han[0], f.han[1], 134, f.han[1], 3) + ln(134, f.han[1], 134, 140, 5) + f.s + cir(f.han[0], f.han[1], 4, 'fd-eqfill'); },
  'face-pull-polea': () => { const f = stand({ ua: -8, fa: 160, hl: dhl }); return floor() + ln(138, 8, 138, 140, 6) + cableTo(138, 30, f.han) + f.s + V(f.han); },
  'remo-al-menton': () => { const f = stand({ ua: -35, fa: 150, hl: dhl }); return floor() + f.s + BAR(f.han, 8); },
  'encogimientos-de-trapecio': () => { const f = stand({ ua: 90, fa: 90, hl: [['torso', 0.8, 1, [0, 0], 14]] }); return floor() + f.s + DB(f.han, 7) + `<path d="M66 18 l4 -5 l4 5 M86 18 l4 -5 l4 5" class="fd-line"/>`; },
  // ---------- BÍCEPS ----------
  'curl-con-barra': () => { const f = stand({ ua: 100, fa: -55, hl: bhl }); return floor() + f.s + BAR(f.han, 8); },
  'curl-con-mancuernas': () => { const f = stand({ ua: 100, fa: -55, hl: bhl }); return floor() + f.s + DB(f.han, 6); },
  'curl-alterno': () => { const f = stand({ ua: 100, fa: -55, fa2: [92, 90], hl: bhl }); return floor() + f.s + DB(f.han, 6); },
  'curl-martillo': () => { const f = stand({ ua: 100, fa: -55, hl: bhl }); return floor() + f.s + hrect(f.han); },
  'curl-en-banco-scott': () => {
    const f = seated({ hip: [56, 102], ua: 62, fa: -38, hl: [['ua', 0.1, 0.9, [3, -2], 8]], head: -90 });
    return rect(36, 110, 34, 8, 3) + ln(52, 118, 52, 140) + ln(66, 66, 92, 108, 9) + ln(86, 108, 86, 140) + f.s + BAR(f.han, 7);
  },
  'curl-en-polea-baja': () => { const f = stand({ ua: 100, fa: -55, hl: bhl }); return floor() + lowTower() + cableTo(138, 132, f.han) + f.s; },
  'curl-concentrado': () => {
    const f = fig({ hip: [66, 100], torso: -48, head: -50, ua: 95, fa: -60, th: -4, sh: 90, foot: 0, hl: [['ua', 0.1, 0.85, [2, 0], 8]] });
    return rect(46, 108, 44, 8, 3) + ln(56, 116, 56, 140) + ln(84, 116, 84, 140) + f.s + DB(f.han, 6);
  },
  'curl-inclinado': () => {
    const f = fig({ hip: [62, 102], torso: -58, head: -62, ua: 92, fa: -40, th: 8, sh: 90, foot: 0, hl: [['ua', 0.1, 0.85, [3, 0], 8]] });
    return rect(40, 110, 34, 8, 3) + ln(50, 118, 50, 140) + ln(54, 108, 92, 62, 9) + ln(90, 76, 90, 140, 4) + f.s + DB(f.han, 6);
  },
  'curl-en-maquina': () => {
    const f = seated({ hip: [56, 102], ua: 60, fa: -40, hl: [['ua', 0.1, 0.9, [3, -2], 8]], head: -90 });
    return rect(36, 110, 34, 8, 3) + ln(52, 118, 52, 140) + ln(66, 66, 92, 108, 9) + ln(86, 108, 86, 140) + f.s + cir(f.han[0], f.han[1], 4, 'fd-eqfill');
  },
  // ---------- TRÍCEPS ----------
  'extension-de-triceps-en-polea': () => { const f = stand({ ua: 92, fa: 18, hl: thl }); return floor() + highTower() + cableTo(110, 8, f.han) + f.s + V(f.han); },
  'press-frances-barra-z': () => { const f = lying({ ua: -90, fa: 72, hl: thl }); return flatBench() + f.s + BAR(f.han, 7); },
  'press-frances-con-mancuernas': () => { const f = lying({ ua: -90, fa: 72, hl: thl }); return flatBench() + f.s + DB(f.han, 7); },
  'extension-sobre-la-cabeza-con-mancuerna': () => { const f = stand({ ua: -92, fa: 125, hl: thl }); return floor() + f.s + DB(f.han, 7); },
  'extension-sobre-la-cabeza-en-polea': () => { const f = stand({ ua: -92, fa: 125, hl: thl }); return floor() + lowTower(20) + cableTo(22, 132, f.han) + f.s; },
  'fondos-en-banco': () => {
    const f = fig({ hip: [78, 118], torso: -90, head: -90, ua: 105, fa: 80, th: 12, sh: 5, foot: -80, hl: thl });
    return floor() + rect(28, 118, 48, 8, 3) + ln(36, 126, 36, 140) + ln(68, 126, 68, 140) + f.s;
  },
  'fondos-en-paralelas-triceps': () => {
    const f = fig({ hip: [80, 94], torso: -88, head: -88, ua: 92, fa: 90, th: 95, sh: 165, foot: 180, hl: thl });
    return ln(60, 98, 124, 98, 4) + ln(64, 98, 64, 140) + ln(120, 98, 120, 140) + f.s;
  },
  'patada-de-triceps': () => {
    const f = fig({ hip: [70, 82], torso: -22, head: -30, ua: 176, fa: 178, th: 72, sh: 108, foot: 0, far: [-3, 0], hl: [['ua', 0.1, 0.9, [0, -3], 8]] });
    return floor() + f.s + DB(f.han, 6);
  },
  'press-cerrado-barra': () => { const f = lying({ ua: -86, fa: -90, hl: [['ua', 0.1, 0.9, [0, 0], 9]] }); return flatBench() + f.s + BAR([f.han[0], f.han[1] - 2]); },
  'fondos-en-maquina-asistida': () => {
    const f = seated({ ua: 92, fa: 82, hl: thl });
    return seatBack() + ln(f.han[0], f.han[1], 118, f.han[1], 3) + ln(118, f.han[1], 118, 140, 5) + f.s + cir(f.han[0], f.han[1], 4, 'fd-eqfill');
  },
});

// Dibujo listo para pantalla. id = id del ejercicio de la app ("b-press-banca-barra"); devuelve '' si aún no hay dibujo.
export function drawnEx(id, size = 40) {
  const fn = DRAW[String(id).replace(/^b-/, '')];
  if (!fn) return '';
  return `<svg class="fd" width="${size}" height="${n1(size * 150 / 160)}" viewBox="0 0 160 150" aria-hidden="true">${fn()}</svg>`;
}
