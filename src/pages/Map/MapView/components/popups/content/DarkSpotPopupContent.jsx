import { useEffect, useRef, useState } from "react";
import SkyQualityInfo from "../SkyQualityInfo";
import targetIcon from "@/assets/icons/target-icon.svg";
import favoriteIcon from "@/assets/icons/favorite-icon.svg";
import shareIcon from "@/assets/icons/share-icon.svg";
import editIcon from "@/assets/icons/edit-svgrepo-com.svg";
import { copyCoordinates, formatCoordinatesLabel } from "./copyCoordinates";

export default function DarkSpotPopupContent({
  spot,
  favoriteSpot,
  isAuthenticated,
  isFavoriteSpot,
  isSelected,
  onRenameFavoriteName,
  onToggleTarget,
  onToggleFavorite,
  onShareLocation,
  flashShareToggle,
  buildDirectionsUrl,
  getDirectionsOrigin,
}) {
  const [isEditingFavoriteName, setIsEditingFavoriteName] = useState(false);
  const [favoriteNameDraft, setFavoriteNameDraft] = useState("");
  const favoriteNameInputRef = useRef(null);
  const favoriteNameCancelRef = useRef(false);

  const buttonLabel = isSelected
    ? "This spot is the active target"
    : "Use this spot for quick actions";
  const hoverLabel = isSelected ? "Active target" : "Set as target";
  const favoriteLabel = isFavoriteSpot ? "Favorited" : "Favorite";
  const favoriteButtonLabel = isFavoriteSpot
    ? "Remove from favorites"
    : "Add to favorites";
  const canFavorite = Boolean(isAuthenticated);
  const canShare = true;
  const toggleCount = 1 + Number(canFavorite) + Number(canShare);
  const toggleLayout = toggleCount > 1 ? "dual" : "single";
  const coordinatesLabel = formatCoordinatesLabel({
    lat: spot?.lat ?? 0,
    lng: spot?.lon ?? 0,
  });
  const resolvedFavoriteName =
    typeof favoriteSpot?.customName === "string" && favoriteSpot.customName.trim()
      ? favoriteSpot.customName.trim()
      : "";
  const defaultHeaderLabel = "Stargazing location";
  const canRenameFavorite =
    Boolean(isFavoriteSpot && isAuthenticated) &&
    typeof onRenameFavoriteName === "function";
  const displayHeaderLabel = resolvedFavoriteName || defaultHeaderLabel;
  const headerInputSize = Math.max(
    (favoriteNameDraft || displayHeaderLabel).length,
    defaultHeaderLabel.length,
    1
  );
  const headerRowClassName = `popup-coords-label-row${
    resolvedFavoriteName ? " is-custom" : ""
  }${canRenameFavorite ? " is-editable" : ""}`;

  const stopPopupEvent = (event) => {
    event.stopPropagation();
  };

  const handleCopyCoords = (event) => {
    event.stopPropagation();
    void copyCoordinates({ lat: spot.lat, lng: spot.lon });
  };

  const handleCopyCoordsKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    void copyCoordinates({ lat: spot.lat, lng: spot.lon });
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
    onRenameFavoriteName?.(favoriteSpot, favoriteNameDraft);
    setIsEditingFavoriteName(false);
  };

  useEffect(() => {
    if (!isEditingFavoriteName) return;
    favoriteNameInputRef.current?.focus?.();
    favoriteNameInputRef.current?.select?.();
  }, [isEditingFavoriteName]);

  if (!spot) return null;

  return (
    <div className="context-menu-popup darkspot-popup">
      <div className="target-toggle-row" data-layout={toggleLayout}>
        <div className="target-toggle-wrapper">
          <button
            className={`target-toggle${isSelected ? " active" : ""}`}
            aria-label={buttonLabel}
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
            className={`target-toggle-label${isSelected ? " active" : ""}`}
            aria-hidden="true"
          >
            {hoverLabel}
          </span>
        </div>
        {canFavorite ? (
          <div className="target-toggle-wrapper">
            <button
              className={`target-toggle favorite-toggle${
                isFavoriteSpot ? " active" : ""
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
                isFavoriteSpot ? " active" : ""
              }`}
              aria-hidden="true"
            >
              {favoriteLabel}
            </span>
          </div>
        ) : null}
        {canShare ? (
          <div className="target-toggle-wrapper">
            <button
              className="target-toggle share-toggle"
              aria-label="Share this location"
              onClick={(event) => {
                event.currentTarget.blur();
                flashShareToggle?.(event.currentTarget);
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
              Share
            </span>
          </div>
        ) : null}
      </div>
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
                  className="popup-coords-label"
                  onDoubleClick={canRenameFavorite ? beginFavoriteNameEdit : undefined}
                >
                  {displayHeaderLabel}
                </span>
              )}
              <span
                className={`popup-coords-edit-trigger${
                  canRenameFavorite ? " is-visible" : ""
                }`}
                role={canRenameFavorite ? "button" : undefined}
                tabIndex={canRenameFavorite ? 0 : -1}
                aria-hidden={!canRenameFavorite}
                aria-label={canRenameFavorite ? "Rename favorite" : undefined}
                style={{ "--popup-edit-icon": `url("${editIcon}")` }}
                onClick={beginFavoriteNameEdit}
                onKeyDown={(event) => {
                  if (!canRenameFavorite) return;
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  beginFavoriteNameEdit(event);
                }}
              >
                <span aria-hidden="true" className="popup-coords-edit-icon" />
              </span>
            </span>
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

        <SkyQualityInfo lat={spot.lat} lng={spot.lon} variant="compact" />

        <div className="darkspot-stats">
          <div className="darkspot-stat">
            <span className="darkspot-stat-label">
              Level
              <span
                className="stat-help"
                tabIndex={0}
                aria-label="Darkness rating: lower numbers are darker skies (1-5)"
                data-tooltip="Darkness rating: lower numbers are darker skies (1-5)"
              >
                ?
              </span>
            </span>
            <span className="darkspot-stat-value">{spot.level ?? "--"}</span>
          </div>
          <div className="darkspot-stat">
            <span className="darkspot-stat-label">
              Light value
              <span
                className="stat-help"
                tabIndex={0}
                aria-label={"Modeled brightness at the site (ucd/m\u00B2)"}
                data-tooltip={"Modeled brightness at the site (ucd/m\u00B2)"}
              >
                ?
              </span>
            </span>
            <span className="darkspot-stat-value">
              {spot.light_value != null ? spot.light_value.toFixed(2) : "--"}
            </span>
          </div>
        </div>
        <div className="popup-actions">
          {(() => {
            const origin = getDirectionsOrigin?.();
            const directionsUrl = buildDirectionsUrl?.(origin, {
              lat: spot.lat,
              lng: spot.lon,
            });
            if (!directionsUrl) return null;
            return (
              <button
                className="popup-btn popup-btn--directions"
                onClick={() => {
                  window.open(directionsUrl, "_blank");
                }}
              >
                <span className="popup-btn__label">Get Directions</span>
                {origin ? (
                  <span className="popup-btn__origin">
                    from {origin.label.toLowerCase()}
                  </span>
                ) : null}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
