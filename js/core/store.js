// Almacenamiento de datos.
// Todo se guarda en el móvil (localStorage) con el prefijo "wibi:".
// Cada sección usa su propia clave (por ejemplo "economy" o "calendar"),
// así una sección no puede estropear los datos de otra.
// La copia de seguridad recoge TODAS las claves con ese prefijo automáticamente,
// por eso cuando se añada una sección nueva no hay que tocar la copia.

const PREFIX = 'wibi:';

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key) {
  try { localStorage.removeItem(PREFIX + key); } catch { /* nada */ }
}

export function allKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k.slice(PREFIX.length));
  }
  return keys;
}

export function exportAll() {
  const data = {};
  for (const key of allKeys()) data[key] = load(key);
  return data;
}

export function replaceAll(data) {
  for (const key of allKeys()) localStorage.removeItem(PREFIX + key);
  for (const [key, value] of Object.entries(data)) save(key, value);
}

// ¿Hay datos de alguna sección? (los ajustes no cuentan)
export function hasSectionData() {
  return allKeys().some((k) => k !== 'settings');
}
