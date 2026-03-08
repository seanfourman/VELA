import ContextMenuPopup from "../ContextMenuPopup";

export default function StargazePopupContent({
  spot,
  isMobileView,
  isAuthenticated,
  isFavoriteSpot,
  isTarget,
  onGetDirections,
  onOpenDetails,
  onToggleFavorite,
  onToggleTarget,
  onShareLocation,
  onOpenSpaceWeather,
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
      coordsLabel="Recommended spot"
      extraActionLabel="Details"
      isTarget={Boolean(isTarget)}
      onToggleTarget={onToggleTarget}
      onShareLocation={onShareLocation}
      onOpenSpaceWeather={onOpenSpaceWeather}
    />
  );
}
