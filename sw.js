/* ============================================================
   PRECIFICAZ — Service Worker
   Cache-first para assets estáticos, network-first para API
   ============================================================ */

const CACHE_NAME   = 'precificaz-v4';
const API_ORIGIN   = 'script.google.com'; // GAS Web App

const STATIC_ASSETS = [
  '/precificaz/',
  '/precificaz/index.html',
  '/precificaz/manifest.json',
  '/precificaz/css/tokens.css',
  '/precificaz/css/base.css',
  '/precificaz/css/components.css',
  '/precificaz/js/app.js',
  '/precificaz/js/api.js',
  '/precificaz/js/auth.js',
  '/precificaz/js/router.js',
  '/precificaz/js/utils.js',
  '/precificaz/pages/login.html',
  '/precificaz/pages/dashboard.html',
  '/precificaz/pages/materiais.html',
  '/precificaz/pages/pecas.html',
  '/precificaz/pages/estoque.html',
  '/precificaz/pages/precificacao.html',
];

/* ── Install: pré-cache de assets estáticos ─────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: limpa caches antigos ─────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: estratégia por tipo de request ───────────────── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Requisições ao GAS (backend): sempre network, sem cache
  if (url.hostname.includes(API_ORIGIN)) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Sem conexão. Tente novamente.' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Assets estáticos: cache-first, fallback para network
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;

        return fetch(request).then(response => {
          if (!response || response.status !== 200) return response;

          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        });
      })
    );
  }
});

/* ── Background sync (futuro) ───────────────────────────── */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pendentes') {
    // TODO: sincronizar operações offline pendentes
  }
});
