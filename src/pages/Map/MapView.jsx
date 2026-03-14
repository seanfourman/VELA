import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import "leaflet/dist/leaflet.css";
import "./MapView/styles/map-layout.css";
import "./MapView/styles/leaflet-overrides.css";
import PlanetPanelContainer from "./PlanetPanel/PlanetPanelContainer";
import MapPanels from "./MapView/components/MapPanels";
import MapViewport from "./MapView/components/MapViewport";
import MapTypeSwitcher from "./MapView/components/controls/MapTypeSwitcher";
import MapQuickActions from "./MapView/components/controls/MapQuickActions";
import LocationSearchBar from "./MapView/components/search/LocationSearchBar";
import SearchDistanceSelector from "./MapView/components/controls/SearchDistanceSelector";
import useMapEventRsvp from "./MapView/hooks/useMapEventRsvp";
import useMapSelectionEffects from "./MapView/hooks/useMapSelectionEffects";
import useMapViewState from "./MapView/hooks/useMapViewState";
import useZoomMarkerVisibility from "./MapView/hooks/useZoomMarkerVisibility";
import { getRsvpUserId } from "@/features/starParty/starPartyUtils";

const MapView = forwardRef(function MapView(
  {
    mapSelection,
    onConsumeMapSelection,
    location,
    locationStatus,
    mapType,
    setMapType,
    stargazeLocations = [],
    starPartyEvents = [],
    isAuthenticated,
    authUser,
    directionsProvider = "google",
    showRecommendedSpots = true,
    satelliteReadableShadowsEnabled = true,
    lightOverlayEnabled = false,
    onToggleLightOverlay,
    searchDistance = 10,
    onSearchDistanceChange,
    autoCenterOnLocate = true,
    onThreeDModeChange,
    onToggleStarPartyRsvp,
  },
  ref,
) {
  const [isThreeDMode, setIsThreeDMode] = useState(false);
  const eventMarkerRefs = useRef(new Map());

  const { refs, ui, state, derived, handlers, planets } = useMapViewState({
    location,
    mapType,
    stargazeLocations,
    directionsProvider,
    showRecommendedSpots,
    lightOverlayEnabled,
    onToggleLightOverlay,
    searchDistance,
    onSearchDistanceChange,
  });
  const { mapRef, planetPanelRef, stargazeMarkerRefs, placedMarkerRef } = refs;
  const mapTypeClass = isThreeDMode ? "light three-d" : mapType;
  const handleCoordinateSearch = handlers.handleCoordinateSearch;
  const handleStargazeSearch = handlers.handleStargazeSearch;
  const handleStarPartySearch = handlers.handleStarPartySearch;
  const handleGetVisiblePlanets = handlers.handleGetVisiblePlanets;
  const handleRenameFavoriteSpot = handlers.handleRenameFavoriteSpot;
  const activeUserRsvpId = getRsvpUserId(authUser);
  const placedMarkerId = state.placedMarker?.id ?? null;
  const contextMenuLat = state.contextMenu?.lat ?? null;
  const contextMenuLng = state.contextMenu?.lng ?? null;
  const hasPinnedPopupTarget =
    placedMarkerId !== null &&
    Number.isFinite(contextMenuLat) &&
    Number.isFinite(contextMenuLng);
  const isSatelliteReadable =
    !isThreeDMode &&
    mapType === "satellite" &&
    satelliteReadableShadowsEnabled;
  const placedMarkerFavorite =
    state.placedMarker &&
    derived.favoriteSpotsByKey.has(
      handlers.getSpotKey(state.placedMarker.lat, state.placedMarker.lng),
    )
      ? derived.favoriteSpotsByKey.get(
          handlers.getSpotKey(state.placedMarker.lat, state.placedMarker.lng),
        ) || null
      : null;
  const visibleStarPartyEvents = useMemo(() => {
    if (!Array.isArray(starPartyEvents)) return [];
    return starPartyEvents.filter((event) => {
      if (!event || event.status !== "published") return false;
      if (!Number.isFinite(event.lat) || !Number.isFinite(event.lng)) return false;
      return true;
    });
  }, [starPartyEvents]);
  const { areZoomMarkersVisible, areZoomMarkersExiting, handleMapZoomChange } =
    useZoomMarkerVisibility(mapRef);
  const { handleToggleEventRsvp } = useMapEventRsvp({
    isAuthenticated,
    activeUserRsvpId,
    onToggleStarPartyRsvp,
  });

  const handleToggleThreeD = useCallback(() => {
    setIsThreeDMode((prev) => !prev);
  }, []);

  useEffect(() => {
    onThreeDModeChange?.(isThreeDMode);
  }, [isThreeDMode, onThreeDModeChange]);

  useEffect(() => {
    return () => {
      onThreeDModeChange?.(false);
    };
  }, [onThreeDModeChange]);

  useImperativeHandle(
    ref,
    () => ({
      zoomOutToMin: handlers.zoomOutToMin,
    }),
    [handlers.zoomOutToMin],
  );

  useMapSelectionEffects({
    hasPinnedPopupTarget,
    mapRef,
    placedMarkerRef,
    placedMarker: state.placedMarker,
    contextMenuLat,
    contextMenuLng,
    placedMarkerId,
    mapSelection,
    onConsumeMapSelection,
    stargazeLocations,
    visibleStarPartyEvents,
    handleCoordinateSearch,
    handleStargazeSearch,
    handleGetVisiblePlanets,
    handleStarPartySearch,
    eventMarkerRefs,
  });

  return (
    <div
      className={`map-container visible ${mapTypeClass}${
        ui.isSearchFocused ? " search-focused" : ""
      }${ui.isPopupOpen ? " popup-open" : ""}${
        isSatelliteReadable ? " satellite-readable" : ""
      }`}
    >
      <PlanetPanelContainer
        ref={planetPanelRef}
        planets={planets.visiblePlanets}
        loading={planets.planetsLoading}
        error={planets.planetsError}
        mapType={mapType}
        reducedMotion={derived.reducedMotion}
        location={location}
        onVisibilityChange={ui.setIsPlanetPanelOpen}
      />

      <MapViewport
        isThreeDMode={isThreeDMode}
        mapType={mapType}
        lightOverlayEnabled={lightOverlayEnabled}
        location={location}
        autoCenterOnLocate={autoCenterOnLocate}
        handlers={handlers}
        ui={ui}
        state={state}
        derived={derived}
        mapRef={mapRef}
        placedMarkerRef={placedMarkerRef}
        stargazeMarkerRefs={stargazeMarkerRefs}
        eventMarkerRefs={eventMarkerRefs}
        isAuthenticated={isAuthenticated}
        activeUserRsvpId={activeUserRsvpId}
        placedMarkerFavorite={placedMarkerFavorite}
        areZoomMarkersVisible={areZoomMarkersVisible}
        areZoomMarkersExiting={areZoomMarkersExiting}
        handleMapZoomChange={handleMapZoomChange}
        handleRenameFavoriteSpot={handleRenameFavoriteSpot}
        handleToggleEventRsvp={handleToggleEventRsvp}
        visibleStarPartyEvents={visibleStarPartyEvents}
      />

      <MapPanels
        state={state}
        ui={ui}
        directionsProvider={directionsProvider}
        handlers={handlers}
      />

      <MapQuickActions
        isThreeDMode={isThreeDMode}
        onToggleThreeDMode={handleToggleThreeD}
        onShowPlanets={handlers.handleGetVisiblePlanets}
        onFindDarkSpots={handlers.handleFetchDarkSpots}
        canShowPlanets={derived.hasAnyLocation}
        canFindDarkSpots={derived.hasAnyLocation}
        planetsTitle={derived.quickPlanetsTitle}
        darkSpotsTitle={derived.quickDarkSpotsTitle}
        locationStatus={locationStatus}
        onSnapToLocation={
          locationStatus === "active" ? handlers.handleSnapToLocation : undefined
        }
        lightOverlayEnabled={lightOverlayEnabled}
        onToggleLightOverlay={handlers.handleToggleLightOverlay}
      />

      <SearchDistanceSelector
        value={searchDistance}
        onChange={handlers.handleSearchDistanceChange}
        hidden={ui.isPlanetPanelOpen}
      />

      <LocationSearchBar
        locations={derived.visibleStargazeLocations}
        events={visibleStarPartyEvents}
        placeholder={derived.searchPlaceholder}
        onSelectCoordinates={handlers.handleCoordinateSearch}
        onSelectLocation={handlers.handleStargazeSearch}
        onSelectEvent={handlers.handleStarPartySearch}
        onFocusChange={ui.setIsSearchFocused}
      />

      <MapTypeSwitcher
        mapType={mapType}
        onChange={setMapType}
        latestGridShot={state.latestGridShot}
      />
    </div>
  );
});

MapView.displayName = "MapView";

export default MapView;
