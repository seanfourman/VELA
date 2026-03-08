import useMapActionHandlers from "./useMapActionHandlers";
import useMapCameraHandlers from "./useMapCameraHandlers";

const useMapInteractions = ({
  mapRef,
  planetPanelRef,
  location,
  mapType,
  searchDistance,
  contextMenu,
  placedMarker,
  selectedDarkSpot,
  favoriteSpotKeys,
  planetQuerySource,
  fetchPlanetsForLocation,
  clearPlanets,
  setContextMenu,
  setPlacedMarker,
  setExitingMarker,
  setSelectedDarkSpot,
  setActiveStargazeId,
  setDarkSpots,
  setLatestGridShot,
  getSpotKey,
}) => {
  const camera = useMapCameraHandlers({
    mapRef,
    mapType,
    favoriteSpotKeys,
    getSpotKey,
    setContextMenu,
    setSelectedDarkSpot,
    setActiveStargazeId,
    setPlacedMarker,
    setLatestGridShot,
  });

  const actions = useMapActionHandlers({
    mapRef,
    planetPanelRef,
    location,
    searchDistance,
    contextMenu,
    placedMarker,
    selectedDarkSpot,
    favoriteSpotKeys,
    planetQuerySource,
    fetchPlanetsForLocation,
    clearPlanets,
    getSpotKey,
    setContextMenu,
    setPlacedMarker,
    setExitingMarker,
    setDarkSpots,
  });

  return {
    ...camera,
    ...actions,
  };
};

export default useMapInteractions;
