import ContextMenuPopup from "./ContextMenuPopup";
import SkyQualityInfo from "./SkyQualityInfo";
import targetIcon from "../../../assets/icons/target-icon.svg";
import favoriteIcon from "../../../assets/icons/favorite-icon.svg";
import shareIcon from "../../../assets/icons/share-icon.svg";

function LocationPopupContent({ location }) {
  if (!location) return null;

  return (
    <div className="context-menu-popup">
      <div className="popup-coords">
        <span className="popup-coords-label">Your location</span>
        <span className="popup-coords-value">
          {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
        </span>
      </div>

      <SkyQualityInfo lat={location.lat} lng={location.lng} variant="compact" />
    </div>
  );
}

function PinnedPopupContent({
  placedMarker,
  isAuthenticated,
  isPinnedTarget,
  onGetDirections,
  onRemovePin,
  onToggleFavorite,
  onToggleTarget,
  onShareLocation,
}) {
  if (!placedMarker) return null;

  return (
    <ContextMenuPopup
      coords={placedMarker}
      onGetDirections={onGetDirections}
      onRemovePin={onRemovePin}
      isAuthenticated={Boolean(isAuthenticated)}
      isFavorite={Boolean(placedMarker.isFavorite)}
      onToggleFavorite={onToggleFavorite}
      coordsLabel={
        placedMarker.isFavorite ? "Favorited spot" : "Pinned location"
      }
      isTarget={Boolean(isPinnedTarget)}
      onToggleTarget={placedMarker.isFavorite ? onToggleTarget : null}
      onShareLocation={onShareLocation}
    />
  );
}

function StargazePopupContent({
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
    />
  );
}

function FavoritePopupContent({
  spot,
  isAuthenticated,
  isSelected,
  onGetDirections,
  onRemoveFavorite,
  onToggleTarget,
  onShareLocation,
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
    />
  );
}

function DarkSpotPopupContent({
  spot,
  isAuthenticated,
  isFavoriteSpot,
  isSelected,
  onToggleTarget,
  onToggleFavorite,
  onShareLocation,
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
      <div className="popup-coords">
        <span className="popup-coords-label">Stargazing location</span>
        <span className="popup-coords-value">
          {spot.lat.toFixed(4)}, {spot.lon.toFixed(4)}
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
              aria-label="Modeled brightness at the site (ucd/mA\u0131)"
              data-tooltip="Modeled brightness at the site (ucd/mA\u0131)"
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
              className="popup-btn"
              onClick={() => {
                window.open(directionsUrl, "_blank");
              }}
            >
              Get Directions
              {origin ? (
                <>
                  <br />
                  (from {origin.label.toLowerCase()})
                </>
              ) : null}
            </button>
          );
        })()}
      </div>
    </div>
  );
}

export {
  LocationPopupContent,
  PinnedPopupContent,
  StargazePopupContent,
  FavoritePopupContent,
  DarkSpotPopupContent,
};
