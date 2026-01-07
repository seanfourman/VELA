import { forwardRef, useImperativeHandle } from "react";
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
import SearchDistanceSelector from "./MapView/SearchDistanceSelector";
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

const MapView = forwardRef(function MapView(
  {
    location,
    locationStatus,
    mapType,
    setMapType,
    stargazeLocations = [],
    isAuthenticated,
    authToken,
    directionsProvider = "google",
    showRecommendedSpots = true,
    lightOverlayEnabled = false,
    onToggleLightOverlay,
    searchDistance = 10,
    onSearchDistanceChange,
    autoCenterOnLocate = true,
  },
  ref
) {
  const { refs, ui, state, derived, handlers, planets } = useMapViewState({
    location,
    mapType,
    stargazeLocations,
    isAuthenticated,
    authToken,
    directionsProvider,
    showRecommendedSpots,
    lightOverlayEnabled,
    onToggleLightOverlay,
    searchDistance,
    onSearchDistanceChange,
  });

  useImperativeHandle(
    ref,
    () => ({
      zoomOutToMin: handlers.zoomOutToMin,
    }),
    [handlers.zoomOutToMin]
  );

  return (
    <div
      className={`map-container visible ${mapType}${
        ui.isSearchFocused ? " search-focused" : ""
      }${ui.isPopupOpen ? " popup-open" : ""}`}
    >
      <PlanetPanelContainer
        ref={refs.planetPanelRef}
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
        doubleClickZoom={false}
        minZoom={MIN_ZOOM}
        maxBounds={[
          [-85, -180],
          [85, 180],
        ]}
        maxBoundsViscosity={1.0}
        maxZoom={MAX_ZOOM}
      >
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

        {lightOverlayEnabled && (
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

        <MapController mapRef={refs.mapRef} />
        <DoubleClickHandler onDoubleClick={handlers.handleDoubleClick} />
        <LongPressHandler
          onLongPress={handlers.handleDoubleClick}
          delayMs={LONG_PRESS_MS}
        />
        <PopupStateHandler
          onPopupStateChange={ui.setIsPopupOpen}
          onPopupClose={handlers.handlePopupClose}
        />
        {location && (
          <MapAnimator
            location={location}
            shouldAutoCenter={autoCenterOnLocate}
          />
        )}

        <MapMarkers
          location={location}
          isAuthenticated={isAuthenticated}
          refs={refs}
          state={state}
          derived={derived}
          ui={ui}
          handlers={handlers}
        />
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

      <MapQuickActions
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
