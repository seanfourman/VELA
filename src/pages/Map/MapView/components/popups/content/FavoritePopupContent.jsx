import ContextMenuPopup from "../ContextMenuPopup";

export default function FavoritePopupContent({
  spot,
  isAuthenticated,
  isSelected,
  onGetDirections,
  onRemoveFavorite,
  onToggleTarget,
  onShareLocation,
  onOpenSpaceWeather,
}) {
  if (!spot) return null;

  return (
    <ContextMenuPopup
      coords={{ lat: spot.lat, lng: spot.lng }}
      onGetDirections={onGetDirections}
      onRemovePin={isAuthenticated ? onRemoveFavorite : null}
      isAuthenticated={Boolean(isAuthenticated)}
      isFavorite={true}
      onToggleFavorite={isAuthenticated ? onRemoveFavorite : null}
      coordsLabel="Favorited spot"
      removeLabel="Remove Favorite"
      isTarget={Boolean(isSelected)}
      onToggleTarget={onToggleTarget}
      onShareLocation={onShareLocation}
      onOpenSpaceWeather={onOpenSpaceWeather}
    />
  );
}
