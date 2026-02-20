import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import usePlanets from "../../../hooks/usePlanets";
import { isProbablyHardwareAccelerated } from "../../../utils/hardwareUtils";
import { preloadAllPlanetTextures } from "../../../utils/planetUtils";
import {
  getFavoriteOnlySpots,
  getFavoriteStargazeSpots,
  getPinnedTargetState,
  getQuickActionTitles,
  getSearchPlaceholder,
} from "./mapViewDerived";
import useMapDirections from "./useMapDirections";
import useMapFavoriteTransition from "./useMapFavoriteTransition";
import useMapFavorites from "../../../features/map/useMapFavorites";
import useMapInteractions from "./useMapInteractions";
import useMapStargaze from "./useMapStargaze";
import useMapTargetToggleHandlers from "./useMapTargetToggleHandlers";
import useMapViewUiState from "./useMapViewUiState";

const useMapViewState = ({
  location,
  mapType,
  stargazeLocations = [],
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
    return prefersReducedMotion || !isProbablyHardwareAccelerated();
  }, []);

  useEffect(() => {
    preloadAllPlanetTextures();
  }, []);

  const getSpotKey = useCallback((lat, lng) => `${lat.toFixed(5)}:${lng.toFixed(5)}`, []);

  const stargaze = useMapStargaze({
    stargazeLocations,
    showRecommendedSpots,
    mapRef,
    isMobileView: ui.isMobileView,
  });

  const favorites = useMapFavorites({
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

  useMapFavoriteTransition({ placedMarker, placedMarkerRef });

  const handleToggleLightOverlay = useCallback(() => {
    onToggleLightOverlay?.(!lightOverlayEnabled);
  }, [lightOverlayEnabled, onToggleLightOverlay]);

  const handleSearchDistanceChange = useCallback(
    (value) => {
      onSearchDistanceChange?.(value);
    },
    [onSearchDistanceChange]
  );

  const targetHandlers = useMapTargetToggleHandlers({
    placedMarker,
    selectedDarkSpot,
    getSpotKey,
    setSelectedDarkSpot,
  });

  const hasPinnedSpot = Boolean(placedMarker);
  const hasAnyLocation =
    hasPinnedSpot || Boolean(location) || Boolean(selectedDarkSpot);
  const { quickPlanetsTitle, quickDarkSpotsTitle } = getQuickActionTitles({
    selectedDarkSpot,
    hasPinnedSpot,
    hasAnyLocation,
  });
  const searchPlaceholder = getSearchPlaceholder(showRecommendedSpots);

  const favoriteOnlySpots = useMemo(
    () =>
      getFavoriteOnlySpots({
        favoriteSpots: favorites.favoriteSpots,
        darkSpots,
        visibleStargazeLocations: stargaze.visibleStargazeLocations,
        placedMarker,
        getSpotKey,
      }),
    [
      darkSpots,
      favorites.favoriteSpots,
      getSpotKey,
      placedMarker,
      stargaze.visibleStargazeLocations,
    ]
  );

  const favoriteStargazeSpots = useMemo(
    () =>
      getFavoriteStargazeSpots({
        visibleStargazeLocations: stargaze.visibleStargazeLocations,
        favoriteSpotKeys: favorites.favoriteSpotKeys,
        getSpotKey,
      }),
    [favorites.favoriteSpotKeys, getSpotKey, stargaze.visibleStargazeLocations]
  );

  const isPinnedTarget = getPinnedTargetState({
    placedMarker,
    selectedDarkSpot,
    getSpotKey,
  });

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
      handleToggleDarkSpotTarget: targetHandlers.handleToggleDarkSpotTarget,
      handleTogglePinnedFavorite: favorites.handleTogglePinnedFavorite,
      handleTogglePinnedTarget: targetHandlers.handleTogglePinnedTarget,
      handleToggleStargazeTarget: targetHandlers.handleToggleStargazeTarget,
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
