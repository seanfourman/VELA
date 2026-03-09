import SkyQualityInfo from "../SkyQualityInfo";
import targetIcon from "@/assets/icons/target-icon.svg";
import favoriteIcon from "@/assets/icons/favorite-icon.svg";
import shareIcon from "@/assets/icons/share-icon.svg";
import { copyCoordinates, formatCoordinatesLabel } from "./copyCoordinates";

export default function DarkSpotPopupContent({
  spot,
  isAuthenticated,
  isFavoriteSpot,
  isSelected,
  onToggleTarget,
  onToggleFavorite,
  onShareLocation,
  onOpenSpaceWeather,
  flashShareToggle,
  buildDirectionsUrl,
  getDirectionsOrigin,
}) {
  if (!spot) return null;

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
  const coordinatesLabel = formatCoordinatesLabel({ lat: spot.lat, lng: spot.lon });
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
          <span className="popup-coords-label">Stargazing location</span>
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
          {onOpenSpaceWeather ? (
            <button className="popup-btn" onClick={onOpenSpaceWeather}>
              Get Space Weather
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
