const CACHE_NAME = "vela-map-tiles-v2";
const TILE_PATTERNS = [
  /api\.maptiler\.com/,
  /basemaps\.cartocdn\.com/,
  /tile\.openstreetmap\.org/,
  /tiles\.stadiamaps\.com/,
];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
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

async function fetchWithRetry(request, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(request.clone());
      if (response.ok) {
        return response;
      }
      if (response.status === 429) {
        const waitTime = delay * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, delay * Math.pow(2, i))
      );
    }
  }
}

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  const isTileRequest = TILE_PATTERNS.some((pattern) => pattern.test(url));

  if (isTileRequest) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetchWithRetry(event.request);
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return new Response(
            Uint8Array.from(
              atob(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
              ),
              (c) => c.charCodeAt(0)
            ),
            {
              status: 200,
              headers: { "Content-Type": "image/png" },
            }
          );
        }
      })
    );
  }
});
