// Resumen del mes: horas por turno y zonas.

import { navigate, back, go, refresh } from '../../core/router.js';
import { readableOn } from '../../core/palette.js';
import { esc } from '../../core/ui.js';
import { getData, activeCal, update } from './data.js';
import { state, shiftMonth } from './state.js';
import { MONTHS, INK, WEEKDAYS, monthStats, periodStats, zoneCounts, pendingDays, fmtHours, parseKey, weekdayOf, shiftMap, stressStats, zoneStress, ZONE_MIN_DAYS, yearHours, stressColor, fmtAvg, STRESS_HEX } from './calc.js';
import { ico, flagIco, roundBtn, navHtml, bindGo } from './shell.js';

function header(sub) {
  return `<header class="cal-head">
    <div class="grow" style="padding-left:4px"><div class="cal-sub">${sub}</div><div class="cal-title">${MONTHS[state.m]} ${state.y}</div></div>
    ${roundBtn('prev', 'back', 'Mes anterior')}${roundBtn('next', 'next', 'Mes siguiente')}
  </header>`;
}
function tabs(active) {
  return `<div class="cal-tabs" role="tablist"><button type="button" role="tab" data-go="/calendario/resumen" aria-selected="${active === 'h'}">Horas</button><button type="button" role="tab" data-go="/calendario/resumen/estres" aria-selected="${active === 'e'}">Estrés</button><button type="button" role="tab" data-go="/calendario/resumen/zonas" aria-selected="${active === 'z'}">Zonas</button></div>`;
}
function bindMonthNav(el) {
  el.querySelector('#prev').addEventListener('click', () => { shiftMonth(-1); refresh(); });
  el.querySelector('#next').addEventListener('click', () => { shiftMonth(1); refresh(); });
  bindGo(el);
}

export function renderHours(el) {
  const d = getData();
  const cal = activeCal(d);
  const yearly = state.hoursScope === 'anio';
  const st = periodStats(cal, d.holidays, state.y, yearly ? null : state.m);
  const work = cal.shifts.filter((s) => s.kind === 'work');
  const others = cal.shifts.filter((s) => s.kind !== 'work' && st.byShift[s.id].days > 0);
  const sw = (s) => `<span class="sw" style="background:${s.color};color:${readableOn(s.color, INK)}">${esc(s.letter)}</span>`;
  const bars = work.map((s) => {
    const b = st.byShift[s.id];
    const pct = st.hours > 0 ? Math.round((b.hours / st.hours) * 100) : 0;
    return `<div class="cal-bar-row"><div class="cal-bar-line">${sw(s)}<span class="nm">${esc(s.name)}</span><span class="dd">${b.days} ${b.days === 1 ? 'turno' : 'turnos'}</span><span class="hh">${fmtHours(b.hours)}</span></div>
      <div class="cal-bar"><i style="width:${pct}%;background:${s.color}"></i></div></div>`;
  }).join('') || '<div class="cal-note small">No hay turnos de trabajo en este calendario.</div>';
  const rest = others.map((s, i) => {
    const b = st.byShift[s.id];
    return `<div class="cal-bar-line ${i === 0 ? 'cal-sep' : ''}">${sw(s)}<span class="nm">${esc(s.name)}</span><span class="dd">${b.days} ${b.days === 1 ? 'día' : 'días'}</span><span class="hh m">0 h</span></div>`;
  }).join('');

  el.innerHTML = `
    <div class="cal">
      <header class="cal-head">
        <div class="grow" style="padding-left:4px"><div class="cal-sub">${yearly ? 'Resumen del año' : 'Resumen del mes'}</div><div class="cal-title">${yearly ? state.y : MONTHS[state.m] + ' ' + state.y}</div></div>
        ${roundBtn('prev', 'back', yearly ? 'Año anterior' : 'Mes anterior')}${roundBtn('next', 'next', yearly ? 'Año siguiente' : 'Mes siguiente')}
      </header>
      <main class="cal-main">
        ${tabs('h')}
        <div class="cal-tabs small" role="tablist" style="align-self:stretch"><button type="button" data-scope="mes" role="tab" aria-selected="${!yearly}" style="flex:1">Mes</button><button type="button" data-scope="anio" role="tab" aria-selected="${yearly}" style="flex:1">Año</button></div>
        <section class="cal-hero compact"><div><div class="k">${yearly ? 'Horas trabajadas en el año' : 'Horas trabajadas'}</div><div class="big">${fmtHours(st.hours)}</div></div>
          <div class="rt"><div>${st.worked} ${st.worked === 1 ? 'día trabajado' : 'días trabajados'}</div><div class="m">${st.off} libres · ${st.out} salientes</div></div></section>
        <section class="cal-section"><h3>Turnos de cada tipo${yearly ? ' · ' + state.y : ''}</h3>${bars}${rest}</section>
        <section class="cal-section" style="flex-direction:row;align-items:center;justify-content:space-between;padding:12px 16px">
          <span style="display:flex;align-items:center;gap:8px;font-size:16px;font-weight:600">${flagIco(18)}Festivos trabajados</span><b style="font-size:18px">${st.fest}</b></section>
        ${!yearly && st.unpainted ? `<div class="cal-note small" style="padding:0 4px">${st.unpainted} ${st.unpainted === 1 ? 'día' : 'días'} sin rellenar este mes (no cuentan).</div>` : ''}
        ${yearly ? '<div class="cal-note small" style="padding:0 4px">Horas programadas en los turnos de los días ya rellenados.</div>' : ''}
      </main>
      <div class="cal-spacer"></div>
      ${navHtml('resumen')}
    </div>`;
  const shift = (n) => { if (yearly) state.y += n; else shiftMonth(n); refresh(); };
  el.querySelector('#prev').addEventListener('click', () => shift(-1));
  el.querySelector('#next').addEventListener('click', () => shift(1));
  bindGo(el);
  el.querySelectorAll('[data-scope]').forEach((b) => b.addEventListener('click', () => { state.hoursScope = b.dataset.scope; refresh(); }));
}

export function renderZones(el) {
  const d = getData();
  const cal = activeCal(d);
  const yearly = state.zoneScope === 'anio';
  const counts = zoneCounts(cal, state.y, yearly ? null : state.m);
  const pend = pendingDays(cal, state.y, yearly ? null : state.m);
  const rows = cal.zones.map((z) => ({ ...z, n: counts[z.id] || 0 })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'es'));
  const max = Math.max(1, ...rows.map((r) => r.n));
  const list = rows.length
    ? rows.map((r) => `<div class="cal-zrow"><span class="zn">${esc(r.name)}</span><span class="zb"><i style="width:${Math.round((r.n / max) * 100)}%"></i></span><span class="zc">${r.n}</span></div>`).join('')
    : '<div class="cal-empty">Aún no hay zonas. Añádelas en Turnos → Zonas.</div>';
  const pendHtml = !cal.zones.length ? '' : pend.length
    ? `<button type="button" class="cal-pend" id="pend"><span>${pend.length} ${pend.length === 1 ? 'día sin zona' : 'días sin zona'}</span><span class="go">Rellenar${ico('next', 18, 2)}</span></button>`
    : '<div class="cal-note small" style="padding:0 4px">Todos los días trabajados tienen zona.</div>';

  el.innerHTML = `
    <div class="cal">
      <header class="cal-head">
        <div class="grow" style="padding-left:4px"><div class="cal-sub">${yearly ? 'Resumen del año' : 'Resumen del mes'}</div><div class="cal-title">${yearly ? state.y : MONTHS[state.m] + ' ' + state.y}</div></div>
        ${roundBtn('prev', 'back', yearly ? 'Año anterior' : 'Mes anterior')}${roundBtn('next', 'next', yearly ? 'Año siguiente' : 'Mes siguiente')}
      </header>
      <main class="cal-main">
        ${tabs('z')}
        <div class="cal-tabs small" role="tablist" style="align-self:stretch"><button type="button" data-scope="mes" role="tab" aria-selected="${!yearly}" style="flex:1">Mes</button><button type="button" data-scope="anio" role="tab" aria-selected="${yearly}" style="flex:1">Año</button></div>
        <section class="cal-section"><h3>Veces en cada zona${yearly ? ' · ' + state.y : ''}</h3>
          <div>${list}</div></section>
        ${pendHtml}
      </main>
      <div class="cal-spacer"></div>
      ${navHtml('resumen')}
    </div>`;
  const shiftZ = (n) => { if (yearly) state.y += n; else shiftMonth(n); refresh(); };
  el.querySelector('#prev').addEventListener('click', () => shiftZ(-1));
  el.querySelector('#next').addEventListener('click', () => shiftZ(1));
  bindGo(el);
  el.querySelectorAll('[data-scope]').forEach((b) => b.addEventListener('click', () => { state.zoneScope = b.dataset.scope; refresh(); }));
  const p = el.querySelector('#pend');
  if (p) p.addEventListener('click', () => navigate('/calendario/zonas-pendientes/' + (yearly ? 'anio' : 'mes')));
}

export function renderPending(el, { scope }) {
  const d = getData();
  const cal = activeCal(d);
  const yearly = scope === 'anio';
  const map = shiftMap(cal);
  const keys = pendingDays(cal, state.y, yearly ? null : state.m);
  const rows = keys.map((key) => {
    const s = map.get(cal.days[key].shift);
    const p = parseKey(key);
    return `<div class="cal-pendrow">
      <span class="sw" style="width:40px;height:40px;border-radius:12px;font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none;background:${s.color};color:${readableOn(s.color, INK)}">${esc(s.letter)}</span>
      <span class="tx" style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><b style="font-size:16px">${WEEKDAYS[weekdayOf(key)]} ${p.d}${yearly ? ' ' + MONTHS[p.m].toLowerCase().slice(0, 3) : ''}</b><span style="font-size:14px;color:var(--muted)">${esc(s.name)}</span></span>
      <select class="cal-select" data-key="${key}" aria-label="Zona del ${WEEKDAYS[weekdayOf(key)]} ${p.d}"><option value="" selected disabled>Elegir zona</option>${cal.zones.map((z) => `<option value="${z.id}">${esc(z.name)}</option>`).join('')}</select></div>`;
  }).join('');
  el.innerHTML = `
    <div class="cal">
      <header class="cal-head">${roundBtn('go-back', 'back', 'Volver al conteo de zonas')}
        <div class="grow"><div class="cal-sub">${yearly ? state.y : MONTHS[state.m] + ' ' + state.y}</div><div class="cal-title">Zonas pendientes</div></div></header>
      <main class="cal-main tight">
        <div class="cal-note">Días trabajados que aún no tienen zona. Elige la de cada uno y se guarda al momento.</div>
        ${rows || '<div class="cal-empty">No queda ningún día pendiente.</div>'}
      </main>
      <div class="cal-foot"><button type="button" class="cal-btn" id="done">Listo</button></div>
    </div>`;
  el.querySelector('#go-back').addEventListener('click', () => back('/calendario/resumen/zonas'));
  el.querySelector('#done').addEventListener('click', () => back('/calendario/resumen/zonas'));
  el.querySelectorAll('select[data-key]').forEach((sel) => sel.addEventListener('change', () => {
    update((data, c) => { if (c.days[sel.dataset.key]) c.days[sel.dataset.key].zone = sel.value; });
    const row = sel.closest('.cal-pendrow');
    row.style.opacity = '0.5';
    sel.disabled = true;
  }));
}


export function renderStress(el) {
  const d = getData();
  const cal = activeCal(d);
  const yearly = state.stressScope === 'anio';
  const st = stressStats(cal, state.y, yearly ? null : state.m);
  const names = new Map(d.stressCauses.map((c) => [c.id, c.name]));
  const rows = Object.entries(st.causes).map(([id, n]) => ({ name: names.get(id) || 'Causa eliminada', n })).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'es'));
  const max = Math.max(1, ...rows.map((r) => r.n));
  const causes = rows.length
    ? rows.map((r) => `<div class="cal-zrow"><span class="zn" style="width:132px">${esc(r.name)}</span><span class="zb"><i style="width:${Math.round((r.n / max) * 100)}%"></i></span><span class="zc">${r.n} ${r.n === 1 ? 'día' : 'días'}</span></div>`).join('')
    : '<div class="cal-empty">Aún no hay días de 7 o más con causas marcadas.</div>';
  const zs = zoneStress(cal, state.y, yearly ? null : state.m);
  const zrows = cal.zones.filter((z) => zs[z.id]).map((z) => ({ z, ...zs[z.id], avg: zs[z.id].sum / zs[z.id].n }))
    .sort((a, b) => (b.n >= ZONE_MIN_DAYS) - (a.n >= ZONE_MIN_DAYS) || b.avg - a.avg);
  const zoneSection = !cal.zones.length ? '' : `<section class="cal-section"><h3>Estrés por zona${yearly ? ' · ' + state.y : ''}</h3>${zrows.length
    ? zrows.map((r) => {
      const few = r.n < ZONE_MIN_DAYS;
      const cs = Object.entries(r.causes).map(([id, n]) => ({ name: names.get(id) || 'Causa eliminada', n })).sort((a, b) => b.n - a.n);
      return `<details class="cs-zs ${few ? 'few' : ''}"><summary><span class="zn">${esc(r.z.name)}</span><span class="zb"><i style="width:${Math.round(r.avg * 10)}%;background:${stressColor(r.avg)}"></i></span><span class="zc">${fmtAvg(r.avg)}</span></summary>
        <div class="cs-zd">${r.n} ${r.n === 1 ? 'día puntuado' : 'días puntuados'}${few ? ' · pocos datos todavía' : ''}<br>${r.high ? `${r.high} ${r.high === 1 ? 'día' : 'días'} de 7 o más` + (cs.length ? ': ' + cs.map((c) => `${esc(c.name)} (${c.n})`).join(', ') : ' (sin causas marcadas)') : 'Ningún día de 7 o más'}</div></details>`;
    }).join('')
    : '<div class="cal-empty">Aún no hay días con zona y estrés a la vez.</div>'}
      <div class="cal-note small">Media de estrés de los días que apuntaste en cada zona. Las zonas con menos de ${ZONE_MIN_DAYS} días salen apagadas porque la media aún no es fiable. Toca una zona para ver sus causas.</div></section>`;
  const bandNames = ['tranquilos', 'normales', 'altos', 'muy altos'];
  const bandCols = [STRESS_HEX.g, STRESS_HEX.y, STRESS_HEX.o, STRESS_HEX.r];
  const bands = st.count
    ? `<section class="cal-section"><h3>Reparto de los días</h3><div class="cal-bandbar">${st.bands.map((n, i) => (n ? `<i style="flex:${n};background:${bandCols[i]}"></i>` : '')).join('')}</div>
        <div class="cal-note small">${st.bands.map((n, i) => `${n} ${bandNames[i]}`).join(' · ')}</div></section>` : '';
  const monthChart = yearly && st.count
    ? `<section class="cal-section"><h3>Media de cada mes</h3><div class="cal-ybars">${st.byMonth.map((b, i) => {
        const avg = b.n ? b.sum / b.n : 0;
        return `<div title="${MONTHS[i]}${b.n ? ': ' + fmtAvg(avg) : ''}"><i style="height:${avg * 10}%;background:${b.n ? stressColor(avg) : 'transparent'}"></i></div>`;
      }).join('')}</div><div class="cal-ylabels">${'EFMAMJJASOND'.split('').map((l) => `<span>${l}</span>`).join('')}</div></section>` : '';
  const topMonth = yearly && st.count ? st.byMonth.map((b, i) => ({ i, a: b.n ? b.sum / b.n : -1 })).sort((a, b) => b.a - a.a)[0] : null;

  el.innerHTML = `
    <div class="cal">
      <header class="cal-head">
        <div class="grow" style="padding-left:4px"><div class="cal-sub">${yearly ? 'Resumen del año' : 'Resumen del mes'}</div><div class="cal-title">${yearly ? state.y : MONTHS[state.m] + ' ' + state.y}</div></div>
        ${roundBtn('prev', 'back', yearly ? 'Año anterior' : 'Mes anterior')}${roundBtn('next', 'next', yearly ? 'Año siguiente' : 'Mes siguiente')}
      </header>
      <main class="cal-main">
        ${tabs('e')}
        <div class="cal-tabs small" role="tablist" style="align-self:stretch"><button type="button" data-scope="mes" role="tab" aria-selected="${!yearly}" style="flex:1">Mes</button><button type="button" data-scope="anio" role="tab" aria-selected="${yearly}" style="flex:1">Año</button></div>
        <section class="cal-hero"><div><div class="k">${yearly ? 'Estrés medio del año' : 'Estrés medio'}</div><div class="big" style="color:${st.count ? stressColor(st.avg) : 'var(--hero-text)'}">${st.count ? fmtAvg(st.avg) : '–'}</div></div>
          <div class="rt"><div>${st.count} ${st.count === 1 ? 'día puntuado' : 'días puntuados'}</div>${st.count ? `<div class="m">Día más alto: ${st.max}<br>Días de 7 o más: ${st.high}${topMonth ? `<br>Mes más alto: ${MONTHS[topMonth.i].toLowerCase()}` : ''}</div>` : ''}</div></section>
        ${st.count ? '' : '<div class="cal-note small" style="padding:0 4px">Puntúa el estrés de tus días de trabajo desde el detalle de cada día y aquí verás las estadísticas.</div>'}
        ${monthChart}
        <section class="cal-section"><h3>Qué te ha causado más estrés${yearly ? ' · ' + state.y : ''}</h3>${causes}
          <div class="cal-note small">Cuenta los días de 7 o más en los que marcaste cada causa.</div></section>
        ${zoneSection}
        ${bands}
      </main>
      <div class="cal-spacer"></div>
      ${navHtml('resumen')}
    </div>`;
  const shift = (n) => { if (yearly) state.y += n; else shiftMonth(n); refresh(); };
  el.querySelector('#prev').addEventListener('click', () => shift(-1));
  el.querySelector('#next').addEventListener('click', () => shift(1));
  bindGo(el);
  el.querySelectorAll('[data-scope]').forEach((b) => b.addEventListener('click', () => { state.stressScope = b.dataset.scope; refresh(); }));
}
