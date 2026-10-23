// Acciones de copia de seguridad que usan varias pantallas (inicio, ajustes, calendario).
// Aquí vive lo que hay que hacer al pulsar "Exportar" o al elegir un archivo para importar.

import { exportBackup, readBackupFile, applyBackup, backupDateText, downloadedMessage, backupNudgeNeeded } from './backup.js';
import { applyTheme } from './settings.js';
import { toast, confirmDialog } from './ui.js';

// Devuelve true si se ha guardado o descargado la copia.
export async function runExport() {
  try {
    const result = await exportBackup();
    if (result === 'shared') { toast('Copia guardada'); return true; }
    if (result === 'downloaded') { toast(downloadedMessage()); return true; }
  } catch {
    toast('No se ha podido crear la copia. Inténtalo de nuevo.');
  }
  return false;
}

// Devuelve true si se ha importado la copia.
export async function runImport(file) {
  if (!file) return false;
  let payload;
  try {
    payload = await readBackupFile(file);
  } catch (err) {
    toast(err.message);
    return false;
  }
  const ok = await confirmDialog({
    title: 'Importar copia',
    text: `Se sustituirán los datos actuales de este móvil por los de la copia del ${backupDateText(payload)}. Esto no se puede deshacer.`,
    confirmLabel: 'Importar',
    danger: true,
  });
  if (!ok) return false;
  applyBackup(payload);
  applyTheme();
  toast('Copia importada');
  return true;
}

// Tras guardar algo importante (entreno, carrera): si llevas unos días sin copia, un aviso discreto
// con botón para hacerla. Como mucho una vez al día y solo si no hay otro aviso encima.
export function backupNudge() {
  try {
    if (!backupNudgeNeeded()) return;
    const hoy = new Date().toISOString().slice(0, 10);
    if (sessionStorage.getItem('wibi:nudge') === hoy) return;
    sessionStorage.setItem('wibi:nudge', hoy);
  } catch { return; }
  setTimeout(() => {
    const root = document.getElementById('overlay-root');
    if (!root || root.querySelector('.modal-back')) return;
    const n = document.createElement('div');
    n.className = 'toast nudge';
    n.innerHTML = '<span>Llevas unos días sin copia de seguridad</span><button type="button">Copiar ahora</button><button type="button" class="x" aria-label="Cerrar">✕</button>';
    const [ok, no] = n.querySelectorAll('button');
    no.addEventListener('click', () => n.remove());
    ok.addEventListener('click', async () => { n.remove(); await runExport(); });
    root.appendChild(n);
    setTimeout(() => n.remove(), 12000);
  }, 5200);
}
