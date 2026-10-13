// Primera vez: punto de partida en 2 pasos (ahorro y largo plazo). También sirve para editarlo desde Ajustes.
// Los saldos se crean directamente, sin movimientos: no cuentan como aportación de ningún mes.

import { go, back } from '../../core/router.js';
import { esc, toast } from '../../core/ui.js';
import { getData, update, uid } from './data.js';
import { parseMoney, toInput } from './fmt.js';
import { ei, round } from './shell.js';

let S = null;

function startDraft(edit) {
  const d = getData();
  const med = d.accounts.filter((a) => a.term === 'medio');
  const lar = d.accounts.filter((a) => a.term === 'largo');
  const row = (a) => ({ id: a.id, name: a.name, type: a.type, balance: toInput(a.balance), contributed: toInput(a.contributed), rate: toInput(a.rate) });
  S = {
    edit, step: 1,
    med: edit && med.length ? med.map(row) : [{ name: '', type: 'remunerada', balance: '', rate: '' }],
    lar: edit && lar.length ? lar.map(row) : [{ name: '', type: 'pensiones', contributed: '', balance: '', rate: '' }],
    cushion: edit ? toInput(d.cushion) : '',
  };
}

const num = (t) => (String(t).trim() === '' ? 0 : parseMoney(t));
const bad = (n) => !Number.isFinite(n) || n < 0;

const unit = (cls, i, key, val, ph, u) => `<div class="eco-unit"><input class="eco-input unit" data-l="${cls}" data-i="${i}" data-k="${key}" inputmode="decimal" value="${esc(val)}" placeholder="${ph}" aria-label="${ph}"><span>${u}</span></div>`;

function grab(el) {
  el.querySelectorAll('[data-l]').forEach((inp) => { S[inp.dataset.l][Number(inp.dataset.i)][inp.dataset.k] = inp.value; });
  const c = el.querySelector('#cushion');
  if (c) S.cushion = c.value;
}

export function renderSetup(el, params, edit = false) {
  if (!S || S.edit !== edit) startDraft(edit);
  const draw = () => {
    const one = S.step === 1;
    el.innerHTML = `
      <div class="eco"><div class="eco-body">
        <header class="eco-head">${edit || !one ? round('go-back', 'back', 'Volver') : ''}<div class="grow"><span class="eco-sub">${edit ? 'Punto de partida' : `Paso ${S.step} de 2`}</span><span class="eco-h1">${one ? 'Tu ahorro' : 'Largo plazo'}</span></div></header>
        <div class="eco-info">${ei('info', 18)}<span>${one ? 'Apunta lo que tienes hoy. Estos saldos no cuentan como ahorro de este mes. Puedes dejar en blanco lo que no tengas.' : 'Planes de pensiones o fondos indexados. Pon lo que has aportado hasta hoy y lo que valen ahora.'}${edit ? ' Cambiar esto puede modificar estadísticas de meses pasados.' : ''}</span></div>
        ${one ? S.med.map((a, i) => `<div class="eco-card pad"><h3>${i ? 'Otra cuenta' : 'Cuenta de ahorro'}</h3>
          <div class="eco-fields"><label>Nombre</label><input class="eco-input" data-l="med" data-i="${i}" data-k="name" maxlength="40" value="${esc(a.name)}" placeholder="Ej.: Cuenta de ahorro"></div>
          <div class="eco-grid2" style="gap:10px"><div class="eco-fields"><label>Saldo</label>${unit('med', i, 'balance', a.balance, '0,00', '€')}</div>
          <div class="eco-fields"><label>Interés (TAE)</label>${unit('med', i, 'rate', a.rate, '0', '%')}</div></div></div>`).join('')
          + `<button type="button" class="eco-dashbtn" id="addmed">${ei('plus', 20, 2.4)}Añadir otra cuenta</button>
          <div class="eco-card pad"><h3>Colchón de emergencia</h3><span class="eco-note">Lo mínimo que quieres tener siempre a mano. Opcional.</span>
          <div class="eco-unit"><input class="eco-input unit" id="cushion" inputmode="decimal" value="${esc(S.cushion)}" placeholder="0,00" aria-label="Colchón"><span>€</span></div></div>`
        : S.lar.map((a, i) => `<div class="eco-card pad"><h3>${i ? 'Otra inversión' : 'Plan de pensiones o fondo'}</h3>
          <div class="eco-fields"><label>Nombre</label><input class="eco-input" data-l="lar" data-i="${i}" data-k="name" maxlength="40" value="${esc(a.name)}" placeholder="Ej.: Fondo indexado"></div>
          <div class="eco-grid2" style="gap:10px"><div class="eco-fields"><label>Aportado hasta hoy</label>${unit('lar', i, 'contributed', a.contributed, '0,00', '€')}</div>
          <div class="eco-fields"><label>Vale ahora</label>${unit('lar', i, 'balance', a.balance, '0,00', '€')}</div></div>
          <div class="eco-fields"><label>Rentabilidad anual estimada</label>${unit('lar', i, 'rate', a.rate, '0', '%')}</div></div>`).join('')
          + `<button type="button" class="eco-dashbtn" id="addlar">${ei('plus', 20, 2.4)}Añadir otra inversión</button>`}
        <div class="eco-foot">${edit ? '' : '<button type="button" class="eco-btn text" id="skip" style="color:var(--muted)">Omitir por ahora</button>'}
          <button type="button" class="eco-btn" id="next">${one ? 'Siguiente' : edit ? 'Guardar cambios' : 'Empezar'}</button></div>
      </div></div>`;
    el.querySelectorAll('[data-l]').forEach((i) => i.addEventListener('input', () => grab(el)));
    const bk = el.querySelector('#go-back');
    if (bk) bk.addEventListener('click', () => { grab(el); if (S.step === 2) { S.step = 1; draw(); } else { S = null; back('/economia/ajustes'); } });
    const add = (id, key, row) => { const b = el.querySelector(id); if (b) b.addEventListener('click', () => { grab(el); S[key].push(row); draw(); }); };
    add('#addmed', 'med', { name: '', type: 'remunerada', balance: '', rate: '' });
    add('#addlar', 'lar', { name: '', type: 'fondo', contributed: '', balance: '', rate: '' });
    const skip = el.querySelector('#skip');
    if (skip) skip.addEventListener('click', () => { update((d) => { d.setupDone = true; }); S = null; go('/economia'); });
    el.querySelector('#next').addEventListener('click', () => {
      grab(el);
      if (S.step === 1) {
        const nums = [...S.med.flatMap((a) => [num(a.balance), num(a.rate)]), num(S.cushion)];
        if (nums.some(bad)) return toast('Revisa los números');
        S.step = 2; draw(); window.scrollTo(0, 0); return;
      }
      const nums = S.lar.flatMap((a) => [num(a.balance), num(a.contributed), num(a.rate)]);
      if (nums.some(bad)) return toast('Revisa los números');
      finish();
    });
  };
  draw();
}

function finish() {
  update((d) => {
    d.setupDone = true;
    d.cushion = num(S.cushion);
    const put = (list, term) => list.forEach((r, n) => {
      const bal = num(r.balance);
      const empty = !r.name.trim() && bal === 0 && !num(r.contributed);
      if (empty && !r.id) return;
      const name = r.name.trim() || (term === 'medio' ? 'Cuenta de ahorro' : 'Inversión');
      const contributed = term === 'largo' ? num(r.contributed) : bal;
      const a = r.id && d.accounts.find((x) => x.id === r.id);
      if (a) Object.assign(a, { name, balance: bal, rate: num(r.rate), contributed: term === 'largo' ? contributed : a.contributed });
      else d.accounts.push({ id: uid(), name, type: r.type, term, balance: bal, contributed, rate: num(r.rate), monthly: 0 });
    });
    put(S.med, 'medio');
    put(S.lar, 'largo');
  });
  const edit = S.edit;
  S = null;
  if (edit) back('/economia/ajustes'); else go('/economia');
}

export const renderSetupEdit = (el, p) => renderSetup(el, p, true);
