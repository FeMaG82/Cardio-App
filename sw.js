// sw.js — Service Worker per HRM Polar H9
// Aggiorna CACHE_NAME ogni volta che modifichi i file (es. 'hrm-v2')
const CACHE_NAME = 'hrm-v7';
const FILES = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
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

// Fetch: lascia passare le chiamate esterne (API Anthropic ecc.), cache-first per il resto
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Non intercettare chiamate a domini esterni (API, CDN ecc.)
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Metti in cache solo risorse GET riuscite della stessa origine
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
