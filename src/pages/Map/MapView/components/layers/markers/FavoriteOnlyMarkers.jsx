import { Marker, Popup } from "react-leaflet";
import {
  favoritePinIconRemoving,
  favoriteSpotIcon,
  favoriteSpotIconTransition,
} from "@/pages/Map/MapView/core/markerIcons";
import { FavoritePopupContent } from "@/pages/Map/MapView/components/popups/PopupContent";
import {
  buildMarkerDirectionsHandler,
  coordinatesMatch,
  resolveFavoriteMarkerIcon,
} from "./markerHelpers";

export default function FavoriteOnlyMarkers({
  favoriteOnlySpots,
  enteringFavoriteKeySet,
  exitingFavoriteKeySet,
  selectedDarkSpot,
  isAuthenticated,
  centerOnCoords,
  handleRemoveFavoriteSpotAnimated,
  handleShareLocation,
  buildDirectionsUrl,
  getDirectionsOrigin,
  setSelectedDarkSpot,
  onOpenSpaceWeatherAt,
}) {
  if (!Array.isArray(favoriteOnlySpots)) return null;
  const directionsOrigin = getDirectionsOrigin();

  return favoriteOnlySpots.map((spot) => {
    const isEntering = enteringFavoriteKeySet.has(spot.key);
    const isExiting = exitingFavoriteKeySet.has(spot.key);
    const isSelected = coordinatesMatch(selectedDarkSpot, spot);
    const handleDirections = buildMarkerDirectionsHandler({
      buildDirectionsUrl,
      getDirectionsOrigin: () => directionsOrigin,
      target: spot,
    });
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
        icon={resolveFavoriteMarkerIcon({
          baseIcon: favoriteSpotIcon,
          isFavorite: true,
          isEntering,
          isExiting,
          favoriteIcon: favoriteSpotIcon,
          favoriteTransitionIcon: favoriteSpotIconTransition,
          favoriteRemovingIcon: favoritePinIconRemoving,
        })}
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
                "Favorite spot",
              )
            }
            onOpenSpaceWeather={() =>
              onOpenSpaceWeatherAt?.(
                { lat: spot.lat, lng: spot.lng },
                "Favorite spot",
              )
            }
          />
        </Popup>
      </Marker>
    );
  });
}
