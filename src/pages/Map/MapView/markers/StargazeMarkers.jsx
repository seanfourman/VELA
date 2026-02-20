import { Marker, Popup } from "react-leaflet";
import { stargazeIcon } from "@/pages/Map/MapView/mapIcons";
import { StargazePopupContent } from "@/pages/Map/MapView/MapPopups";

export default function StargazeMarkers({
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
                spot.name || "Recommended spot",
              )
            }
          />
        </Popup>
      </Marker>
    );
  });
}
