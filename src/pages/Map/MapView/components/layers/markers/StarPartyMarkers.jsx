import { useEffect, useRef } from "react";
import { Marker, Popup } from "react-leaflet";
import {
  specialEventIcon,
  starPartyEventIcon,
} from "@/pages/Map/MapView/core/markerIcons";
import { StarPartyPopupContent } from "@/pages/Map/MapView/components/popups/PopupContent";

const RSVP_CONFETTI_MS = 900;

function StarPartyMarkerItem({
  event,
  isAuthenticated,
  isJoined,
  rsvpCount,
  centerOnCoords,
  handleShareLocation,
  buildDirectionsUrl,
  getDirectionsOrigin,
  onToggleRsvp,
}) {
  const markerRef = useRef(null);
  const prevJoinedRef = useRef(isJoined);
  const confettiTimerRef = useRef(0);

  useEffect(() => {
    const marker = markerRef.current;
    const icon = marker?._icon;
    const justJoined = !prevJoinedRef.current && isJoined;
    prevJoinedRef.current = isJoined;
    if (!justJoined || !icon) return;

    icon.classList.remove("rsvp-confetti-pop");
    // Force reflow so repeated joins replay the animation.
    void icon.offsetHeight;
    icon.classList.add("rsvp-confetti-pop");

    if (confettiTimerRef.current) {
      window.clearTimeout(confettiTimerRef.current);
    }
    confettiTimerRef.current = window.setTimeout(() => {
      icon.classList.remove("rsvp-confetti-pop");
      confettiTimerRef.current = 0;
    }, RSVP_CONFETTI_MS);
  }, [isJoined]);

  useEffect(
    () => () => {
      if (confettiTimerRef.current) {
        window.clearTimeout(confettiTimerRef.current);
      }
    },
    [],
  );

  const directionsOrigin = getDirectionsOrigin?.();
  const directionsUrl = buildDirectionsUrl?.(directionsOrigin, {
    lat: event.lat,
    lng: event.lng,
  });

  return (
    <Marker
      key={`event-${event.id}`}
      position={[event.lat, event.lng]}
      icon={
        event.eventType === "special_event" ? specialEventIcon : starPartyEventIcon
      }
      ref={markerRef}
      eventHandlers={{
        popupopen: () => centerOnCoords?.(event.lat, event.lng),
      }}
    >
      <Popup>
        <StarPartyPopupContent
          event={event}
          isAuthenticated={isAuthenticated}
          isJoined={isJoined}
          rsvpCount={rsvpCount}
          onToggleRsvp={onToggleRsvp ? () => onToggleRsvp(event) : null}
          onShareLocation={() =>
            handleShareLocation?.(
              { lat: event.lat, lng: event.lng },
              `${event.title} meetup`,
            )
          }
          onGetDirections={
            directionsUrl
              ? () => {
                  window.open(directionsUrl, "_blank");
                }
              : null
          }
        />
      </Popup>
    </Marker>
  );
}

export default function StarPartyMarkers({
  events,
  isAuthenticated,
  activeUserRsvpId,
  centerOnCoords,
  handleShareLocation,
  buildDirectionsUrl,
  getDirectionsOrigin,
  onToggleRsvp,
}) {
  if (!Array.isArray(events) || events.length === 0) return null;

  return events.map((event) => {
    const rsvps = Array.isArray(event.rsvps) ? event.rsvps : [];
    const rsvpCount = rsvps.length;
    const isJoined = Boolean(
      activeUserRsvpId &&
        rsvps.some((entry) => String(entry.userId) === String(activeUserRsvpId)),
    );

    return (
      <StarPartyMarkerItem
        key={`event-${event.id}`}
        event={event}
        isAuthenticated={isAuthenticated}
        isJoined={isJoined}
        rsvpCount={rsvpCount}
        centerOnCoords={centerOnCoords}
        handleShareLocation={handleShareLocation}
        buildDirectionsUrl={buildDirectionsUrl}
        getDirectionsOrigin={getDirectionsOrigin}
        onToggleRsvp={onToggleRsvp}
      />
    );
  });
}
