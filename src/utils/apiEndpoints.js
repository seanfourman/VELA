const normalizeBaseUrl = (value) => {
  if (!value) return "";
  return String(value).replace(/\/+$/, "");
};

const API_BASE = normalizeBaseUrl(import.meta.env.VITE_API_BASE);
const LIGHTMAP_API_BASE = normalizeBaseUrl(import.meta.env.VITE_LIGHTMAP_API_BASE);
const RECOMMENDATIONS_API_BASE = normalizeBaseUrl(
  import.meta.env.VITE_RECOMMENDATIONS_API_BASE
);
const VISIBLE_PLANETS_URL = normalizeBaseUrl(import.meta.env.VITE_VISIBLE_PLANETS_URL);
const DARK_SPOTS_URL = normalizeBaseUrl(import.meta.env.VITE_DARK_SPOTS_URL);

const LOCAL_ENDPOINTS = {
  auth: "/api/users",
  favorites: "/api/favorites",
  visiblePlanets: "/api/visible-planets",
  darkSpots: "/api/darkspots",
  skyQuality: "/api/skyquality",
  lightMapTiles: "/api/lightmap/{z}/{x}/{y}.png",
  recommendations: "/api/recommendations",
};

const joinResourceUrl = (base, resource) =>
  `${base.replace(/\/+$/, "")}/${String(resource || "").replace(/^\/+/, "")}`;

const joinQuery = (baseUrl, params) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    query.set(key, String(value));
  });

  if ([...query.keys()].length === 0) return baseUrl;

  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}${query.toString()}`;
};

const resolveBase = (value, fallback) => {
  if (API_BASE) return API_BASE;
  return value || fallback;
};

export const buildAuthUrl = (path = "") =>
  API_BASE
    ? joinResourceUrl(
        API_BASE,
        path ? `users/${String(path).replace(/^\/+/, "")}` : "users"
      )
    : `${LOCAL_ENDPOINTS.auth}${path ? `/${path}` : ""}`;

export const buildFavoritesUrl = (spotId = "") => {
  const base = API_BASE
    ? joinResourceUrl(API_BASE, "favorites")
    : LOCAL_ENDPOINTS.favorites;
  const normalizedSpotId = String(spotId || "").trim();
  return normalizedSpotId
    ? `${base}/${encodeURIComponent(normalizedSpotId)}`
    : base;
};

export const buildVisiblePlanetsUrl = (lat, lng) =>
  joinQuery(VISIBLE_PLANETS_URL || LOCAL_ENDPOINTS.visiblePlanets, {
    lat,
    lon: lng,
  });

export const buildSkyQualityUrl = (lat, lon) =>
  joinQuery(
    LIGHTMAP_API_BASE ? `${LIGHTMAP_API_BASE}/skyquality` : LOCAL_ENDPOINTS.skyQuality,
    { lat, lon }
  );

export const buildDarkSpotsUrl = (lat, lon, searchDistance) =>
  joinQuery(DARK_SPOTS_URL || LOCAL_ENDPOINTS.darkSpots, {
    lat,
    lon,
    searchDistance,
  });

export const buildRecommendationsUrl = () =>
  API_BASE
    ? joinResourceUrl(API_BASE, "recommendations")
    : `${resolveBase(
        RECOMMENDATIONS_API_BASE,
        LOCAL_ENDPOINTS.recommendations
      ).replace(/\/recommendations$/, "")}/recommendations`;

export const getLightmapTileUrlTemplate = () =>
  LIGHTMAP_API_BASE
    ? `${LIGHTMAP_API_BASE}/lightmap/{z}/{x}/{y}.png`
    : LOCAL_ENDPOINTS.lightMapTiles;
