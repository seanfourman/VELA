import { useCallback } from "react";

const useMapTargetToggleHandlers = ({
  placedMarker,
  selectedDarkSpot,
  getSpotKey,
  setSelectedDarkSpot,
}) => {
  const handleTogglePinnedTarget = useCallback(() => {
    if (!placedMarker?.isFavorite) return;
    const { lat, lng } = placedMarker;
    const key = getSpotKey(lat, lng);
    const isSelected =
      selectedDarkSpot &&
      getSpotKey(selectedDarkSpot.lat, selectedDarkSpot.lng) === key;
    if (isSelected) {
      setSelectedDarkSpot(null);
      return;
    }
    setSelectedDarkSpot({ lat, lng, label: "Favorite spot" });
  }, [getSpotKey, placedMarker, selectedDarkSpot, setSelectedDarkSpot]);

  const handleToggleStargazeTarget = useCallback(
    (spot) => {
      if (!spot) return;
      const spotKey = getSpotKey(spot.lat, spot.lng);
      const isSelected =
        selectedDarkSpot &&
        getSpotKey(selectedDarkSpot.lat, selectedDarkSpot.lng) === spotKey;
      if (isSelected) {
        setSelectedDarkSpot(null);
        return;
      }
      setSelectedDarkSpot({
        lat: spot.lat,
        lng: spot.lng,
        label: spot.name || "Stargazing spot",
      });
    },
    [getSpotKey, selectedDarkSpot, setSelectedDarkSpot]
  );

  const handleToggleDarkSpotTarget = useCallback(
    (spot) => {
      if (!spot) return;
      const isSelected =
        selectedDarkSpot &&
        Math.abs(selectedDarkSpot.lat - spot.lat) < 1e-6 &&
        Math.abs(selectedDarkSpot.lng - spot.lon) < 1e-6;
      if (isSelected) {
        setSelectedDarkSpot(null);
        return;
      }
      setSelectedDarkSpot({
        lat: spot.lat,
        lng: spot.lon,
        label: "Stargazing spot",
      });
    },
    [selectedDarkSpot, setSelectedDarkSpot]
  );

  return {
    handleTogglePinnedTarget,
    handleToggleStargazeTarget,
    handleToggleDarkSpotTarget,
  };
};

export default useMapTargetToggleHandlers;
