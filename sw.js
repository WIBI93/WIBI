// Service worker: guarda una copia de la app en el móvil para poder abrirla sin conexión.
// Estrategia: si hay internet, se usa siempre la versión más nueva (y se guarda);
// si no hay internet, se usa la última versión guardada.

const CACHE = 'wibi-v11';

const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'css/calendar.css',
  'css/economy.css',
  'js/main.js',
  'js/core/icons.js',
  'js/core/palette.js',
  'js/core/store.js',
  'js/core/settings.js',
  'js/core/modules.js',
  'js/core/router.js',
  'js/core/ui.js',
  'js/core/backup.js',
  'js/core/backup-ui.js',
  'js/screens/home.js',
  'js/screens/settings.js',
  'js/screens/colors.js',
  'js/screens/placeholder.js',
  'js/modules/economy/calc.js',
  'js/modules/economy/data.js',
  'js/modules/economy/fixed.js',
  'js/modules/economy/fmt.js',
  'js/modules/economy/forms.js',
  'js/modules/economy/index.js',
  'js/modules/economy/moves.js',
  'js/modules/economy/projection.js',
  'js/modules/economy/savings.js',
  'js/modules/economy/settings.js',
  'js/modules/economy/setup.js',
  'js/modules/economy/shell.js',
  'js/modules/economy/sim.js',
  'js/modules/economy/state.js',
  'js/modules/economy/summary.js',
  'js/modules/calendar/index.js',
  'js/modules/calendar/calc.js',
  'js/modules/calendar/data.js',
  'js/modules/calendar/state.js',
  'js/modules/calendar/shell.js',
  'js/modules/calendar/month.js',
  'js/modules/calendar/brush.js',
  'js/modules/calendar/day.js',
  'js/modules/calendar/summary.js',
  'js/modules/calendar/shifts.js',
  'js/modules/calendar/zones.js',
  'js/modules/calendar/settings.js',
  'js/modules/calendar/holidays.js',
  'js/modules/calendar/newcal.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // 'reload' salta la copia temporal del navegador (GitHub guarda 10 min) para tener siempre lo último.
      .then((cache) => Promise.all(ASSETS.map((a) => cache.add(new Request(a, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('index.html')))
  );
});
