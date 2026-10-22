// Compartir un calendario como archivo (por WhatsApp, etc.) e importar el de otra persona.
// El archivo lleva solo los turnos y qué turno toca cada día: nada de notas, estrés ni zonas.

import { back, navigate } from '../../core/router.js';
import { esc, toast, confirmDialog } from '../../core/ui.js';
import { getData, update, uid, setShiftOnDay, CAL_COLORS } from './data.js';
import { MONTHS, parseKey } from './calc.js';
import { ico, roundBtn, navHtml, bindGo } from './shell.js';

const TYPE = 'calendar-share';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const KINDS = ['work', 'off', 'out'];

// ---------- Crear el archivo ----------
export function buildShare(cal) {
  const days = {};
  const used = new Set();
  Object.entries(cal.days).forEach(([k, v]) => { if (v && v.shift) { days[k] = v.shift; used.add(v.shift); } });
  const shifts = cal.shifts.filter((s) => used.has(s.id)).map((s) => ({ id: s.id, name: s.name, letter: s.letter, start: s.start, end: s.end, color: s.color, kind: s.kind }));
  return { app: 'WIBI', type: TYPE, v: 1, name: cal.name, color: cal.color, exportedAt: new Date().toISOString().slice(0, 10), shifts, days };
}
const fileNameFor = (name) => `calendario-${String(name).trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'WIBI'}.txt`;

export async function shareCalendar(cal) {
  const payload = buildShare(cal);
  if (!Object.keys(payload.days).length) { toast('Este calendario aún no tiene días rellenados'); return; }
  const name = fileNameFor(cal.name);
  const text = JSON.stringify(payload);
  try {
    const file = new File([text], name, { type: 'text/plain' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `Calendario ${cal.name}` });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return; // lo canceló la persona
  }
  // Sin menú de compartir (ordenador, navegadores antiguos): se descarga el archivo.
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast('Archivo guardado en tu móvil. Envíalo por WhatsApp.');
}

// ---------- Leer el archivo recibido ----------
export function parseShare(text) {
  let o;
  try { o = JSON.parse(text); } catch { return null; }
  if (!o || o.app !== 'WIBI' || o.type !== TYPE || !Array.isArray(o.shifts) || !o.days || typeof o.days !== 'object') return null;
  const ids = new Set();
  const shifts = o.shifts.slice(0, 40).map((s) => {
    if (!s || typeof s.id !== 'string' || ids.has(s.id)) return null;
    ids.add(s.id);
    const name = String(s.name || '').trim().slice(0, 30) || 'Turno';
    return {
      id: s.id.slice(0, 40), name, letter: String(s.letter || name[0]).trim().slice(0, 2).toUpperCase(),
      start: TIME_RE.test(s.start) ? s.start : '08:00', end: TIME_RE.test(s.end) ? s.end : '14:00',
      color: HEX_RE.test(s.color) ? s.color.toUpperCase() : '#6B7785', kind: KINDS.includes(s.kind) ? s.kind : 'work',
    };
  }).filter(Boolean);
  const days = {};
  Object.entries(o.days).slice(0, 4000).forEach(([k, v]) => { if (DATE_RE.test(k) && ids.has(v)) days[k] = v; });
  const keys = Object.keys(days).sort();
  if (!keys.length) return null;
  return {
    name: String(o.name || '').trim().slice(0, 40) || 'Calendario recibido',
    color: HEX_RE.test(o.color) ? o.color.toUpperCase() : CAL_COLORS[1].hex,
    shifts, days, first: keys[0], last: keys[keys.length - 1], count: keys.length,
  };
}

const sameShift = (a, b) => a.letter === b.letter && a.name === b.name && a.start === b.start && a.end === b.end && a.kind === b.kind;
// Cuántos días cambiarían en un calendario que ya existe.
function changesFor(sh, cal) {
  let n = 0;
  Object.entries(sh.days).forEach(([k, sid]) => {
    const incoming = sh.shifts.find((s) => s.id === sid);
    const cur = cal.days[k] && cal.days[k].shift ? cal.shifts.find((s) => s.id === cal.days[k].shift) : null;
    if (!cur || !sameShift(cur, incoming)) n++;
  });
  return n;
}
function applyTo(d, sh, destId, newName) {
  if (destId === 'new') {
    const id = uid();
    const shifts = sh.shifts.map((s) => ({ ...s, id: 'i' + uid() + s.id.slice(0, 4) }));
    const idMap = new Map(sh.shifts.map((s, i) => [s.id, shifts[i].id]));
    const cal = { id, name: newName, color: sh.color, shifts, zones: [], days: {} };
    Object.entries(sh.days).forEach(([k, sid]) => { cal.days[k] = { shift: idMap.get(sid), zone: null, swap: false, note: '', stress: null, causes: [] }; });
    d.calendars.push(cal);
    return cal;
  }
  const cal = d.calendars.find((c) => c.id === destId);
  const idMap = new Map();
  sh.shifts.forEach((s) => {
    const hit = cal.shifts.find((x) => sameShift(x, s));
    if (hit) idMap.set(s.id, hit.id);
    else { const ns = { ...s, id: 'i' + uid() + s.id.slice(0, 4) }; cal.shifts.push(ns); idMap.set(s.id, ns.id); }
  });
  Object.entries(sh.days).forEach(([k, sid]) => setShiftOnDay(cal, k, idMap.get(sid)));
  return cal;
}

// Recoge (y borra) el archivo que dejó el service worker al recibirlo desde Compartir.
async function takeShared() {
  try {
    if (!('caches' in window)) return null;
    const cache = await caches.open('wibi-share');
    const r = await cache.match('pending');
    if (!r) return null;
    const text = await r.text();
    await cache.delete('pending');
    return text || null;
  } catch { return null; }
}

const dayText = (key) => { const p = parseKey(key); return `${p.d} ${MONTHS[p.m].toLowerCase().slice(0, 3)} ${p.y}`; };
let pendingText = null; // por si se recarga la pantalla con el archivo ya leído

export function renderImport(el) {
  const draw = (sh, st) => {
    const d = getData();
    if (!sh) {
      el.innerHTML = `<div class="cal"><header class="cal-head">${roundBtn('go-back', 'back', 'Volver')}<div class="grow"><div class="cal-sub">Calendarios</div><div class="cal-title">Importar calendario</div></div></header>
        <main class="cal-main"><section class="cal-section"><h3>Calendario de otra persona</h3>
          <div class="cal-note">Cuando alguien te mande su calendario por WhatsApp, ábrelo con «Compartir» → WIBI y aparecerá aquí. También puedes elegir el archivo a mano.</div>
          <button type="button" class="cal-btn" id="pick">Elegir archivo</button><input type="file" id="file" accept=".txt,.json,text/plain,application/json" hidden></section></main>
        <div class="cal-spacer"></div>${navHtml('ajustes')}</div>`;
      bindGo(el);
      el.querySelector('#go-back').addEventListener('click', () => back('/calendario/ajustes'));
      const file = el.querySelector('#file');
      el.querySelector('#pick').addEventListener('click', () => file.click());
      file.addEventListener('change', async () => {
        const f = file.files && file.files[0]; file.value = '';
        if (!f) return;
        let text = ''; try { text = await f.text(); } catch { toast('No he podido leer el archivo'); return; }
        const parsed = parseShare(text);
        if (!parsed) { toast('Este archivo no es un calendario de WIBI'); return; }
        pendingText = text; draw(parsed, { dest: 'new', name: parsed.name });
      });
      return;
    }
    const dest = st.dest;
    const cal = dest === 'new' ? null : d.calendars.find((c) => c.id === dest);
    const nChg = cal ? changesFor(sh, cal) : sh.count;
    const radio = (id, label, sub) => `<button type="button" class="cal-radio ${dest === id ? 'on' : ''}" data-dest="${esc(id)}"><i class="dot"></i><span>${label}${sub ? `<small style="display:block;color:var(--muted);font-weight:500">${sub}</small>` : ''}</span></button>`;
    const used = sh.shifts.filter((s) => Object.values(sh.days).includes(s.id));
    const mini = used.map((s) => `<span style="display:inline-flex;align-items:center;gap:6px;font-size:13px;margin:2px 10px 2px 0"><i style="width:14px;height:14px;border-radius:4px;background:${esc(s.color)};display:inline-block"></i>${esc(s.letter)} · ${esc(s.name)}</span>`).join('');
    el.innerHTML = `<div class="cal"><header class="cal-head">${roundBtn('go-back', 'back', 'Volver')}<div class="grow"><div class="cal-sub">Calendarios</div><div class="cal-title">Importar calendario</div></div></header>
      <main class="cal-main">
        <section class="cal-hero"><div><div class="k">Calendario recibido</div><div class="big" style="font-size:24px">${esc(sh.name)}</div></div>
          <div class="rt"><div>${sh.count} días</div><div class="m">${dayText(sh.first)} – ${dayText(sh.last)}</div></div></section>
        <div class="cal-note small" style="padding:0 2px">Turnos: ${mini}</div>
        <div class="cal-field"><span>¿Dónde lo guardo?</span>
          ${d.calendars.map((c) => radio(c.id, `En «${esc(c.name)}»`, c.id === d.activeId ? 'El calendario que tienes abierto' : '')).join('')}
          ${radio('new', 'Crear un calendario nuevo', '')}</div>
        ${dest === 'new' ? `<label class="cal-field"><span>Nombre del calendario nuevo</span><input class="cal-input" id="newname" type="text" maxlength="40" value="${esc(st.name)}"></label>`
          : `<div class="cal-note small">${nChg ? `Cambiará el turno de <b>${nChg}</b> ${nChg === 1 ? 'día' : 'días'} de «${esc(cal.name)}». Los demás días, sus notas y su estrés se quedan como están.` : 'Todos esos días ya están igual en este calendario. No cambia nada.'}</div>`}
      </main>
      <div class="cal-foot"><button type="button" class="cal-btn" id="go">${dest === 'new' ? 'Crear calendario' : `Importar en «${esc(cal.name)}»`}</button></div></div>`;
    el.querySelector('#go-back').addEventListener('click', () => { pendingText = null; back('/calendario/ajustes'); });
    const grabName = () => { const i = el.querySelector('#newname'); if (i) st.name = i.value; };
    el.querySelectorAll('[data-dest]').forEach((b) => b.addEventListener('click', () => { grabName(); draw(sh, { ...st, dest: b.dataset.dest }); }));
    el.querySelector('#go').addEventListener('click', async () => {
      grabName();
      if (dest === 'new' && !st.name.trim()) return toast('Escribe un nombre para el calendario');
      if (cal && nChg > 0) {
        const ok = await confirmDialog({ title: `¿Importar en «${cal.name}»?`, text: `Se cambiará el turno de ${nChg} ${nChg === 1 ? 'día' : 'días'}. Si dudas, exporta antes una copia en Ajustes.`, confirmLabel: 'Importar' });
        if (!ok) return;
      }
      let newId = null;
      update((data) => { const c = applyTo(data, sh, dest, st.name.trim()); newId = c.id; data.activeId = c.id; });
      pendingText = null;
      toast(dest === 'new' ? 'Calendario creado' : 'Calendario actualizado');
      back('/calendario');
    });
  };
  const start = (text) => {
    const parsed = parseShare(text);
    if (!parsed) { toast('Este archivo no es un calendario de WIBI'); draw(null); return; }
    pendingText = text;
    draw(parsed, { dest: 'new', name: parsed.name });
  };
  if (pendingText) { start(pendingText); return; }
  draw(null);
  takeShared().then((text) => { if (text && el.isConnected) start(text); });
}
