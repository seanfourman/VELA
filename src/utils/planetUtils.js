import { buildVisiblePlanetsUrl } from "./apiEndpoints";

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
  return (
    PLANET_TEXTURES[key] ||
    (key.includes("venus") && PLANET_TEXTURES.venus) ||
    (key.includes("saturn") && PLANET_TEXTURES.saturn) ||
    (key.includes("moon") && PLANET_TEXTURES.moon) ||
    PLANET_TEXTURES.default
  );
};

const PLANETS_API_CACHE_KEY = "visiblePlanetsCache";
const CACHE_DURATION = 24 * 60 * 60 * 1000;
const texturePreloadCache = new Map();
const cacheKey = (lat, lng) =>
  `${PLANETS_API_CACHE_KEY}_${lat.toFixed(2)}_${lng.toFixed(2)}`;

export function preloadPlanetTexture(url) {
  if (!url) return Promise.resolve();
  if (texturePreloadCache.has(url)) return texturePreloadCache.get(url);

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
  return Promise.all(
    Object.values(PLANET_TEXTURES).map((url) => preloadPlanetTexture(url))
  ).catch(() => undefined);
}

export async function fetchVisiblePlanets(lat, lng) {
  const key = cacheKey(lat, lng);
  const cachedRaw = (() => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  })();

  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw);
      if (Date.now() - cached?.timestamp < CACHE_DURATION) return cached.data;
    } catch {
      // Ignore invalid cache payload.
    }
  }

  try {
    const response = await fetch(buildVisiblePlanetsUrl(lat, lng));
    if (!response.ok) throw new Error(`Visible planets API failed: ${response.status}`);
    const data = await response.json();

    try {
      localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {
      // Storage unavailable; continue without cache
    }
    return data;
  } catch {
    return null;
  }
}
