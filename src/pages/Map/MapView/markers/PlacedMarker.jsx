import { Marker, Popup } from "react-leaflet";
import { favoriteSpotIcon, pinIcon } from "@/pages/Map/MapView/mapIcons";
import { PinnedPopupContent } from "@/pages/Map/MapView/MapPopups";

export default function PlacedMarker({
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
