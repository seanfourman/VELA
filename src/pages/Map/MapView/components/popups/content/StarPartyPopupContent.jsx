import SkyQualityInfo from "../SkyQualityInfo";
import shareIcon from "@/assets/icons/share-icon.svg";
import invitationHeartIcon from "@/assets/icons/invitation-heart-love-svgrepo-com.svg";
import { formatDateTime } from "@/utils/dateTime";
import { copyCoordinates, formatCoordinatesLabel } from "./copyCoordinates";

export default function StarPartyPopupContent({
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
  const coordinatesLabel = formatCoordinatesLabel({ lat: event.lat, lng: event.lng });
  const handleCopyCoords = (popupEvent) => {
    popupEvent.stopPropagation();
    void copyCoordinates({ lat: event.lat, lng: event.lng });
  };
  const handleCopyCoordsKeyDown = (popupEvent) => {
    if (popupEvent.key !== "Enter" && popupEvent.key !== " ") return;
    popupEvent.preventDefault();
    popupEvent.stopPropagation();
    void copyCoordinates({ lat: event.lat, lng: event.lng });
  };

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
      <div className="context-menu-popup__scroll">
        <div className="star-party-popup__stats">
          <span className="star-party-popup__chip">RSVP {rsvpCount}</span>
        </div>

        <div className="popup-coords star-party-popup__title-block">
          <span className="popup-coords-label star-party-popup__type">
            {eventTypeLabel}
          </span>
          <span className="star-party-popup__title">
            {event.title}
          </span>
          <div className="star-party-popup__time">
            {formatDateTime(event.startsAt)}
            {event.endsAt ? ` - ${formatDateTime(event.endsAt)}` : ""}
          </div>
        </div>

        <div className="popup-coords star-party-popup__meetup">
          <span className="popup-coords-label">Meetup pin</span>
          <span
            className="popup-coords-value star-party-popup__coords-value popup-coords-value--copyable"
            role="button"
            tabIndex={0}
            aria-label={`Copy coordinates ${coordinatesLabel}`}
            onClick={handleCopyCoords}
            onKeyDown={handleCopyCoordsKeyDown}
          >
            {coordinatesLabel}
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
    </div>
  );
}
