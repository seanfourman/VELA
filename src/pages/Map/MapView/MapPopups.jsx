import ContextMenuPopup from "./ContextMenuPopup";
import SkyQualityInfo from "./SkyQualityInfo";
import targetIcon from "@/assets/icons/target-icon.svg";
import favoriteIcon from "@/assets/icons/favorite-icon.svg";
import shareIcon from "@/assets/icons/share-icon.svg";
import invitationHeartIcon from "@/assets/icons/invitation-heart-love-svgrepo-com.svg";

function LocationPopupContent({ location, onOpenSpaceWeather }) {
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

      {onOpenSpaceWeather ? (
        <div className="popup-actions">
          <button className="popup-btn" onClick={onOpenSpaceWeather}>
            Get Space Weather
          </button>
        </div>
      ) : null}
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
  onOpenSpaceWeather,
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
      onOpenSpaceWeather={onOpenSpaceWeather}
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

function FavoritePopupContent({
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

function DarkSpotPopupContent({
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
              aria-label="Modeled brightness at the site (ucd/m^2)"
              data-tooltip="Modeled brightness at the site (ucd/m^2)"
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
        {onOpenSpaceWeather ? (
          <button className="popup-btn" onClick={onOpenSpaceWeather}>
            Get Space Weather
          </button>
        ) : null}
      </div>
    </div>
  );
}

const formatEventDateTime = (value) => {
  if (!value) return "TBD";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "TBD";
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function StarPartyPopupContent({
  event,
  isAuthenticated,
  isJoined,
  rsvpCount,
  onToggleRsvp,
  onShareLocation,
  onGetDirections,
}) {
  if (!event) return null;

  const stopPopupEvent = (popupEvent) => {
    popupEvent.stopPropagation();
  };

  const flashShareToggle = (button) => {
    if (!button) return;
    button.classList.remove("share-flash");
    void button.offsetHeight;
    button.classList.add("share-flash");
    window.setTimeout(() => {
      button.classList.remove("share-flash");
    }, 2000);
  };

  const isSpecialEvent = event.eventType === "special_event";
  const eventTypeLabel = isSpecialEvent ? "Special event" : "Star party";
  const canRsvp = Boolean(onToggleRsvp);
  const canShare = Boolean(onShareLocation);
  const toggleCount = Number(canRsvp) + Number(canShare);
  const toggleLayout = toggleCount > 1 ? "dual" : "single";
  const rsvpActionLabel = !isAuthenticated
    ? "Sign in to RSVP"
    : isJoined
      ? "Leave this event"
      : "RSVP to this event";
  const rsvpHoverLabel = !isAuthenticated
    ? "Sign in"
    : isJoined
      ? "Joined"
      : "RSVP";

  return (
    <div
      className={`context-menu-popup star-party-popup${
        isSpecialEvent ? " is-special-event" : ""
      }`}
      onPointerDown={stopPopupEvent}
      onClick={stopPopupEvent}
    >
      {toggleCount > 0 ? (
        <div className="target-toggle-row" data-layout={toggleLayout}>
          <div
            className="target-toggle-wrapper"
            data-visible={canRsvp ? "true" : "false"}
            aria-hidden={!canRsvp}
          >
            <button
              className={`target-toggle rsvp-toggle${
                isSpecialEvent ? " special" : ""
              }${isJoined ? " active" : ""}`}
              aria-label={rsvpActionLabel}
              disabled={!canRsvp}
              tabIndex={canRsvp ? 0 : -1}
              onClick={(popupEvent) => {
                popupEvent.currentTarget.blur();
                onToggleRsvp?.();
              }}
            >
              <img
                src={invitationHeartIcon}
                alt=""
                aria-hidden="true"
                className="target-toggle-icon"
              />
            </button>
            <span
              className={`target-toggle-label rsvp-toggle-label${
                isSpecialEvent ? " special" : ""
              }${
                isJoined ? " active" : ""
              }`}
              aria-hidden="true"
            >
              {rsvpHoverLabel}
            </span>
          </div>
          <div
            className="target-toggle-wrapper"
            data-visible={canShare ? "true" : "false"}
            aria-hidden={!canShare}
          >
            <button
              className="target-toggle share-toggle"
              aria-label="Share meetup location"
              disabled={!canShare}
              tabIndex={canShare ? 0 : -1}
              onClick={(popupEvent) => {
                popupEvent.currentTarget.blur();
                flashShareToggle(popupEvent.currentTarget);
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
        </div>
      ) : null}

      <div className="star-party-popup__stats">
        <span className="star-party-popup__chip">RSVP {rsvpCount}</span>
      </div>

      <div className="popup-coords star-party-popup__title-block">
        <span className="popup-coords-label star-party-popup__type">
          {eventTypeLabel}
        </span>
        <span className="popup-coords-value star-party-popup__title">
          {event.title}
        </span>
        <div className="star-party-popup__time">
          {formatEventDateTime(event.startsAt)}
          {event.endsAt ? ` - ${formatEventDateTime(event.endsAt)}` : ""}
        </div>
      </div>

      <div className="popup-coords star-party-popup__meetup">
        <span className="popup-coords-label">Meetup pin</span>
        <span className="popup-coords-value star-party-popup__coords-value">
          {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
        </span>
      </div>

      <SkyQualityInfo lat={event.lat} lng={event.lng} variant="compact" />

      {event.description ? (
        <p className="star-party-popup__description">{event.description}</p>
      ) : null}

      {Array.isArray(event.hostChecklist) && event.hostChecklist.length > 0 ? (
        <div className="star-party-popup__checklist">
          <div className="star-party-popup__checklist-title">Host checklist</div>
          <ul>
            {event.hostChecklist.slice(0, 3).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {onGetDirections ? (
        <div className="popup-actions">
          <button className="popup-btn" onClick={onGetDirections}>
            Get Directions
          </button>
        </div>
      ) : null}
    </div>
  );
}

export {
  LocationPopupContent,
  PinnedPopupContent,
  StargazePopupContent,
  FavoritePopupContent,
  DarkSpotPopupContent,
  StarPartyPopupContent,
};
