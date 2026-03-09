import { buildRecommendationsUrl } from "./apiEndpoints";
import { readStoredToken } from "@/features/auth/authStorage";

const clean = (value) => (typeof value === "string" ? value.trim() : "");
const MAX_URLS_PER_FIELD = 20;
const MAX_URL_LENGTH = 2048;

const toList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(/[\n,]+/);
  return [];
};

const normalizeHttpUrl = (value) => {
  const raw = clean(value);
  if (!raw) return null;
  if (raw.length > MAX_URL_LENGTH) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

const cleanUrlList = (value, fieldLabel) => {
  const entries = toList(value).map(clean).filter(Boolean);
  if (entries.length > MAX_URLS_PER_FIELD) {
    throw new Error(`${fieldLabel} supports up to ${MAX_URLS_PER_FIELD} URLs.`);
  }

  const invalidEntries = [];
  const normalizedUrls = [];
  const seen = new Set();

  entries.forEach((entry) => {
    const normalized = normalizeHttpUrl(entry);
    if (!normalized) {
      invalidEntries.push(entry);
      return;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalizedUrls.push(normalized);
  });

  if (invalidEntries.length > 0) {
    throw new Error(`${fieldLabel} must contain valid http(s) URLs only.`);
  }

  return normalizedUrls;
};

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

const getAuthHeaders = () => {
  const token = String(readStoredToken() || "").trim();
  if (!token) {
    throw new Error("Admin sign-in is required for this action.");
  }
  return { Authorization: `Bearer ${token}` };
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
    photo_urls: cleanUrlList(
      location.photo_urls ?? location.photoUrls,
      "photo_urls"
    ),
    source_urls: cleanUrlList(
      location.source_urls ?? location.sourceUrls,
      "source_urls"
    ),
  };
  return payload.name ? payload : null;
};

export async function saveRecommendation({ location }) {
  const payload = buildPayload(location);
  if (!payload) return;

  const response = await fetch(buildRecommendationsUrl(), {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(await getError(response));

  const data = await response.json().catch(() => null);
  return data ?? payload;
}

export async function fetchRecommendations() {
  const response = await fetch(buildRecommendationsUrl(), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(await getError(response));

  const data = await response.json().catch(() => null);
  return parseLocations(data);
}

export async function deleteRecommendation({ spotId }) {
  if (!spotId) return;

  const response = await fetch(
    `${buildRecommendationsUrl()}/${encodeURIComponent(spotId)}`,
    {
      method: "DELETE",
      headers: {
        ...getAuthHeaders(),
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) throw new Error(await getError(response));
}
