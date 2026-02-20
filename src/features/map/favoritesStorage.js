import {
  deleteFavoriteSpot,
  fetchFavoriteSpots,
  saveFavoriteSpot,
} from "@/utils/favoritesApi";

export const loadFavoriteSpots = async (getSpotKey) => {
  const items = await fetchFavoriteSpots();
  const unique = new Map();

  items.forEach((item) => {
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const key = getSpotKey(lat, lon);
    unique.set(key, {
      key,
      lat,
      lng: lon,
      spotId: item.spotId ?? null,
      createdAt: item.createdAt ?? null,
    });
  });

  return [...unique.values()];
};

export const saveFavorite = async (lat, lng) => {
  await saveFavoriteSpot({ lat, lon: lng });
};

export const removeFavorite = async ({ lat, lng, spotId }) => {
  await deleteFavoriteSpot({ lat, lon: lng, spotId });
};
