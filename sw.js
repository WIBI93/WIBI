// Service worker: guarda una copia de la app en el móvil para poder abrirla sin conexión.
// Estrategia: si hay internet, se usa siempre la versión más nueva (y se guarda);
// si no hay internet, se usa la última versión guardada.

const CACHE = 'wibi-v45';
// Aquí se deja, un momento, el GPX que llega desde el menú Compartir de Android (la pantalla de importar lo recoge y lo borra).
const SHARE_CACHE = 'wibi-share';

const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'manifest-calendario.webmanifest',
  'css/styles.css',
  'css/calendar.css',
  'css/fit.css',
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
  'js/modules/economy/stats.js',
  'js/modules/economy/pagos.js',
  'js/modules/economy/goals.js',
  'js/modules/economy/state.js',
  'js/modules/economy/summary.js',
  'js/modules/fit/index.js',
  'js/modules/fit/dates.js',
  'js/modules/fit/data.js',
  'js/modules/fit/engine.js',
  'js/modules/fit/medals.js',
  'js/modules/fit/shell.js',
  'js/modules/fit/common.js',
  'js/modules/fit/sport.js',
  'js/modules/fit/exercises.js',
  'js/modules/fit/gymlogic.js',
  'js/modules/fit/gym.js',
  'js/modules/fit/gymmedals.js',
  'js/modules/fit/gym2.js',
  'js/modules/fit/secrets.js',
  'js/modules/fit/stickfigs.js',
  'js/modules/fit/exdraw.js',
  'js/modules/fit/exmuscles.js',
  'js/modules/fit/musclemap.js',
  'js/modules/fit/musclepaths.js',
  'img/muscle/base_f.webp',
  'img/muscle/base_b.webp',
  'img/muscle/lines_f.png',
  'img/muscle/lines_b.png',
  'js/modules/fit/goals.js',
  'js/modules/fit/seasons.js',
  'js/modules/fit/annual.js',
  'js/modules/fit/gpx.js',
  'js/modules/fit/runlogic.js',
  'js/modules/fit/runmedals.js',
  'js/modules/fit/run.js',
  'js/modules/fit/plans.js',
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
  'js/modules/calendar/settings-sub.js',
  'js/modules/calendar/holidays.js',
  'js/modules/calendar/newcal.js',
  'js/modules/calendar/compare.js',
  'js/modules/calendar/share.js',
  'js/modules/calendar/swaps.js',
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
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== SHARE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Archivo recibido desde "Compartir": se guarda y se abre la pantalla de importar carrera.
  if (req.method === 'POST' && new URL(req.url).pathname.endsWith('/share-target')) {
    event.respondWith((async () => {
      let target = './#/fit/running/importar';
      try {
        const form = await req.formData();
        const file = form.getAll('gpx').find((f) => f && typeof f !== 'string');
        if (file) {
          const text = await file.text();
          // Un calendario compartido por otra persona va a la pantalla de importar calendario.
          if (text.includes('"type":"calendar-share"')) target = './#/calendario/importar';
          const cache = await caches.open(SHARE_CACHE);
          await cache.put('pending', new Response(text, { headers: { 'X-Name': encodeURIComponent(file.name || '') } }));
        }
      } catch (e) { /* si falla, se abre igualmente la pantalla de importar */ }
      return Response.redirect(new URL(target, self.registration.scope).href, 303);
    })());
    return;
  }
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
