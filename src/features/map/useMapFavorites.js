import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import showNotification from "@/utils/notifications";
import { FAVORITE_EXIT_MS } from "@/pages/Map/MapView/core/mapConfig";
import {
  loadFavoriteSpots,
  renameFavorite,
  removeFavorite,
  saveFavorite,
} from "./favoritesStorage";

const upsertFavoriteSpot = (collection, nextSpot) => {
  const exists = collection.some((item) => item.key === nextSpot.key);
  if (!exists) {
    return [...collection, nextSpot];
  }

  return collection.map((item) =>
    item.key === nextSpot.key ? { ...item, ...nextSpot } : item,
  );
};

const FAVORITE_ENTRY_MS = 360;
const MAX_CUSTOM_NAME_LENGTH = 120;

const normalizeCustomFavoriteName = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_CUSTOM_NAME_LENGTH);
};

const useMapFavorites = ({
  getSpotKey,
  placedMarker,
  selectedDarkSpot,
  setPlacedMarker,
  setSelectedDarkSpot,
}) => {
  const [favoriteSpots, setFavoriteSpots] = useState([]);
  const [enteringFavoriteKeys, setEnteringFavoriteKeys] = useState([]);
  const [exitingFavoriteKeys, setExitingFavoriteKeys] = useState([]);
  const favoriteEntryTimeoutsRef = useRef(new Map());
  const favoriteRemovalTimeoutsRef = useRef(new Map());

  const favoriteSpotKeys = useMemo(
    () => new Set(favoriteSpots.map((spot) => spot.key)),
    [favoriteSpots],
  );
  const exitingFavoriteKeySet = useMemo(
    () => new Set(exitingFavoriteKeys),
    [exitingFavoriteKeys],
  );
  const enteringFavoriteKeySet = useMemo(
    () => new Set(enteringFavoriteKeys),
    [enteringFavoriteKeys],
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
        showNotification(
          error instanceof Error
            ? error.message
            : "Could not load favorites right now",
          "failure",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getSpotKey]);

  useEffect(() => {
    const entryTimeouts = favoriteEntryTimeoutsRef.current;
    const removalTimeouts = favoriteRemovalTimeoutsRef.current;
    return () => {
      entryTimeouts.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      entryTimeouts.clear();
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

  const buildFavoriteSpot = useCallback(
    (lat, lng, extras = {}) => ({
      key: getSpotKey(lat, lng),
      lat,
      lng,
      spotId: extras.spotId ?? null,
      createdAt: extras.createdAt ?? null,
      customName: normalizeCustomFavoriteName(extras.customName),
    }),
    [getSpotKey],
  );

  const reportFavoriteError = useCallback((error, fallback) => {
    showNotification(
      error instanceof Error ? error.message : fallback,
      "failure",
    );
  }, []);

  const clearFavoriteEntry = useCallback((spotKey) => {
    if (!spotKey) return;
    const entryTimeouts = favoriteEntryTimeoutsRef.current;
    const timeoutId = entryTimeouts.get(spotKey);
    if (timeoutId) {
      clearTimeout(timeoutId);
      entryTimeouts.delete(spotKey);
    }
    setEnteringFavoriteKeys((prev) => prev.filter((key) => key !== spotKey));
  }, []);

  const triggerFavoriteEntry = useCallback((spotKey) => {
    if (!spotKey) return;
    clearFavoriteEntry(spotKey);
    setEnteringFavoriteKeys((prev) =>
      prev.includes(spotKey) ? prev : [...prev, spotKey],
    );
    const timeoutId = setTimeout(() => {
      favoriteEntryTimeoutsRef.current.delete(spotKey);
      setEnteringFavoriteKeys((prev) => prev.filter((key) => key !== spotKey));
    }, FAVORITE_ENTRY_MS);
    favoriteEntryTimeoutsRef.current.set(spotKey, timeoutId);
  }, [clearFavoriteEntry]);

  const persistFavoriteSpot = useCallback(
    async (lat, lng) => {
      return saveFavorite(lat, lng, getSpotKey);
    },
    [getSpotKey],
  );

  const persistRemoveFavoriteSpot = useCallback(async ({ lat, lng, spotId }) => {
    return removeFavorite({ lat, lng, spotId });
  }, []);

  const persistRenameFavoriteSpot = useCallback(
    async ({ lat, lng, spotId, customName }) => {
      return renameFavorite(
        {
          lat,
          lng,
          spotId,
          customName,
        },
        getSpotKey,
      );
    },
    [getSpotKey],
  );

  const setPlacedMarkerFavoriteState = useCallback(
    (spotKey, isFavorite) => {
      setPlacedMarker((prev) => {
        if (!prev) return prev;
        const currentKey = getSpotKey(prev.lat, prev.lng);
        if (currentKey !== spotKey || prev.isFavorite === isFavorite) {
          return prev;
        }
        return { ...prev, isFavorite };
      });
    },
    [getSpotKey, setPlacedMarker],
  );

  const restoreSelectedTarget = useCallback(
    (spotKey, nextSelection) => {
      setSelectedDarkSpot((prev) => {
        if (!nextSelection) {
          if (!prev) return prev;
          const currentKey = getSpotKey(prev.lat, prev.lng);
          return currentKey === spotKey ? null : prev;
        }

        if (prev) {
          const currentKey = getSpotKey(prev.lat, prev.lng);
          if (currentKey !== spotKey) return prev;
        }

        return nextSelection;
      });
    },
    [getSpotKey, setSelectedDarkSpot],
  );

  const removeFavoriteLocally = useCallback(
    (spotKey) => {
      setFavoriteSpots((prev) => prev.filter((item) => item.key !== spotKey));
      restoreSelectedTarget(spotKey, null);
      setPlacedMarkerFavoriteState(spotKey, false);
    },
    [restoreSelectedTarget, setPlacedMarkerFavoriteState],
  );

  const restoreFavoriteLocally = useCallback(
    (favoriteSpot, selectionToRestore = null) => {
      if (!favoriteSpot) return;
      setFavoriteSpots((prev) => upsertFavoriteSpot(prev, favoriteSpot));
      setPlacedMarkerFavoriteState(favoriteSpot.key, true);
      restoreSelectedTarget(favoriteSpot.key, selectionToRestore);
    },
    [restoreSelectedTarget, setPlacedMarkerFavoriteState],
  );

  const commitSavedFavorite = useCallback((favoriteSpot) => {
    if (!favoriteSpot) return;
    setFavoriteSpots((prev) => {
      const exists = prev.some((item) => item.key === favoriteSpot.key);
      return exists ? upsertFavoriteSpot(prev, favoriteSpot) : prev;
    });
  }, []);

  const addFavoriteSpot = useCallback(
    async ({
      lat,
      lng,
      onOptimisticAdd,
      onRollback,
      errorMessage = "Could not save favorite right now",
    }) => {
      const optimisticSpot = buildFavoriteSpot(lat, lng);
      const { key } = optimisticSpot;

      setFavoriteSpots((prev) => upsertFavoriteSpot(prev, optimisticSpot));
      triggerFavoriteEntry(key);
      onOptimisticAdd?.(optimisticSpot);

      try {
        const saved = await persistFavoriteSpot(lat, lng);
        commitSavedFavorite(saved ?? optimisticSpot);
        return saved ?? optimisticSpot;
      } catch (error) {
        clearFavoriteEntry(key);
        setFavoriteSpots((prev) => prev.filter((item) => item.key !== key));
        onRollback?.(optimisticSpot);
        reportFavoriteError(error, errorMessage);
        return null;
      }
    },
    [
      buildFavoriteSpot,
      clearFavoriteEntry,
      commitSavedFavorite,
      persistFavoriteSpot,
      reportFavoriteError,
      triggerFavoriteEntry,
    ],
  );

  const handleRemoveFavoriteSpot = useCallback(
    async (spotKey) => {
      if (!spotKey) return;
      const existing = favoriteSpots.find((item) => item.key === spotKey);
      if (!existing) return;

      const selectionToRestore =
        selectedDarkSpot &&
        getSpotKey(selectedDarkSpot.lat, selectedDarkSpot.lng) === spotKey
          ? selectedDarkSpot
          : null;

      clearFavoriteEntry(spotKey);
      removeFavoriteLocally(spotKey);

      try {
        await persistRemoveFavoriteSpot({
          lat: existing.lat,
          lng: existing.lng,
          spotId: existing.spotId,
        });
      } catch (error) {
        restoreFavoriteLocally(existing, selectionToRestore);
        reportFavoriteError(error, "Could not remove favorite right now");
      }
    },
    [
      favoriteSpots,
      clearFavoriteEntry,
      getSpotKey,
      persistRemoveFavoriteSpot,
      removeFavoriteLocally,
      reportFavoriteError,
      restoreFavoriteLocally,
      selectedDarkSpot,
    ],
  );

  const handleToggleDarkSpotFavorite = useCallback(
    async (spot) => {
      if (!spot) return;
      const key = getSpotKey(spot.lat, spot.lon);
      const isFavorite = favoriteSpotKeys.has(key);

      if (isFavorite) {
        await handleRemoveFavoriteSpot(key);
        return;
      }

      await addFavoriteSpot({ lat: spot.lat, lng: spot.lon });
    },
    [
      addFavoriteSpot,
      favoriteSpotKeys,
      getSpotKey,
      handleRemoveFavoriteSpot,
    ],
  );

  const handleRemoveFavoriteSpotAnimated = useCallback(
    (spotKey) => {
      if (!spotKey) return;
      if (favoriteRemovalTimeoutsRef.current.has(spotKey)) return;

      setExitingFavoriteKeys((prev) =>
        prev.includes(spotKey) ? prev : [...prev, spotKey],
      );

      const timeoutId = setTimeout(() => {
        favoriteRemovalTimeoutsRef.current.delete(spotKey);
        setExitingFavoriteKeys((prev) => prev.filter((key) => key !== spotKey));
        void handleRemoveFavoriteSpot(spotKey);
      }, FAVORITE_EXIT_MS);

      favoriteRemovalTimeoutsRef.current.set(spotKey, timeoutId);
    },
    [handleRemoveFavoriteSpot],
  );

  const handleToggleStargazeFavorite = useCallback(
    async (spot) => {
      if (!spot) return;
      const key = getSpotKey(spot.lat, spot.lng);
      const isFavorite = favoriteSpotKeys.has(key);
      if (isFavorite) {
        handleRemoveFavoriteSpotAnimated(key);
        return;
      }

      await addFavoriteSpot({ lat: spot.lat, lng: spot.lng });
    },
    [
      addFavoriteSpot,
      favoriteSpotKeys,
      getSpotKey,
      handleRemoveFavoriteSpotAnimated,
    ],
  );

  const handleTogglePinnedFavorite = useCallback(async () => {
    if (!placedMarker) return;

    const { lat, lng } = placedMarker;
    const key = getSpotKey(lat, lng);
    const isCurrentlyFavorite = favoriteSpotKeys.has(key);
    const existing = favoriteSpots.find((item) => item.key === key) || null;
    const previousSelection = selectedDarkSpot;
    const selectionMatchesPinned =
      previousSelection &&
      getSpotKey(previousSelection.lat, previousSelection.lng) === key;

    if (isCurrentlyFavorite) {
      await handleRemoveFavoriteSpot(key);
      return;
    }

    await addFavoriteSpot({
      lat,
      lng,
      onOptimisticAdd: (optimisticSpot) => {
        setPlacedMarkerFavoriteState(optimisticSpot.key, true);
        setSelectedDarkSpot({ lat, lng, label: "Favorite spot" });
      },
      onRollback: (optimisticSpot) => {
        setPlacedMarkerFavoriteState(optimisticSpot.key, false);
        restoreSelectedTarget(
          optimisticSpot.key,
          selectionMatchesPinned ? previousSelection : null,
        );
        if (existing) {
          restoreFavoriteLocally(existing, previousSelection);
        }
      },
    });
  }, [
    addFavoriteSpot,
    favoriteSpotKeys,
    favoriteSpots,
    getSpotKey,
    handleRemoveFavoriteSpot,
    placedMarker,
    restoreFavoriteLocally,
    restoreSelectedTarget,
    selectedDarkSpot,
    setPlacedMarkerFavoriteState,
    setSelectedDarkSpot,
  ]);

  const handleRenameFavoriteSpot = useCallback(
    async (favoriteSpot, nextCustomName) => {
      if (!favoriteSpot?.key) return null;

      const normalizedName = normalizeCustomFavoriteName(nextCustomName);
      const previousCustomName = normalizeCustomFavoriteName(
        favoriteSpot.customName,
      );

      if (normalizedName === previousCustomName) {
        return favoriteSpot;
      }

      const optimisticSpot = {
        ...favoriteSpot,
        customName: normalizedName,
      };

      setFavoriteSpots((prev) => upsertFavoriteSpot(prev, optimisticSpot));

      try {
        const saved = await persistRenameFavoriteSpot({
          lat: favoriteSpot.lat,
          lng: favoriteSpot.lng,
          spotId: favoriteSpot.spotId,
          customName: normalizedName,
        });
        const resolvedSpot = saved ?? optimisticSpot;
        setFavoriteSpots((prev) => upsertFavoriteSpot(prev, resolvedSpot));
        showNotification(
          normalizedName ? "Favorite name saved" : "Favorite name cleared",
          "success",
          { duration: 1800 },
        );
        return resolvedSpot;
      } catch (error) {
        setFavoriteSpots((prev) =>
          upsertFavoriteSpot(prev, {
            ...favoriteSpot,
            customName: previousCustomName,
          }),
        );
        reportFavoriteError(error, "Could not save favorite name right now");
        return null;
      }
    },
    [persistRenameFavoriteSpot, reportFavoriteError],
  );

  return {
    favoriteSpots,
    setFavoriteSpots,
    favoriteSpotKeys,
    enteringFavoriteKeySet,
    exitingFavoriteKeys,
    setExitingFavoriteKeys,
    exitingFavoriteKeySet,
    handleToggleDarkSpotFavorite,
    handleTogglePinnedFavorite,
    handleToggleStargazeFavorite,
    handleRemoveFavoriteSpotAnimated,
    handleRenameFavoriteSpot,
  };
};

export default useMapFavorites;
