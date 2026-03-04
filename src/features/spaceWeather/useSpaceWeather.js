import { useCallback, useMemo, useRef, useState } from "react";
import { classifyKpIndex } from "./spaceWeatherModel";
import { fetchSpaceWeatherSnapshot } from "@/utils/spaceWeatherApi";

const STALE_MS = 15 * 60 * 1000;

const getErrorMessage = (error) => {
  if (error instanceof Error && error.message) return error.message;
  return "Could not load space weather data";
};

const useSpaceWeather = () => {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const loadedAtRef = useRef(0);
  const activeRequestRef = useRef(null);

  const requestSnapshot = useCallback(
    async ({ force = false } = {}) => {
      const now = Date.now();
      const isFresh =
        !force &&
        snapshot &&
        loadedAtRef.current > 0 &&
        now - loadedAtRef.current < STALE_MS;
      if (isFresh) return snapshot;

      if (activeRequestRef.current) return activeRequestRef.current;

      setLoading(true);
      const request = fetchSpaceWeatherSnapshot({ force })
        .then((nextSnapshot) => {
          setSnapshot(nextSnapshot);
          setError("");
          loadedAtRef.current = Date.now();
          return nextSnapshot;
        })
        .catch((requestError) => {
          const message = getErrorMessage(requestError);
          setError(message);
          throw requestError;
        })
        .finally(() => {
          setLoading(false);
          activeRequestRef.current = null;
        });

      activeRequestRef.current = request;
      return request;
    },
    [snapshot],
  );

  const ensureLoaded = useCallback(
    () => requestSnapshot({ force: false }).catch(() => null),
    [requestSnapshot],
  );

  const refresh = useCallback(
    () => requestSnapshot({ force: true }).catch(() => null),
    [requestSnapshot],
  );

  const quickTitle = useMemo(() => {
    if (loading && !snapshot) return "Loading space weather";
    if (error && !snapshot) return "Space weather unavailable";

    const latestKp = snapshot?.stats?.latestKp;
    if (typeof latestKp === "number" && Number.isFinite(latestKp)) {
      const category = classifyKpIndex(latestKp);
      return `${category.shortLabel} - Kp ${latestKp.toFixed(1)}`;
    }

    return "Space weather outlook";
  }, [error, loading, snapshot]);

  return {
    snapshot,
    loading,
    error,
    quickTitle,
    ensureLoaded,
    refresh,
  };
};

export default useSpaceWeather;
