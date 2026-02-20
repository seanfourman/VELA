import { Marker, Popup } from "react-leaflet";
import { favoritePinIconRemoving, favoriteSpotIcon } from "../mapIcons";
import { FavoritePopupContent } from "../MapPopups";

export default function FavoriteOnlyMarkers({
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
                "Favorite spot",
              )
            }
          />
        </Popup>
      </Marker>
    );
  });
}
