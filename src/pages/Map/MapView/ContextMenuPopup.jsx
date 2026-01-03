import SkyQualityInfo from "./SkyQualityInfo";
import favoriteIcon from "../../../assets/icons/favorite-icon.svg";
import targetIcon from "../../../assets/icons/target-icon.svg";
import shareIcon from "../../../assets/icons/share-icon.svg";
import "./ContextMenuPopup.css";

export default function ContextMenuPopup({
  coords,
  onGetDirections,
  onRemovePin,
  onExtraAction,
  isAuthenticated,
  isFavorite,
  onToggleFavorite,
  coordsLabel,
  removeLabel,
  extraActionLabel,
  isTarget,
  onToggleTarget,
  onShareLocation,
}) {
  if (!coords) return null;

  const stopPopupEvent = (event) => {
    event.stopPropagation();
  };

  const canFavorite = Boolean(isAuthenticated && onToggleFavorite);
  const canTarget = Boolean(onToggleTarget);
  const canShare = Boolean(onShareLocation);
  const toggleCount = Number(canTarget) + Number(canFavorite) + Number(canShare);
  const toggleLayout = toggleCount > 1 ? "dual" : "single";
  const favoriteButtonLabel = isFavorite
    ? "Remove from favorites"
    : "Add to favorites";
  const favoriteLabel = isFavorite ? "Favorited" : "Favorite";
  const targetButtonLabel = isTarget
    ? "This spot is the active target"
    : "Use this spot for quick actions";
  const targetLabel = isTarget ? "Active target" : "Set as target";
  const shareButtonLabel = "Share this location";
  const shareLabel = "Share";
  const resolvedCoordsLabel =
    coordsLabel || (isFavorite ? "Favorited spot" : "Pinned location");
  const resolvedRemoveLabel = removeLabel || "Remove Pin";
  const resolvedExtraLabel = extraActionLabel || "View details";

  return (
    <div
      className="context-menu-popup"
      onPointerDown={stopPopupEvent}
      onClick={stopPopupEvent}
    >
      {toggleCount > 0 ? (
        <div className="target-toggle-row" data-layout={toggleLayout}>
          <div
            className="target-toggle-wrapper"
            data-visible={canTarget ? "true" : "false"}
            aria-hidden={!canTarget}
          >
            <button
              className={`target-toggle${isTarget ? " active" : ""}`}
              aria-label={targetButtonLabel}
              disabled={!canTarget}
              tabIndex={canTarget ? 0 : -1}
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
          <div
            className="target-toggle-wrapper"
            data-visible={canFavorite ? "true" : "false"}
            aria-hidden={!canFavorite}
          >
            <button
              className={`target-toggle favorite-toggle${
                isFavorite ? " active" : ""
              }`}
              aria-label={favoriteButtonLabel}
              disabled={!canFavorite}
              tabIndex={canFavorite ? 0 : -1}
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
          <div
            className="target-toggle-wrapper"
            data-visible={canShare ? "true" : "false"}
            aria-hidden={!canShare}
          >
            <button
              className="target-toggle share-toggle"
              aria-label={shareButtonLabel}
              disabled={!canShare}
              tabIndex={canShare ? 0 : -1}
              onClick={(event) => {
                event.currentTarget.blur();
                onShareLocation?.();
              }}
            >
              <img
                src={shareIcon}
                alt=""
                aria-hidden="true"
                className="target-toggle-icon"
              />
            </button>
            <span className="target-toggle-label" aria-hidden="true">
              {shareLabel}
            </span>
          </div>
        </div>
      ) : null}
      <div className="popup-coords">
        <span key={resolvedCoordsLabel} className="popup-coords-label">
          {resolvedCoordsLabel}
        </span>
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
        {onExtraAction && (
          <button className="popup-btn" onClick={onExtraAction}>
            {resolvedExtraLabel}
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
