import ContextMenuPopup from "../ContextMenuPopup";

export default function PinnedPopupContent({
  placedMarker,
  isAuthenticated,
  isPinnedTarget,
  onGetDirections,
  onRemovePin,
  onToggleFavorite,
  onToggleTarget,
  onShareLocation,
  onOpenSpaceWeather,
}) {
  if (!placedMarker) return null;

  return (
    <ContextMenuPopup
      coords={placedMarker}
      onGetDirections={onGetDirections}
      onRemovePin={onRemovePin}
      isAuthenticated={Boolean(isAuthenticated)}
      isFavorite={Boolean(placedMarker.isFavorite)}
      onToggleFavorite={onToggleFavorite}
      coordsLabel={placedMarker.isFavorite ? "Favorited spot" : "Pinned location"}
      isTarget={Boolean(isPinnedTarget)}
      onToggleTarget={placedMarker.isFavorite ? onToggleTarget : null}
      onShareLocation={onShareLocation}
      onOpenSpaceWeather={onOpenSpaceWeather}
    />
  );
}
