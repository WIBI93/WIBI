// Ajustes de Economía: punto de partida, categorías, copia de seguridad y borrado.

import { navigate, back, refresh } from '../../core/router.js';
import { esc, toast, confirmDialog, formDialog } from '../../core/ui.js';
import { runExport, runImport } from '../../core/backup-ui.js';
import { lastBackupText } from '../../core/backup.js';
import { getData, update, addCategory, removeCategory, resetAll, OTROS } from './data.js';
import { ei, round } from './shell.js';

export function renderEcoSettings(el) {
  const d = getData();
  const cats = d.categories;
  el.innerHTML = `
    <div class="eco"><div class="eco-body">
      <header class="eco-head">${round('go-back', 'back', 'Volver')}<div class="grow"><span class="eco-sub">Economía</span><span class="eco-h1">Ajustes</span></div></header>
      <span class="eco-section">PUNTO DE PARTIDA</span>
      <button type="button" class="eco-card pad" id="start" style="text-align:left"><h3>Saldos iniciales</h3><span class="eco-note">Cuentas, colchón y largo plazo tal como empezaste.</span></button>
      <span class="eco-section">CATEGORÍAS DE GASTO</span>
      <div class="eco-list" style="padding-bottom:0">${cats.map((c) => `<div class="eco-item"><span class="dot" style="background:${c.color}"></span><span class="tx"><b>${esc(c.name)}</b></span>
        ${c.id === OTROS ? '<span class="eco-tag">Fija</span>' : `<button type="button" data-ren="${c.id}" style="min-height:44px;padding:0 8px;font-weight:800;color:var(--accent-text)">Renombrar</button><button type="button" data-del="${c.id}" style="min-height:44px;padding:0 8px;font-weight:800;color:var(--danger)">Quitar</button>`}</div>`).join('')}</div>
      <button type="button" class="eco-dashbtn" id="newcat">${ei('plus', 20, 2.4)}Añadir categoría</button>
      <span class="eco-section">GASTOS FIJOS</span>
      <button type="button" class="eco-card pad" id="fixed" style="text-align:left"><h3>Editar gastos fijos</h3></button>
      <span class="eco-section">COPIA DE SEGURIDAD</span>
      <div class="eco-card pad"><span class="eco-note">${esc(lastBackupText())}. La copia incluye toda la app (calendario y economía).</span>
        <button type="button" class="eco-btn" id="exp">Exportar copia</button>
        <button type="button" class="eco-btn outline" id="imp">Importar copia</button>
        <input type="file" id="file" accept=".json,.txt,application/json,text/plain" hidden></div>
      <span class="eco-section">ZONA DELICADA</span>
      <button type="button" class="eco-btn text" id="reset">Borrar todos los datos de Economía</button>
    </div></div>`;
  el.querySelector('#go-back').addEventListener('click', () => back('/economia'));
  el.querySelector('#start').addEventListener('click', () => navigate('/economia/inicio/editar'));
  el.querySelector('#fixed').addEventListener('click', () => navigate('/economia/gastos-fijos/editar'));
  el.querySelector('#newcat').addEventListener('click', async () => {
    const r = await formDialog({ title: 'Nueva categoría', fields: [{ key: 'name', label: 'Nombre', type: 'text', value: '', maxLength: 30 }], confirmLabel: 'Añadir' });
    if (!r || !String(r.name).trim()) return;
    update((x) => { addCategory(x, r.name); });
    refresh();
  });
  el.querySelectorAll('[data-ren]').forEach((b) => b.addEventListener('click', async () => {
    const c = cats.find((x) => x.id === b.dataset.ren);
    const r = await formDialog({ title: 'Renombrar categoría', fields: [{ key: 'name', label: 'Nombre', type: 'text', value: c.name, maxLength: 30 }], confirmLabel: 'Guardar' });
    const name = r && String(r.name).trim();
    if (!name) return;
    if (cats.some((x) => x.id !== c.id && x.name.toLowerCase() === name.toLowerCase())) return toast('Ya existe esa categoría');
    update((x) => { const k = x.categories.find((y) => y.id === c.id); if (k) k.name = name.slice(0, 30); });
    refresh();
  }));
  el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    const c = cats.find((x) => x.id === b.dataset.del);
    const ok = await confirmDialog({ title: `Quitar «${c.name}»`, text: 'Sus gastos pasarán a «Otros». No se pierde ningún importe.', confirmLabel: 'Quitar', danger: true });
    if (!ok) return;
    update((x) => removeCategory(x, c.id));
    refresh();
  }));
  el.querySelector('#exp').addEventListener('click', async () => { await runExport(); refresh(); });
  const file = el.querySelector('#file');
  el.querySelector('#imp').addEventListener('click', () => file.click());
  file.addEventListener('change', async () => { const f = file.files[0]; file.value = ''; if (await runImport(f)) location.hash = '#/economia'; });
  el.querySelector('#reset').addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Borrar datos de Economía', text: 'Se borrarán gastos, ingresos, cuentas y movimientos. El calendario no se toca. Esto no se puede deshacer; haz antes una copia si dudas.', confirmLabel: 'Borrar todo', danger: true });
    if (!ok) return;
    resetAll();
    toast('Datos de Economía borrados');
    location.hash = '#/economia';
  });
}
