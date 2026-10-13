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
  const tot = accountTotals(d);
  const medio = d.accounts.filter((a) => a.term === 'medio');
  const largo = d.accounts.filter((a) => a.term === 'largo');
  const cushion = Math.min(d.cushion, tot.medio);
  const free = Math.max(0, tot.medio - cushion);
  const accRow = (a, extra) => `<button type="button" class="eco-item" data-acc="${a.id}" style="min-height:64px;padding:0">
      <span class="tx"><b>${esc(a.name)}</b><span>${extra}</span></span><span class="am">${money(a.balance)}</span><span style="color:var(--muted)">${ei('next', 16)}</span></button>`;
  const rentab = (a) => (a.contributed > 0 ? ((a.balance - a.contributed) / a.contributed) * 100 : 0);

  el.innerHTML = `
    <div class="eco"><div class="eco-body">
      <header class="eco-head"><div class="grow"><span class="eco-sub">Economía</span><span class="eco-h1">Ahorro</span></div>
        <button type="button" class="eco-pill-btn" id="newacc">${ei('plus', 16, 2.4)} Cuenta</button></header>
      <div class="eco-hero"><span class="k">Ahorro total</span><span class="big">${money(tot.total)}</span>
        <div class="foot"><span>Medio plazo ${moneyAuto(tot.medio)}</span><span>Largo plazo ${moneyAuto(tot.largo)}</span></div></div>
      ${d.cushion > 0 && tot.medio < d.cushion ? `<div class="eco-info warn">${ei('info', 18)}<span>El saldo de medio plazo está por debajo de tu colchón de ${money(d.cushion)}.</span></div>` : ''}

      <div class="eco-card pad"><div style="display:flex;justify-content:space-between;align-items:baseline"><h3>Medio plazo</h3><span class="v">${money(tot.medio)}</span></div>
        ${medio.length ? `${d.cushion > 0 && tot.medio > 0 ? `<div class="eco-bar thick" style="height:10px"><i style="width:${share(cushion, tot.medio)}%;background:#E0A33A"></i><i style="width:${share(free, tot.medio)}%;background:#17594A"></i></div>
          <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600"><div class="eco-leg"><span class="dot" style="background:#E0A33A"></span><span>Colchón ${moneyAuto(cushion)} · ${Math.round(share(cushion, tot.medio))} %</span></div><div class="eco-leg"><span class="dot" style="background:#17594A"></span><span>Libre ${moneyAuto(free)}</span></div></div>` : ''}
          <div>${medio.map((a) => accRow(a, `${esc(ACCOUNT_TYPES[a.type])} · ${rate(a.rate)} TAE`)).join('')}</div>`
          : '<span class="eco-note">Aún no tienes ninguna cuenta de medio plazo. Pulsa “+ Cuenta” para añadirla.</span>'}
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="eco-chip" id="cushion" style="flex:1">${d.cushion > 0 ? 'Editar colchón · ' + moneyAuto(d.cushion) : 'Poner un colchón'}</button>
          <button type="button" class="eco-chip" id="move" style="flex:1;background:var(--primary);color:#fff">+ Movimiento</button></div>
        <button type="button" class="eco-chip" id="proj" style="width:100%">Proyección</button></div>

      <button type="button" class="eco-dashbtn" id="sim">Simular inversiones e hipoteca</button>

      <div class="eco-card pad"><div style="display:flex;justify-content:space-between;align-items:baseline"><h3>Largo plazo</h3><span class="v">${money(tot.largo)}</span></div>
        ${largo.length ? `<div>${largo.map((a) => accRow(a, `Aportado ${moneyAuto(a.contributed)} · ${rentab(a) >= 0 ? '+' : '−'}${pct(Math.abs(rentab(a)), 1)}`)).join('')}</div>`
          : '<span class="eco-note">Aún no tienes inversiones a largo plazo (plan de pensiones, fondos…).</span>'}
        <button type="button" class="eco-chip" id="long" style="width:100%">+ Aportar o actualizar valor</button></div>
    </div>${navHtml('ahorro')}</div>`;
  bindNav(el);
  el.querySelector('#newacc').addEventListener('click', () => navigate('/economia/ahorro/cuenta/nueva'));
  el.querySelectorAll('[data-acc]').forEach((b) => b.addEventListener('click', () => navigate('/economia/ahorro/cuenta/' + b.dataset.acc)));
  el.querySelector('#move').addEventListener('click', () => (medio.length ? navigate('/economia/ahorro/medio') : toast('Primero añade una cuenta de medio plazo')));
  el.querySelector('#long').addEventListener('click', () => (largo.length ? navigate('/economia/ahorro/largo') : toast('Primero añade una cuenta de largo plazo')));
  el.querySelector('#sim').addEventListener('click', () => navigate('/economia/simular'));
  el.querySelector('#proj').addEventListener('click', () => (medio.length ? navigate('/economia/ahorro/proyeccion') : toast('Primero añade una cuenta de medio plazo')));
  el.querySelector('#cushion').addEventListener('click', async () => {
    const r = await formDialog({ title: 'Colchón', confirmLabel: 'Guardar', fields: [{ key: 'v', label: 'Dinero de medio plazo que no piensas tocar (€)', value: toInput(d.cushion), placeholder: '0' }] });
    if (!r) return;
    const v = r.v.trim() === '' ? 0 : parseMoney(r.v);
    if (!Number.isFinite(v) || v < 0) return toast('Escribe una cantidad válida');
    update((data) => { data.cushion = v; });
    refresh();
  });
}

// ---------- Movimiento en medio plazo ----------
export function renderMediumMove(el) {
  const d0 = getData();
  const accs = d0.accounts.filter((a) => a.term === 'medio');
  if (!accs.length) { back('/economia/ahorro'); return; }
  const draft = { kind: 'contrib', accId: accs[0].id, amount: '', date: dateKey(), note: '' };
  const KINDS = [['contrib', 'Aportación'], ['withdraw', 'Retirada'], ['adjust', 'Ajustar saldo']];
  const HELP = { contrib: 'Aportación: dinero que traspasas a la cuenta.', withdraw: 'Retirada: dinero que sacas.', adjust: 'Ajustar saldo: pones lo que ves en tu banco, con los intereses incluidos.' };
  const draw = () => {
    const d = getData();
    const acc = d.accounts.find((a) => a.id === draft.accId);
    const v = parseMoney(draft.amount);
    const val = Number.isFinite(v) ? v : 0;
    const after = draft.kind === 'contrib' ? acc.balance + val : draft.kind === 'withdraw' ? acc.balance - val : val;
    const info = () => {
      const v2 = parseMoney(el.querySelector('#amount') ? el.querySelector('#amount').value : draft.amount);
      const val2 = Number.isFinite(v2) ? v2 : 0;
      const after = draft.kind === 'contrib' ? acc.balance + val2 : draft.kind === 'withdraw' ? acc.balance - val2 : val2;
      const others = d.accounts.filter((a) => a.term === 'medio' && a.id !== acc.id).reduce((t, a) => t + a.balance, 0);
      const totalAfter = others + after;
      return `<div style="display:flex;justify-content:space-between;width:100%;font-size:14px;font-weight:600"><span>Saldo ahora</span><b>${money(acc.balance)}</b></div>
          <div style="display:flex;justify-content:space-between;width:100%;font-size:14px;font-weight:600"><span>Saldo después</span><b>${money(after)}</b></div>
          ${d.cushion > 0 ? `<span class="eco-note" style="font-weight:700;color:${totalAfter >= d.cushion ? 'var(--accent-text)' : 'var(--danger)'}">${totalAfter >= d.cushion ? `Colchón de ${moneyAuto(d.cushion)} cubierto` : `Por debajo de tu colchón de ${moneyAuto(d.cushion)}`}</span>` : ''}`;
    };
    el.innerHTML = `
      <div class="eco"><div class="eco-body">
        <header class="eco-head">${round('go-back', 'back', 'Volver')}<div class="grow"><span class="eco-sub">Ahorro</span><span class="eco-h1">Medio plazo</span></div></header>
        <div class="eco-seg" role="group">${KINDS.map(([k, l]) => `<button type="button" data-kind="${k}" aria-pressed="${draft.kind === k}">${l}</button>`).join('')}</div>
        <span class="eco-note" style="padding:0 4px">${HELP[draft.kind]}</span>
        ${accs.length > 1 ? `<div class="eco-chips">${accs.map((a) => `<button type="button" class="eco-chip" data-acc="${a.id}" aria-pressed="${draft.accId === a.id}">${esc(a.name)}</button>`).join('')}</div>` : ''}
        ${amountCard(draft.kind === 'adjust' ? 'Saldo que ves en tu banco' : 'Importe', draft.amount)}
        <div class="eco-rows">${dateRow(draft.date)}${noteRow(draft.note)}</div>
        <div class="eco-info" id="info" style="flex-direction:column;gap:6px;width:100%">${info()}</div>
        <div class="eco-foot"><button type="button" class="eco-btn" id="save">Guardar ${draft.kind === 'contrib' ? 'aportación' : draft.kind === 'withdraw' ? 'retirada' : 'ajuste'}</button></div>
      </div></div>`;
    const grab = () => { draft.amount = el.querySelector('#amount').value; draft.note = el.querySelector('#note').value; };
    el.querySelector('#amount').addEventListener('input', () => { el.querySelector('#info').innerHTML = info(); });
    el.querySelector('#go-back').addEventListener('click', () => back('/economia/ahorro'));
    el.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => { grab(); draft.kind = b.dataset.kind; draw(); }));
    el.querySelectorAll('[data-acc]').forEach((b) => b.addEventListener('click', () => { grab(); draft.accId = b.dataset.acc; draw(); }));
    el.querySelector('#date').addEventListener('change', (e) => { grab(); if (e.target.value) draft.date = e.target.value; draw(); });
    el.querySelector('#save').addEventListener('click', () => {
      grab();
      const n = parseMoney(draft.amount);
      if (!Number.isFinite(n) || n < 0 || (draft.kind !== 'adjust' && n === 0)) return toast('Escribe un importe válido');
      if (draft.kind === 'withdraw' && n > acc.balance) return toast('No puedes retirar más de lo que hay en la cuenta');
      update((data) => addMovement(data, { accId: draft.accId, kind: draft.kind, amount: n, date: draft.date, note: draft.note }));
      back('/economia/ahorro');
    });
  };
  draw();
}

// ---------- Largo plazo: aportar o actualizar valor ----------
export function renderLongMove(el) {
  const accs = getData().accounts.filter((a) => a.term === 'largo');
  if (!accs.length) { back('/economia/ahorro'); return; }
  const draft = { kind: 'contrib', accId: accs[0].id, amount: '', date: dateKey(), note: '' };
  const draw = () => {
    const d = getData();
    const acc = d.accounts.find((a) => a.id === draft.accId);
    const v = parseMoney(draft.amount);
    const val = Number.isFinite(v) ? v : 0;
    const info = () => {
      const v2 = parseMoney(el.querySelector('#amount') ? el.querySelector('#amount').value : draft.amount);
      const val2 = Number.isFinite(v2) ? v2 : 0;
      const newBal = draft.kind === 'value' ? val2 : acc.balance + val2;
      const newContrib = draft.kind === 'value' ? acc.contributed : acc.contributed + val2;
      const gain = newBal - newContrib;
      return `<div style="display:flex;justify-content:space-between;width:100%;font-size:14px;font-weight:600"><span>Aportado</span><b>${money(newContrib)}</b></div>
          <div style="display:flex;justify-content:space-between;width:100%;font-size:14px;font-weight:600"><span>Vale hoy</span><b>${money(newBal)}</b></div>
          <div style="display:flex;justify-content:space-between;width:100%;font-size:14px;font-weight:600"><span>Rentabilidad</span><b>${gain >= 0 ? '+' : '−'}${money(Math.abs(gain))}${newContrib > 0 ? ` · ${gain >= 0 ? '+' : '−'}${pct(Math.abs(gain / newContrib) * 100, 1)}` : ''}</b></div>`;
    };
    el.innerHTML = `
      <div class="eco"><div class="eco-body">
        <header class="eco-head">${round('go-back', 'back', 'Volver')}<div class="grow"><span class="eco-sub">Ahorro</span><span class="eco-h1">Largo plazo</span></div></header>
        <div class="eco-seg" role="group"><button type="button" data-kind="contrib" aria-pressed="${draft.kind === 'contrib'}">Aportación</button><button type="button" data-kind="value" aria-pressed="${draft.kind === 'value'}">Actualizar valor</button></div>
        <div class="eco-card pad" style="border-radius:24px"><h3>¿Cuál?</h3><div class="eco-chips">${accs.map((a) => `<button type="button" class="eco-chip" data-acc="${a.id}" aria-pressed="${draft.accId === a.id}">${esc(a.name)}</button>`).join('')}</div></div>
        ${amountCard(draft.kind === 'value' ? 'Valor actual' : 'Importe', draft.amount)}
        ${draft.kind === 'value' ? '<span class="eco-note" style="padding:0 4px">Pon el valor que ves en tu banco o bróker. La app guarda por separado lo que has aportado y lo que vale hoy, y la diferencia es tu rentabilidad.</span>' : ''}
        <div class="eco-rows">${dateRow(draft.date)}</div>
        <div class="eco-info" id="info" style="flex-direction:column;gap:6px;width:100%">${info()}</div>
        <div class="eco-foot"><button type="button" class="eco-btn" id="save">${draft.kind === 'value' ? 'Guardar valor' : 'Guardar aportación'}</button></div>
      </div></div>`;
    const grab = () => { draft.amount = el.querySelector('#amount').value; };
    el.querySelector('#amount').addEventListener('input', () => { el.querySelector('#info').innerHTML = info(); });
    el.querySelector('#go-back').addEventListener('click', () => back('/economia/ahorro'));
    el.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => { grab(); draft.kind = b.dataset.kind; draw(); }));
    el.querySelectorAll('[data-acc]').forEach((b) => b.addEventListener('click', () => { grab(); draft.accId = b.dataset.acc; draw(); }));
    el.querySelector('#date').addEventListener('change', (e) => { grab(); if (e.target.value) draft.date = e.target.value; draw(); });
    el.querySelector('#save').addEventListener('click', () => {
      grab();
      const n = parseMoney(draft.amount);
      if (!Number.isFinite(n) || n < 0 || (draft.kind === 'contrib' && n === 0)) return toast('Escribe un importe válido');
      update((data) => addMovement(data, { accId: draft.accId, kind: draft.kind, amount: n, date: draft.date, note: '' }));
      back('/economia/ahorro');
    });
  };
  draw();
}

// ---------- Editar o borrar un movimiento de ahorro (desde Movimientos) ----------
export function renderSavingMove(el, { id }) {
  const d = getData();
  const m = d.movements.find((x) => x.id === id);
  if (!m) { back('/economia/gastos'); return; }
  const acc = d.accounts.find((a) => a.id === m.accId);
  const editable = m.kind === 'contrib' || m.kind === 'withdraw';
  const draft = { amount: toInput(m.amount), date: m.date, note: m.note };
  const NAMES = { contrib: 'Aportación', withdraw: 'Retirada', adjust: 'Ajuste de saldo', value: 'Valor actualizado' };
  el.innerHTML = `
    <div class="eco"><div class="eco-body">
      <header class="eco-head">${round('go-back', 'back', 'Volver')}<div class="grow"><span class="eco-sub">Movimientos · ${esc(acc.name)}</span><span class="eco-h1">${NAMES[m.kind]}</span></div></header>
      ${editable ? amountCard('Importe', draft.amount) : `<div class="eco-info">${ei('info', 18)}<span>${NAMES[m.kind]} de ${money(m.delta, { sign: true })}. Este tipo de movimiento solo se puede eliminar o cambiar de fecha.</span></div>`}
      <div class="eco-rows">${dateRow(draft.date)}${noteRow(draft.note)}</div>
      <div class="eco-foot"><button type="button" class="eco-btn text" id="del">Eliminar movimiento</button><button type="button" class="eco-btn" id="save">Guardar cambios</button></div>
    </div></div>`;
  el.querySelector('#go-back').addEventListener('click', () => back('/economia/gastos'));
  el.querySelector('#date').addEventListener('change', (e) => { if (e.target.value) { draft.date = e.target.value; el.querySelector('.eco-formrow .l').textContent = dayLabel(draft.date); } });
  el.querySelector('#save').addEventListener('click', () => {
    let amount = m.amount;
    if (editable) {
      amount = readAmount(el);
      if (!Number.isFinite(amount)) return toast('Escribe un importe mayor que 0');
    }
    update((data) => editMovement(data, id, { amount, date: draft.date, note: el.querySelector('#note').value }));
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
