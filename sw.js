// Service worker: guarda una copia de la app en el móvil para poder abrirla sin conexión.
// Estrategia: si hay internet, se usa siempre la versión más nueva (y se guarda);
// si no hay internet, se usa la última versión guardada.

const CACHE = 'wibi-v2';

const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/main.js',
  'js/core/icons.js',
  'js/core/palette.js',
  'js/core/store.js',
  'js/core/settings.js',
  'js/core/modules.js',
  'js/core/router.js',
  'js/core/ui.js',
  'js/core/backup.js',
  'js/screens/home.js',
  'js/screens/settings.js',
  'js/screens/colors.js',
  'js/screens/placeholder.js',
  'js/modules/economy/index.js',
  'js/modules/calendar/index.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
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
    fetch(req)
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
