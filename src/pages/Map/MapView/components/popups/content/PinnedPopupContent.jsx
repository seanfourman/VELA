import ContextMenuPopup from "../ContextMenuPopup";

const PIN_POPUP_EXIT_MS = 240;

export default function PinnedPopupContent({
  placedMarker,
  favoriteSpot,
  isAuthenticated,
  isPinnedTarget,
  onGetDirections,
  onRemovePin,
  onToggleFavorite,
  onRenameFavoriteName,
  onToggleTarget,
  onShareLocation,
}) {
  if (!placedMarker) return null;

  const isFavoritedPin = Boolean(placedMarker.isFavorite);
  const handleRemoveAction = (event) => {
    event.currentTarget.blur();

    if (isFavoritedPin) {
      onToggleFavorite?.();
      return;
    }

    const popupNode = event.currentTarget.closest(".leaflet-popup");
    if (!popupNode) {
      onRemovePin?.();
      return;
    }

    if (popupNode.classList.contains("popup-exiting")) {
      return;
    }

    popupNode.classList.add("popup-exiting");
    window.setTimeout(() => {
      onRemovePin?.();
    }, PIN_POPUP_EXIT_MS);
  };

  return (
    <ContextMenuPopup
      coords={placedMarker}
      onGetDirections={onGetDirections}
      onRemovePin={handleRemoveAction}
      isAuthenticated={Boolean(isAuthenticated)}
      isFavorite={isFavoritedPin}
      onToggleFavorite={onToggleFavorite}
      favoriteName={favoriteSpot?.customName || ""}
      onRenameFavoriteName={
        isFavoritedPin && isAuthenticated
          ? (nextName) => onRenameFavoriteName?.(favoriteSpot, nextName)
          : null
      }
      coordsLabel={isFavoritedPin ? "Favorited spot" : "Pinned location"}
      removeLabel={isFavoritedPin ? "Remove Favorite" : "Remove Pin"}
      isTarget={Boolean(isPinnedTarget)}
      onToggleTarget={isFavoritedPin ? onToggleTarget : null}
      onShareLocation={onShareLocation}
    />
  );
}
