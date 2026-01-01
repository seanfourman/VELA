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

const requireEndpoint = (value, envKey) => {
  if (!value) {
    throw new Error(`Missing ${envKey}. Set it in .env.`);
  }
  return value;
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

export const getLightmapTileUrlTemplate = () =>
  LIGHTMAP_API_BASE
    ? `${LIGHTMAP_API_BASE}/lightmap/{z}/{x}/{y}.png`
    : "/api/lightmap/{z}/{x}/{y}.png";

export { AWS_ENDPOINTS };
