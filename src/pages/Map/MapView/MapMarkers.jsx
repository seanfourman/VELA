import LocationMarker from "./markers/LocationMarker";
import ExitingMarker from "./markers/ExitingMarker";
import PlacedMarker from "./markers/PlacedMarker";
import StargazeMarkers from "./markers/StargazeMarkers";
import FavoriteStargazeMarkers from "./markers/FavoriteStargazeMarkers";
import DarkSpotMarkers from "./markers/DarkSpotMarkers";
import FavoriteOnlyMarkers from "./markers/FavoriteOnlyMarkers";

export default function MapMarkers({
  location,
  isAuthenticated,
  mapRef,
  stargazeMarkerRefs,
  placedMarkerRef,
  state,
  derived,
  ui,
  handlers,
}) {
  return (
    <>
      <LocationMarker
        location={location}
        centerOnCoords={handlers.centerOnCoords}
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
        centerOnCoords={handlers.centerOnCoords}
      />
      <StargazeMarkers
        spots={derived.visibleStargazeLocations}
        isAuthenticated={isAuthenticated}
        isMobileView={ui.isMobileView}
        favoriteSpotKeys={derived.favoriteSpotKeys}
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
      />
      <FavoriteStargazeMarkers
        spots={derived.favoriteStargazeSpots}
        exitingFavoriteKeySet={derived.exitingFavoriteKeySet}
        getSpotKey={handlers.getSpotKey}
      />
      <DarkSpotMarkers
        darkSpots={state.darkSpots}
        selectedDarkSpot={state.selectedDarkSpot}
        favoriteSpotKeys={derived.favoriteSpotKeys}
        isAuthenticated={isAuthenticated}
        centerOnCoords={handlers.centerOnCoords}
        handleToggleDarkSpotFavorite={handlers.handleToggleDarkSpotFavorite}
        handleToggleDarkSpotTarget={handlers.handleToggleDarkSpotTarget}
        flashShareToggle={handlers.flashShareToggle}
        handleShareLocation={handlers.handleShareLocation}
        buildDirectionsUrl={handlers.buildDirectionsUrl}
        getDirectionsOrigin={handlers.getDirectionsOrigin}
        getSpotKey={handlers.getSpotKey}
      />
      <FavoriteOnlyMarkers
        favoriteOnlySpots={derived.favoriteOnlySpots}
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
      />
    </>
  );
}
