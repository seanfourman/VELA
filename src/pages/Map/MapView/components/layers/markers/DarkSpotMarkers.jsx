import { Marker, Popup } from "react-leaflet";
import {
  darkSpotIcon,
  favoriteSpotIcon,
  favoriteSpotIconTransition,
} from "@/pages/Map/MapView/core/markerIcons";
import { DarkSpotPopupContent } from "@/pages/Map/MapView/components/popups/PopupContent";
import { coordinatesMatch, resolveFavoriteMarkerIcon } from "./markerHelpers";

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
    const isSelected = coordinatesMatch(selectedDarkSpot, spot, "lon");

    return (
      <Marker
        key={`darkspot-${index}`}
        position={[spot.lat, spot.lon]}
        icon={resolveFavoriteMarkerIcon({
          baseIcon: darkSpotIcon,
          isFavorite: isFavoriteSpot,
          isEntering: isFavoriteEntering,
          favoriteIcon: favoriteSpotIcon,
          favoriteTransitionIcon: favoriteSpotIconTransition,
        })}
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
