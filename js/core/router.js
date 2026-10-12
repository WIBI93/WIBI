// Navegación entre pantallas. La dirección lleva un "#": por ejemplo ".../#/ajustes".
// Así el botón "atrás" del móvil funciona como se espera.

const routes = {};
let container = null;

export function route(path, render) {
  routes[path] = render;
}

export function navigate(path) {
  history.pushState({ inApp: true }, '', '#' + path);
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
  const render = routes[currentPath()] || routes['/'];
  container.innerHTML = '';
  render(container);
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
