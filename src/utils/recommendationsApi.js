import { buildRecommendationsUrl } from "./awsEndpoints";

const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeList = (value) =>
  Array.isArray(value)
    ? value
        .map((entry) => normalizeString(entry))
        .filter(Boolean)
    : [];

const buildPayload = (location) => {
  if (!location || typeof location !== "object") return null;

  const lat = Number(location.lat ?? location.latitude);
  const lon = Number(location.lng ?? location.lon ?? location.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const payload = {
    id: normalizeString(location.id) || undefined,
    name: normalizeString(location.name),
    country: normalizeString(location.country) || undefined,
    region: normalizeString(location.region) || undefined,
    type: normalizeString(location.type) || undefined,
    description: normalizeString(location.description) || undefined,
    best_time:
      normalizeString(location.best_time ?? location.bestTime) || undefined,
    coordinates: { lat, lon },
    photo_urls: normalizeList(location.photo_urls ?? location.photoUrls),
    source_urls: normalizeList(location.source_urls ?? location.sourceUrls),
  };

  if (!payload.name) return null;

  return payload;
};

export async function saveRecommendation({ location, idToken }) {
  if (!idToken) return;
  const payload = buildPayload(location);
  if (!payload) return;

  const response = await fetch(buildRecommendationsUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      message
        ? `Recommendations API error: ${message}`
        : `Recommendations API error: ${response.status}`
    );
  }

  const data = await response.json().catch(() => null);
  return data ?? payload;
}
