import { useEffect, useRef, useState } from "react";
import SkyQualityInfo from "./SkyQualityInfo";
import editIcon from "@/assets/icons/edit-svgrepo-com.svg";
import favoriteIcon from "@/assets/icons/favorite-icon.svg";
import targetIcon from "@/assets/icons/target-icon.svg";
import shareIcon from "@/assets/icons/share-icon.svg";
import {
  copyCoordinates,
  formatCoordinatesLabel,
} from "./content/copyCoordinates";
import "./styles/ContextMenuPopup.css";

export default function ContextMenuPopup({
  coords,
  onGetDirections,
  onRemovePin,
  onExtraAction,
  onOpenSpaceWeather,
  isAuthenticated,
  isFavorite,
  onToggleFavorite,
  coordsLabel,
  removeLabel,
  extraActionLabel,
  isTarget,
  onToggleTarget,
  onShareLocation,
  favoriteName,
  onRenameFavoriteName,
}) {
  const [isEditingFavoriteName, setIsEditingFavoriteName] = useState(false);
  const [favoriteNameDraft, setFavoriteNameDraft] = useState("");
  const favoriteNameInputRef = useRef(null);
  const favoriteNameCancelRef = useRef(false);

  const stopPopupEvent = (event) => {
    event.stopPropagation();
  };

  const flashShareToggle = (button) => {
    if (!button) return;
    button.classList.remove("share-flash");
    // Force reflow so the animation restarts on repeat clicks.
    void button.offsetHeight;
    button.classList.add("share-flash");
    window.setTimeout(() => {
      button.classList.remove("share-flash");
    }, 2000);
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
  const coordinatesLabel = formatCoordinatesLabel({
    lat: coords?.lat ?? 0,
    lng: coords?.lng ?? 0,
  });
  const resolvedFavoriteName =
    typeof favoriteName === "string" && favoriteName.trim()
      ? favoriteName.trim()
      : "";
  const canRenameFavorite =
    Boolean(isFavorite) && typeof onRenameFavoriteName === "function";
  const displayHeaderLabel = resolvedFavoriteName || resolvedCoordsLabel;
  const headerInputSize = Math.max(
    (favoriteNameDraft || displayHeaderLabel).length,
    resolvedCoordsLabel.length,
    1
  );
  const headerRowClassName = `popup-coords-label-row${
    resolvedFavoriteName ? " is-custom" : ""
  }${canRenameFavorite ? " is-editable" : ""}`;

  const handleCopyCoords = (event) => {
    event.stopPropagation();
    void copyCoordinates({ lat: coords.lat, lng: coords.lng });
  };

  const handleCopyCoordsKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    void copyCoordinates({ lat: coords.lat, lng: coords.lng });
  };

  const beginFavoriteNameEdit = (event) => {
    event.stopPropagation();
    if (!canRenameFavorite) return;
    favoriteNameCancelRef.current = false;
    setFavoriteNameDraft(resolvedFavoriteName);
    setIsEditingFavoriteName(true);
  };

  const cancelFavoriteNameEdit = () => {
    favoriteNameCancelRef.current = true;
    setFavoriteNameDraft(resolvedFavoriteName);
    setIsEditingFavoriteName(false);
  };

  const commitFavoriteNameEdit = () => {
    if (!canRenameFavorite) return;
    if (favoriteNameCancelRef.current) {
      favoriteNameCancelRef.current = false;
      setFavoriteNameDraft(resolvedFavoriteName);
      setIsEditingFavoriteName(false);
      return;
    }
    onRenameFavoriteName?.(favoriteNameDraft);
    setIsEditingFavoriteName(false);
  };

  useEffect(() => {
    if (!isEditingFavoriteName) return;
    favoriteNameInputRef.current?.focus?.();
    favoriteNameInputRef.current?.select?.();
  }, [isEditingFavoriteName]);

  if (!coords) return null;

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
                flashShareToggle(event.currentTarget);
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
      <div className="context-menu-popup__scroll">
        <div className="popup-coords">
          <span className={headerRowClassName}>
            <span className="popup-coords-label-shell">
              {canRenameFavorite && isEditingFavoriteName ? (
                <input
                  ref={favoriteNameInputRef}
                  type="text"
                  className="popup-coords-label-input"
                  value={favoriteNameDraft}
                  size={headerInputSize}
                  maxLength={120}
                  placeholder={displayHeaderLabel}
                  onChange={(event) => {
                    setFavoriteNameDraft(event.target.value);
                  }}
                  onBlur={commitFavoriteNameEdit}
                  onClick={stopPopupEvent}
                  onDoubleClick={stopPopupEvent}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitFavoriteNameEdit();
                      return;
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelFavoriteNameEdit();
                    }
                  }}
                />
              ) : (
                <span
                  key={displayHeaderLabel}
                  className="popup-coords-label"
                  onDoubleClick={canRenameFavorite ? beginFavoriteNameEdit : undefined}
                >
                  {displayHeaderLabel}
                </span>
              )}
            </span>
            {canRenameFavorite ? (
              <span
                className="popup-coords-edit-trigger"
                role="button"
                tabIndex={0}
                aria-label="Rename favorite"
                style={{ "--popup-edit-icon": `url("${editIcon}")` }}
                onClick={beginFavoriteNameEdit}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  beginFavoriteNameEdit(event);
                }}
              >
                <span aria-hidden="true" className="popup-coords-edit-icon" />
              </span>
            ) : null}
          </span>
          <span
            className="popup-coords-value popup-coords-value--copyable"
            role="button"
            tabIndex={0}
            aria-label={`Copy coordinates ${coordinatesLabel}`}
            onClick={handleCopyCoords}
            onKeyDown={handleCopyCoordsKeyDown}
          >
            {coordinatesLabel}
          </span>
        </div>

        <SkyQualityInfo lat={coords.lat} lng={coords.lng} variant="compact" />

        <div className="popup-actions">
          {onGetDirections && (
            <button className="popup-btn" onClick={onGetDirections}>
              Get Directions
            </button>
          )}
          {onOpenSpaceWeather && (
            <button className="popup-btn" onClick={onOpenSpaceWeather}>
              Get Space Weather
            </button>
          )}
          {onExtraAction && (
            <button className="popup-btn" onClick={onExtraAction}>
              {resolvedExtraLabel}
            </button>
          )}
          {onRemovePin && (
            <button className="popup-btn" onClick={onRemovePin}>
              <span
                key={resolvedRemoveLabel}
                className="popup-btn__label popup-btn__label--swap"
              >
                {resolvedRemoveLabel}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
