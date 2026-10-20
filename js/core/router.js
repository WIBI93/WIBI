// Navegación entre pantallas. La dirección lleva un "#": por ejemplo ".../#/ajustes".
// Así el botón "atrás" del móvil funciona como se espera.
// Las rutas pueden llevar partes variables: "/calendario/dia/:key".

const routes = [];
let container = null;

const split = (p) => p.split('/').filter(Boolean);

// opts.cal = true -> la pantalla usa el aspecto propio del calendario.
// opts.theme = 'fitc' | 'fitg' | 'fitr' -> aspecto propio de W fit (común, gimnasio o running).
// opts.full = true -> la pantalla ocupa todo el ancho (barra inferior propia).
export function route(path, render, opts = {}) {
  routes.push({ parts: split(path), render, opts });
}

function find(path) {
  const parts = split(path);
  for (const r of routes) {
    if (r.parts.length !== parts.length) continue;
    const params = {};
    let ok = true;
    r.parts.forEach((seg, i) => {
      if (seg[0] === ':') {
        try { params[seg.slice(1)] = decodeURIComponent(parts[i]); } catch { ok = false; }
      } else if (seg !== parts[i]) {
        ok = false;
      }
    });
    if (ok) return { r, params };
  }
  return null;
}

export function navigate(path) {
  history.pushState({ inApp: true }, '', '#' + path);
  show();
}

// Cambia de pantalla sin añadir un paso más al historial
// (para las pestañas de abajo: así "atrás" no recorre todas las pestañas).
export function go(path) {
  history.replaceState(history.state, '', '#' + path);
  show();
}

// Vuelve a la pantalla anterior. Si la app se abrió directamente en esta
// pantalla (no hay "anterior" dentro de la app), va a la pantalla padre.
export function back(parent = '/') {
  if (history.state && history.state.inApp) {
    history.back();
  } else {
    history.replaceState({ inApp: true }, '', '#' + parent);
    show();
  }
}

function currentPath() {
  return location.hash.replace(/^#/, '') || '/';
}

function show() {
  const hit = find(currentPath()) || find('/');
  const cal = !!hit.r.opts.cal;
  const theme = hit.r.opts.theme || '';
  const root = document.documentElement;
  root.classList.toggle('in-cal', cal);
  for (const t of ['fitc', 'fitg', 'fitr']) root.classList.toggle('in-' + t, t === theme);
  if (!theme) delete root.dataset.accent;
  container.classList.toggle('full', cal || !!theme || !!hit.r.opts.full);
  container.innerHTML = '';
  hit.r.render(container, hit.params);
  window.scrollTo(0, 0);
}

export function start(el) {
  container = el;
  window.addEventListener('popstate', show);
  show();
}

// Vuelve a dibujar la pantalla actual (por ejemplo, tras cambiar un ajuste).
export function refresh() {
  const y = window.scrollY;
  show();
  window.scrollTo(0, y);
}
