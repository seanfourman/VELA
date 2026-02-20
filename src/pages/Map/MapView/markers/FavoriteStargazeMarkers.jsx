import { Marker } from "react-leaflet";
import { favoritePinIconRemoving, favoriteSpotIconTransition } from "../mapIcons";

export default function FavoriteStargazeMarkers({
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
