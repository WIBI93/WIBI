// Cambios de turno: un bloc de notas para buscar y seguir cambios (buscando → pendiente de enviar → enviado → aceptado).

import { navigate, back, go, refresh } from '../../core/router.js';
import { readableOn } from '../../core/palette.js';
import { esc, toast, confirmDialog } from '../../core/ui.js';
import { getData, activeCal, update, newSwap, swapNames, applySwapToCalendar, uid } from './data.js';
import { INK, WEEKDAYS, MONTHS, todayKey, shiftMap } from './calc.js';
import { ico, roundBtn, navHtml, bindGo } from './shell.js';

const ST_LABEL = { find: 'Buscando', send: 'Pendiente de enviar', sent: 'Enviado', ok: 'Aceptado' };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const draft = { date: '', shift: '' }; // formulario de «otro día que puedo devolver» y de nueva búsqueda

const fmtDay = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()].slice(0, 3)} ${d} ${MONTHS[m - 1].slice(0, 3).toLowerCase()}`;
};
const badge = (map, id) => {
  const s = id ? map.get(id) : null;
  return s ? `<span class="cs-sb" role="img" aria-label="${esc(s.name)}" style="background:${s.color};color:${readableOn(s.color, INK)}">${esc(s.letter)}</span>` : '<span class="cs-sb none" role="img" aria-label="Sin turno">–</span>';
};
const dayBadge = (map, o) => `${esc(fmtDay(o.date))} ${badge(map, o.shift)}`;
const findSwap = (cal, id) => cal.swaps.find((w) => w.id === id);
const shiftOptions = (cal, sel) => `<option value="">Sin turno</option>${cal.shifts.map((s) => `<option value="${esc(s.id)}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}`;
const calShiftOn = (cal, key) => (cal.days[key] && cal.days[key].shift) || '';

function head(sub, title, backId) {
  return `<header class="cal-head">${backId ? roundBtn(backId, 'back', 'Volver') : ''}<div class="grow" style="padding-left:${backId ? 0 : 4}px"><div class="cal-sub">${sub}</div><div class="cal-title">${title}</div></div></header>`;
}

// ---------- Lista ----------
export function renderSwaps(el) {
  const d = getData();
  const cal = activeCal(d);
  const map = shiftMap(cal);
  const group = (title, sts) => {
    const arr = cal.swaps.filter((w) => sts.includes(w.st));
    if (!arr.length) return '';
    return `<h3 class="cs-h">${title}</h3>` + arr.map((w) => {
      const line = w.st === 'find'
        ? `${w.offers.length} ${w.offers.length === 1 ? 'día ofrecido' : 'días ofrecidos'} · ${w.offers.reduce((a, o) => a + o.people.length, 0)} personas · ${w.offers.reduce((a, o) => a + o.people.filter((q) => q.s === 'no').length, 0)} han dicho que no`
        : `Con ${esc(w.deal.who)} · tú trabajas ${dayBadge(map, w.deal)}`;
      return `<button type="button" class="cs-item" data-open="${esc(w.id)}"><span class="r"><b>Librar ${dayBadge(map, w.free)}</b><span class="cs-chip ${w.st}">${ST_LABEL[w.st]}</span></span><small>${line}</small></button>`;
    }).join('');
  };
  el.innerHTML = `
    <div class="cal">
      ${head('Calendario de trabajo', 'Cambios')}
      <main class="cal-main">
        <button type="button" class="cal-btn" id="new">+ Nueva búsqueda</button>
        ${cal.swaps.length ? group('Buscando', ['find']) + group('En marcha', ['send', 'sent']) + group('Aceptados', ['ok'])
          : '<div class="cal-empty">Aún no hay cambios. Pulsa «Nueva búsqueda» cuando quieras librar un día.</div>'}
      </main>
      <div class="cal-spacer"></div>
      ${navHtml('cambios')}
    </div>`;
  bindGo(el);
  el.querySelector('#new').addEventListener('click', () => { draft.date = ''; draft.shift = ''; navigate('/calendario/cambios/nuevo'); });
  el.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => navigate('/calendario/cambio/' + b.dataset.open)));
}

// ---------- Nueva búsqueda ----------
export function renderNewSwap(el) {
  const d = getData();
  const cal = activeCal(d);
  if (!draft.date) { draft.date = todayKey(); draft.shift = calShiftOn(cal, draft.date); }
  el.innerHTML = `
    <div class="cal">
      ${head('Cambios', 'Nueva búsqueda', 'go-back')}
      <main class="cal-main">
        <div class="cal-note">¿Qué día quieres librar? Si ya lo tienes rellenado en el calendario, el turno sale solo.</div>
        <label class="cal-field"><span>Día que quieres librar</span><input class="cal-input" type="date" id="date" value="${esc(draft.date)}"></label>
        <label class="cal-field"><span>Turno de ese día</span><select class="cal-select" id="shift" style="width:100%">${shiftOptions(cal, draft.shift)}</select></label>
      </main>
      <div class="cal-foot"><button type="button" class="cal-btn" id="go">Empezar a buscar</button></div>
    </div>`;
  el.querySelector('#go-back').addEventListener('click', () => back('/calendario/cambios'));
  el.querySelector('#date').addEventListener('change', (e) => {
    if (!DATE_RE.test(e.target.value)) return;
    draft.date = e.target.value; draft.shift = calShiftOn(cal, draft.date);
    el.querySelector('#shift').value = draft.shift;
  });
  el.querySelector('#shift').addEventListener('change', (e) => { draft.shift = e.target.value; });
  el.querySelector('#go').addEventListener('click', () => {
    if (!DATE_RE.test(draft.date)) { toast('Elige un día'); return; }
    let id;
    update((data, c) => { id = newSwap(c, draft.date, draft.shift).id; });
    go('/calendario/cambio/' + id);
  });
}

// ---------- Detalle: buscando o cambio acordado ----------
export function renderSwap(el, { id }) {
  const d = getData();
  const cal = activeCal(d);
  const w = findSwap(cal, id);
  if (!w) { back('/calendario/cambios'); return; }
  if (w.st === 'find') renderFind(el, cal, w); else renderDeal(el, cal, w);
}

const mut = (id, fn) => { update((data, c) => { const w = findSwap(c, id); if (w) fn(w, c); }); refresh(); };

function renderFind(el, cal, w) {
  const map = shiftMap(cal);
  const names = swapNames(cal);
  let yes = null;
  w.offers.forEach((o) => o.people.forEach((q) => { if (!yes && q.s === 'yes') yes = { who: q.name, date: o.date, shift: o.shift }; }));
  if (!draft.date || draft.owner !== w.id) { draft.owner = w.id; draft.date = ''; draft.shift = ''; }
  const days = w.offers.map((o) => `
    <section class="cs-day"><header><span>${dayBadge(map, o)}</span><em>${o.people.length} ${o.people.length === 1 ? 'persona' : 'personas'}</em>
      <button type="button" class="cs-x" data-rmday="${esc(o.id)}" aria-label="Quitar este día">${ico('x', 16)}</button></header>
      ${o.people.map((q) => `<div class="cs-person ${q.s}"><span class="nm">${esc(q.name)}</span>${q.s === 'ask'
        ? `<button type="button" class="cs-sm" data-no="${esc(q.id)}">No</button><button type="button" class="cs-sm yes" data-yes="${esc(q.id)}">Sí</button>`
        : `<button type="button" class="cs-sm undo" data-undo="${esc(q.id)}">${q.s === 'yes' ? 'Sí ✓ · deshacer' : 'Deshacer'}</button>`}
        <button type="button" class="cs-x" data-rmp="${esc(q.id)}" aria-label="Quitar a ${esc(q.name)}">${ico('x', 16)}</button></div>`).join('')}
      <div class="cs-add"><input type="text" list="names" maxlength="40" placeholder="Añadir persona" aria-label="Añadir persona" data-in="${esc(o.id)}"><button type="button" class="cs-sm" data-add="${esc(o.id)}">Añadir</button></div>
    </section>`).join('');
  el.innerHTML = `
    <div class="cal">
      ${head('Buscando cambio', `Librar ${dayBadge(map, w.free)}`, 'go-back')}
      <main class="cal-main">
        ${yes ? `<div class="cs-banner"><span>${esc(yes.who)} dice que sí: tú trabajas el ${dayBadge(map, yes)} y esa persona el ${dayBadge(map, w.free)}.</span><button type="button" class="cal-btn" id="mk">Apuntar cambio · pendiente de enviar</button></div>` : ''}
        <div class="cal-note small">Días que puedes devolver y gente que trabaja ese día. Pulsa «No» o «Sí» según te contesten.</div>
        ${days || '<div class="cal-empty">Añade abajo los días que podrías devolver.</div>'}
        <section class="cal-section"><h3>Otro día que puedo devolver</h3>
          <input class="cal-input" type="date" id="odate" value="${esc(draft.date)}" aria-label="Día">
          <select class="cal-select" id="oshift" style="width:100%" aria-label="Turno">${shiftOptions(cal, draft.shift)}</select>
          <button type="button" class="cal-btn slim outline" id="oadd">+ Añadir día</button></section>
        <datalist id="names">${names.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
        <button type="button" class="cal-btn plain-danger" id="del">Borrar esta búsqueda</button>
      </main>
      <div class="cal-spacer"></div>
    </div>`;
  const find = (pid) => { for (const o of w.offers) for (const q of o.people) if (q.id === pid) return [o, q]; return []; };
  const setS = (pid, s) => mut(w.id, (sw) => { for (const o of sw.offers) for (const q of o.people) if (q.id === pid) q.s = s; });
  el.querySelector('#go-back').addEventListener('click', () => back('/calendario/cambios'));
  el.querySelectorAll('[data-no]').forEach((b) => b.addEventListener('click', () => setS(b.dataset.no, 'no')));
  el.querySelectorAll('[data-yes]').forEach((b) => b.addEventListener('click', () => setS(b.dataset.yes, 'yes')));
  el.querySelectorAll('[data-undo]').forEach((b) => b.addEventListener('click', () => setS(b.dataset.undo, 'ask')));
  el.querySelectorAll('[data-rmp]').forEach((b) => b.addEventListener('click', () => mut(w.id, (sw) => sw.offers.forEach((o) => { o.people = o.people.filter((q) => q.id !== b.dataset.rmp); }))));
  el.querySelectorAll('[data-rmday]').forEach((b) => b.addEventListener('click', async () => {
    if (await confirmDialog({ title: '¿Quitar este día?', text: 'Se quitará también la lista de personas de ese día.', confirmLabel: 'Quitar', danger: true })) mut(w.id, (sw) => { sw.offers = sw.offers.filter((o) => o.id !== b.dataset.rmday); });
  }));
  const addPerson = (oid) => {
    const inp = el.querySelector(`[data-in="${oid}"]`);
    const name = inp.value.trim().slice(0, 40);
    if (!name) return;
    mut(w.id, (sw) => { const o = sw.offers.find((x) => x.id === oid); if (o) o.people.push({ id: 'p' + uid(), name, s: 'ask' }); });
  };
  el.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => addPerson(b.dataset.add)));
  el.querySelectorAll('[data-in]').forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') addPerson(i.dataset.in); }));
  el.querySelector('#odate').addEventListener('change', (e) => {
    draft.date = DATE_RE.test(e.target.value) ? e.target.value : '';
    draft.shift = draft.date ? calShiftOn(cal, draft.date) : '';
    el.querySelector('#oshift').value = draft.shift;
  });
  el.querySelector('#oshift').addEventListener('change', (e) => { draft.shift = e.target.value; });
  el.querySelector('#oadd').addEventListener('click', () => {
    if (!DATE_RE.test(draft.date)) { toast('Elige un día'); return; }
    const o = { id: 'o' + uid(), date: draft.date, shift: draft.shift || null, people: [] };
    draft.date = ''; draft.shift = '';
    mut(w.id, (sw) => { sw.offers.push(o); });
  });
  const mk = el.querySelector('#mk');
  if (mk) mk.addEventListener('click', () => mut(w.id, (sw) => { sw.deal = { who: yes.who, date: yes.date, shift: yes.shift }; sw.st = 'send'; }));
  el.querySelector('#del').addEventListener('click', () => delSwap(w.id));
}

async function delSwap(id) {
  if (!(await confirmDialog({ title: '¿Borrar este cambio?', text: 'Se borra solo de esta lista. El calendario no se modifica.', confirmLabel: 'Borrar', danger: true }))) return;
  update((data, c) => { c.swaps = c.swaps.filter((w) => w.id !== id); });
  back('/calendario/cambios');
}

function renderDeal(el, cal, w) {
  const map = shiftMap(cal);
  const order = ['send', 'sent', 'ok'];
  const at = order.indexOf(w.st);
  const off = cal.shifts.find((s) => s.kind === 'off');
  const nextLabel = { send: 'Marcar como enviado', sent: 'Marcar como aceptado' };
  const steps = order.map((k, i) => `<div class="${i < at ? 'done' : i === at ? 'on' : ''}">${ST_LABEL[k]}</div>`).join('');
  const bottom = w.st === 'ok'
    ? `<section class="cs-apply"><b>¿Lo reflejo en el calendario?</b>
        <div class="ln">${esc(fmtDay(w.free.date))} → ${off ? badge(map, off.id) : ''} ${off ? esc(off.name) : 'sin turno'}, con marca de cambio de turno</div>
        <div class="ln">${esc(fmtDay(w.deal.date))} → ${badge(map, w.deal.shift)} tu turno, con marca de cambio de turno</div></section>
       <button type="button" class="cal-btn" id="ap">Aplicar al calendario y borrar</button>
       <button type="button" class="cal-btn outline" id="rm">Solo borrar de la lista</button>`
    : `<button type="button" class="cal-btn" id="adv">${nextLabel[w.st]}</button>`;
  el.innerHTML = `
    <div class="cal">
      ${head('Cambio con ' + esc(w.deal.who), `Librar ${dayBadge(map, w.free)}`, 'go-back')}
      <main class="cal-main">
        <div class="cs-steps">${steps}</div>
        <section class="cs-kv"><div><span>Tú libras</span><b>${dayBadge(map, w.free)}</b></div>
          <div><span>Tú trabajas (turno de ${esc(w.deal.who)})</span><b>${dayBadge(map, w.deal)}</b></div>
          <div><span>Con</span><b>${esc(w.deal.who)}</b></div></section>
        ${bottom}
        ${w.st !== 'ok' ? '<button type="button" class="cal-btn outline" id="again">Me dijo que no · seguir buscando</button>' : ''}
        <button type="button" class="cal-btn plain-danger" id="del">Cancelar este cambio</button>
      </main>
      <div class="cal-spacer"></div>
    </div>`;
  el.querySelector('#go-back').addEventListener('click', () => back('/calendario/cambios'));
  const adv = el.querySelector('#adv');
  if (adv) adv.addEventListener('click', () => mut(w.id, (sw) => { sw.st = order[at + 1]; }));
  const again = el.querySelector('#again');
  if (again) again.addEventListener('click', () => mut(w.id, (sw) => {
    sw.offers.forEach((o) => o.people.forEach((q) => { if (q.s === 'yes' && q.name === sw.deal.who && o.date === sw.deal.date) q.s = 'no'; }));
    sw.deal = null; sw.st = 'find';
  }));
  const ap = el.querySelector('#ap');
  if (ap) ap.addEventListener('click', () => {
    update((data, c) => { const sw = findSwap(c, w.id); if (sw) { applySwapToCalendar(c, sw); c.swaps = c.swaps.filter((x) => x.id !== w.id); } });
    toast('Calendario actualizado');
    back('/calendario/cambios');
  });
  const rm = el.querySelector('#rm');
  if (rm) rm.addEventListener('click', () => { update((data, c) => { c.swaps = c.swaps.filter((x) => x.id !== w.id); }); back('/calendario/cambios'); });
  el.querySelector('#del').addEventListener('click', () => delSwap(w.id));
}
