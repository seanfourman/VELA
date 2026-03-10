import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import showNotification from "@/utils/notifications";
import { FAVORITE_EXIT_MS } from "@/pages/Map/MapView/core/mapConfig";
import {
  loadFavoriteSpots,
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

      const optimisticSpot = buildFavoriteSpot(spot.lat, spot.lon);
      setFavoriteSpots((prev) => upsertFavoriteSpot(prev, optimisticSpot));
      triggerFavoriteEntry(key);

      try {
        const saved = await persistFavoriteSpot(spot.lat, spot.lon);
        commitSavedFavorite(saved ?? optimisticSpot);
      } catch (error) {
        clearFavoriteEntry(key);
        setFavoriteSpots((prev) => prev.filter((item) => item.key !== key));
        reportFavoriteError(error, "Could not save favorite right now");
      }
    },
    [
      buildFavoriteSpot,
      clearFavoriteEntry,
      commitSavedFavorite,
      favoriteSpotKeys,
      getSpotKey,
      handleRemoveFavoriteSpot,
      persistFavoriteSpot,
      reportFavoriteError,
      triggerFavoriteEntry,
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

      const optimisticSpot = buildFavoriteSpot(spot.lat, spot.lng);
      setFavoriteSpots((prev) => upsertFavoriteSpot(prev, optimisticSpot));
      triggerFavoriteEntry(key);

      try {
        const saved = await persistFavoriteSpot(spot.lat, spot.lng);
        commitSavedFavorite(saved ?? optimisticSpot);
      } catch (error) {
        clearFavoriteEntry(key);
        setFavoriteSpots((prev) => prev.filter((item) => item.key !== key));
        reportFavoriteError(error, "Could not save favorite right now");
      }
    },
    [
      buildFavoriteSpot,
      clearFavoriteEntry,
      commitSavedFavorite,
      favoriteSpotKeys,
      getSpotKey,
      handleRemoveFavoriteSpotAnimated,
      persistFavoriteSpot,
      reportFavoriteError,
      triggerFavoriteEntry,
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

    const optimisticSpot = buildFavoriteSpot(lat, lng);
    setFavoriteSpots((prev) => upsertFavoriteSpot(prev, optimisticSpot));
    triggerFavoriteEntry(key);
    setPlacedMarkerFavoriteState(key, true);
    setSelectedDarkSpot({ lat, lng, label: "Favorite spot" });

    try {
      const saved = await persistFavoriteSpot(lat, lng);
      commitSavedFavorite(saved ?? optimisticSpot);
    } catch (error) {
      clearFavoriteEntry(key);
      setFavoriteSpots((prev) => prev.filter((item) => item.key !== key));
      setPlacedMarkerFavoriteState(key, false);
      restoreSelectedTarget(
        key,
        selectionMatchesPinned ? previousSelection : null,
      );
      if (existing) {
        restoreFavoriteLocally(existing, previousSelection);
      }
      reportFavoriteError(error, "Could not save favorite right now");
    }
  }, [
    buildFavoriteSpot,
    clearFavoriteEntry,
    commitSavedFavorite,
    favoriteSpotKeys,
    favoriteSpots,
    getSpotKey,
    handleRemoveFavoriteSpot,
    persistFavoriteSpot,
    placedMarker,
    reportFavoriteError,
    restoreFavoriteLocally,
    restoreSelectedTarget,
    selectedDarkSpot,
    setPlacedMarkerFavoriteState,
    setSelectedDarkSpot,
    triggerFavoriteEntry,
  ]);

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
  };
};

export default useMapFavorites;
