import { MapContainer, Marker, TileLayer } from "react-leaflet";
import MapLibre3DLayer from "./layers/MapLibre3DLayer";
import LocationMarker from "./layers/markers/LocationMarker";
import PlacedMarker from "./layers/markers/PlacedMarker";
import StargazeMarkers from "./layers/markers/StargazeMarkers";
import DarkSpotMarkers from "./layers/markers/DarkSpotMarkers";
import FavoriteOnlyMarkers from "./layers/markers/FavoriteOnlyMarkers";
import StarPartyMarkers from "./layers/markers/StarPartyMarkers";
import {
  DoubleClickHandler,
  LongPressHandler,
  MapAnimator,
  MapController,
  MapZoomTracker,
  PopupStateHandler,
} from "../core/MapInteractionHandlers";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  LIGHT_TILE_URL,
  LONG_PRESS_MS,
  MAP_TILES,
  MAX_ZOOM,
  MIN_ZOOM,
} from "../core/mapConfig";
import {
  favoritePinIconRemoving,
  pinIconRemoving,
} from "../core/markerIcons";

export default function MapViewport({
  isThreeDMode,
  mapType,
  lightOverlayEnabled,
  location,
  autoCenterOnLocate,
  handlers,
  ui,
  state,
  derived,
  mapRef,
  placedMarkerRef,
  stargazeMarkerRefs,
  eventMarkerRefs,
  isAuthenticated,
  activeUserRsvpId,
  placedMarkerFavorite,
  areZoomMarkersVisible,
  areZoomMarkersExiting,
  handleMapZoomChange,
  handleRenameFavoriteSpot,
  handleOpenSpaceWeatherAt,
  handleToggleEventRsvp,
  visibleStarPartyEvents,
}) {
  return (
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
        <MapLibre3DLayer />
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
      <MapZoomTracker onZoomChange={handleMapZoomChange} />
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
        <MapAnimator location={location} shouldAutoCenter={autoCenterOnLocate} />
      )}

      {!isThreeDMode && (
        <>
          <LocationMarker
            location={location}
            centerOnCoords={handlers.centerOnCoords}
            onOpenSpaceWeatherAt={handleOpenSpaceWeatherAt}
          />
          {state.exitingMarker ? (
            <Marker
              key={`removing-${
                state.exitingMarker.id ||
                `${state.exitingMarker.lat}-${state.exitingMarker.lng}`
              }`}
              position={[state.exitingMarker.lat, state.exitingMarker.lng]}
              icon={
                state.exitingMarker.isFavorite
                  ? favoritePinIconRemoving
                  : pinIconRemoving
              }
              interactive={false}
            />
          ) : null}
          <PlacedMarker
            placedMarker={state.placedMarker}
            favoriteSpot={placedMarkerFavorite}
            placedMarkerRef={placedMarkerRef}
            isAuthenticated={isAuthenticated}
            isPinnedTarget={derived.isPinnedTarget}
            onGetDirections={handlers.handleGetDirections}
            onRemovePin={handlers.handleCloseContextMenu}
            onToggleFavorite={handlers.handleTogglePinnedFavorite}
            onRenameFavoriteName={handleRenameFavoriteSpot}
            onToggleTarget={handlers.handleTogglePinnedTarget}
            onShareLocation={() =>
              handlers.handleShareLocation(
                state.placedMarker,
                state.placedMarker?.isFavorite ? "Favorite spot" : "Pinned location",
              )
            }
            onOpenSpaceWeather={() =>
              handleOpenSpaceWeatherAt?.(
                {
                  lat: state.placedMarker?.lat,
                  lng: state.placedMarker?.lng,
                },
                state.placedMarker?.isFavorite ? "Favorite spot" : "Pinned location",
              )
            }
            isFavoriteEntering={
              state.placedMarker
                ? derived.enteringFavoriteKeySet.has(
                    handlers.getSpotKey(
                      state.placedMarker.lat,
                      state.placedMarker.lng,
                    ),
                  )
                : false
            }
            centerOnCoords={handlers.centerOnCoords}
          />
          {areZoomMarkersVisible ? (
            <>
              <StargazeMarkers
                spots={derived.visibleStargazeLocations}
                isAuthenticated={isAuthenticated}
                isMobileView={ui.isMobileView}
                favoriteSpotsByKey={derived.favoriteSpotsByKey}
                favoriteSpotKeys={derived.favoriteSpotKeys}
                enteringFavoriteKeySet={derived.enteringFavoriteKeySet}
                isExiting={areZoomMarkersExiting}
                selectedDarkSpot={state.selectedDarkSpot}
                stargazeMarkerRefs={stargazeMarkerRefs}
                mapRef={mapRef}
                setActiveStargazeId={handlers.setActiveStargazeId}
                centerOnCoords={handlers.centerOnCoords}
                openStargazePanel={handlers.openStargazePanel}
                handleRenameFavoriteSpot={handleRenameFavoriteSpot}
                handleToggleStargazeFavorite={handlers.handleToggleStargazeFavorite}
                handleToggleStargazeTarget={handlers.handleToggleStargazeTarget}
                handleShareLocation={handlers.handleShareLocation}
                buildDirectionsUrl={handlers.buildDirectionsUrl}
                getDirectionsOrigin={handlers.getDirectionsOrigin}
                getSpotKey={handlers.getSpotKey}
                onOpenSpaceWeatherAt={handleOpenSpaceWeatherAt}
              />
              <DarkSpotMarkers
                darkSpots={state.darkSpots}
                selectedDarkSpot={state.selectedDarkSpot}
                favoriteSpotsByKey={derived.favoriteSpotsByKey}
                favoriteSpotKeys={derived.favoriteSpotKeys}
                enteringFavoriteKeySet={derived.enteringFavoriteKeySet}
                isExiting={areZoomMarkersExiting}
                isAuthenticated={isAuthenticated}
                centerOnCoords={handlers.centerOnCoords}
                handleRenameFavoriteSpot={handleRenameFavoriteSpot}
                handleToggleDarkSpotFavorite={handlers.handleToggleDarkSpotFavorite}
                handleToggleDarkSpotTarget={handlers.handleToggleDarkSpotTarget}
                flashShareToggle={handlers.flashShareToggle}
                handleShareLocation={handlers.handleShareLocation}
                buildDirectionsUrl={handlers.buildDirectionsUrl}
                getDirectionsOrigin={handlers.getDirectionsOrigin}
                getSpotKey={handlers.getSpotKey}
                onOpenSpaceWeatherAt={handleOpenSpaceWeatherAt}
              />
              <FavoriteOnlyMarkers
                favoriteOnlySpots={derived.favoriteOnlySpots}
                enteringFavoriteKeySet={derived.enteringFavoriteKeySet}
                exitingFavoriteKeySet={derived.exitingFavoriteKeySet}
                isExiting={areZoomMarkersExiting}
                selectedDarkSpot={state.selectedDarkSpot}
                isAuthenticated={isAuthenticated}
                centerOnCoords={handlers.centerOnCoords}
                handleRenameFavoriteSpot={handleRenameFavoriteSpot}
                handleRemoveFavoriteSpotAnimated={
                  handlers.handleRemoveFavoriteSpotAnimated
                }
                handleShareLocation={handlers.handleShareLocation}
                buildDirectionsUrl={handlers.buildDirectionsUrl}
                getDirectionsOrigin={handlers.getDirectionsOrigin}
                setSelectedDarkSpot={handlers.setSelectedDarkSpot}
                onOpenSpaceWeatherAt={handleOpenSpaceWeatherAt}
              />
              <StarPartyMarkers
                events={visibleStarPartyEvents}
                isAuthenticated={isAuthenticated}
                activeUserRsvpId={activeUserRsvpId}
                eventMarkerRefs={eventMarkerRefs}
                isExiting={areZoomMarkersExiting}
                centerOnCoords={handlers.centerOnCoords}
                handleShareLocation={handlers.handleShareLocation}
                buildDirectionsUrl={handlers.buildDirectionsUrl}
                getDirectionsOrigin={handlers.getDirectionsOrigin}
                onToggleRsvp={handleToggleEventRsvp}
              />
            </>
          ) : null}
        </>
      )}
    </MapContainer>
  );
}
