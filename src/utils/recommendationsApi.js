import { buildRecommendationsUrl } from "./apiEndpoints";

const clean = (value) => (typeof value === "string" ? value.trim() : "");
const cleanList = (value) =>
  Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
const withAuth = (idToken, headers = {}) =>
  idToken ? { ...headers, Authorization: `Bearer ${idToken}` } : headers;

const getError = async (response) => {
  const message = (await response.text().catch(() => "")).trim();
  return message
    ? `Recommendations API error: ${message}`
    : `Recommendations API error: ${response.status}`;
};

const parseLocations = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.recommendations)) return data.recommendations;
  return [];
};

const buildPayload = (location) => {
  if (!location || typeof location !== "object") return null;

  const lat = Number(location.lat ?? location.latitude);
  const lon = Number(location.lng ?? location.lon ?? location.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const payload = {
    id: clean(location.id) || undefined,
    name: clean(location.name),
    country: clean(location.country) || undefined,
    region: clean(location.region) || undefined,
    type: clean(location.type) || undefined,
    description: clean(location.description) || undefined,
    best_time: clean(location.best_time ?? location.bestTime) || undefined,
    coordinates: { lat, lon },
    photo_urls: cleanList(location.photo_urls ?? location.photoUrls),
    source_urls: cleanList(location.source_urls ?? location.sourceUrls),
  };
  return payload.name ? payload : null;
};

export async function saveRecommendation({ location, idToken }) {
  const payload = buildPayload(location);
  if (!payload) return;

  const response = await fetch(buildRecommendationsUrl(), {
    method: "POST",
    headers: withAuth(idToken, { "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(await getError(response));

  const data = await response.json().catch(() => null);
  return data ?? payload;
}

export async function fetchRecommendations({ idToken } = {}) {
  const response = await fetch(buildRecommendationsUrl(), {
    headers: withAuth(idToken, { Accept: "application/json" }),
  });
  if (!response.ok) throw new Error(await getError(response));

  const data = await response.json().catch(() => null);
  return parseLocations(data);
}

export async function deleteRecommendation({ spotId, idToken }) {
  if (!spotId) return;

  const response = await fetch(
    `${buildRecommendationsUrl()}/${encodeURIComponent(spotId)}`,
    {
      method: "DELETE",
      headers: withAuth(idToken, { Accept: "application/json" }),
    }
  );

  if (!response.ok) throw new Error(await getError(response));
}
