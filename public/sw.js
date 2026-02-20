const CACHE_NAME = "vela-map-tiles-v3";
const META_CACHE_NAME = "vela-map-tiles-meta-v1";
const TILE_CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const TILE_CACHE_MAX_ENTRIES = 4000;
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
          if (cacheName !== CACHE_NAME && cacheName !== META_CACHE_NAME) {
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

const createMetaKey = (request) =>
  `${self.registration.scope}__sw-meta__/tile?url=${encodeURIComponent(
    request.url,
  )}`;

async function readCachedTile(tileCache, metaCache, request) {
  const cachedResponse = await tileCache.match(request);
  if (!cachedResponse) return null;

  const metaKey = createMetaKey(request);
  const metaEntry = await metaCache.match(metaKey);
  const now = Date.now();

  if (!metaEntry) {
    await metaCache.put(metaKey, new Response(String(now)));
    return cachedResponse;
  }

  const cachedAt = Number(await metaEntry.text());
  const isExpired =
    !Number.isFinite(cachedAt) || now - cachedAt > TILE_CACHE_MAX_AGE;

  if (isExpired) {
    await Promise.all([tileCache.delete(request), metaCache.delete(metaKey)]);
    return null;
  }

  await metaCache.put(metaKey, new Response(String(now)));
  return cachedResponse;
}

async function enforceCacheLimit(tileCache, metaCache) {
  const keys = await tileCache.keys();
  const overflow = keys.length - TILE_CACHE_MAX_ENTRIES;
  if (overflow <= 0) return;

  const staleKeys = keys.slice(0, overflow);
  await Promise.all(
    staleKeys.map((request) =>
      Promise.all([
        tileCache.delete(request),
        metaCache.delete(createMetaKey(request)),
      ]),
    ),
  );
}

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  const isTileRequest = TILE_PATTERNS.some((pattern) => pattern.test(url));

  if (isTileRequest) {
    event.respondWith(
      Promise.all([caches.open(CACHE_NAME), caches.open(META_CACHE_NAME)]).then(
        async ([tileCache, metaCache]) => {
          const cachedResponse = await readCachedTile(
            tileCache,
            metaCache,
            event.request,
          );
          if (cachedResponse) {
            return cachedResponse;
          }

          try {
            const networkResponse = await fetchWithRetry(event.request);
            if (networkResponse.ok) {
              await Promise.all([
                tileCache.put(event.request, networkResponse.clone()),
                metaCache.put(
                  createMetaKey(event.request),
                  new Response(String(Date.now())),
                ),
              ]);
              await enforceCacheLimit(tileCache, metaCache);
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
        },
      ),
    );
  }
});
