import { useCallback, useState } from "react";

export default function useMapSpaceWeatherPanel({
  ensureSpaceWeatherLoaded,
  closeStargazePanel,
}) {
  const [isSpaceWeatherOpen, setIsSpaceWeatherOpen] = useState(false);
  const [spaceWeatherFocus, setSpaceWeatherFocus] = useState(null);

  const handleOpenSpaceWeatherAt = useCallback(
    (coords, label) => {
      if (
        !coords ||
        typeof coords.lat !== "number" ||
        !Number.isFinite(coords.lat) ||
        typeof coords.lng !== "number" ||
        !Number.isFinite(coords.lng)
      ) {
        return;
      }

      setSpaceWeatherFocus({
        lat: coords.lat,
        lng: coords.lng,
        label: typeof label === "string" ? label : "Selected location",
      });
      ensureSpaceWeatherLoaded();
      closeStargazePanel?.();
      setIsSpaceWeatherOpen(true);
    },
    [closeStargazePanel, ensureSpaceWeatherLoaded],
  );

  const handleCloseSpaceWeather = useCallback(() => {
    setIsSpaceWeatherOpen(false);
  }, []);

  return {
    isSpaceWeatherOpen,
    spaceWeatherFocus,
    handleOpenSpaceWeatherAt,
    handleCloseSpaceWeather,
  };
}
