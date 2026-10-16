// Proyección de medio plazo: cómo crecerán las cuentas sumando aportaciones e intereses.

import { back, refresh } from '../../core/router.js';
import { esc, toast } from '../../core/ui.js';
import { getData, update } from './data.js';
import { money, moneyAuto, pct, parseMoney, toInput } from './fmt.js';
import { growth } from './calc.js';
import { round } from './shell.js';

let years = 10;
let picked = []; // cuentas marcadas para proyectar (por defecto, una)

export function renderProjection(el) {
  const d = getData();
  if (!d.accounts.length) { back('/economia/ahorro'); return; }
  picked = picked.filter((id) => d.accounts.some((a) => a.id === id));
  if (!picked.length) picked = [d.accounts[0].id];
  const accs = d.accounts.filter((a) => picked.includes(a.id));
  const series = accs.map((a) => growth(a.balance, a.monthly, a.rate, years));
  const rows = Array.from({ length: years }, (_, i) => ({
    year: i + 1,
    invested: series.reduce((t, s) => t + s[i].invested, 0),
    balance: series.reduce((t, s) => t + s[i].balance, 0),
  }));
  const last = rows[rows.length - 1];
  const interest = last.balance - last.invested;
  const max = Math.max(1, ...rows.map((r) => r.balance));
  const title = accs.length === 1 ? esc(accs[0].name) : `${accs.length} cuentas juntas`;
  const group = (term, label) => {
    const list = d.accounts.filter((a) => a.term === term);
    if (!list.length) return '';
    return `<span class="grp">${label}</span>${list.map((a) => {
      const on = picked.includes(a.id);
      return `<button type="button" data-p="${a.id}" aria-pressed="${on}"><span class="ck">${on ? '✓' : ''}</span><span class="g"><span class="nm">${esc(a.name)}</span><span class="sb">Saldo real ${money(a.balance)}</span></span></button>`;
    }).join('')}`;
  };

  el.innerHTML = `
    <div class="eco"><div class="eco-body">
      <header class="eco-head">${round('go-back', 'back', 'Volver')}<div class="grow"><span class="eco-sub">Ahorro</span><span class="eco-h1">Proyección</span></div></header>
      <div class="eco-card pad"><h3>¿Qué quieres proyectar?</h3><span class="eco-note" style="margin-top:-6px">Marca una cuenta, o varias para verlas sumadas.</span>
        <div class="sv-pick">${group('medio', 'MEDIO PLAZO')}${group('largo', 'LARGO PLAZO')}</div></div>
      <div class="eco-seg" role="group">${[5, 10, 15, 20].map((y) => `<button type="button" data-y="${y}" aria-pressed="${years === y}">${y} años</button>`).join('')}</div>
      <div class="eco-hero"><span class="k">${title} · en ${years} años</span><span class="big" style="font-size:32px">${money(last.balance)}</span>
        <div class="foot"><span>Aportado ${moneyAuto(last.invested)}</span><span>Ganado ${money(interest)}</span></div></div>
      <div class="eco-card pad"><h3>Cómo crece año a año</h3>
        <div style="display:flex;align-items:flex-end;gap:4px;height:140px">${rows.map((r) => `<div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:flex-end;height:100%" title="Año ${r.year}: ${money(r.balance)}">
          <div style="height:${(Math.max(0, r.balance - r.invested) / max) * 100}%;background:var(--gain);border-radius:3px 3px 0 0"></div>
          <div style="height:${(r.invested / max) * 100}%;background:#17594A"></div></div>`).join('')}</div>
        <div style="display:flex;gap:4px;font-size:10px;font-weight:600;color:var(--muted)">${rows.map((r) => `<span style="flex:1;text-align:center">${r.year}</span>`).join('')}</div>
        <div style="display:flex;gap:14px;font-size:12px;font-weight:600"><span class="eco-leg"><span class="dot" style="background:#17594A"></span>Aportado y saldo inicial</span><span class="eco-leg"><span class="dot" style="background:var(--gain)"></span>Ganado</span></div></div>
      ${accs.map((a, i) => `<div class="eco-card pad"><div style="display:flex;justify-content:space-between;align-items:baseline"><h3>${esc(a.name)}</h3><span class="v" style="font-size:16px">${money(series[i][years - 1].balance)}</span></div>
        <span class="eco-note">Parte de ${moneyAuto(a.balance)} (saldo real de hoy) · en ${years} años</span>
        <div class="eco-grid2" style="gap:10px">
          <div class="eco-fields"><label for="m-${a.id}">Aportas al mes</label><div class="eco-unit"><input class="eco-input unit" id="m-${a.id}" data-m="${a.id}" inputmode="decimal" value="${toInput(a.monthly)}" placeholder="0"><span>€</span></div></div>
          <div class="eco-fields"><label for="r-${a.id}">Rentabilidad anual estimada</label><div class="eco-unit"><input class="eco-input unit" id="r-${a.id}" data-r="${a.id}" inputmode="decimal" value="${toInput(a.rate)}" placeholder="0"><span>%</span></div></div></div></div>`).join('')}
      <div class="eco-note" style="padding:0 4px">Es una estimación con rentabilidad fija; la realidad variará. El interés se calcula mes a mes. Lo que escribas aquí se guarda en la cuenta.</div>
    </div></div>`;
  el.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.p;
    if (picked.includes(id)) { if (picked.length > 1) picked = picked.filter((x) => x !== id); } else picked = [...picked, id];
    refresh();
  }));
  el.querySelector('#go-back').addEventListener('click', () => back('/economia/ahorro'));
  el.querySelectorAll('[data-y]').forEach((b) => b.addEventListener('click', () => { years = Number(b.dataset.y); refresh(); }));
  const save = (input, field) => input.addEventListener('change', () => {
    const v = input.value.trim() === '' ? 0 : parseMoney(input.value);
    if (!Number.isFinite(v) || v < 0) { toast('Escribe un número válido'); refresh(); return; }
    const id = input.dataset.m || input.dataset.r;
    update((data) => { const a = data.accounts.find((x) => x.id === id); if (a) a[field] = v; });
    refresh();
  });
  el.querySelectorAll('[data-m]').forEach((i) => save(i, 'monthly'));
  el.querySelectorAll('[data-r]').forEach((i) => save(i, 'rate'));
}
