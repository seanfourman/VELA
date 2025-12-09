const CACHE_NAME = 'vela-map-tiles-v1';
const TILE_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Tile URL patterns to cache
const TILE_PATTERNS = [
  /basemaps\.cartocdn\.com/,
  /tile\.openstreetmap\.org/,
  /tiles\.stadiamaps\.com/,
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Check if this is a tile request
  const isTileRequest = TILE_PATTERNS.some(pattern => pattern.test(url));
  
  if (isTileRequest) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached tile
            return cachedResponse;
          }
          
          // Fetch and cache the tile
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Return a placeholder or empty response on network failure
            return new Response('', { status: 503, statusText: 'Tile unavailable' });
          });
        });
      })
    );
  }
});
