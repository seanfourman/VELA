import { useCallback, useRef, useState } from "react";
import { fetchVisiblePlanets } from "../utils/planetUtils";

const getPlanetList = (data) =>
  Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

export function usePlanets() {
  const lastPlanetKey = useRef(null);
  const [visiblePlanets, setVisiblePlanets] = useState([]);
  const [planetsLoading, setPlanetsLoading] = useState(false);
  const [planetsError, setPlanetsError] = useState(null);
  const [planetQuery, setPlanetQuery] = useState(null);

  const clearPlanets = useCallback(() => {
    setVisiblePlanets([]);
    setPlanetsError(null);
    setPlanetQuery(null);
    lastPlanetKey.current = null;
  }, []);

  const fetchPlanetsForLocation = useCallback(
    async (lat, lng, label, { force = false, source = "location" } = {}) => {
      if (lat === undefined || lng === undefined) return;

      const roundedKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;
      if (!force && lastPlanetKey.current === roundedKey) {
        return;
      }

      setPlanetsLoading(true);
      setPlanetsError(null);

      try {
        const data = await fetchVisiblePlanets(lat, lng);
        if (!data) throw new Error("No visible planets data returned");

        setVisiblePlanets(getPlanetList(data));
        setPlanetQuery({ lat, lng, label, source });
        lastPlanetKey.current = roundedKey;
      } catch {
        setVisiblePlanets([]);
        setPlanetsError("Could not load visible planets right now.");
      } finally {
        setPlanetsLoading(false);
      }
    },
    []
  );

  return {
    visiblePlanets,
    planetsLoading,
    planetsError,
    planetQuery,
    fetchPlanetsForLocation,
    clearPlanets,
  };
}

export default usePlanets;
