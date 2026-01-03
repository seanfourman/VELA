import { buildFavoritesUrl } from "./awsEndpoints";

const parseCoord = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseSpotId = (spotId) => {
  if (!spotId) return null;
  const [latRaw, lonRaw] = String(spotId).split(",");
  const lat = parseCoord(latRaw);
  const lon = parseCoord(lonRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
};

const normalizeFavoriteItem = (item) => {
  if (!item || typeof item !== "object") return null;

  let lat = parseCoord(item.lat ?? item.latitude);
  let lon = parseCoord(item.lon ?? item.lng ?? item.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    const parsed = parseSpotId(item.spotId);
    if (parsed) {
      lat = parsed.lat;
      lon = parsed.lon;
    }
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    lat,
    lon,
    spotId: item.spotId ?? null,
    createdAt: item.createdAt ?? null,
  };
};

export async function saveFavoriteSpot({ lat, lon, idToken }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  if (!idToken) return;

  const response = await fetch(buildFavoritesUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ lat, lon }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      message
        ? `Favorite API error: ${message}`
        : `Favorite API error: ${response.status}`
    );
  }
}

export const buildSpotId = (lat, lon) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return `${Number(lat).toFixed(6)},${Number(lon).toFixed(6)}`;
};

export async function deleteFavoriteSpot({ lat, lon, spotId, idToken }) {
  if (!idToken) return;
  const resolvedSpotId = spotId || buildSpotId(lat, lon);
  if (!resolvedSpotId) return;

  const response = await fetch(
    `${buildFavoritesUrl()}/${encodeURIComponent(resolvedSpotId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${idToken}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      message
        ? `Favorite API error: ${message}`
        : `Favorite API error: ${response.status}`
    );
  }
}

export async function fetchFavoriteSpots({ idToken }) {
  if (!idToken) return [];

  const response = await fetch(buildFavoritesUrl(), {
    headers: {
      Authorization: `Bearer ${idToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      message
        ? `Favorite API error: ${message}`
        : `Favorite API error: ${response.status}`
    );
  }

  const data = await response.json().catch(() => null);
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.Items)
    ? data.Items
    : [];

  return items.map(normalizeFavoriteItem).filter(Boolean);
}
