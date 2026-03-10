import { Marker, Popup } from "react-leaflet";
import {
  darkSpotIcon,
  favoriteSpotIcon,
  favoriteSpotIconTransition,
} from "@/pages/Map/MapView/core/markerIcons";
import { DarkSpotPopupContent } from "@/pages/Map/MapView/components/popups/PopupContent";

export default function DarkSpotMarkers({
  darkSpots,
  selectedDarkSpot,
  favoriteSpotKeys,
  enteringFavoriteKeySet,
  isAuthenticated,
  centerOnCoords,
  handleToggleDarkSpotFavorite,
  handleToggleDarkSpotTarget,
  flashShareToggle,
  handleShareLocation,
  buildDirectionsUrl,
  getDirectionsOrigin,
  getSpotKey,
  onOpenSpaceWeatherAt,
}) {
  if (!Array.isArray(darkSpots)) return null;

  return darkSpots.map((spot, index) => {
    const spotKey = getSpotKey(spot.lat, spot.lon);
    const isFavoriteSpot = favoriteSpotKeys.has(spotKey);
    const isFavoriteEntering = enteringFavoriteKeySet.has(spotKey);
    const isSelected =
      selectedDarkSpot &&
      Math.abs(selectedDarkSpot.lat - spot.lat) < 1e-6 &&
      Math.abs(selectedDarkSpot.lng - spot.lon) < 1e-6;

    return (
      <Marker
        key={`darkspot-${index}`}
        position={[spot.lat, spot.lon]}
        icon={
          isFavoriteSpot
            ? isFavoriteEntering
              ? favoriteSpotIconTransition
              : favoriteSpotIcon
            : darkSpotIcon
        }
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
                "Stargazing spot",
              )
            }
            onOpenSpaceWeather={() =>
              onOpenSpaceWeatherAt?.(
                { lat: spot.lat, lng: spot.lon },
                "Stargazing spot",
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
