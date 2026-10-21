// Pantallas de cada deporte (gimnasio y running): Inicio, Ajustes, Pausa y pestañas aún sin construir.

import { navigate, refresh, back } from '../../core/router.js';
import { esc, toast, confirmDialog } from '../../core/ui.js';
import { getFit, updateFit, resetSport } from './data.js';
import { thisMonday, addDaysKey, weekRangeText, weeksBetween } from './dates.js';
import { comodinBank, comodinCandidate, weekProgress, streak, forma, formaName, levelInfo, totalXp, activePause, firstWeek, SPORT_NAME, weekStatus, countsByWeek } from './engine.js';
import { sportNav, bindGo, header, backHeader, ico, stepper, bindSteppers } from './shell.js';

const SLUG = { gym: 'gym', run: 'running' };
const base = (s) => '/fit/' + SLUG[s];

const TAB_NAMES = {
  rutinas: 'Rutinas', entrenos: 'Entrenos', planes: 'Planes', carreras: 'Carreras',
  estadisticas: 'Estadísticas', medallas: 'Medallas', retos: 'Retos',
};

function setAccent(sport) {
  if (sport === 'gym') document.documentElement.dataset.accent = getFit().settings.accent;
}

function centerAction(el, sport) {
  const b = el.querySelector('#f-center');
  if (b) b.addEventListener('click', () => { if (sport === 'gym') navigate('/fit/gym/empezar'); else navigate('/fit/running/importar'); });
}

function weekDots(fit, sport) {
  const counts = countsByWeek(fit, sport);
  const cur = thisMonday();
  const dots = [];
  for (let i = 7; i >= 0; i--) {
    const mk = addDaysKey(cur, -7 * i);
    const st = weekStatus(fit, sport, mk, counts, cur);
    dots.push(`<span class="f-dot ${st}" title="${weekRangeText(mk)}"></span>`);
  }
  return `<div class="f-dots">${dots.join('')}</div>`;
}

export function renderSportHome(sport) {
  return (el) => {
    setAccent(sport);
    const fit = getFit();
    const p = weekProgress(fit, sport);
    const lv = levelInfo(totalXp(fit, sport));
    const f = forma(fit, sport);
    const pause = activePause(fit, sport);
    const started = !!firstWeek(fit, sport);
    el.innerHTML = `<div class="f-screen">
      ${header(SPORT_NAME[sport], 'Esta semana ' + weekRangeText(thisMonday()), `<button type="button" class="f-round" data-go="${base(sport)}/ajustes" aria-label="Ajustes">${ico('gear')}</button>`)}
      <main class="f-main">
        ${sport === 'gym' ? `<button type="button" class="f-btn" data-go="/fit/gym/empezar">${fit.gym.draft ? 'Continuar entreno en curso' : 'Empezar entreno'}</button>` : ''}
        ${sport === 'run' ? `<button type="button" class="f-btn" data-go="/fit/running/importar">Importar carrera</button>` : ''}
        ${pause ? `<section class="f-card pausa"><strong>${ico('pause', 18)} En pausa</strong><div class="f-mini">${pause.to ? 'Hasta la semana del ' + weekRangeText(pause.to) : 'Sin fecha de vuelta'} · tu racha está congelada.</div><button type="button" class="f-link" data-go="${base(sport)}/pausa">Gestionar pausa</button></section>` : ''}
        <section class="f-card level"><div class="f-sub">Nivel</div><div class="f-big">${lv.name}</div>
          <div class="f-bar"><i style="width:${lv.pct}%"></i></div><div class="f-mini">${lv.xp} XP · siguiente nivel a ${lv.to} XP${lv.stars ? ' · ' + '★'.repeat(Math.min(lv.stars, 5)) : ''}</div></section>
        <div class="f-grid">
          <section class="f-card plain"><div class="f-sub">Semana</div><div class="f-num">${p.paused ? '—' : p.done + '/' + p.goal}</div><div class="f-mini">sesiones</div></section>
          <section class="f-card plain"><div class="f-sub">Racha</div><div class="f-num">${streak(fit, sport)}</div><div class="f-mini">semanas</div></section>
          <section class="f-card plain"><div class="f-sub">Forma</div><div class="f-num">${f}</div><div class="f-mini">${formaName(f)}</div></section>
        </div>
        <section class="f-card plain"><strong>Últimas 8 semanas</strong>${weekDots(fit, sport)}</section>
        ${(() => { const c = comodinCandidate(fit, sport); const bank = comodinBank(fit, sport); if (!c) return bank ? `<div class="f-mini center">Comodín de racha: tienes ${bank} guardado${bank > 1 ? 's' : ''} (1 al mes, hasta 2).</div>` : ''; return `<section class="f-card plain"><strong>Comodín de racha</strong><div class="f-mini">La semana del ${weekRangeText(c)} no se cumplió. ${bank ? `Tienes ${bank} comodín${bank > 1 ? 'es' : ''}: úsalo y esa semana cuenta como cumplida para tu racha.` : 'No te queda ningún comodín (recibes 1 al mes y puedes guardar hasta 2).'}</div>${bank ? `<button type="button" class="f-btn ghost" id="comodin" data-mk="${c}">Usar comodín en esa semana</button>` : ''}</section>`; })()}
        ${started ? '' : `<div class="f-note">${sport === 'gym' ? 'Todavía no has registrado ningún entreno.' : 'Todavía no has importado ninguna carrera.'} Aquí irá apareciendo tu progreso.</div>`}
        ${pause ? '' : `<button type="button" class="f-link wide" data-go="${base(sport)}/pausa">Pausar ${SPORT_NAME[sport].toLowerCase()}</button>`}
        <button type="button" class="f-link wide" data-go="/fit">← Volver a W fit</button>
      </main>${sportNav(sport, 'inicio')}</div>`;
    bindGo(el);
    centerAction(el, sport);
    const cb = el.querySelector('#comodin');
    if (cb) cb.addEventListener('click', () => { updateFit((f) => { f.comodines[sport].push(cb.dataset.mk); }); toast('Comodín usado: esa semana cuenta como cumplida'); refresh(); });
  };
}

export function renderSportTab(sport) {
  return (el, { tab }) => {
    setAccent(sport);
    if (tab === 'ajustes') return renderSportSettings(sport)(el);
    if (tab === 'pausa') return renderPause(sport)(el);
    const gymTabs = ['rutinas', 'entrenos', 'estadisticas', 'medallas', 'retos'];
    const runTabs = ['planes', 'carreras', 'estadisticas', 'medallas', 'retos'];
    if (!(sport === 'gym' ? gymTabs : runTabs).includes(tab)) { navigate(base(sport)); return; }
    const stage = sport === 'gym' ? 'la etapa del gimnasio' : 'la etapa de running';
    el.innerHTML = `<div class="f-screen">
      ${header(TAB_NAMES[tab], SPORT_NAME[sport])}
      <main class="f-main"><div class="f-note">Esta pantalla se programa en ${stage}. De momento está vacía.</div></main>
      ${sportNav(sport, tab)}</div>`;
    bindGo(el);
    centerAction(el, sport);
  };
}

function renderSportSettings(sport) {
  return (el) => {
    const fit = getFit();
    const s = fit.settings[sport];
    const run = sport === 'run';
    el.innerHTML = `<div class="f-screen">
      ${backHeader('Ajustes · ' + SPORT_NAME[sport], base(sport))}
      <main class="f-main">
        <section class="f-card plain">
          <div class="rowh"><span>Objetivo habitual<br><small class="f-mini">sesiones por semana</small></span><span class="grow"></span>${stepper('goal', s.goal, 1, 7)}</div>
          <div class="rowh"><span>Mínimo para la racha<br><small class="f-mini">sesiones mínimas en una semana</small></span><span class="grow"></span>${stepper('minStreak', s.minStreak, 1, 7)}</div>
        </section>
        ${!run ? `<section class="f-card plain">
          <div class="rowh"><span>Descanso entre series<br><small class="f-mini">segundos</small></span><span class="grow"></span>${stepper('restSecs', s.restSecs, 15, 600)}</div>
          <button type="button" class="f-link" data-go="/fit/gym/ejercicios">Mis ejercicios (renombrar, ocultar)</button>
        </section>` : ''}
        ${run ? `<section class="f-card plain">
          <div class="rowh"><span>Ritmo límite<br><small class="f-mini">más lento que esto cuenta como caminar (min/km)</small></span><span class="grow"></span>${stepper('paceMin', Math.floor(s.paceLimit / 60), 6, 12)}</div>
          <div class="rowh"><span>Segundos<br><small class="f-mini">del ritmo límite</small></span><span class="grow"></span>${stepper('paceSec', s.paceLimit % 60, 0, 59)}</div>
          <div class="rowh"><span>Carrera válida desde<br><small class="f-mini">minutos corriendo</small></span><span class="grow"></span>${stepper('minRunMin', s.minRunMin, 1, 60)}</div>
          <div class="rowh"><span>Tolerancia de paradas<br><small class="f-mini">segundos</small></span><span class="grow"></span>${stepper('stopTol', s.stopTol, 0, 120)}</div>
        </section>` : ''}
        <section class="f-card plain"><strong>Borrar ${SPORT_NAME[sport]}</strong>
          <div class="f-mini">Borra solo los datos de este deporte.</div>
          <button type="button" class="f-btn danger" id="reset">Borrar ${SPORT_NAME[sport].toLowerCase()}</button></section>
      </main></div>`;
    bindGo(el);
    const tmp = { paceMin: Math.floor(s.paceLimit / 60), paceSec: s.paceLimit % 60 };
    bindSteppers(el, (id, v) => {
      if (id === 'paceMin' || id === 'paceSec') tmp[id] = v;
      updateFit((f) => {
        const x = f.settings[sport];
        if (id === 'paceMin' || id === 'paceSec') x.paceLimit = tmp.paceMin * 60 + tmp.paceSec;
        else if (id === 'restSecs') x.restSecs = v;
        else x[id] = v;
        if (id === 'goal' && x.minStreak > v) x.minStreak = v;
      });
    });
    el.querySelector('#reset').addEventListener('click', async () => {
      const ok = await confirmDialog({ title: 'Borrar ' + SPORT_NAME[sport], text: 'Se borrarán sus entrenos, niveles, medallas y pausas. No se puede deshacer.', confirmLabel: 'Borrar', danger: true });
      if (ok) { resetSport(sport); toast('Datos borrados'); navigate(base(sport)); }
    });
  };
}

function renderPause(sport) {
  return (el) => {
    const fit = getFit();
    const cur = thisMonday();
    const act = activePause(fit, sport);
    if (act) {
      el.innerHTML = `<div class="f-screen">${backHeader('Pausa · ' + SPORT_NAME[sport], base(sport))}
        <main class="f-main"><section class="f-card pausa"><strong>${ico('pause', 18)} Pausa activa</strong>
          <div class="f-mini">Desde la semana del ${weekRangeText(act.from)} · ${act.to ? 'hasta la semana del ' + weekRangeText(act.to) : 'sin fecha de vuelta'}.<br>Tu racha está congelada y tu forma no baja.</div></section>
          <button type="button" class="f-btn" id="end">Volver a entrenar</button></main></div>`;
      bindGo(el);
      el.querySelector('#end').addEventListener('click', () => {
        updateFit((f) => {
          const p = f.pauses[sport].find((x) => x === x && x.from === act.from && x.to === act.to);
          const prev = addDaysKey(cur, -7);
          if (p) { if (act.from >= cur) f.pauses[sport] = f.pauses[sport].filter((x) => x !== p); else p.to = prev; }
        });
        toast('¡Bienvenido de vuelta!');
        navigate(base(sport));
      });
      return;
    }
    const st = { start: 'now', weeks: 2, open: false };
    const draw = () => {
      el.innerHTML = `<div class="f-screen">${backHeader('Pausar ' + SPORT_NAME[sport], base(sport))}
        <main class="f-main">
          <div class="f-note">No hace falta dar ningún motivo. Durante la pausa tu racha se congela, tu forma no baja y los retos de la semana no cuentan ni se fallan.</div>
          <section class="f-card plain"><strong>¿Cuándo empieza?</strong>
            <div class="f-seg"><button type="button" data-st="now" aria-pressed="${st.start === 'now'}">Esta semana</button><button type="button" data-st="next" aria-pressed="${st.start === 'next'}">Próxima semana</button></div></section>
          <section class="f-card plain"><strong>¿Cuánto dura?</strong>
            <div class="f-seg"><button type="button" data-open="0" aria-pressed="${!st.open}">Semanas</button><button type="button" data-open="1" aria-pressed="${st.open}">Sin fecha</button></div>
            ${st.open ? '' : `<div class="rowh"><span>Semanas</span><span class="grow"></span>${stepper('weeks', st.weeks, 1, 52)}</div>`}</section>
          <button type="button" class="f-btn" id="go">Empezar pausa</button>
        </main></div>`;
      bindGo(el);
      el.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => { st.start = b.dataset.st; draw(); }));
      el.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => { st.open = b.dataset.open === '1'; draw(); }));
      bindSteppers(el, (id, v) => { st[id] = v; });
      el.querySelector('#go').addEventListener('click', () => {
        const from = st.start === 'now' ? cur : addDaysKey(cur, 7);
        const to = st.open ? null : addDaysKey(from, 7 * (st.weeks - 1));
        updateFit((f) => { f.pauses[sport].push({ from, to }); });
        toast('Pausa activada');
        navigate(base(sport));
      });
    };
    draw();
  };
}
