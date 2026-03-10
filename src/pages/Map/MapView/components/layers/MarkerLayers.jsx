import LocationMarker from "./markers/LocationMarker";
import ExitingMarker from "./markers/ExitingMarker";
import PlacedMarker from "./markers/PlacedMarker";
import StargazeMarkers from "./markers/StargazeMarkers";
import DarkSpotMarkers from "./markers/DarkSpotMarkers";
import FavoriteOnlyMarkers from "./markers/FavoriteOnlyMarkers";
import StarPartyMarkers from "./markers/StarPartyMarkers";

export default function MarkerLayers({
  location,
  isAuthenticated,
  activeUserRsvpId,
  mapRef,
  stargazeMarkerRefs,
  placedMarkerRef,
  state,
  derived,
  ui,
  handlers,
  starPartyEvents,
  onToggleStarPartyRsvp,
  onOpenSpaceWeatherAt,
}) {
  return (
    <>
      <LocationMarker
        location={location}
        centerOnCoords={handlers.centerOnCoords}
        onOpenSpaceWeatherAt={onOpenSpaceWeatherAt}
      />
      <ExitingMarker exitingMarker={state.exitingMarker} />
      <PlacedMarker
        placedMarker={state.placedMarker}
        placedMarkerRef={placedMarkerRef}
        isAuthenticated={isAuthenticated}
        isPinnedTarget={derived.isPinnedTarget}
        onGetDirections={handlers.handleGetDirections}
        onRemovePin={handlers.handleCloseContextMenu}
        onToggleFavorite={handlers.handleTogglePinnedFavorite}
        onToggleTarget={handlers.handleTogglePinnedTarget}
        onShareLocation={() =>
          handlers.handleShareLocation(
            state.placedMarker,
            state.placedMarker?.isFavorite ? "Favorite spot" : "Pinned location",
          )
        }
        onOpenSpaceWeather={() =>
          onOpenSpaceWeatherAt?.(
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
      <StargazeMarkers
        spots={derived.visibleStargazeLocations}
        isAuthenticated={isAuthenticated}
        isMobileView={ui.isMobileView}
        favoriteSpotKeys={derived.favoriteSpotKeys}
        enteringFavoriteKeySet={derived.enteringFavoriteKeySet}
        selectedDarkSpot={state.selectedDarkSpot}
        stargazeMarkerRefs={stargazeMarkerRefs}
        mapRef={mapRef}
        setActiveStargazeId={handlers.setActiveStargazeId}
        centerOnCoords={handlers.centerOnCoords}
        openStargazePanel={handlers.openStargazePanel}
        handleToggleStargazeFavorite={handlers.handleToggleStargazeFavorite}
        handleToggleStargazeTarget={handlers.handleToggleStargazeTarget}
        handleShareLocation={handlers.handleShareLocation}
        buildDirectionsUrl={handlers.buildDirectionsUrl}
        getDirectionsOrigin={handlers.getDirectionsOrigin}
        getSpotKey={handlers.getSpotKey}
        onOpenSpaceWeatherAt={onOpenSpaceWeatherAt}
      />
      <DarkSpotMarkers
        darkSpots={state.darkSpots}
        selectedDarkSpot={state.selectedDarkSpot}
        favoriteSpotKeys={derived.favoriteSpotKeys}
        enteringFavoriteKeySet={derived.enteringFavoriteKeySet}
        isAuthenticated={isAuthenticated}
        centerOnCoords={handlers.centerOnCoords}
        handleToggleDarkSpotFavorite={handlers.handleToggleDarkSpotFavorite}
        handleToggleDarkSpotTarget={handlers.handleToggleDarkSpotTarget}
        flashShareToggle={handlers.flashShareToggle}
        handleShareLocation={handlers.handleShareLocation}
        buildDirectionsUrl={handlers.buildDirectionsUrl}
        getDirectionsOrigin={handlers.getDirectionsOrigin}
        getSpotKey={handlers.getSpotKey}
        onOpenSpaceWeatherAt={onOpenSpaceWeatherAt}
      />
      <FavoriteOnlyMarkers
        favoriteOnlySpots={derived.favoriteOnlySpots}
        enteringFavoriteKeySet={derived.enteringFavoriteKeySet}
        exitingFavoriteKeySet={derived.exitingFavoriteKeySet}
        selectedDarkSpot={state.selectedDarkSpot}
        isAuthenticated={isAuthenticated}
        centerOnCoords={handlers.centerOnCoords}
        handleRemoveFavoriteSpotAnimated={
          handlers.handleRemoveFavoriteSpotAnimated
        }
        handleShareLocation={handlers.handleShareLocation}
        buildDirectionsUrl={handlers.buildDirectionsUrl}
        getDirectionsOrigin={handlers.getDirectionsOrigin}
        setSelectedDarkSpot={handlers.setSelectedDarkSpot}
        onOpenSpaceWeatherAt={onOpenSpaceWeatherAt}
      />
      <StarPartyMarkers
        events={starPartyEvents}
        isAuthenticated={isAuthenticated}
        activeUserRsvpId={activeUserRsvpId}
        centerOnCoords={handlers.centerOnCoords}
        handleShareLocation={handlers.handleShareLocation}
        buildDirectionsUrl={handlers.buildDirectionsUrl}
        getDirectionsOrigin={handlers.getDirectionsOrigin}
        onToggleRsvp={onToggleStarPartyRsvp}
      />
    </>
  );
}
