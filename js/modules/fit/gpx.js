// Lee un archivo GPX (Zepp, Garmin, Strava...) y separa lo que corres de lo que caminas.
// Todo se calcula en el móvil: el archivo no se sube a ningún sitio.

const R = 6371000;
const rad = (x) => (x * Math.PI) / 180;
export function haversine(a, b) {
  const dp = rad(b[0] - a[0]);
  const dl = rad(b[1] - a[1]);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Devuelve los puntos: { lat, lon, t (segundos), hr, cad, ele (altitud en m o null) }
export function parseGpx(text) {
  const pts = [];
  const re = /<trkpt\s+[^>]*?lat="(-?[\d.]+)"[^>]*?lon="(-?[\d.]+)"[^>]*>([\s\S]*?)<\/trkpt>/g;
  let m;
  while ((m = re.exec(text))) {
    const time = /<time>\s*([^<\s]+)\s*<\/time>/.exec(m[3]);
    if (!time) continue;
    const t = Date.parse(time[1]);
    if (!Number.isFinite(t)) continue;
    const hr = /<(?:\w+:)?hr>\s*([\d.]+)/.exec(m[3]);
    const cad = /<(?:\w+:)?cad>\s*([\d.]+)/.exec(m[3]);
    const ele = /<ele>\s*(-?[\d.]+)/.exec(m[3]);
    pts.push({ lat: +m[1], lon: +m[2], t: t / 1000, hr: hr ? +hr[1] : 0, cad: cad ? +cad[1] : 0, ele: ele && Number.isFinite(+ele[1]) ? +ele[1] : null });
  }
  pts.sort((a, b) => a.t - b.t);
  const name = /<name>\s*(?:<!\[CDATA\[)?([^<\]]*)/.exec(text);
  return { pts, name: name ? name[1].trim() : '' };
}

const PAUSE_GAP = 30; // hueco de más de 30 s sin puntos = pausa del reloj
const STOP_SPEED = 0.8; // m/s: por debajo, estás parado

// Divide la carrera en tramos: run (corriendo), walk (caminando) y stop (parado).
// paceLimit en segundos por km: más lento que eso cuenta como caminar.
export function analyze(pts, paceLimit = 570) {
  const n = pts.length;
  if (n < 5) return null;
  const limit = 1000 / paceLimit;
  // velocidad suavizada en ventanas de ~10 s
  const sp = new Array(n).fill(0);
  let a = 0;
  let b = 0;
  for (let i = 0; i < n; i++) {
    while (pts[a].t < pts[i].t - 5) a++;
    if (b < i) b = i;
    while (b + 1 < n && pts[b + 1].t <= pts[i].t + 5) b++;
    const dt = pts[b].t - pts[a].t;
    sp[i] = dt > 0 ? haversine([pts[a].lat, pts[a].lon], [pts[b].lat, pts[b].lon]) / dt : 0;
  }
  const segs = [];
  const push = (type, sec, m, hr, cad) => {
    const last = segs[segs.length - 1];
    if (last && last.type === type) { last.sec += sec; last.m += m; last.hrS += hr * sec; last.cadS += cad * sec; }
    else segs.push({ type, sec, m, hrS: hr * sec, cadS: cad * sec });
  };
  for (let i = 1; i < n; i++) {
    const dt = pts[i].t - pts[i - 1].t;
    if (dt <= 0) continue;
    const hr = (pts[i].hr + pts[i - 1].hr) / 2;
    const cad = (pts[i].cad + pts[i - 1].cad) / 2;
    if (dt > PAUSE_GAP) { push('stop', dt, 0, hr, 0); continue; }
    const s = (sp[i] + sp[i - 1]) / 2;
    const d = haversine([pts[i - 1].lat, pts[i - 1].lon], [pts[i].lat, pts[i].lon]);
    push(s < STOP_SPEED ? 'stop' : s >= limit ? 'run' : 'walk', dt, s < STOP_SPEED ? 0 : d, hr, cad);
  }
  // los cambios de menos de 8 s entre dos tramos iguales se absorben (ruido del GPS)
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < segs.length - 1; i++) {
      const s = segs[i];
      if (s.sec < 8 && segs[i - 1].type === segs[i + 1].type && s.type !== 'stop') { s.type = segs[i - 1].type; }
    }
    for (let i = segs.length - 1; i > 0; i--) {
      if (segs[i].type === segs[i - 1].type) { const p = segs[i - 1]; const q = segs.splice(i, 1)[0]; p.sec += q.sec; p.m += q.m; p.hrS += q.hrS; p.cadS += q.cadS; }
    }
  }
  // los tramos de menos de 5 s (ruido) se funden con el anterior
  for (let i = segs.length - 1; i >= 0; i--) {
    if (segs.length < 2 || segs[i].sec >= 5) continue;
    const j = i > 0 ? i - 1 : 1;
    const q = segs.splice(i, 1)[0];
    const p = segs[i > 0 ? i - 1 : 0];
    p.sec += q.sec; p.m += q.m; p.hrS += q.hrS; p.cadS += q.cadS;
  }
  for (let i = segs.length - 1; i > 0; i--) {
    if (segs[i].type === segs[i - 1].type) { const p = segs[i - 1]; const q = segs.splice(i, 1)[0]; p.sec += q.sec; p.m += q.m; p.hrS += q.hrS; p.cadS += q.cadS; }
  }
  const startT = pts[0].t * 1000;
  // mini-ruta (máx. unos 250 puntos) para dibujarla
  const step = Math.max(1, Math.floor(n / 250));
  const route = pts.filter((_, i) => i % step === 0).map((p) => [Math.round(p.lat * 1e5) / 1e5, Math.round(p.lon * 1e5) / 1e5]);
  // parciales por km sobre la distancia en movimiento
  const splits = [];
  let acc = 0; let secAcc = 0; let km = 1; let lastSplitSec = 0;
  for (let i = 1; i < n; i++) {
    const dt = pts[i].t - pts[i - 1].t;
    if (dt <= 0 || dt > PAUSE_GAP) continue;
    const d = haversine([pts[i - 1].lat, pts[i - 1].lon], [pts[i].lat, pts[i].lon]);
    if ((sp[i] + sp[i - 1]) / 2 < STOP_SPEED) { secAcc += dt; continue; }
    secAcc += dt; acc += d;
    while (acc >= km * 1000) { splits.push(Math.round(secAcc - lastSplitSec)); lastSplitSec = secAcc; km++; }
  }
  // mejores tiempos en 1/3/5/10 km sobre la distancia en movimiento
  const cum = [0]; const tm = [0];
  let c = 0; let tt = 0;
  for (let i = 1; i < n; i++) {
    const dt = pts[i].t - pts[i - 1].t;
    if (dt > 0 && dt <= PAUSE_GAP && (sp[i] + sp[i - 1]) / 2 >= STOP_SPEED) { c += haversine([pts[i - 1].lat, pts[i - 1].lon], [pts[i].lat, pts[i].lon]); }
    if (dt > 0 && dt <= PAUSE_GAP) tt += dt;
    cum.push(c); tm.push(tt);
  }
  const best = {};
  for (const km2 of [1, 3, 5, 10]) {
    if (c < km2 * 1000) continue;
    let bt = Infinity; let j = 0;
    for (let i = 0; i < n; i++) {
      while (j < n && cum[j] - cum[i] < km2 * 1000) j++;
      if (j >= n) break;
      bt = Math.min(bt, tm[j] - tm[i]);
    }
    if (Number.isFinite(bt)) best[km2] = Math.round(bt);
  }
  const prof = profile(pts);
  return {
    startedAt: startT,
    segs: segs.map((s) => ({ type: s.type, sec: Math.round(s.sec), m: Math.round(s.m), hr: s.sec ? Math.round(s.hrS / s.sec) : 0, cad: s.sec ? Math.round((s.cadS / s.sec) * 2) : 0 })),
    route, splits, best, ...prof,
    hrMax: Math.max(0, ...pts.map((p) => p.hr)),
  };
}

// Altitud y pulso para los gráficos: un punto cada ~15 s [segundos desde el inicio, altitud, pulso], más desnivel.
// La altitud del GPS tiene ruido: se alisa (media de ±10 s) y solo cuentan cambios de más de 3 m.
export function profile(pts) {
  const n = pts.length;
  const hasEle = pts.filter((p) => p.ele != null).length > n * 0.5;
  let sm = null;
  if (hasEle) {
    let last = pts.find((p) => p.ele != null).ele;
    const raw = pts.map((p) => { if (p.ele != null) last = p.ele; return last; });
    sm = new Array(n);
    let a = 0; let b = 0; let sum = 0; let cnt = 0;
    for (let i = 0; i < n; i++) {
      while (b < n && pts[b].t <= pts[i].t + 10) { sum += raw[b]; cnt++; b++; }
      while (a < n && pts[a].t < pts[i].t - 10) { sum -= raw[a]; cnt--; a++; }
      sm[i] = sum / Math.max(1, cnt);
    }
  }
  const prof = [];
  let el = 0; let nextAt = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) { const dt = pts[i].t - pts[i - 1].t; if (dt > 0) el += dt; }
    if (el >= nextAt) { prof.push([Math.round(el), hasEle ? Math.round(sm[i] * 10) / 10 : null, Math.round(pts[i].hr)]); nextAt = el + 15; }
  }
  const out = { prof };
  if (hasEle) {
    let ref = sm[0]; let asc = 0; let desc = 0;
    for (let i = 1; i < n; i++) {
      if (sm[i] - ref >= 3) { asc += sm[i] - ref; ref = sm[i]; } else if (ref - sm[i] >= 3) { desc += ref - sm[i]; ref = sm[i]; }
    }
    out.ascent = Math.round(asc); out.descent = Math.round(desc);
    out.eleMax = Math.round(Math.max(...sm)); out.eleMin = Math.round(Math.min(...sm));
  }
  return out;
}

// Zonas de pulso (% del pulso máximo): solo cuenta el tiempo corriendo. Devuelve segundos en cada zona.
export const ZONES = [
  { name: 'Muy suave', from: 0, color: '#7FB2FF' }, { name: 'Suave', from: 0.6, color: '#47D1C4' },
  { name: 'Aeróbica', from: 0.7, color: '#7BE07A' }, { name: 'Umbral', from: 0.8, color: '#FFB340' }, { name: 'Máximo', from: 0.9, color: '#FF5A5F' },
];
export function zoneSeconds(run, hrMax) {
  const out = [0, 0, 0, 0, 0];
  if (!run.prof || !run.prof.length || !run.segs || !hrMax) return out;
  const bounds = []; let t = 0;
  for (const s of run.segs) { bounds.push([t, t + s.sec, s.type]); t += s.sec; }
  let k = 0;
  run.prof.forEach((p, i) => {
    const d = i + 1 < run.prof.length ? Math.min(30, run.prof[i + 1][0] - p[0]) : 15;
    while (k < bounds.length - 1 && p[0] >= bounds[k][1]) k++;
    if (!bounds[k] || bounds[k][2] !== 'run' || !p[2]) return;
    const f = p[2] / hrMax;
    out[f >= 0.9 ? 4 : f >= 0.8 ? 3 : f >= 0.7 ? 2 : f >= 0.6 ? 1 : 0] += d;
  });
  return out;
}

// Totales de la carrera a partir de sus tramos. stopTol = segundos de parada que no rompen una racha corriendo.
export function summarize(segs, stopTol = 30) {
  let runSec = 0; let runM = 0; let walkSec = 0; let walkM = 0; let stopSec = 0;
  let curM = 0; let curSec = 0; let bestM = 0; let bestSec = 0;
  let hrS = 0; let hrT = 0;
  const close = () => { bestM = Math.max(bestM, curM); bestSec = Math.max(bestSec, curSec); curM = 0; curSec = 0; };
  for (const s of segs) {
    if (s.hr) { hrS += s.hr * s.sec; hrT += s.sec; }
    if (s.type === 'run') { runSec += s.sec; runM += s.m; curM += s.m; curSec += s.sec; }
    else if (s.type === 'walk') { walkSec += s.sec; walkM += s.m; close(); }
    else { stopSec += s.sec; if (s.sec > stopTol) close(); }
  }
  close();
  return {
    runSec, runM, walkSec, walkM, stopSec,
    movingSec: runSec + walkSec,
    distM: runM + walkM,
    longestM: Math.round(bestM), longestSec: bestSec,
    paceRun: runM > 0 ? Math.round(runSec / (runM / 1000)) : 0,
    hrAvg: hrT ? Math.round(hrS / hrT) : 0,
  };
}

export const paceText = (secPerKm) => (secPerKm > 0 ? `${Math.floor(secPerKm / 60)}:${String(Math.round(secPerKm % 60)).padStart(2, '0')}` : '—');
export const durText = (sec) => {
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = Math.round(sec % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};
