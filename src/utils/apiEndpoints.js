const normalizeBaseUrl = (value) => {
  if (!value) return "";
  return String(value).replace(/\/+$/, "");
};

const API_BASE = normalizeBaseUrl(import.meta.env.VITE_API_BASE);

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

const buildApiUrl = (resourcePath) => {
  const normalizedResource = String(resourcePath || "").replace(/^\/+/, "");
  if (!normalizedResource) {
    return API_BASE || "/api";
  }

  return API_BASE
    ? joinResourceUrl(API_BASE, normalizedResource)
    : joinResourceUrl("/api", normalizedResource);
};

const MAPTILER_PROXY_BASE = API_BASE
  ? joinResourceUrl(API_BASE, "maptiler")
  : "/api/maptiler";

export const buildAuthUrl = (path = "") => {
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return normalizedPath
    ? buildApiUrl(`users/${normalizedPath}`)
    : buildApiUrl("users");
};

export const buildFavoritesUrl = (spotId = "") => {
  const base = buildApiUrl("favorites");
  const normalizedSpotId = String(spotId || "").trim();
  return normalizedSpotId
    ? `${base}/${encodeURIComponent(normalizedSpotId)}`
    : base;
};

export const buildVisiblePlanetsUrl = (lat, lng) =>
  joinQuery(buildApiUrl("visible-planets"), {
    lat,
    lon: lng,
  });

const buildMapTilerResourceUrl = (resourcePath = "") =>
  resourcePath
    ? joinResourceUrl(MAPTILER_PROXY_BASE, resourcePath)
    : MAPTILER_PROXY_BASE;

export const buildMapTilerRasterTemplateUrl = (mapId, format) =>
  buildMapTilerResourceUrl(`maps/${mapId}/{z}/{x}/{y}.${format}`);

export const buildMapTilerRasterUrl = (mapId, z, x, y, format) =>
  buildMapTilerResourceUrl(`maps/${mapId}/${z}/${x}/${y}.${format}`);

export const buildMapTilerStyleUrl = (mapId = "streets-v2") =>
  buildMapTilerResourceUrl(`maps/${mapId}/style.json`);

export const buildSkyQualityUrl = (lat, lon) =>
  joinQuery(buildApiUrl("skyquality"), { lat, lon });

export const buildDarkSpotsUrl = (lat, lon, searchDistance) =>
  joinQuery(buildApiUrl("darkspots"), {
    lat,
    lon,
    searchDistance,
  });

export const buildRecommendationsUrl = () => buildApiUrl("recommendations");

export const buildStarPartyEventsUrl = (eventId = "") => {
  const base = buildApiUrl("star-party-events");
  const normalizedId = String(eventId || "").trim();
  return normalizedId ? `${base}/${encodeURIComponent(normalizedId)}` : base;
};

export const buildStarPartyEventStatusUrl = (eventId) =>
  `${buildStarPartyEventsUrl(eventId)}/status`;

export const buildStarPartyEventToggleRsvpUrl = (eventId) =>
  `${buildStarPartyEventsUrl(eventId)}/rsvp/toggle`;

export const getLightmapTileUrlTemplate = () => buildApiUrl("lightmap/{z}/{x}/{y}.png");
