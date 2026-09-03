// sw.js — Service Worker per HRM Polar H9
// Aggiorna CACHE_NAME ogni volta che modifichi i file (es. 'hrm-v2')
const CACHE_NAME = 'hrm-v7';
const FILES = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',
];

// Installazione: mette in cache i file
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
  );
  self.skipWaiting();
});

// Attivazione: rimuove cache vecchie (MAI la cache dei tile offline)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE_NAME && k !== 'osm-tiles-v1')
        .map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Tile OpenStreetMap: cache-first, con fallback a rete. Questo rende
  // disponibili offline i tile scaricati esplicitamente dall'utente
  // (sezione "Mappa offline"), e mette in cache anche i tile visti
  // normalmente durante la navigazione online (utile per riuso, non è
  // download bulk automatizzato quindi rispetta la policy OSM).
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open('osm-tiles-v1').then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(resp => {
            if (resp.ok) cache.put(event.request, resp.clone());
            return resp;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // Altre chiamate a domini esterni (API, CDN ecc.): lascia passare dirette
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
