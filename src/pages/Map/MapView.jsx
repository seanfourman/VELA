import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./MapView/mapView.css";
import "./MapView/leaflet-overrides.css";
import PlanetPanelContainer from "./PlanetPanel/PlanetPanelContainer";
import MapTypeSwitcher from "./MapView/MapTypeSwitcher";
import MapQuickActions from "./MapView/MapQuickActions";
import LocationSearchBar from "./MapView/LocationSearchBar";
import StargazePanel from "./MapView/StargazePanel";
import StargazePanelMobile from "./MapView/StargazePanelMobile";
import SpaceWeatherPanel from "./MapView/SpaceWeatherPanel";
import SpaceWeatherPanelMobile from "./MapView/SpaceWeatherPanelMobile";
import SearchDistanceSelector from "./MapView/SearchDistanceSelector";
import MapLibre3DLayer from "./MapView/MapLibre3DLayer";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  LIGHT_TILE_URL,
  LONG_PRESS_MS,
  MAP_TILES,
  MAPTILER_KEY,
  MAX_ZOOM,
  MIN_ZOOM,
} from "./MapView/mapConstants";
import {
  DoubleClickHandler,
  LongPressHandler,
  MapAnimator,
  MapController,
  PopupStateHandler,
} from "./MapView/MapEventHandlers";
import MapMarkers from "./MapView/MapMarkers";
import useMapViewState from "./MapView/useMapViewState";
import useSpaceWeather from "@/features/spaceWeather/useSpaceWeather";

const MapView = forwardRef(function MapView(
  {
    location,
    locationStatus,
    mapType,
    setMapType,
    stargazeLocations = [],
    isAuthenticated,
    directionsProvider = "google",
    showRecommendedSpots = true,
    lightOverlayEnabled = false,
    onToggleLightOverlay,
    searchDistance = 10,
    onSearchDistanceChange,
    autoCenterOnLocate = true,
    onThreeDModeChange,
  },
  ref
) {
  const [isThreeDMode, setIsThreeDMode] = useState(false);
  const [isSpaceWeatherOpen, setIsSpaceWeatherOpen] = useState(false);
  const spaceWeather = useSpaceWeather();

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
  const closeStargazePanel = handlers.handleCloseStargazePanel;
  const ensureSpaceWeatherLoaded = spaceWeather.ensureLoaded;

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

  const handleToggleSpaceWeather = useCallback(() => {
    setIsSpaceWeatherOpen((prev) => {
      const next = !prev;
      if (next) {
        ensureSpaceWeatherLoaded();
        closeStargazePanel?.();
      }
      return next;
    });
  }, [closeStargazePanel, ensureSpaceWeatherLoaded]);

  const handleCloseSpaceWeather = useCallback(() => {
    setIsSpaceWeatherOpen(false);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      zoomOutToMin: handlers.zoomOutToMin,
    }),
    [handlers.zoomOutToMin]
  );

  return (
    <div
      className={`map-container visible ${mapTypeClass}${
        ui.isSearchFocused ? " search-focused" : ""
      }${ui.isPopupOpen ? " popup-open" : ""}`}
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

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
        tapHold={false}
        doubleClickZoom={false}
        minZoom={MIN_ZOOM}
        maxBounds={[
          [-85, -180],
          [85, 180],
        ]}
        maxBoundsViscosity={1.0}
        maxZoom={MAX_ZOOM}
      >
        {isThreeDMode ? (
          <MapLibre3DLayer apiKey={MAPTILER_KEY} />
        ) : (
          <TileLayer
            key={mapType}
            attribution={MAP_TILES[mapType].attribution}
            url={MAP_TILES[mapType].url}
            maxZoom={MAX_ZOOM}
            keepBuffer={4}
            updateWhenIdle={true}
            updateWhenZooming={false}
            noWrap={true}
            eventHandlers={{
              tileload: handlers.handleTileLoad,
            }}
          />
        )}

        {lightOverlayEnabled && !isThreeDMode && (
          <TileLayer
            url={LIGHT_TILE_URL}
            attribution="WA2015 artificial sky brightness"
            opacity={0.72}
            zIndex={5}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            tileSize={256}
          />
        )}

        <MapController mapRef={mapRef} />
        {!isThreeDMode && (
          <>
            <DoubleClickHandler onDoubleClick={handlers.handleDoubleClick} />
            <LongPressHandler
              onLongPress={handlers.handleDoubleClick}
              delayMs={LONG_PRESS_MS}
            />
            <PopupStateHandler
              onPopupStateChange={ui.setIsPopupOpen}
              onPopupClose={handlers.handlePopupClose}
            />
          </>
        )}
        {location && (
          <MapAnimator
            location={location}
            shouldAutoCenter={autoCenterOnLocate}
          />
        )}

        {!isThreeDMode && (
          <MapMarkers
            location={location}
            isAuthenticated={isAuthenticated}
            mapRef={mapRef}
            stargazeMarkerRefs={stargazeMarkerRefs}
            placedMarkerRef={placedMarkerRef}
            state={state}
            derived={derived}
            ui={ui}
            handlers={handlers}
          />
        )}
      </MapContainer>

      <StargazePanel
        spot={state.stargazePanelSpot}
        isOpen={state.isStargazePanelOpen && !ui.isMobileView}
        onClose={handlers.handleCloseStargazePanel}
        directionsProvider={directionsProvider}
      />
      <StargazePanelMobile
        spot={state.stargazePanelSpot}
        isOpen={state.isStargazePanelOpen && ui.isMobileView}
        onClose={handlers.handleCloseStargazePanel}
        directionsProvider={directionsProvider}
      />

      <SpaceWeatherPanel
        isOpen={isSpaceWeatherOpen && !ui.isMobileView}
        onClose={handleCloseSpaceWeather}
        snapshot={spaceWeather.snapshot}
        location={location}
        loading={spaceWeather.loading}
        error={spaceWeather.error}
        onRefresh={spaceWeather.refresh}
      />
      <SpaceWeatherPanelMobile
        isOpen={isSpaceWeatherOpen && ui.isMobileView}
        onClose={handleCloseSpaceWeather}
        snapshot={spaceWeather.snapshot}
        location={location}
        loading={spaceWeather.loading}
        error={spaceWeather.error}
        onRefresh={spaceWeather.refresh}
      />

      <MapQuickActions
        isThreeDMode={isThreeDMode}
        onToggleThreeDMode={handleToggleThreeD}
        onShowPlanets={handlers.handleGetVisiblePlanets}
        onFindDarkSpots={handlers.handleFetchDarkSpots}
        onToggleSpaceWeather={handleToggleSpaceWeather}
        canShowPlanets={derived.hasAnyLocation}
        canFindDarkSpots={derived.hasAnyLocation}
        planetsTitle={derived.quickPlanetsTitle}
        darkSpotsTitle={derived.quickDarkSpotsTitle}
        spaceWeatherTitle={spaceWeather.quickTitle}
        spaceWeatherActive={isSpaceWeatherOpen}
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
        placeholder={derived.searchPlaceholder}
        onSelectCoordinates={handlers.handleCoordinateSearch}
        onSelectLocation={handlers.handleStargazeSearch}
        onFocusChange={ui.setIsSearchFocused}
      />

      <MapTypeSwitcher
        mapType={mapType}
        onChange={setMapType}
        previewKey={MAPTILER_KEY}
        latestGridShot={state.latestGridShot}
      />
    </div>
  );
});

MapView.displayName = "MapView";

export default MapView;
