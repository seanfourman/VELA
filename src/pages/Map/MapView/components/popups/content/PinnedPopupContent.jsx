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

  const isFavoritedPin = Boolean(placedMarker.isFavorite);

  return (
    <ContextMenuPopup
      coords={placedMarker}
      onGetDirections={onGetDirections}
      onRemovePin={isFavoritedPin ? onToggleFavorite : onRemovePin}
      isAuthenticated={Boolean(isAuthenticated)}
      isFavorite={isFavoritedPin}
      onToggleFavorite={onToggleFavorite}
      coordsLabel={isFavoritedPin ? "Favorited spot" : "Pinned location"}
      removeLabel={isFavoritedPin ? "Remove Favorite" : "Remove Pin"}
      isTarget={Boolean(isPinnedTarget)}
      onToggleTarget={isFavoritedPin ? onToggleTarget : null}
      onShareLocation={onShareLocation}
      onOpenSpaceWeather={onOpenSpaceWeather}
    />
  );
}
