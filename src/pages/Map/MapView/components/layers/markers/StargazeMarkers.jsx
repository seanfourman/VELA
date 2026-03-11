import { Marker, Popup } from "react-leaflet";
import {
  favoriteSpotIcon,
  favoriteSpotIconTransition,
  stargazeIcon,
} from "@/pages/Map/MapView/core/markerIcons";
import { StargazePopupContent } from "@/pages/Map/MapView/components/popups/PopupContent";
import {
  buildMarkerDirectionsHandler,
  coordinatesMatch,
  resolveFavoriteMarkerIcon,
} from "./markerHelpers";

export default function StargazeMarkers({
  spots,
  isAuthenticated,
  isMobileView,
  favoriteSpotKeys,
  enteringFavoriteKeySet,
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
  onOpenSpaceWeatherAt,
}) {
  if (!Array.isArray(spots)) return null;
  const directionsOrigin = getDirectionsOrigin();

  return spots.map((spot) => {
    const spotKey = getSpotKey(spot.lat, spot.lng);
    const isFavoriteSpot = favoriteSpotKeys.has(spotKey);
    const isFavoriteEntering = enteringFavoriteKeySet.has(spotKey);
    const isTarget = coordinatesMatch(selectedDarkSpot, spot);
    const handleDirections = buildMarkerDirectionsHandler({
      buildDirectionsUrl,
      getDirectionsOrigin: () => directionsOrigin,
      target: spot,
    });

    return (
      <Marker
        key={`stargaze-${spot.id}`}
        position={[spot.lat, spot.lng]}
        icon={resolveFavoriteMarkerIcon({
          baseIcon: stargazeIcon,
          isFavorite: isFavoriteSpot,
          isEntering: isFavoriteEntering,
          favoriteIcon: favoriteSpotIcon,
          favoriteTransitionIcon: favoriteSpotIconTransition,
        })}
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
                spot.name || "Recommended spot",
              )
            }
            onOpenSpaceWeather={() =>
              onOpenSpaceWeatherAt?.(
                { lat: spot.lat, lng: spot.lng },
                spot.name || "Recommended spot",
              )
            }
          />
        </Popup>
      </Marker>
    );
  });
}
