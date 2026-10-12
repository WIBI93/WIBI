// Copia de seguridad única.
// Un solo archivo (.json) con los datos de TODAS las secciones y los ajustes.
// La app nunca sube nada a internet: el archivo lo guardas tú donde quieras
// (por ejemplo en Google Drive desde el menú de compartir del móvil).

import { exportAll, replaceAll, hasSectionData } from './store.js';
import { getSettings, setSettings } from './settings.js';

export const APP_VERSION = '0.1.0';
const FORMAT = 1; // sube si algún día cambia la forma del archivo
const REMINDER_DAYS = 30;

const DAY = 24 * 60 * 60 * 1000;

export function daysSince(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / DAY);
}

// ¿Hay que avisar de que toca hacer una copia?
// Solo si hay datos de alguna sección y han pasado más de 30 días desde la
// última copia (o desde el primer uso si nunca se ha hecho una).
export function needsBackupReminder() {
  if (!hasSectionData()) return false;
  const s = getSettings();
  const days = daysSince(s.lastBackupAt || s.installedAt);
  return days !== null && days > REMINDER_DAYS;
}

export function lastBackupText() {
  const days = daysSince(getSettings().lastBackupAt);
  if (days === null) return 'Todavía no has hecho ninguna copia';
  if (days <= 0) return 'Última copia: hoy';
  if (days === 1) return 'Última copia: ayer';
  return `Última copia: hace ${days} días`;
}

function pad(n) { return String(n).padStart(2, '0'); }

// Devuelve 'shared', 'downloaded' o 'cancelled'.
export async function exportBackup() {
  const now = new Date();
  const data = exportAll();
  data.settings = { ...getSettings(), lastBackupAt: now.toISOString() };

  const payload = { app: 'WIBI', format: FORMAT, appVersion: APP_VERSION, exportedAt: now.toISOString(), data };
  const text = JSON.stringify(payload, null, 2);
  const name = `wibi-copia-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
  const file = new File([text], name, { type: 'application/json' });

  // 1) Menú de compartir del móvil (ahí aparece "Guardar en Drive").
  // Chrome no deja compartir archivos .json, pero sí .txt. El contenido es el
  // mismo, así que para compartir se usa la extensión .txt.
  const shareFile = new File([text], name.replace(/\.json$/, '.txt'), { type: 'text/plain' });
  if (navigator.canShare && navigator.canShare({ files: [shareFile] })) {
    try {
      await navigator.share({ files: [shareFile], title: 'Copia de seguridad de WIBI' });
      setSettings({ lastBackupAt: now.toISOString() });
      return 'shared';
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled';
      // Si falla por otra causa, se descarga el archivo.
    }
  }

  // 2) Descarga normal al móvil.
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  setSettings({ lastBackupAt: now.toISOString() });
  return 'downloaded';
}

// Lee y comprueba un archivo de copia. Lanza un Error con un mensaje claro si no vale.
export async function readBackupFile(file) {
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    throw new Error('No he podido leer el archivo. ¿Seguro que es una copia de WIBI?');
  }
  if (!payload || payload.app !== 'WIBI' || !payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
    throw new Error('Este archivo no parece una copia de seguridad de WIBI.');
  }
  if (typeof payload.format === 'number' && payload.format > FORMAT) {
    throw new Error('Esta copia es de una versión más nueva de WIBI. Actualiza la app y vuelve a probar.');
  }
  return payload;
}

// Sustituye los datos actuales por los de la copia.
export function applyBackup(payload) {
  replaceAll(payload.data);
  // La fecha de "última copia" pasa a ser la de la copia que se acaba de importar.
  setSettings({ lastBackupAt: payload.exportedAt || null });
}

export function backupDateText(payload) {
  const d = new Date(payload.exportedAt);
  if (Number.isNaN(d.getTime())) return 'fecha desconocida';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}
