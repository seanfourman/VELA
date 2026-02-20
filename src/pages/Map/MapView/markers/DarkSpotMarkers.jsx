import { Marker, Popup } from "react-leaflet";
import { darkSpotIcon, favoriteSpotIcon } from "@/pages/Map/MapView/mapIcons";
import { DarkSpotPopupContent } from "@/pages/Map/MapView/MapPopups";

export default function DarkSpotMarkers({
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
    const isFavoriteSpot = favoriteSpotKeys.has(getSpotKey(spot.lat, spot.lon));
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
