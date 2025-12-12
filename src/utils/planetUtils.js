const planetTexture = (fileName) =>
  new URL(`../assets/planets/${fileName}`, import.meta.url).href;

export const PLANET_TEXTURES = {
  sun: planetTexture("2k_sun.jpg"),
  moon: planetTexture("2k_moon.jpg"),
  mercury: planetTexture("2k_mercury.jpg"),
  venus: planetTexture("2k_venus_atmosphere.jpg"),
  earth: planetTexture("2k_stars_milky_way.jpg"),
  mars: planetTexture("2k_mars.jpg"),
  jupiter: planetTexture("2k_jupiter.jpg"),
  saturn: planetTexture("2k_saturn.jpg"),
  saturnRing: planetTexture("2k_saturn_ring_alpha.png"),
  uranus: planetTexture("2k_uranus.jpg"),
  neptune: planetTexture("2k_neptune.jpg"),
  pluto: planetTexture("2k_makemake_fictional.jpg"),
  ceres: planetTexture("2k_ceres_fictional.jpg"),
  eris: planetTexture("2k_eris_fictional.jpg"),
  haumea: planetTexture("2k_haumea_fictional.jpg"),
  makemake: planetTexture("2k_makemake_fictional.jpg"),
  stars: planetTexture("2k_stars_milky_way.jpg"),
  default: planetTexture("2k_stars_milky_way.jpg"),
};

export const resolvePlanetTexture = (name) => {
  if (!name) return PLANET_TEXTURES.default;
  const key = name.toLowerCase();

  if (PLANET_TEXTURES[key]) return PLANET_TEXTURES[key];
  if (key.includes("venus")) return PLANET_TEXTURES.venus;
  if (key.includes("saturn")) return PLANET_TEXTURES.saturn;
  if (key.includes("moon")) return PLANET_TEXTURES.moon;

  return PLANET_TEXTURES.default;
};

const PLANETS_API_CACHE_KEY = "visiblePlanetsCache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms

// IndexedDB cache (with in-memory fallback)
const DB_NAME = "VisiblePlanetsDB";
const DB_VERSION = 1;
const STORE_NAME = "cache";
const memoryCache = new Map();
let dbPromise = null;

function openPlanetDb() {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === "undefined") {
    dbPromise = Promise.reject(new Error("IndexedDB unavailable"));
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB error"));
  });

  return dbPromise;
}

async function getCachedPlanets(key) {
  try {
    const db = await openPlanetDb();
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (record) return record;
  } catch {
    if (memoryCache.has(key)) return memoryCache.get(key);
    try {
      const ls = localStorage.getItem(key);
      if (ls) return JSON.parse(ls);
    } catch {
      // ignore
    }
  }
  return null;
}

async function setCachedPlanets(key, data) {
  const record = { key, data, timestamp: Date.now() };
  try {
    const db = await openPlanetDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      localStorage.setItem(key, JSON.stringify(record));
    } catch {
      memoryCache.set(key, record);
    }
  }
}

// Texture preloading helpers
const texturePreloadCache = new Map();

export function preloadPlanetTexture(url) {
  if (!url) return Promise.resolve();
  if (texturePreloadCache.has(url)) {
    return texturePreloadCache.get(url);
  }
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = reject;
    img.src = url;
  });
  texturePreloadCache.set(url, promise);
  return promise;
}

export function preloadAllPlanetTextures() {
  const entries = Object.values(PLANET_TEXTURES);
  return Promise.all(entries.map((url) => preloadPlanetTexture(url))).catch(
    () => {}
  );
}

// Fetch visible planets with caching
export async function fetchVisiblePlanets(lat, lng) {
  const cacheKey = `${PLANETS_API_CACHE_KEY}_${lat.toFixed(2)}_${lng.toFixed(
    2
  )}`;
  const cached = await getCachedPlanets(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await fetch(
      `https://api.visibleplanets.dev/v3?latitude=${lat}&longitude=${lng}`
    );
    if (!response.ok) {
      throw new Error(`Visible planets API failed: ${response.status}`);
    }

    const data = await response.json();

    setCachedPlanets(cacheKey, data);

    return data;
  } catch (error) {
    return null;
  }
}
