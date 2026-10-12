// Ajustes generales de WIBI: apariencia, colores de las secciones y fechas de copia.

import { load, save } from './store.js';
import { HEX_RE } from './palette.js';
import { MODULES } from './modules.js';

const THEMES = ['light', 'dark', 'auto'];

// Limpia lo que venga guardado (o de una copia importada) para que nunca rompa la app.
function normalize(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const colors = {};
  if (s.colors && typeof s.colors === 'object') {
    for (const [id, hex] of Object.entries(s.colors)) {
      if (typeof hex === 'string' && HEX_RE.test(hex)) colors[id] = hex.toUpperCase();
    }
  }
  return {
    theme: THEMES.includes(s.theme) ? s.theme : 'auto',
    colors,
    installedAt: typeof s.installedAt === 'string' ? s.installedAt : null,
    lastBackupAt: typeof s.lastBackupAt === 'string' ? s.lastBackupAt : null,
  };
}

export function getSettings() {
  return normalize(load('settings'));
}

export function setSettings(patch) {
  const next = normalize({ ...getSettings(), ...patch });
  save('settings', next);
  return next;
}

// Se guarda la fecha del primer uso: sirve para el aviso de copia de seguridad.
export function ensureInstalledAt() {
  const s = getSettings();
  if (!s.installedAt) setSettings({ installedAt: new Date().toISOString() });
}

export function sectionColor(id) {
  const mod = MODULES.find((m) => m.id === id);
  return getSettings().colors[id] || (mod ? mod.color : '#17594A');
}

// ---------- Apariencia ----------

const media = window.matchMedia('(prefers-color-scheme: dark)');

export function applyTheme() {
  const { theme } = getSettings();
  const dark = theme === 'dark' || (theme === 'auto' && media.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0F1A17' : '#F2F5F2');
}

// En modo automático, si el móvil cambia de claro a oscuro, la app lo sigue.
media.addEventListener('change', applyTheme);
