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

// Fetch visible planets with caching
export async function fetchVisiblePlanets(lat, lng) {
  const cacheKey = `${PLANETS_API_CACHE_KEY}_${lat.toFixed(2)}_${lng.toFixed(
    2
  )}`;
  let cached;

  try {
    cached = localStorage.getItem(cacheKey);
  } catch {
    cached = null;
  }

  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    } catch {
      // Corrupt cache, ignore and refetch
    }
  }

  try {
    const response = await fetch(
      `https://api.visibleplanets.dev/v3?latitude=${lat}&longitude=${lng}`
    );
    if (!response.ok) {
      throw new Error(`Visible planets API failed: ${response.status}`);
    }

    const data = await response.json();

    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({ data, timestamp: Date.now() })
      );
    } catch {
      // Storage may be unavailable (quota/permissions); continue without cache
    }

    return data;
  } catch (error) {
    console.error("Failed to fetch visible planets:", error);
    return null;
  }
}
