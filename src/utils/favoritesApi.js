const FAVORITES_STORAGE_KEY = "vela:local:favorites";

const parseCoord = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const buildSpotId = (lat, lon) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return `${Number(lat).toFixed(6)},${Number(lon).toFixed(6)}`;
};

const normalizeFavoriteItem = (item) => {
  if (!item || typeof item !== "object") return null;
  const lat = parseCoord(item.lat ?? item.latitude);
  const lon = parseCoord(item.lon ?? item.lng ?? item.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    lat,
    lon,
    spotId: item.spotId ?? buildSpotId(lat, lon),
    createdAt:
      typeof item.createdAt === "string" && item.createdAt
        ? item.createdAt
        : new Date().toISOString(),
  };
};

const readFavorites = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeFavoriteItem).filter(Boolean);
  } catch {
    return [];
  }
};

const writeFavorites = (items) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage errors.
  }
};

export async function saveFavoriteSpot({ lat, lon }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  const spotId = buildSpotId(lat, lon);
  if (!spotId) return;

  const current = readFavorites();
  const exists = current.some((item) => item.spotId === spotId);
  if (exists) return;

  current.push({
    lat: Number(lat),
    lon: Number(lon),
    spotId,
    createdAt: new Date().toISOString(),
  });
  writeFavorites(current);
}

export async function deleteFavoriteSpot({ lat, lon, spotId }) {
  const resolvedSpotId =
    (typeof spotId === "string" && spotId.trim()) || buildSpotId(lat, lon);
  if (!resolvedSpotId) return;

  const current = readFavorites();
  const next = current.filter((item) => item.spotId !== resolvedSpotId);
  writeFavorites(next);
}

export async function fetchFavoriteSpots() {
  return readFavorites();
}
