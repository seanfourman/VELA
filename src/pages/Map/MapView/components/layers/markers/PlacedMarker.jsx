import { Marker, Popup } from "react-leaflet";
import {
  favoriteSpotIcon,
  favoriteSpotIconTransition,
  pinIcon,
} from "@/pages/Map/MapView/core/markerIcons";
import { PinnedPopupContent } from "@/pages/Map/MapView/components/popups/PopupContent";

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
  onOpenSpaceWeather,
  isFavoriteEntering,
  centerOnCoords,
}) {
  if (!placedMarker) return null;

  return (
    <Marker
      key={`placed-${placedMarker.id}`}
      position={[placedMarker.lat, placedMarker.lng]}
      icon={
        placedMarker.isFavorite
          ? isFavoriteEntering
            ? favoriteSpotIconTransition
            : favoriteSpotIcon
          : pinIcon
      }
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
          onOpenSpaceWeather={onOpenSpaceWeather}
        />
      </Popup>
    </Marker>
  );
}
