import { Marker, Popup } from "react-leaflet";
import {
  customIcon,
  darkSpotIcon,
  favoritePinIconRemoving,
  favoriteSpotIcon,
  favoriteSpotIconTransition,
  pinIcon,
  pinIconRemoving,
  stargazeIcon,
} from "./mapIcons";
import {
  DarkSpotPopupContent,
  FavoritePopupContent,
  LocationPopupContent,
  PinnedPopupContent,
  StargazePopupContent,
} from "./MapPopups";

function LocationMarker({ location, centerOnCoords }) {
  if (!location) return null;

  return (
    <Marker
      position={[location.lat, location.lng]}
      icon={customIcon}
      eventHandlers={{
        popupopen: () => centerOnCoords(location.lat, location.lng),
      }}
    >
      <Popup>
        <LocationPopupContent location={location} />
      </Popup>
    </Marker>
  );
}

function ExitingMarker({ exitingMarker }) {
  if (!exitingMarker) return null;

  return (
    <Marker
      key={`removing-${
        exitingMarker.id || `${exitingMarker.lat}-${exitingMarker.lng}`
      }`}
      position={[exitingMarker.lat, exitingMarker.lng]}
      icon={
        exitingMarker.isFavorite ? favoritePinIconRemoving : pinIconRemoving
      }
      interactive={false}
    />
  );
}

function PlacedMarker({
  placedMarker,
  placedMarkerRef,
  isAuthenticated,
  isPinnedTarget,
  onGetDirections,
  onRemovePin,
  onToggleFavorite,
  onToggleTarget,
  onShareLocation,
  centerOnCoords,
}) {
  if (!placedMarker) return null;

  return (
    <Marker
      key={`placed-${placedMarker.id}`}
      position={[placedMarker.lat, placedMarker.lng]}
      icon={placedMarker.isFavorite ? favoriteSpotIcon : pinIcon}
      ref={(marker) => {
        placedMarkerRef.current = marker || null;
      }}
      eventHandlers={{
        popupopen: () => centerOnCoords(placedMarker.lat, placedMarker.lng),
      }}
    >
      <Popup>
        <PinnedPopupContent
          placedMarker={placedMarker}
          isAuthenticated={isAuthenticated}
          isPinnedTarget={isPinnedTarget}
          onGetDirections={onGetDirections}
          onRemovePin={onRemovePin}
          onToggleFavorite={onToggleFavorite}
          onToggleTarget={onToggleTarget}
          onShareLocation={onShareLocation}
        />
      </Popup>
    </Marker>
  );
}

function StargazeMarkers({
  spots,
  isAuthenticated,
  isMobileView,
  favoriteSpotKeys,
  selectedDarkSpot,
  stargazeMarkerRefs,
  mapRef,
  setActiveStargazeId,
  centerOnCoords,
  openStargazePanel,
  handleToggleStargazeFavorite,
  handleToggleStargazeTarget,
  handleShareLocation,
  buildDirectionsUrl,
  getDirectionsOrigin,
  getSpotKey,
}) {
  if (!Array.isArray(spots)) return null;

  return spots.map((spot) => {
    const spotKey = getSpotKey(spot.lat, spot.lng);
    const isFavoriteSpot = favoriteSpotKeys.has(spotKey);
    const isTarget =
      selectedDarkSpot &&
      Math.abs(selectedDarkSpot.lat - spot.lat) < 1e-6 &&
      Math.abs(selectedDarkSpot.lng - spot.lng) < 1e-6;
    const directionsOrigin = getDirectionsOrigin();
    const directionsUrl = buildDirectionsUrl(directionsOrigin, spot);
    const handleDirections = directionsUrl
      ? () => {
          window.open(directionsUrl, "_blank");
        }
      : null;

    return (
      <Marker
        key={`stargaze-${spot.id}`}
        position={[spot.lat, spot.lng]}
        icon={stargazeIcon}
        ref={(marker) => {
          if (marker) {
            stargazeMarkerRefs.current.set(spot.id, marker);
          } else {
            stargazeMarkerRefs.current.delete(spot.id);
          }
        }}
        eventHandlers={{
          click: () => {
            setActiveStargazeId(spot.id);
          },
          popupopen: () => {
            setActiveStargazeId(spot.id);
            centerOnCoords(spot.lat, spot.lng);
            if (!isMobileView) {
              openStargazePanel(spot);
            }
          },
          popupclose: () => {
            setActiveStargazeId((prev) => (prev === spot.id ? null : prev));
          },
        }}
      >
        <Popup>
          <StargazePopupContent
            spot={spot}
            isMobileView={isMobileView}
            isAuthenticated={isAuthenticated}
            isFavoriteSpot={isFavoriteSpot}
            isTarget={Boolean(isTarget)}
            onGetDirections={handleDirections}
            onOpenDetails={() => {
              openStargazePanel(spot);
              mapRef.current?.closePopup();
            }}
            onToggleFavorite={() => handleToggleStargazeFavorite(spot)}
            onToggleTarget={() => handleToggleStargazeTarget(spot)}
            onShareLocation={() =>
              handleShareLocation(
                { lat: spot.lat, lng: spot.lng },
                spot.name || "Recommended spot"
              )
            }
          />
        </Popup>
      </Marker>
    );
  });
}

function FavoriteStargazeMarkers({
  spots,
  exitingFavoriteKeySet,
  getSpotKey,
}) {
  if (!Array.isArray(spots)) return null;

  return spots.map((spot) => {
    const spotKey = getSpotKey(spot.lat, spot.lng);
    const isExiting = exitingFavoriteKeySet.has(spotKey);
    return (
      <Marker
        key={`favorite-stargaze-${spot.id}`}
        position={[spot.lat, spot.lng]}
        icon={isExiting ? favoritePinIconRemoving : favoriteSpotIconTransition}
        interactive={false}
      />
    );
  });
}

function DarkSpotMarkers({
  darkSpots,
  selectedDarkSpot,
  favoriteSpotKeys,
  isAuthenticated,
  centerOnCoords,
  handleToggleDarkSpotFavorite,
  handleToggleDarkSpotTarget,
  flashShareToggle,
  handleShareLocation,
  buildDirectionsUrl,
  getDirectionsOrigin,
  getSpotKey,
}) {
  if (!Array.isArray(darkSpots)) return null;

  return darkSpots.map((spot, index) => {
    const isFavoriteSpot = favoriteSpotKeys.has(
      getSpotKey(spot.lat, spot.lon)
    );
    const isSelected =
      selectedDarkSpot &&
      Math.abs(selectedDarkSpot.lat - spot.lat) < 1e-6 &&
      Math.abs(selectedDarkSpot.lng - spot.lon) < 1e-6;

    return (
      <Marker
        key={`darkspot-${index}`}
        position={[spot.lat, spot.lon]}
        icon={isFavoriteSpot ? favoriteSpotIcon : darkSpotIcon}
        eventHandlers={{
          popupopen: () => centerOnCoords(spot.lat, spot.lon),
        }}
      >
        <Popup>
          <DarkSpotPopupContent
            spot={spot}
            isAuthenticated={isAuthenticated}
            isFavoriteSpot={isFavoriteSpot}
            isSelected={isSelected}
            onToggleTarget={() => handleToggleDarkSpotTarget(spot)}
            onToggleFavorite={() => handleToggleDarkSpotFavorite(spot)}
            onShareLocation={() =>
              handleShareLocation(
                { lat: spot.lat, lng: spot.lon },
                "Stargazing spot"
              )
            }
            flashShareToggle={flashShareToggle}
            buildDirectionsUrl={buildDirectionsUrl}
            getDirectionsOrigin={getDirectionsOrigin}
          />
        </Popup>
      </Marker>
    );
  });
}

function FavoriteOnlyMarkers({
  favoriteOnlySpots,
  exitingFavoriteKeySet,
  selectedDarkSpot,
  isAuthenticated,
  centerOnCoords,
  handleRemoveFavoriteSpotAnimated,
  handleShareLocation,
  buildDirectionsUrl,
  getDirectionsOrigin,
  setSelectedDarkSpot,
}) {
  if (!Array.isArray(favoriteOnlySpots)) return null;

  return favoriteOnlySpots.map((spot) => {
    const directionsOrigin = getDirectionsOrigin();
    const isExiting = exitingFavoriteKeySet.has(spot.key);
    const isSelected =
      selectedDarkSpot &&
      Math.abs(selectedDarkSpot.lat - spot.lat) < 1e-6 &&
      Math.abs(selectedDarkSpot.lng - spot.lng) < 1e-6;
    const directionsUrl = buildDirectionsUrl(directionsOrigin, spot);
    const handleDirections = directionsUrl
      ? () => {
          window.open(directionsUrl, "_blank");
        }
      : null;
    const handleRemoveFavorite = () =>
      handleRemoveFavoriteSpotAnimated(spot.key);
    const handleToggleTarget = () => {
      if (isSelected) {
        setSelectedDarkSpot(null);
        return;
      }
      setSelectedDarkSpot({
        lat: spot.lat,
        lng: spot.lng,
        label: "Favorite spot",
      });
    };

    return (
      <Marker
        key={`favorite-${spot.key}`}
        position={[spot.lat, spot.lng]}
        icon={isExiting ? favoritePinIconRemoving : favoriteSpotIcon}
        eventHandlers={{
          popupopen: () => centerOnCoords(spot.lat, spot.lng),
        }}
      >
        <Popup className={isExiting ? "popup-exiting" : undefined}>
          <FavoritePopupContent
            spot={spot}
            isAuthenticated={isAuthenticated}
            isSelected={isSelected}
            onGetDirections={handleDirections}
            onRemoveFavorite={handleRemoveFavorite}
            onToggleTarget={handleToggleTarget}
            onShareLocation={() =>
              handleShareLocation(
                { lat: spot.lat, lng: spot.lng },
                "Favorite spot"
              )
            }
          />
        </Popup>
      </Marker>
    );
  });
}

export default function MapMarkers({
  location,
  isAuthenticated,
  refs,
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
        placedMarkerRef={refs.placedMarkerRef}
        isAuthenticated={isAuthenticated}
        isPinnedTarget={derived.isPinnedTarget}
        onGetDirections={handlers.handleGetDirections}
        onRemovePin={handlers.handleCloseContextMenu}
        onToggleFavorite={handlers.handleTogglePinnedFavorite}
        onToggleTarget={handlers.handleTogglePinnedTarget}
        onShareLocation={() =>
          handlers.handleShareLocation(
            state.placedMarker,
            state.placedMarker?.isFavorite ? "Favorite spot" : "Pinned location"
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
        stargazeMarkerRefs={refs.stargazeMarkerRefs}
        mapRef={refs.mapRef}
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
