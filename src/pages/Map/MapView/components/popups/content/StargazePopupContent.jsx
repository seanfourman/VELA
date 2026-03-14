import ContextMenuPopup from "../ContextMenuPopup";

export default function StargazePopupContent({
  spot,
  favoriteSpot,
  isMobileView,
  isAuthenticated,
  isFavoriteSpot,
  isTarget,
  onGetDirections,
  onOpenDetails,
  onRenameFavoriteName,
  onToggleFavorite,
  onToggleTarget,
  onShareLocation,
}) {
  if (!spot) return null;

  return (
    <ContextMenuPopup
      coords={{ lat: spot.lat, lng: spot.lng }}
      onGetDirections={onGetDirections}
      onExtraAction={isMobileView ? onOpenDetails : null}
      isAuthenticated={Boolean(isAuthenticated)}
      isFavorite={Boolean(isFavoriteSpot)}
      onToggleFavorite={isAuthenticated ? onToggleFavorite : null}
      favoriteName={favoriteSpot?.customName || ""}
      onRenameFavoriteName={
        isAuthenticated && isFavoriteSpot
          ? (nextName) => onRenameFavoriteName?.(favoriteSpot, nextName)
          : null
      }
      coordsLabel="Recommended spot"
      extraActionLabel="Details"
      isTarget={Boolean(isTarget)}
      onToggleTarget={onToggleTarget}
      onShareLocation={onShareLocation}
    />
  );
}
