import { Marker, Popup } from "react-leaflet";
import {
  favoritePinIconRemoving,
  favoriteSpotIcon,
  favoriteSpotIconTransition,
} from "@/pages/Map/MapView/core/markerIcons";
import FavoritePopupContent from "@/pages/Map/MapView/components/popups/content/FavoritePopupContent";

const openMarkerDirections = (url) => {
  if (!url) return;
  window.open(url, "_blank");
};

const buildMarkerDirectionsHandler = ({
  buildDirectionsUrl,
  getDirectionsOrigin,
  target,
}) => {
  if (typeof buildDirectionsUrl !== "function") return null;
  const origin =
    typeof getDirectionsOrigin === "function" ? getDirectionsOrigin() : null;
  const directionsUrl = buildDirectionsUrl(origin, target);

  if (!directionsUrl) return null;
  return () => openMarkerDirections(directionsUrl);
};

const coordinatesMatch = (left, right, rightLngKey = "lng") => {
  if (!left || !right) return false;
  return (
    Math.abs(Number(left.lat) - Number(right.lat)) < 1e-6 &&
    Math.abs(Number(left.lng) - Number(right[rightLngKey])) < 1e-6
  );
};

const resolveFavoriteMarkerIcon = ({
  baseIcon,
  isFavorite = false,
  isEntering = false,
  isExiting = false,
  favoriteIcon,
  favoriteTransitionIcon,
  favoriteRemovingIcon = null,
}) => {
  if (isExiting && favoriteRemovingIcon) {
    return favoriteRemovingIcon;
  }

  if (!isFavorite) {
    return baseIcon;
  }

  return isEntering ? favoriteTransitionIcon : favoriteIcon;
};

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
