import SkyQualityInfo from "./SkyQualityInfo";
import favoriteIcon from "../../assets/icons/favorite-icon.svg";
import targetIcon from "../../assets/icons/target-icon.svg";
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
  isTarget,
  onToggleTarget,
}) {
  if (!coords) return null;

  const stopPopupEvent = (event) => {
    event.stopPropagation();
  };

  const canFavorite = Boolean(isAuthenticated && onToggleFavorite);
  const canTarget = Boolean(onToggleTarget);
  const favoriteButtonLabel = isFavorite
    ? "Remove from favorites"
    : "Add to favorites";
  const favoriteLabel = isFavorite ? "Favorited" : "Favorite";
  const targetButtonLabel = isTarget
    ? "This spot is the active target"
    : "Use this spot for quick actions";
  const targetLabel = isTarget ? "Active target" : "Set as target";
  const resolvedCoordsLabel =
    coordsLabel || (isFavorite ? "Favorited spot" : "Pinned location");
  const resolvedRemoveLabel = removeLabel || "Remove Pin";

  return (
    <div
      className="context-menu-popup"
      onPointerDown={stopPopupEvent}
      onClick={stopPopupEvent}
    >
      {canTarget && canFavorite ? (
        <div className="target-toggle-row">
          <div className="target-toggle-wrapper">
            <button
              className={`target-toggle${isTarget ? " active" : ""}`}
              aria-label={targetButtonLabel}
              onClick={(event) => {
                event.currentTarget.blur();
                onToggleTarget?.();
              }}
            >
              <img
                src={targetIcon}
                alt=""
                aria-hidden="true"
                className="target-toggle-icon"
              />
            </button>
            <span
              className={`target-toggle-label${isTarget ? " active" : ""}`}
              aria-hidden="true"
            >
              {targetLabel}
            </span>
          </div>
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
        </div>
      ) : canTarget ? (
        <div className="target-toggle-wrapper">
          <button
            className={`target-toggle${isTarget ? " active" : ""}`}
            aria-label={targetButtonLabel}
            onClick={(event) => {
              event.currentTarget.blur();
              onToggleTarget?.();
            }}
          >
            <img
              src={targetIcon}
              alt=""
              aria-hidden="true"
              className="target-toggle-icon"
            />
          </button>
          <span
            className={`target-toggle-label${isTarget ? " active" : ""}`}
            aria-hidden="true"
          >
            {targetLabel}
          </span>
        </div>
      ) : canFavorite ? (
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
