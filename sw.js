// sw.js — Service Worker per HRM Polar H9
// Aggiorna CACHE_NAME ogni volta che modifichi i file (es. 'hrm-v2')
const CACHE_NAME = 'hrm-v2';
const FILES = [
  './',
  './index.html',
];

// Installazione: mette in cache i file
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
  );
  self.skipWaiting();
});

// Attivazione: rimuove cache vecchie
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: prima dalla cache, poi dalla rete (cache-first)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Metti in cache anche le risorse nuove (solo GET riuscite)
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached); // se offline e non in cache, ritorna cached (o nulla)
    })
  );
});
