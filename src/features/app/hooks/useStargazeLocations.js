import { useCallback, useEffect, useState } from "react";
import showNotification from "@/utils/notifications";
import { fetchRecommendations } from "@/utils/recommendationsApi";
import {
  normalizeStargazeLocation,
  normalizeStargazePayload,
} from "@/utils/appState";

export const useStargazeLocations = () => {
  const [stargazeLocations, setStargazeLocations] = useState([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchRecommendations();
        const normalized = normalizeStargazePayload(data);
        if (cancelled) return;
        setStargazeLocations(normalized);
      } catch (error) {
        if (cancelled) return;
        showNotification(
          error instanceof Error
            ? error.message
            : "Could not load recommended spots right now",
          "failure",
          { duration: 4500 },
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveStargazeLocation = useCallback((location) => {
    const normalized = normalizeStargazeLocation(location);
    if (!normalized) return;

    setStargazeLocations((prev) => {
      const exists = prev.some((item) => item.id === normalized.id);
      return exists
        ? prev.map((item) => (item.id === normalized.id ? normalized : item))
        : [...prev, normalized];
    });
  }, []);

  const handleDeleteStargazeLocation = useCallback((id) => {
    setStargazeLocations((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    stargazeLocations,
    handleSaveStargazeLocation,
    handleDeleteStargazeLocation,
  };
};


