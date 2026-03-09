import { clearStoredSession, readStoredToken } from "@/features/auth/authStorage";
import { buildFavoritesUrl } from "./apiEndpoints";

const parseCoord = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildSpotId = (lat, lon) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return `${Number(lat).toFixed(6)},${Number(lon).toFixed(6)}`;
};

const getAuthToken = () => {
  const token = readStoredToken();
  return typeof token === "string" ? token.trim() : "";
};

const getResponseError = async (response) => {
  const message = (await response.text().catch(() => "")).trim();
  return message || `Favorites API error: ${response.status}`;
};

const authHeaders = () => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Sign in to save favorites.");
  }

  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export async function saveFavoriteSpot({ lat, lon }) {
  const parsedLat = parseCoord(lat);
  const parsedLon = parseCoord(lon);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)) return;

  const response = await fetch(buildFavoritesUrl(), {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      spotId: buildSpotId(parsedLat, parsedLon),
      lat: parsedLat,
      lon: parsedLon,
    }),
  });

  if (!response.ok) {
    throw new Error(await getResponseError(response));
  }
}

export async function deleteFavoriteSpot({ lat, lon, spotId }) {
  const parsedLat = parseCoord(lat);
  const parsedLon = parseCoord(lon);
  const resolvedSpotId =
    (typeof spotId === "string" && spotId.trim()) ||
    buildSpotId(parsedLat, parsedLon);
  if (!resolvedSpotId) return;

  const response = await fetch(buildFavoritesUrl(resolvedSpotId), {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (response.status === 404) return;
  if (!response.ok) {
    throw new Error(await getResponseError(response));
  }
}

export async function fetchFavoriteSpots() {
  const token = getAuthToken();
  if (!token) return [];

  const response = await fetch(buildFavoritesUrl(), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    clearStoredSession();
    return [];
  }
  if (!response.ok) {
    throw new Error(await getResponseError(response));
  }

  const data = await response.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}
