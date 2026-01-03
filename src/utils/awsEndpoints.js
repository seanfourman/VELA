const AWS_ENDPOINTS = {
  visiblePlanets: import.meta.env.VITE_VISIBLE_PLANETS_URL,
  darkSpots: import.meta.env.VITE_DARK_SPOTS_URL,
};

const normalizeBaseUrl = (value) => {
  if (!value) return "";
  return String(value).replace(/\/+$/, "");
};

const LIGHTMAP_API_BASE = normalizeBaseUrl(
  import.meta.env.VITE_LIGHTMAP_API_BASE
);
const API_BASE = normalizeBaseUrl(import.meta.env.VITE_API_BASE);
const FAVORITES_API_BASE = normalizeBaseUrl(
  import.meta.env.VITE_FAVORITES_API_BASE
);
const RECOMMENDATIONS_API_BASE = normalizeBaseUrl(
  import.meta.env.VITE_RECOMMENDATIONS_API_BASE
);

const requireEndpoint = (value, envKey) => {
  if (!value) {
    throw new Error(`Missing ${envKey}. Set it in .env.`);
  }
  return value;
};

const resolveApiBase = (value, envKey) => {
  if (API_BASE) return API_BASE;
  return requireEndpoint(value, envKey);
};

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

export const buildVisiblePlanetsUrl = (lat, lng) =>
  joinQuery(
    requireEndpoint(AWS_ENDPOINTS.visiblePlanets, "VITE_VISIBLE_PLANETS_URL"),
    {
      lat,
      lon: lng,
    }
  );

export const buildSkyQualityUrl = (lat, lon) =>
  joinQuery(
    LIGHTMAP_API_BASE
      ? `${LIGHTMAP_API_BASE}/skyquality`
      : "/api/skyquality",
    { lat, lon }
  );

export const buildDarkSpotsUrl = (lat, lon, searchDistance) =>
  joinQuery(requireEndpoint(AWS_ENDPOINTS.darkSpots, "VITE_DARK_SPOTS_URL"), {
    lat,
    lon,
    searchDistance,
  });

export const buildFavoritesUrl = () =>
  resolveApiBase(FAVORITES_API_BASE, "VITE_FAVORITES_API_BASE") + "/favorites";

export const buildRecommendationsUrl = () =>
  resolveApiBase(
    RECOMMENDATIONS_API_BASE,
    "VITE_RECOMMENDATIONS_API_BASE"
  ) + "/recommendations";

export const getLightmapTileUrlTemplate = () =>
  LIGHTMAP_API_BASE
    ? `${LIGHTMAP_API_BASE}/lightmap/{z}/{x}/{y}.png`
    : "/api/lightmap/{z}/{x}/{y}.png";

export { AWS_ENDPOINTS };
