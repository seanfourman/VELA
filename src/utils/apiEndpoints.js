const API_BASE = "/api";

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
  if (!normalizedResource) return API_BASE;
  return joinResourceUrl(API_BASE, normalizedResource);
};

const MAPTILER_BASE = "https://api.maptiler.com";
const MAPTILER_API_KEY = "re4o7qbuIJi7iGBzGu24";

const buildMapTilerUrl = (resourcePath = "") => {
  const base = resourcePath
    ? joinResourceUrl(MAPTILER_BASE, resourcePath)
    : MAPTILER_BASE;
  return joinQuery(base, { key: MAPTILER_API_KEY });
};

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

export const buildMapTilerRasterTemplateUrl = (mapId, format) =>
  buildMapTilerUrl(`maps/${mapId}/{z}/{x}/{y}.${format}`);

export const buildMapTilerRasterUrl = (mapId, z, x, y, format) =>
  buildMapTilerUrl(`maps/${mapId}/${z}/${x}/${y}.${format}`);

export const buildMapTilerStyleUrl = (mapId = "streets-v2") =>
  buildMapTilerUrl(`maps/${mapId}/style.json`);

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

export const getLightmapTileUrlTemplate = () =>
  buildApiUrl("lightmap/{z}/{x}/{y}.png");
