import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import usePlanets from "../../../hooks/usePlanets";
import { preloadAllPlanetTextures } from "../../../utils/planetUtils";
import { isProbablyHardwareAccelerated } from "../../../utils/hardwareUtils";
import useMapDirections from "./useMapDirections";
import useMapFavorites from "./useMapFavorites";
import useMapInteractions from "./useMapInteractions";
import useMapStargaze from "./useMapStargaze";
import useMapViewUiState from "./useMapViewUiState";

const useMapViewState = ({
  location,
  mapType,
  stargazeLocations = [],
  authToken,
  directionsProvider = "google",
  showRecommendedSpots = true,
  lightOverlayEnabled = false,
  onToggleLightOverlay,
  searchDistance = 10,
  onSearchDistanceChange,
}) => {
  const mapRef = useRef(null);
  const planetPanelRef = useRef(null);
  const placedMarkerRef = useRef(null);
  const favoriteTransitionTimeoutRef = useRef(null);
  const prevPlacedFavoriteRef = useRef(false);

  const [placedMarker, setPlacedMarker] = useState(null);
  const [exitingMarker, setExitingMarker] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [darkSpots, setDarkSpots] = useState([]);
  const [selectedDarkSpot, setSelectedDarkSpot] = useState(null);
  const [latestGridShot, setLatestGridShot] = useState(null);

  const ui = useMapViewUiState();

  const {
    visiblePlanets,
    planetsLoading,
    planetsError,
    planetQuery,
    fetchPlanetsForLocation,
    clearPlanets,
  } = usePlanets();

  const reducedMotion = useMemo(() => {
    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;
    const hardwareOk = isProbablyHardwareAccelerated();
    return prefersReducedMotion || !hardwareOk;
  }, []);

  useEffect(() => {
    preloadAllPlanetTextures();
  }, []);

  useEffect(() => {
    return () => {
      if (favoriteTransitionTimeoutRef.current) {
        clearTimeout(favoriteTransitionTimeoutRef.current);
      }
    };
  }, []);

  const getSpotKey = useCallback(
    (lat, lng) => `${lat.toFixed(5)}:${lng.toFixed(5)}`,
    []
  );

  const stargaze = useMapStargaze({
    stargazeLocations,
    showRecommendedSpots,
    mapRef,
    isMobileView: ui.isMobileView,
  });

  const favorites = useMapFavorites({
    authToken,
    getSpotKey,
    placedMarker,
    setPlacedMarker,
    setSelectedDarkSpot,
  });

  const directions = useMapDirections({
    directionsProvider,
    location,
    placedMarker,
    contextMenu,
  });

  const interactions = useMapInteractions({
    mapRef,
    planetPanelRef,
    location,
    mapType,
    searchDistance,
    contextMenu,
    placedMarker,
    selectedDarkSpot,
    favoriteSpotKeys: favorites.favoriteSpotKeys,
    planetQuerySource: planetQuery?.source,
    fetchPlanetsForLocation,
    clearPlanets,
    setContextMenu,
    setPlacedMarker,
    setExitingMarker,
    setSelectedDarkSpot,
    setActiveStargazeId: stargaze.setActiveStargazeId,
    setDarkSpots,
    setLatestGridShot,
    getSpotKey,
  });

  useEffect(() => {
    const isFavorite = Boolean(placedMarker?.isFavorite);
    const hadFavorite = prevPlacedFavoriteRef.current;

    if (!placedMarker) {
      prevPlacedFavoriteRef.current = false;
      return;
    }

    if (isFavorite && !hadFavorite) {
      const marker = placedMarkerRef.current;
      const element = marker?.getElement?.();
      if (element) {
        element.classList.remove("favorite-transition");
        void element.offsetWidth;
        element.classList.add("favorite-transition");
        if (favoriteTransitionTimeoutRef.current) {
          clearTimeout(favoriteTransitionTimeoutRef.current);
        }
        favoriteTransitionTimeoutRef.current = setTimeout(() => {
          element.classList.remove("favorite-transition");
        }, 360);
      }
    }

    prevPlacedFavoriteRef.current = isFavorite;
  }, [placedMarker]);

  const handleToggleLightOverlay = useCallback(() => {
    onToggleLightOverlay?.(!lightOverlayEnabled);
  }, [lightOverlayEnabled, onToggleLightOverlay]);

  const handleSearchDistanceChange = useCallback(
    (value) => {
      onSearchDistanceChange?.(value);
    },
    [onSearchDistanceChange]
  );

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
  }, [getSpotKey, placedMarker, selectedDarkSpot]);

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
    [getSpotKey, selectedDarkSpot]
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
    [selectedDarkSpot]
  );

  const hasPinnedSpot = Boolean(placedMarker);
  const hasAnyLocation =
    hasPinnedSpot || Boolean(location) || Boolean(selectedDarkSpot);
  const selectedTargetLabel = selectedDarkSpot?.label || "stargazing spot";
  const selectedTargetLabelLower = selectedTargetLabel.toLowerCase();
  const quickPlanetsTitle = selectedDarkSpot
    ? `Visible planets from ${selectedTargetLabelLower}`
    : hasPinnedSpot
    ? "Visible planets from pinned spot"
    : hasAnyLocation
    ? "Visible planets from your location"
    : "Drop a pin or enable location";
  const quickDarkSpotsTitle = selectedDarkSpot
    ? `Find spots near the ${selectedTargetLabelLower}`
    : hasPinnedSpot
    ? "Find stargazing spots near the pin"
    : hasAnyLocation
    ? "Find stargazing spots near you"
    : "Drop a pin or enable location";
  const searchPlaceholder = showRecommendedSpots
    ? "Search coordinates or best stargazing spots"
    : "Search coordinates";
  const favoriteOnlySpots = useMemo(() => {
    if (favorites.favoriteSpots.length === 0) return [];
    const activeDarkSpotKeys = new Set(
      darkSpots.map((spot) => getSpotKey(spot.lat, spot.lon))
    );
    const stargazeKeys = new Set(
      stargaze.visibleStargazeLocations.map((spot) =>
        getSpotKey(spot.lat, spot.lng)
      )
    );
    const placedKey = placedMarker
      ? getSpotKey(placedMarker.lat, placedMarker.lng)
      : null;
    return favorites.favoriteSpots.filter((spot) => {
      if (placedKey && spot.key === placedKey) return false;
      if (activeDarkSpotKeys.has(spot.key)) return false;
      if (stargazeKeys.has(spot.key)) return false;
      return true;
    });
  }, [
    darkSpots,
    favorites.favoriteSpots,
    getSpotKey,
    placedMarker,
    stargaze.visibleStargazeLocations,
  ]);
  const favoriteStargazeSpots = useMemo(() => {
    if (
      !Array.isArray(stargaze.visibleStargazeLocations) ||
      stargaze.visibleStargazeLocations.length === 0
    ) {
      return [];
    }
    if (favorites.favoriteSpotKeys.size === 0) return [];
    return stargaze.visibleStargazeLocations.filter((spot) =>
      favorites.favoriteSpotKeys.has(getSpotKey(spot.lat, spot.lng))
    );
  }, [
    favorites.favoriteSpotKeys,
    getSpotKey,
    stargaze.visibleStargazeLocations,
  ]);

  const isPinnedTarget =
    placedMarker?.isFavorite &&
    selectedDarkSpot &&
    getSpotKey(placedMarker.lat, placedMarker.lng) ===
      getSpotKey(selectedDarkSpot.lat, selectedDarkSpot.lng);

  return {
    refs: {
      mapRef,
      planetPanelRef,
      stargazeMarkerRefs: stargaze.stargazeMarkerRefs,
      placedMarkerRef,
    },
    ui: {
      isMobileView: ui.isMobileView,
      isPopupOpen: ui.isPopupOpen,
      isSearchFocused: ui.isSearchFocused,
      isPlanetPanelOpen: ui.isPlanetPanelOpen,
      setIsPopupOpen: ui.setIsPopupOpen,
      setIsSearchFocused: ui.setIsSearchFocused,
      setIsPlanetPanelOpen: ui.setIsPlanetPanelOpen,
    },
    state: {
      placedMarker,
      exitingMarker,
      contextMenu,
      darkSpots,
      selectedDarkSpot,
      latestGridShot,
      activeStargazeId: stargaze.activeStargazeId,
      stargazePanelSpot: stargaze.stargazePanelSpot,
      isStargazePanelOpen: stargaze.isStargazePanelOpen,
    },
    derived: {
      visibleStargazeLocations: stargaze.visibleStargazeLocations,
      activeStargazeSpot: stargaze.activeStargazeSpot,
      favoriteSpotKeys: favorites.favoriteSpotKeys,
      exitingFavoriteKeySet: favorites.exitingFavoriteKeySet,
      reducedMotion,
      hasAnyLocation,
      quickPlanetsTitle,
      quickDarkSpotsTitle,
      searchPlaceholder,
      favoriteOnlySpots,
      favoriteStargazeSpots,
      isPinnedTarget,
    },
    planets: {
      visiblePlanets,
      planetsLoading,
      planetsError,
      planetQuery,
    },
    handlers: {
      setActiveStargazeId: stargaze.setActiveStargazeId,
      setSelectedDarkSpot,
      setPlacedMarker,
      setExitingMarker,
      setContextMenu,
      setDarkSpots,
      setFavoriteSpots: favorites.setFavoriteSpots,
      setStargazePanelSpot: stargaze.setStargazePanelSpot,
      setIsStargazePanelOpen: stargaze.setIsStargazePanelOpen,
      setExitingFavoriteKeys: favorites.setExitingFavoriteKeys,
      centerOnCoords: interactions.centerOnCoords,
      getSpotKey,
      openStargazePanel: stargaze.openStargazePanel,
      closeStargazePanel: stargaze.closeStargazePanel,
      handleCoordinateSearch: interactions.handleCoordinateSearch,
      handleStargazeSearch: interactions.handleStargazeSearch,
      handleCloseStargazePanel: stargaze.handleCloseStargazePanel,
      handlePopupClose: stargaze.handlePopupClose,
      handleTileLoad: interactions.handleTileLoad,
      handleSnapToLocation: interactions.handleSnapToLocation,
      handleDoubleClick: interactions.handleDoubleClick,
      handleGetVisiblePlanets: interactions.handleGetVisiblePlanets,
      handleFetchDarkSpots: interactions.handleFetchDarkSpots,
      buildDirectionsUrl: directions.buildDirectionsUrl,
      getDirectionsOrigin: directions.getDirectionsOrigin,
      handleShareLocation: directions.handleShareLocation,
      flashShareToggle: directions.flashShareToggle,
      handleGetDirections: directions.handleGetDirections,
      handleCloseContextMenu: interactions.handleCloseContextMenu,
      handleToggleDarkSpotFavorite: favorites.handleToggleDarkSpotFavorite,
      handleToggleDarkSpotTarget,
      handleTogglePinnedFavorite: favorites.handleTogglePinnedFavorite,
      handleTogglePinnedTarget,
      handleToggleStargazeTarget,
      handleRemoveFavoriteSpotAnimated:
        favorites.handleRemoveFavoriteSpotAnimated,
      handleToggleStargazeFavorite: favorites.handleToggleStargazeFavorite,
      handleToggleLightOverlay,
      handleSearchDistanceChange,
      zoomOutToMin: interactions.zoomOutToMin,
    },
  };
};

export default useMapViewState;
