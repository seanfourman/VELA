import {
  deleteFavoriteSpot,
  fetchFavoriteSpots,
  saveFavoriteSpot,
  updateFavoriteSpotName,
} from "@/utils/favoritesApi";

const toFavoriteMapItem = (item, getSpotKey) => {
  const lat = Number(item?.lat);
  const lon = Number(item?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const key = getSpotKey(lat, lon);
  return {
    key,
    lat,
    lng: lon,
    spotId: item?.spotId ?? null,
    createdAt: item?.createdAt ?? null,
    customName:
      typeof item?.customName === "string" && item.customName.trim()
        ? item.customName.trim()
        : null,
  };
};

export const loadFavoriteSpots = async (getSpotKey) => {
  const items = await fetchFavoriteSpots();
  const unique = new Map();

  items.forEach((item) => {
    const normalized = toFavoriteMapItem(item, getSpotKey);
    if (!normalized) return;
    unique.set(normalized.key, normalized);
  });

  return [...unique.values()];
};

export const saveFavorite = async (lat, lng, getSpotKey) => {
  const saved = await saveFavoriteSpot({ lat, lon: lng });
  return toFavoriteMapItem(saved, getSpotKey);
};

export const removeFavorite = async ({ lat, lng, spotId }) => {
  return deleteFavoriteSpot({ lat, lon: lng, spotId });
};

export const renameFavorite = async (
  { lat, lng, spotId, customName },
  getSpotKey,
) => {
  const updated = await updateFavoriteSpotName({
    lat,
    lon: lng,
    spotId,
    customName,
  });
  return toFavoriteMapItem(updated, getSpotKey);
};
