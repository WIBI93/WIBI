// Pestaña Ahorro: cuentas de medio y largo plazo, colchón, movimientos y cuentas nuevas.

import { navigate, back, refresh } from '../../core/router.js';
import { esc, toast, confirmDialog, formDialog } from '../../core/ui.js';
import { getData, update, addMovement, removeMovement, editMovement, removeAccount, uid, ACCOUNT_TYPES } from './data.js';
import { money, moneyAuto, pct, parseMoney, toInput, dateKey, dayLabel } from './fmt.js';
import { accountTotals } from './calc.js';
import { ei, round, navHtml, bindNav } from './shell.js';
import { amountCard, dateRow, noteRow, readAmount } from './forms.js';

const share = (a, b) => (b > 0 ? Math.max(0, (a / b) * 100) : 0);
const rate = (r) => pct(r, r % 1 ? 1 : 0);

export function renderSavings(el) {
  const d = getData();
  const medio = d.accounts.filter((a) => a.term === 'medio');
  const largo = d.accounts.filter((a) => a.term === 'largo');
  const tot = accountTotals(d);
  const cushion = Math.min(d.cushion, tot.medio);
  const free = Math.max(0, tot.medio - cushion);
  const gainTxt = (g, base) => `${g >= 0 ? '+' : '−'}${moneyAuto(Math.abs(g))} · ${g >= 0 ? '+' : '−'}${pct(base > 0 ? Math.abs(g / base) * 100 : 0, 1)}`;
  const accCard = (a) => {
    const g = a.balance - a.contributed;
    const top = Math.max(a.contributed, a.balance, 1);
    return `<button type="button" class="sv-acc" data-acc="${a.id}">
      <span class="top"><span><span class="nm">${esc(a.name)}</span><span class="ty">${esc(ACCOUNT_TYPES[a.type])} · ${rate(a.rate)} al año</span></span><span class="val">${moneyAuto(a.balance)}</span></span>
      <span class="trio"><span><i class="k">Aportado</i><b>${moneyAuto(a.contributed)}</b></span><span><i class="k">Saldo real</i><b>${moneyAuto(a.balance)}</b></span><span><i class="k">${a.term === 'medio' ? 'Intereses' : 'Rentabilidad'}</i><b class="${g >= 0 ? 'pos' : 'neg'}">${gainTxt(g, a.contributed)}</b></span></span>
      <span class="mini"><i class="a" style="width:${(Math.min(a.contributed, a.balance) / top) * 100}%"></i><i class="g" style="width:${(Math.max(0, g) / top) * 100}%"></i></span></button>`;
  };
  const zone = (term, list, total) => {
    const med = term === 'medio';
    const ap = list.reduce((t, a) => t + a.contributed, 0);
    const g = total - ap;
    const body = list.length ? list.map(accCard).join('')
      : `<span class="eco-note" style="color:inherit;opacity:.85">${med ? 'Aún no tienes ninguna cuenta de medio plazo. Pulsa “+ Cuenta” para añadirla.' : 'Aún no tienes inversiones a largo plazo (plan de pensiones, fondos…).'}</span>`;
    const cush = med && list.length && d.cushion > 0 && total > 0
      ? `<div class="sv-cush"><div class="bar"><i style="width:${share(cushion, total)}%;background:#E0A33A"></i><i style="width:${share(free, total)}%;background:var(--med-strong)"></i></div>
         <div class="lg"><span>Colchón ${moneyAuto(cushion)}</span><span>Libre ${moneyAuto(free)}</span></div></div>` : '';
    return `<section class="sv-zone ${med ? 'med' : 'lar'}">
      <div><div class="t">${med ? 'Medio plazo' : 'Largo plazo'}</div><div class="big">${moneyAuto(total)}</div></div>
      <div class="zsub"><span>Aportado <b>${moneyAuto(ap)}</b></span><span>${med ? 'Intereses' : 'Rentabilidad'} <b>${g >= 0 ? '+' : '−'}${moneyAuto(Math.abs(g))}</b></span></div>
      ${cush}${body}
      <button type="button" class="sv-big" data-move="${term}">+ Movimiento</button>
      ${med ? `<button type="button" class="sv-link" id="cushion">${d.cushion > 0 ? 'Editar colchón · ' + moneyAuto(d.cushion) : 'Poner un colchón'}</button>` : ''}
    </section>`;
  };

  el.innerHTML = `
    <div class="eco"><div class="eco-body">
      <header class="eco-head"><div class="grow"><span class="eco-sub">Economía</span><span class="eco-h1">Ahorro</span></div>
        <button type="button" class="eco-pill-btn" id="newacc">${ei('plus', 16, 2.4)}<span>Cuenta</span></button></header>
      ${d.cushion > 0 && tot.medio < d.cushion ? `<div class="eco-info warn">${ei('info', 18)}<span>El saldo de medio plazo está por debajo de tu colchón de ${money(d.cushion)}.</span></div>` : ''}
      ${zone('medio', medio, tot.medio)}
      ${zone('largo', largo, tot.largo)}
      <button type="button" class="sv-out" id="proj">Proyección</button>
    </div>${navHtml('ahorro')}</div>`;
  bindNav(el);
  el.querySelector('#newacc').addEventListener('click', () => navigate('/economia/ahorro/cuenta/nueva'));
  el.querySelectorAll('[data-acc]').forEach((b) => b.addEventListener('click', () => navigate('/economia/ahorro/cuenta/' + b.dataset.acc)));
  el.querySelectorAll('[data-move]').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.move;
    if (!(t === 'medio' ? medio : largo).length) return toast(`Primero añade una cuenta de ${t} plazo`);
    navigate('/economia/ahorro/' + t);
  }));
  el.querySelector('#proj').addEventListener('click', () => (d.accounts.length ? navigate('/economia/ahorro/proyeccion') : toast('Primero añade una cuenta')));
  const cb = el.querySelector('#cushion');
  if (cb) cb.addEventListener('click', async () => {
    const r = await formDialog({ title: 'Colchón', confirmLabel: 'Guardar', fields: [{ key: 'v', label: 'Dinero de medio plazo que no piensas tocar (€)', value: toInput(d.cushion), placeholder: '0' }] });
    if (!r) return;
    const v = r.v.trim() === '' ? 0 : parseMoney(r.v);
    if (!Number.isFinite(v) || v < 0) return toast('Escribe una cantidad válida');
    update((data) => { data.cushion = v; });
    refresh();
  });
}

// ---------- Movimiento: una sola pantalla para los dos plazos (cada botón llega con el suyo) ----------
function renderMove(el, term) {
  const med = term === 'medio';
  const accs = getData().accounts.filter((a) => a.term === term);
  if (!accs.length) { back('/economia/ahorro'); return; }
  const SAL = med ? 'Ahorro a medio plazo' : 'Ahorro a largo plazo';
  const adj = med ? 'adjust' : 'value';
  const KINDS = [['contrib', 'Aportación'], ['withdraw', 'Retirada'], [adj, 'Actualizar saldo real']];
  const HELP = {
    contrib: 'Dinero que tú pones. Sube lo aportado y el saldo real a la vez.',
    withdraw: 'Dinero que sacas. Baja el saldo real y lo aportado a la vez.',
    [adj]: 'Escribes lo que ves hoy en el banco o bróker. Lo aportado no cambia; la diferencia es lo que has ganado.',
  };
  const draft = { kind: 'contrib', accId: accs[0].id, amount: '', date: dateKey(), note: '', sal: true };
  const draw = () => {
    const d = getData();
    const acc = d.accounts.find((a) => a.id === draft.accId);
    const calc = (raw) => {
      const v = parseMoney(raw);
      const x = Number.isFinite(v) ? v : 0;
      let ap = acc.contributed; let bal = acc.balance;
      if (draft.kind === 'contrib') { ap += x; bal += x; }
      else if (draft.kind === 'withdraw') { ap -= Math.min(x, Math.max(0, acc.contributed)); bal -= x; }
      else if (raw.trim() !== '' && Number.isFinite(v)) bal = x;
      return { ap, bal, gain: bal - ap };
    };
    const info = () => {
      const r = calc(el.querySelector('#amount') ? el.querySelector('#amount').value : draft.amount);
      const others = d.accounts.filter((a) => a.term === 'medio' && a.id !== acc.id).reduce((t, a) => t + a.balance, 0);
      const row = (k, v, cls = '') => `<div style="display:flex;justify-content:space-between;width:100%;font-size:14px;font-weight:600"><span>${k}</span><b class="${cls}">${v}</b></div>`;
      return `${row('Aportado', money(r.ap))}${row('Saldo real', money(r.bal))}${row(med ? 'Intereses ganados' : 'Rentabilidad', (r.gain >= 0 ? '+' : '−') + money(Math.abs(r.gain)), r.gain >= 0 ? 'pos' : 'neg')}
        ${med && d.cushion > 0 ? `<span class="eco-note" style="font-weight:700;color:${others + r.bal >= d.cushion ? 'var(--accent-text)' : 'var(--danger)'}">${others + r.bal >= d.cushion ? `Colchón de ${moneyAuto(d.cushion)} cubierto` : `Por debajo de tu colchón de ${moneyAuto(d.cushion)}`}</span>` : ''}`;
    };
    el.innerHTML = `
      <div class="eco"><div class="eco-body">
        <header class="eco-head">${round('go-back', 'back', 'Volver')}<div class="grow"><span class="eco-sub">Ahorro</span><span class="eco-h1">${med ? 'Medio plazo' : 'Largo plazo'}</span></div><span class="sv-tag ${med ? 'med' : 'lar'}">${med ? 'Medio' : 'Largo'}</span></header>
        <div class="eco-seg" role="group">${KINDS.map(([k, l]) => `<button type="button" data-kind="${k}" aria-pressed="${draft.kind === k}">${l}</button>`).join('')}</div>
        <span class="eco-note" style="padding:0 4px">${HELP[draft.kind]}</span>
        ${accs.length > 1 ? `<div class="eco-chips">${accs.map((a) => `<button type="button" class="eco-chip" data-acc="${a.id}" aria-pressed="${draft.accId === a.id}">${esc(a.name)}</button>`).join('')}</div>` : ''}
        ${amountCard(draft.kind === adj ? 'Saldo real hoy' : 'Importe', draft.amount)}
        ${draft.kind === 'contrib' ? `<div class="sv-sw"><span class="tx"><b>Restar de mi sueldo de este mes</b><span>${draft.sal ? `Cuenta como ahorro del mes («${SAL}») y baja lo que te sobra.` : 'No toca tu sueldo (por ejemplo, dinero que ya tenías aparte).'}</span></span>
          <button type="button" class="sv-tg" id="sal" role="switch" aria-checked="${draft.sal}" aria-label="Restar de mi sueldo"><i></i></button></div>` : ''}
        <div class="eco-rows">${dateRow(draft.date)}${noteRow(draft.note)}</div>
        <div class="eco-info" id="info" style="flex-direction:column;gap:6px;width:100%">${info()}</div>
        <div class="eco-foot"><button type="button" class="eco-btn" id="save">Guardar</button></div>
      </div></div>`;
    const grab = () => { draft.amount = el.querySelector('#amount').value; draft.note = el.querySelector('#note').value; };
    el.querySelector('#amount').addEventListener('input', () => { el.querySelector('#info').innerHTML = info(); });
    el.querySelector('#go-back').addEventListener('click', () => back('/economia/ahorro'));
    el.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => { grab(); draft.kind = b.dataset.kind; draw(); }));
    el.querySelectorAll('[data-acc]').forEach((b) => b.addEventListener('click', () => { grab(); draft.accId = b.dataset.acc; draw(); }));
    const sal = el.querySelector('#sal');
    if (sal) sal.addEventListener('click', () => { grab(); draft.sal = !draft.sal; draw(); });
    el.querySelector('#date').addEventListener('change', (e) => { grab(); if (e.target.value) draft.date = e.target.value; draw(); });
    el.querySelector('#save').addEventListener('click', () => {
      grab();
      const n = parseMoney(draft.amount);
      if (!Number.isFinite(n) || n < 0 || (draft.kind !== adj && n === 0)) return toast('Escribe un importe válido');
      if (draft.kind === 'withdraw' && n > acc.balance) return toast('No puedes retirar más de lo que hay en la cuenta');
      update((data) => addMovement(data, { accId: draft.accId, kind: draft.kind, amount: n, date: draft.date, note: draft.note, fromSalary: draft.kind === 'contrib' && draft.sal }));
      toast(draft.kind === 'contrib' && draft.sal ? 'Guardado y restado de tu sueldo' : 'Guardado');
      back('/economia/ahorro');
    });
  };
  draw();
}
export const renderMediumMove = (el) => renderMove(el, 'medio');
export const renderLongMove = (el) => renderMove(el, 'largo');

// ---------- Editar o borrar un movimiento de ahorro (desde Movimientos) ----------
export function renderSavingMove(el, { id }) {
  const d = getData();
  const m = d.movements.find((x) => x.id === id);
  if (!m) { back('/economia/gastos'); return; }
  const acc = d.accounts.find((a) => a.id === m.accId);
  const editable = m.kind === 'contrib' || m.kind === 'withdraw';
  const draft = { amount: toInput(m.amount), date: m.date, note: m.note, sal: !!m.fromSalary };
  const NAMES = { contrib: 'Aportación', withdraw: 'Retirada', adjust: 'Ajuste de saldo', value: 'Valor actualizado' };
  el.innerHTML = `
    <div class="eco"><div class="eco-body">
      <header class="eco-head">${round('go-back', 'back', 'Volver')}<div class="grow"><span class="eco-sub">Movimientos · ${esc(acc.name)}</span><span class="eco-h1">${NAMES[m.kind]}</span></div></header>
      ${editable ? amountCard('Importe', draft.amount) : `<div class="eco-info">${ei('info', 18)}<span>${NAMES[m.kind]} de ${money(m.delta, { sign: true })}. Este tipo de movimiento solo se puede eliminar o cambiar de fecha.</span></div>`}
      ${m.kind === 'contrib' ? `<div class="sv-sw"><span class="tx"><b>Restada de mi sueldo</b><span>Si está activado, cuenta como ahorro de ese mes y baja lo que te sobra.</span></span><button type="button" class="sv-tg" id="sal" role="switch" aria-checked="${draft.sal}" aria-label="Restada de mi sueldo"><i></i></button></div>` : ''}
      <div class="eco-rows">${dateRow(draft.date)}${noteRow(draft.note)}</div>
      <div class="eco-foot"><button type="button" class="eco-btn text" id="del">Eliminar movimiento</button><button type="button" class="eco-btn" id="save">Guardar cambios</button></div>
    </div></div>`;
  el.querySelector('#go-back').addEventListener('click', () => back('/economia/gastos'));
  el.querySelector('#date').addEventListener('change', (e) => { if (e.target.value) { draft.date = e.target.value; el.querySelector('.eco-formrow .l').textContent = dayLabel(draft.date); } });
  const salBtn = el.querySelector('#sal');
  if (salBtn) salBtn.addEventListener('click', () => { draft.sal = !draft.sal; salBtn.setAttribute('aria-checked', String(draft.sal)); });
  el.querySelector('#save').addEventListener('click', () => {
    let amount = m.amount;
    if (editable) {
      amount = readAmount(el);
      if (!Number.isFinite(amount)) return toast('Escribe un importe mayor que 0');
    }
    update((data) => editMovement(data, id, { amount, date: draft.date, note: el.querySelector('#note').value, fromSalary: draft.sal }));
    back('/economia/gastos');
  });
  el.querySelector('#del').addEventListener('click', async () => {
    const after = acc.balance - m.delta;
    const ok = await confirmDialog({ title: '¿Eliminar este movimiento?', text: `El saldo de ${acc.name} pasará de ${money(acc.balance)} a ${money(after)}${m.kind === 'contrib' ? `, y ese mes aparecerá aportado ${money(m.amount)} menos` : ''}.`, confirmLabel: 'Sí, eliminar', danger: true });
    if (!ok) return;
    update((data) => removeMovement(data, id));
    back('/economia/gastos');
  });
}

// ---------- Cuenta nueva o editar ----------
export function renderAccountForm(el, { id }) {
  const isNew = id === 'nueva';
  const a0 = getData().accounts.find((a) => a.id === id);
  if (!isNew && !a0) { back('/economia/ahorro'); return; }
  const draft = a0 ? { name: a0.name, type: a0.type, term: a0.term, balance: toInput(a0.balance), rate: toInput(a0.rate) } : { name: '', type: 'remunerada', term: 'medio', balance: '', rate: '' };
  const draw = () => {
    el.innerHTML = `
      <div class="eco"><div class="eco-body">
        <header class="eco-head">${round('go-back', 'back', 'Volver')}<div class="grow"><span class="eco-sub">Ahorro</span><span class="eco-h1">${isNew ? 'Nueva cuenta' : 'Editar cuenta'}</span></div></header>
        <div class="eco-fields"><label for="name">Nombre</label><input class="eco-input" id="name" maxlength="40" value="${esc(draft.name)}" placeholder="Ej.: Mi cuenta de ahorro"></div>
        <div class="eco-fields"><span class="eco-label">Tipo</span><div class="eco-chips">${Object.entries(ACCOUNT_TYPES).map(([k, l]) => `<button type="button" class="eco-chip" data-type="${k}" aria-pressed="${draft.type === k}">${l}</button>`).join('')}</div></div>
        <div class="eco-fields"><span class="eco-label">Plazo</span><div class="eco-seg" style="background:var(--card)"><button type="button" data-term="medio" aria-pressed="${draft.term === 'medio'}">Medio plazo</button><button type="button" data-term="largo" aria-pressed="${draft.term === 'largo'}">Largo plazo</button></div></div>
        <div class="eco-fields"><label for="balance">${isNew ? 'Saldo actual' : 'Saldo actual'}</label><div class="eco-unit"><input class="eco-input unit" id="balance" inputmode="decimal" value="${esc(draft.balance)}" placeholder="0,00"><span>€</span></div></div>
        <div class="eco-fields"><label for="rate">Interés anual (TAE)</label><div class="eco-unit"><input class="eco-input unit" id="rate" inputmode="decimal" value="${esc(draft.rate)}" placeholder="0"><span>%</span></div>
          <span class="eco-note">En fondos y planes de pensiones, pon la rentabilidad anual que estimas. La proyección la usa para calcular.</span></div>
        ${isNew ? '' : '<div class="eco-info">' + ei('info', 18) + '<span>Si cambias el saldo aquí, cuenta como un ajuste: no se anota como aportación de este mes.</span></div>'}
        <div class="eco-card" style="flex-direction:row;align-items:center;justify-content:space-between;opacity:.7"><span style="font-size:14px;font-weight:700">Actualizar con el ISIN de un fondo</span><span class="eco-tag">Próximamente</span></div>
        <div class="eco-foot">${isNew ? '' : '<button type="button" class="eco-btn text" id="del">Eliminar cuenta</button>'}<button type="button" class="eco-btn" id="save">${isNew ? 'Guardar cuenta' : 'Guardar cambios'}</button></div>
      </div></div>`;
    const grab = () => { draft.name = el.querySelector('#name').value; draft.balance = el.querySelector('#balance').value; draft.rate = el.querySelector('#rate').value; };
    el.querySelector('#go-back').addEventListener('click', () => back('/economia/ahorro'));
    el.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => { grab(); draft.type = b.dataset.type; draw(); }));
    el.querySelectorAll('[data-term]').forEach((b) => b.addEventListener('click', () => { grab(); draft.term = b.dataset.term; draw(); }));
    el.querySelector('#save').addEventListener('click', () => {
      grab();
      const name = draft.name.trim();
      const bal = draft.balance.trim() === '' ? 0 : parseMoney(draft.balance);
      const rt = draft.rate.trim() === '' ? 0 : parseMoney(draft.rate);
      if (!name) return toast('Escribe un nombre');
      if (!Number.isFinite(bal) || !Number.isFinite(rt) || rt < 0) return toast('Revisa el saldo y el interés');
      update((data) => {
        if (isNew) data.accounts.push({ id: uid(), name, type: draft.type, term: draft.term, balance: bal, contributed: bal, rate: rt, monthly: 0 });
        else {
          const a = data.accounts.find((x) => x.id === id);
          if (!a) return;
          const wasTerm = a.term;
          Object.assign(a, { name, type: draft.type, term: draft.term, rate: rt });
          if (bal !== a.balance) addMovement(data, { accId: id, kind: wasTerm === 'largo' ? 'value' : 'adjust', amount: bal, date: dateKey(), note: 'Cambio desde Editar cuenta' });
        }
      });
      back('/economia/ahorro');
    });
    const del = el.querySelector('#del');
    if (del) del.addEventListener('click', async () => {
      const d = getData();
      const rest = d.accounts.filter((a) => a.term === 'medio' && a.id !== id).reduce((t, a) => t + a.balance, 0);
      const warn = a0.term === 'medio' && d.cushion > 0 && rest < d.cushion ? ` Ojo: sin esta cuenta, tu colchón de ${moneyAuto(d.cushion)} queda sin cubrir; ajústalo después en Ahorro.` : '';
      const ok = await confirmDialog({ title: `¿Eliminar "${a0.name}"?`, text: `Se borrará la cuenta y sus movimientos de ahorro.${warn}`, confirmLabel: 'Eliminar', danger: true });
      if (!ok) return;
      update((data) => removeAccount(data, id));
      back('/economia/ahorro');
    });
  };
  draw();
}
