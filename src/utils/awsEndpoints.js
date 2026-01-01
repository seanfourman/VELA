const AWS_ENDPOINTS = {
  visiblePlanets: import.meta.env.VITE_VISIBLE_PLANETS_URL,
  skyQuality: import.meta.env.VITE_SKY_QUALITY_URL,
  darkSpots: import.meta.env.VITE_DARK_SPOTS_URL,
};

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
  joinQuery(requireEndpoint(AWS_ENDPOINTS.visiblePlanets, "VITE_VISIBLE_PLANETS_URL"), {
    latitude: lat,
    longitude: lng,
  });

export const buildSkyQualityUrl = (lat, lon) =>
  joinQuery(requireEndpoint(AWS_ENDPOINTS.skyQuality, "VITE_SKY_QUALITY_URL"), {
    lat,
    lon,
  });

export const buildDarkSpotsUrl = (lat, lon, searchDistance) =>
  joinQuery(requireEndpoint(AWS_ENDPOINTS.darkSpots, "VITE_DARK_SPOTS_URL"), {
    lat,
    lon,
    searchDistance,
  });

export { AWS_ENDPOINTS };
