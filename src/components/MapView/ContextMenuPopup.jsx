import SkyQualityInfo from "./SkyQualityInfo";
import favoriteIcon from "../../assets/icons/favorite-icon.svg";
import "./ContextMenuPopup.css";

export default function ContextMenuPopup({
  coords,
  onGetDirections,
  onRemovePin,
  isAuthenticated,
  isFavorite,
  onToggleFavorite,
  coordsLabel,
  removeLabel,
}) {
  if (!coords) return null;

  const canFavorite = Boolean(isAuthenticated && onToggleFavorite);
  const favoriteButtonLabel = isFavorite
    ? "Remove from favorites"
    : "Add to favorites";
  const favoriteLabel = isFavorite ? "Favorited" : "Favorite";
  const resolvedCoordsLabel =
    coordsLabel || (isFavorite ? "Favorited spot" : "Pinned location");
  const resolvedRemoveLabel = removeLabel || "Remove Pin";

  return (
    <div className="context-menu-popup">
      {canFavorite ? (
        <div className="target-toggle-wrapper">
          <button
            className={`target-toggle favorite-toggle${
              isFavorite ? " active" : ""
            }`}
            aria-label={favoriteButtonLabel}
            onClick={(event) => {
              event.currentTarget.blur();
              onToggleFavorite?.();
            }}
          >
            <img
              src={favoriteIcon}
              alt=""
              aria-hidden="true"
              className="favorite-toggle-icon"
            />
          </button>
          <span
            className={`target-toggle-label favorite-toggle-label${
              isFavorite ? " active" : ""
            }`}
            aria-hidden="true"
          >
            {favoriteLabel}
          </span>
        </div>
      ) : null}
      <div className="popup-coords">
        <span className="popup-coords-label">{resolvedCoordsLabel}</span>
        <span className="popup-coords-value">
          {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </span>
      </div>

      <SkyQualityInfo lat={coords.lat} lng={coords.lng} variant="compact" />

      <div className="popup-actions">
        {onGetDirections && (
          <button className="popup-btn" onClick={onGetDirections}>
            Get Directions
          </button>
        )}
        {onRemovePin && (
          <button className="popup-btn" onClick={onRemovePin}>
            {resolvedRemoveLabel}
          </button>
        )}
      </div>
    </div>
  );
}
