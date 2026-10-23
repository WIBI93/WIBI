// Pantallas de running: importar carrera, carreras, detalle y estadísticas.

import { navigate } from '../../core/router.js';
import { esc, toast, confirmDialog } from '../../core/ui.js';
import { getFit, updateFit } from './data.js';
import { shortDateText, addDaysKey, thisMonday, mondayKey, parseKey } from './dates.js';
import { sportNav, bindGo, header, backHeader, ico } from './shell.js';
import { parseGpx, analyze, summarize, paceText, durText, zoneSeconds, ZONES } from './gpx.js';
import { saveRun, isDuplicate, PR_NAMES } from './runlogic.js';
import { awardRun } from './runmedals.js';
import { celebrate } from './gym2.js';
import { checkPlan } from './plans.js';

const B = '/fit/running';
const SCREEN = (inner, nav) => `<div class="f-screen">${inner}${nav || ''}</div>`;
const km = (m, d = 2) => (m / 1000).toFixed(d).replace('.', ',');
const FRIKI = ['Corres como si te persiguiera un Titán.', 'Más rápido que un Flash con agujetas.', 'Tu pace dice: «Vamos, Forrest».', 'Hoy has ganado un Mario Kart… a pie.'];

function center(el) {
  const b = el.querySelector('#f-center');
  if (b) b.onclick = () => navigate(B + '/importar');
}

// Dibuja la ruta como línea (sin mapa de fondo: así funciona sin internet).
function routeSvg(route) {
  if (!route || route.length < 2) return '';
  const lat0 = route.reduce((a, p) => a + p[0], 0) / route.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const xs = route.map((p) => p[1] * k);
  const ys = route.map((p) => -p[0]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const w = Math.max(1e-9, x1 - x0), h = Math.max(1e-9, y1 - y0);
  const sc = Math.min(280 / w, 150 / h);
  const ox = (300 - w * sc) / 2, oy = (170 - h * sc) / 2;
  const pts = route.map((p, i) => `${(xs[i] - x0) * sc + ox},${(ys[i] - y0) * sc + oy}`);
  const [sx, sy] = pts[0].split(',');
  const [ex, ey] = pts[pts.length - 1].split(',');
  return `<svg viewBox="0 0 300 170" class="f-route"><polyline points="${pts.join(' ')}" fill="none" stroke="var(--f-acc)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${sx}" cy="${sy}" r="5" fill="var(--f-acc2)"/><circle cx="${ex}" cy="${ey}" r="5" fill="#fff" stroke="var(--f-acc)" stroke-width="2"/></svg>`;
}

function segBar(segs) {
  const tot = segs.reduce((a, s) => a + s.sec, 0) || 1;
  return `<div class="f-segbar">${segs.map((s) => `<i class="${s.type}" style="flex:${s.sec / tot}" title="${s.type}"></i>`).join('')}</div>
    <div class="f-legend"><span><i class="run"></i>Corriendo</span><span><i class="walk"></i>Caminando</span><span><i class="stop"></i>Parado</span></div>`;
}

// Altitud a lo largo de la carrera (área). Solo si el archivo traía altitud.
function eleSvg(prof) {
  const p = (prof || []).filter((x) => x[1] != null);
  if (p.length < 3) return '';
  const t1 = p[p.length - 1][0] || 1;
  const lo = Math.min(...p.map((x) => x[1])), hi = Math.max(...p.map((x) => x[1]));
  const span = Math.max(10, hi - lo);
  const X = (t) => (t / t1) * 296 + 2, Y = (e) => 8 + (1 - (e - lo) / span) * 64;
  const line = p.map((x) => `${X(x[0]).toFixed(1)},${Y(x[1]).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 300 80" class="f-ele" role="img" aria-label="Altitud de la carrera"><polygon points="2,76 ${line} 298,76" class="f-elearea"/><polyline points="${line}" fill="none" stroke="var(--f-acc)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

// Ritmo de cada km: barra más larga = más rápido.
function paceRows(splits) {
  const best = Math.min(...splits);
  return splits.map((s, i) => `<div class="f-hb"><span>${i + 1}</span><em><i style="width:${Math.max(12, Math.round((best / s) * 100))}%"></i></em><b>${paceText(s)}</b></div>`).join('');
}

function zoneCard(r, hrMax) {
  const z = zoneSeconds(r, hrMax);
  const tot = z.reduce((a, x) => a + x, 0);
  if (!tot) return '';
  const lim = (i) => (i === 0 ? `menos de ${Math.round(hrMax * 0.6)}` : i === 4 ? `${Math.round(hrMax * 0.9)} o más` : `${Math.round(hrMax * ZONES[i].from)}–${Math.round(hrMax * ZONES[i + 1].from) - 1}`);
  return `<section class="f-card plain"><strong>Zonas de pulso</strong>
    <div class="f-segbar">${z.map((x, i) => (x ? `<i style="flex:${x};background:${ZONES[i].color}"></i>` : '')).join('')}</div>
    ${z.map((x, i) => `<div class="f-zrow"><i style="background:${ZONES[i].color}"></i><span class="grow">Z${i + 1} ${ZONES[i].name}<small class="f-mini"> · ${lim(i)} ppm</small></span><b>${durText(x)}</b><span class="f-mini">${Math.round((x / tot) * 100)} %</span></div>`).join('')}
    <div class="f-mini">Solo cuenta el tiempo corriendo. Pulso máximo ${hrMax} (se cambia en Ajustes).</div></section>`;
}

const TYPE_NAME = { run: 'Corriendo', walk: 'Caminando', stop: 'Parado' };
function segList(segs, editable) {
  return segs.map((s, i) => `<div class="f-seg-row ${s.type}"><span class="dot"></span><span class="grow">${TYPE_NAME[s.type]} · ${durText(s.sec)}${s.type !== 'stop' ? ` · ${km(s.m)} km · ${paceText(s.m ? s.sec / (s.m / 1000) : 0)}/km` : ''}${s.hr ? ` · ${s.hr} ppm` : ''}</span>
    ${editable && s.type !== 'stop' ? `<button type="button" data-flip="${i}">${s.type === 'run' ? 'Era caminar' : 'Era correr'}</button>` : ''}</div>`).join('');
}

// ---- Importar ----
export function renderImport(el) {
  const fit = getFit();
  const set = fit.settings.run;
  el.innerHTML = SCREEN(backHeader('Importar carrera', B) + `<main class="f-main">
    <div class="f-note">En Zepp abre la carrera, pulsa compartir, elige el archivo <b>GPX</b> y luego <b>WIBI</b>: la carrera llegará aquí sola. Si no te sale WIBI, guarda el archivo y elígelo con el botón de abajo. El archivo no sale del móvil.</div>
    <input type="file" id="file" hidden>
    <button type="button" class="f-btn" id="pick">Elegir archivo GPX</button>
    <div class="f-mini">Ritmo límite actual: ${paceText(set.paceLimit)} min/km (más lento = caminando). Puedes cambiarlo en Ajustes.</div></main>`);
  bindGo(el);
  const file = el.querySelector('#file');
  el.querySelector('#pick').onclick = () => file.click();
  // Procesa el texto de un GPX (elegido con el botón o recibido desde Compartir).
  const handle = (text, fname) => {
    const { pts, name } = parseGpx(text);
    const analysis = analyze(pts, set.paceLimit);
    if (!analysis) { toast('No parece un GPX de carrera con recorrido. Prueba con otro archivo.'); file.value = ''; return; }
    if (isDuplicate(getFit(), analysis.startedAt)) { toast('Esta carrera ya está importada'); file.value = ''; return; }
    review(el, { analysis, name: name || String(fname || 'Carrera').replace(/\.[^.]+$/, ''), segs: analysis.segs.map((s) => ({ ...s })) });
  };
  file.onchange = async () => {
    const f = file.files[0];
    if (!f) return;
    let text;
    try { text = await f.text(); } catch { toast('No he podido leer el archivo'); return; }
    handle(text, f.name);
  };
  // ¿Ha llegado un archivo desde el menú Compartir de Android?
  takeShared().then((sh) => { if (sh && el.isConnected && el.querySelector('#pick')) handle(sh.text, sh.name); });
}

// Recoge (y borra) el GPX que dejó el service worker al recibirlo desde Compartir.
async function takeShared() {
  try {
    if (!('caches' in window)) return null;
    const cache = await caches.open('wibi-share');
    const r = await cache.match('pending');
    if (!r) return null;
    const text = await r.text();
    await cache.delete('pending');
    let name = '';
    try { name = decodeURIComponent(r.headers.get('X-Name') || ''); } catch { /* nada */ }
    return text ? { text, name } : null;
  } catch { return null; }
}

function review(el, st) {
  const set = getFit().settings.run;
  const draw = () => {
    const sum = summarize(st.segs, set.stopTol);
    const ok = sum.runSec >= set.minRunMin * 60;
    el.innerHTML = SCREEN(backHeader('Revisar carrera', B) + `<main class="f-main">
      <section class="f-card level"><div class="f-sub">${esc(st.name)}</div>
        <div class="f-grid2"><div><div class="f-num">${km(sum.runM)}</div><div class="f-mini">km corridos</div></div><div><div class="f-num">${durText(sum.runSec)}</div><div class="f-mini">corriendo</div></div><div><div class="f-num">${paceText(sum.paceRun)}</div><div class="f-mini">ritmo /km</div></div></div>
        <div class="f-mini">Seguido: ${km(sum.longestM)} km · ${durText(sum.longestSec)}. ${ok ? 'Cuenta como salida válida.' : `No llega a ${set.minRunMin} min corriendo: no cuenta como salida ni da XP.`}</div></section>
      ${routeSvg(st.analysis.route)}
      <section class="f-card plain"><strong>Tramos detectados</strong>${segBar(st.segs)}<div class="f-mini">Si la app se ha equivocado, cambia un tramo con su botón.</div>${segList(st.segs, true)}</section>
      <button type="button" class="f-btn" id="save">Guardar carrera</button></main>`);
    bindGo(el);
    el.querySelectorAll('[data-flip]').forEach((b) => (b.onclick = () => { const s = st.segs[+b.dataset.flip]; s.type = s.type === 'run' ? 'walk' : 'run'; draw(); }));
    el.querySelector('#save').onclick = async () => {
      const res = saveRun({ analysis: st.analysis, segs: st.segs, name: st.name, paceLimit: set.paceLimit });
      const planMsg = checkPlan(res.run);
      const extra = awardRun();
      extra.levelUp = extra.levelUp || res.levelUp;
      toast(res.run.valid ? `Carrera guardada · +${res.run.xp} XP${res.run.prs.length ? ' · ' + res.run.prs.length + ' récord' + (res.run.prs.length > 1 ? 's' : '') + ' 🏆' : ''}` : 'Carrera guardada (sin XP)');
      if (planMsg) setTimeout(() => toast(planMsg), 1800);
      navigate(`${B}/carrera/${res.run.id}`);
      if (extra.medals.length || extra.reto || extra.levelUp) celebrate(extra, 'run');
    };
  };
  draw();
}

// ---- Carreras ----
export function renderRuns(el) {
  const fit = getFit();
  const list = [...fit.run.runs].sort((a, b) => b.startedAt - a.startedAt);
  el.innerHTML = SCREEN(header('Carreras', 'Running') + `<main class="f-main">
    ${list.map((r) => `<button type="button" class="f-card" data-go="${B}/carrera/${r.id}"><div class="rowh"><strong>${esc(r.name)}</strong><span class="grow"></span><span class="f-mini">${shortDateText(r.date)}</span></div>
      <div class="f-mini">${km(r.runM)} km corridos · ${durText(r.runSec)} · ${paceText(r.paceRun)}/km${r.valid === false ? ' · no cuenta' : ''}${r.xp ? ' · +' + r.xp + ' XP' : ''}</div></button>`).join('')}
    ${list.length ? '' : '<div class="f-note">Aquí aparecerán tus carreras. Pulsa el rayo amarillo para importar la primera.</div>'}</main>`, sportNav('run', 'carreras'));
  bindGo(el); center(el);
}

export function renderRunDetail(el, { id }) {
  const fit = getFit();
  const r = fit.run.runs.find((x) => x.id === id);
  if (!r) { navigate(B + '/carreras'); return; }
  const g = fit.settings.guinos ? `<div class="f-guino">${FRIKI[parseInt(r.id, 36) % FRIKI.length]}</div>` : '';
  el.innerHTML = SCREEN(backHeader(esc(r.name), B + '/carreras') + `<main class="f-main">
    <section class="f-card level"><div class="f-sub">${shortDateText(r.date)}</div>
      <div class="f-grid2"><div><div class="f-num">${km(r.runM)}</div><div class="f-mini">km corridos</div></div><div><div class="f-num">${durText(r.runSec)}</div><div class="f-mini">corriendo</div></div><div><div class="f-num">${paceText(r.paceRun)}</div><div class="f-mini">ritmo /km</div></div></div>
      <div class="f-mini">${r.valid === false ? 'No cuenta como salida (poco tiempo corriendo): sin XP.' : '+' + (r.xp || 0) + ' XP'}${r.prs && r.prs.length ? ' · 🏆 ' + r.prs.map((k) => PR_NAMES[k]).join(', ') : ''}</div></section>
    ${routeSvg(r.route)}
    <div class="f-grid">
      <section class="f-card plain"><div class="f-sub">Seguido</div><div class="f-num">${km(r.longestM)}</div><div class="f-mini">km · ${durText(r.longestSec)}</div></section>
      <section class="f-card plain"><div class="f-sub">Pulso</div><div class="f-num">${r.hrAvg || '—'}</div><div class="f-mini">máx. ${r.hrMax || '—'}</div></section>
      <section class="f-card plain"><div class="f-sub">Caminado</div><div class="f-num">${km(r.walkM, 1)}</div><div class="f-mini">km · no cuenta</div></section>
    </div>
    <section class="f-card plain"><strong>Tramos</strong>${segBar(r.segs)}${segList(r.segs, false)}</section>
    ${r.ascent != null ? `<section class="f-card plain"><strong>Desnivel</strong>
      <div class="f-grid2"><div><div class="f-num">+${r.ascent}</div><div class="f-mini">m subidos</div></div><div><div class="f-num">−${r.descent}</div><div class="f-mini">m bajados</div></div></div>
      ${eleSvg(r.prof)}<div class="f-mini">Altitud entre ${r.eleMin} y ${r.eleMax} m. El reloj mide la altitud de forma aproximada.</div></section>` : ''}
    ${r.splits && r.splits.length ? `<section class="f-card plain"><strong>Ritmo por km</strong>${paceRows(r.splits)}<div class="f-mini">Barra más larga = más rápido.</div></section>` : ''}
    ${zoneCard(r, fit.settings.run.hrMax)}
    ${g}
    <button type="button" class="f-btn danger" id="del">Borrar carrera</button></main>`);
  bindGo(el);
  el.querySelector('#del').onclick = async () => {
    if (!(await confirmDialog({ title: 'Borrar carrera', text: 'Se quitará también su XP.', confirmLabel: 'Borrar', danger: true }))) return;
    updateFit((f) => { f.run.runs = f.run.runs.filter((x) => x.id !== id); f.run.xpLog = f.run.xpLog.filter((x) => x.ref !== id); });
    navigate(B + '/carreras');
  };
}

// ---- Estadísticas ----
export function renderRunStats(el) {
  let range = 'mes';
  const draw = () => {
    const fit = getFit();
    const now = new Date();
    const all = fit.run.runs.filter((r) => r.valid !== false);
    const sel = all.filter((r) => { if (range === 'todo') return true; const d = parseKey(r.date); return range === 'mes' ? d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() : d.getFullYear() === now.getFullYear(); });
    const m = sel.reduce((a, r) => a + r.runM, 0);
    const sec = sel.reduce((a, r) => a + r.runSec, 0);
    const bars = [];
    for (let i = 7; i >= 0; i--) { const mk = addDaysKey(thisMonday(), -7 * i); bars.push({ mk, v: all.filter((r) => mondayKey(parseKey(r.date)) === mk).reduce((a, r) => a + r.runM, 0) }); }
    const maxV = Math.max(1, ...bars.map((b) => b.v));
    const byDate = [...all].sort((a, b) => a.startedAt - b.startedAt).filter((r) => r.paceRun);
    const lo = Math.min(...byDate.map((r) => r.paceRun)), hi = Math.max(...byDate.map((r) => r.paceRun));
    const line = byDate.length > 1 ? `<svg viewBox="0 0 300 90" class="f-line" preserveAspectRatio="none"><polyline fill="none" stroke="var(--f-acc)" stroke-width="3" stroke-linejoin="round" points="${byDate.map((r, i) => `${(i / (byDate.length - 1)) * 290 + 5},${10 + ((r.paceRun - lo) / Math.max(1, hi - lo)) * 70}`).join(' ')}"/></svg><div class="f-mini">Ritmo por carrera (más abajo = más rápido).</div>` : '<div class="f-mini">Con dos carreras verás aquí cómo evoluciona tu ritmo.</div>';
    el.innerHTML = SCREEN(header('Estadísticas', 'Running') + `<main class="f-main">
      <div class="f-seg">${[['mes', 'Mes'], ['año', 'Año'], ['todo', 'Todo']].map(([k, l]) => `<button type="button" data-r="${k}" aria-pressed="${range === k}">${l}</button>`).join('')}</div>
      <div class="f-grid">
        <section class="f-card plain"><div class="f-sub">Salidas</div><div class="f-num">${sel.length}</div></section>
        <section class="f-card plain"><div class="f-sub">Corrido</div><div class="f-num">${km(m, 1)}</div><div class="f-mini">km</div></section>
        <section class="f-card plain"><div class="f-sub">Tiempo</div><div class="f-num">${Math.round(sec / 60)}</div><div class="f-mini">min</div></section>
      </div>
      ${sel.some((r) => r.ascent != null) ? `<section class="f-card plain"><div class="f-sub">Desnivel subido</div><div class="f-num">${sel.reduce((a, r) => a + (r.ascent || 0), 0)}</div><div class="f-mini">metros en el periodo (solo carreras con altitud)</div></section>` : ''}
      <section class="f-card plain"><strong>Km por semana</strong><div class="f-bars">${bars.map((b) => `<div class="f-bcol"><i style="height:${Math.round((b.v / maxV) * 100)}%"></i><span>${parseKey(b.mk).getDate()}</span></div>`).join('')}</div></section>
      <button type="button" class="f-card level" data-go="${B}/anual"><strong>Tu año de running</strong><div class="f-mini">Resumen anual: totales, mejores momentos y comparación con el año pasado</div></button>
      <section class="f-card plain"><strong>Evolución del ritmo</strong>${line}</section>
    </main>`, sportNav('run', 'estadisticas'));
    bindGo(el); center(el);
    el.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { range = b.dataset.r; draw(); }));
  };
  draw();
}
