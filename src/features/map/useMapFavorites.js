import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import showPopup from "@/utils/popup";
import { FAVORITE_EXIT_MS } from "@/pages/Map/MapView/mapConstants";
import {
  loadFavoriteSpots,
  removeFavorite,
  saveFavorite,
} from "./favoritesStorage";

const useMapFavorites = ({
  getSpotKey,
  placedMarker,
  setPlacedMarker,
  setSelectedDarkSpot,
}) => {
  const [favoriteSpots, setFavoriteSpots] = useState([]);
  const [exitingFavoriteKeys, setExitingFavoriteKeys] = useState([]);
  const favoriteRemovalTimeoutsRef = useRef(new Map());

  const favoriteSpotKeys = useMemo(
    () => new Set(favoriteSpots.map((spot) => spot.key)),
    [favoriteSpots],
  );
  const exitingFavoriteKeySet = useMemo(
    () => new Set(exitingFavoriteKeys),
    [exitingFavoriteKeys],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const items = await loadFavoriteSpots(getSpotKey);
        if (cancelled) return;
        setFavoriteSpots(items);
      } catch (error) {
        if (cancelled) return;
        showPopup(
          error instanceof Error
            ? error.message
            : "Could not load favorites right now.",
          "failure",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getSpotKey]);

  useEffect(() => {
    const removalTimeouts = favoriteRemovalTimeoutsRef.current;
    return () => {
      removalTimeouts.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      removalTimeouts.clear();
    };
  }, []);

  useEffect(() => {
    if (!placedMarker) return;
    const isFavorite = favoriteSpotKeys.has(
      getSpotKey(placedMarker.lat, placedMarker.lng),
    );
    if (placedMarker.isFavorite === isFavorite) return;
    setPlacedMarker((prev) => {
      if (!prev) return prev;
      return { ...prev, isFavorite };
    });
  }, [favoriteSpotKeys, getSpotKey, placedMarker, setPlacedMarker]);

  const persistFavoriteSpot = useCallback(
    async (lat, lng) => {
      try {
        await saveFavorite(lat, lng);
      } catch (error) {
        showPopup(
          error instanceof Error
            ? error.message
            : "Could not save favorite right now.",
          "failure",
        );
      }
    },
    [],
  );

  const persistRemoveFavoriteSpot = useCallback(
    async ({ lat, lng, spotId }) => {
      try {
        await removeFavorite({ lat, lng, spotId });
      } catch (error) {
        showPopup(
          error instanceof Error
            ? error.message
            : "Could not remove favorite right now.",
          "failure",
        );
      }
    },
    [],
  );

  const handleToggleDarkSpotFavorite = useCallback(
    (spot) => {
      if (!spot) return;
      const key = getSpotKey(spot.lat, spot.lon);
      const isFavorite = favoriteSpotKeys.has(key);
      setFavoriteSpots((prev) => {
        const exists = prev.some((item) => item.key === key);
        if (exists) {
          return prev.filter((item) => item.key !== key);
        }
        return [...prev, { key, lat: spot.lat, lng: spot.lon }];
      });
      if (isFavorite) {
        persistRemoveFavoriteSpot({ lat: spot.lat, lng: spot.lon });
      } else {
        persistFavoriteSpot(spot.lat, spot.lon);
      }
    },
    [
      favoriteSpotKeys,
      getSpotKey,
      persistFavoriteSpot,
      persistRemoveFavoriteSpot,
    ],
  );

  const handleRemoveFavoriteSpot = useCallback(
    (spotKey) => {
      if (!spotKey) return;
      const existing = favoriteSpots.find((item) => item.key === spotKey);
      if (existing) {
        persistRemoveFavoriteSpot({
          lat: existing.lat,
          lng: existing.lng,
          spotId: existing.spotId,
        });
      }
      setFavoriteSpots((prev) => prev.filter((item) => item.key !== spotKey));
      setSelectedDarkSpot((prev) => {
        if (!prev) return prev;
        const currentKey = getSpotKey(prev.lat, prev.lng);
        if (currentKey !== spotKey) return prev;
        return null;
      });
      setPlacedMarker((prev) => {
        if (!prev) return prev;
        const currentKey = getSpotKey(prev.lat, prev.lng);
        if (currentKey !== spotKey) return prev;
        return { ...prev, isFavorite: false };
      });
    },
    [
      favoriteSpots,
      getSpotKey,
      persistRemoveFavoriteSpot,
      setPlacedMarker,
      setSelectedDarkSpot,
    ],
  );

  const handleRemoveFavoriteSpotAnimated = useCallback(
    (spotKey) => {
      if (!spotKey) return;
      if (favoriteRemovalTimeoutsRef.current.has(spotKey)) return;

      setSelectedDarkSpot((prev) => {
        if (!prev) return prev;
        const currentKey = getSpotKey(prev.lat, prev.lng);
        if (currentKey !== spotKey) return prev;
        return null;
      });
      setExitingFavoriteKeys((prev) =>
        prev.includes(spotKey) ? prev : [...prev, spotKey],
      );

      const timeoutId = setTimeout(() => {
        favoriteRemovalTimeoutsRef.current.delete(spotKey);
        setExitingFavoriteKeys((prev) => prev.filter((key) => key !== spotKey));
        handleRemoveFavoriteSpot(spotKey);
      }, FAVORITE_EXIT_MS);

      favoriteRemovalTimeoutsRef.current.set(spotKey, timeoutId);
    },
    [getSpotKey, handleRemoveFavoriteSpot, setSelectedDarkSpot],
  );

  const handleToggleStargazeFavorite = useCallback(
    (spot) => {
      if (!spot) return;
      const key = getSpotKey(spot.lat, spot.lng);
      const isFavorite = favoriteSpotKeys.has(key);
      if (isFavorite) {
        handleRemoveFavoriteSpotAnimated(key);
        return;
      }
      setFavoriteSpots((prev) => [
        ...prev,
        { key, lat: spot.lat, lng: spot.lng },
      ]);
      persistFavoriteSpot(spot.lat, spot.lng);
    },
    [
      favoriteSpotKeys,
      getSpotKey,
      handleRemoveFavoriteSpotAnimated,
      persistFavoriteSpot,
    ],
  );

  const handleTogglePinnedFavorite = useCallback(() => {
    if (!placedMarker) return;
    const { lat, lng } = placedMarker;
    const key = getSpotKey(lat, lng);
    const isCurrentlyFavorite = favoriteSpotKeys.has(key);
    setFavoriteSpots((prev) => {
      const exists = prev.some((item) => item.key === key);
      if (exists) {
        return prev.filter((item) => item.key !== key);
      }
      return [...prev, { key, lat, lng }];
    });
    if (isCurrentlyFavorite) {
      persistRemoveFavoriteSpot({ lat, lng });
      setSelectedDarkSpot((prev) => {
        if (!prev) return prev;
        const currentKey = getSpotKey(prev.lat, prev.lng);
        if (currentKey !== key) return prev;
        return null;
      });
    } else {
      setSelectedDarkSpot({ lat, lng, label: "Favorite spot" });
      persistFavoriteSpot(lat, lng);
    }
    setPlacedMarker((prev) => {
      if (!prev) return prev;
      return { ...prev, isFavorite: !prev.isFavorite };
    });
  }, [
    favoriteSpotKeys,
    getSpotKey,
    placedMarker,
    persistFavoriteSpot,
    persistRemoveFavoriteSpot,
    setPlacedMarker,
    setSelectedDarkSpot,
  ]);

  return {
    favoriteSpots,
    setFavoriteSpots,
    favoriteSpotKeys,
    exitingFavoriteKeys,
    setExitingFavoriteKeys,
    exitingFavoriteKeySet,
    handleToggleDarkSpotFavorite,
    handleTogglePinnedFavorite,
    handleToggleStargazeFavorite,
    handleRemoveFavoriteSpotAnimated,
  };
};

export default useMapFavorites;
