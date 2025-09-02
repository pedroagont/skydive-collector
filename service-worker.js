/* service-worker.js */
const CACHE_NAME = 'skydive-v1';
const APP_SHELL = [
  '/',                // adjust to '/index.html' if your host doesn't serve index on '/'
  '/index.html',
  '/favicon.png',
  '/audio/background.mp3',
  '/audio/finish.mp3',
  '/audio/orb.mp3',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js'
];

// Install: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for navigations, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // HTML navigations -> network first (fallback to cache for offline)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Same-origin static -> cache first
  const url = new URL(req.url);
  const isSameOrigin = self.location.origin === url.origin;

  if (isSameOrigin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        });
      })
    );
    return;
  }

  // Cross-origin (e.g., CDN) -> stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => cached); // offline fallback to cache if available
      return cached || fetchPromise;
    })
  );
});
