import { Marker, Popup } from "react-leaflet";
import {
  specialEventIcon,
  starPartyEventIcon,
} from "@/pages/Map/MapView/mapIcons";
import { StarPartyPopupContent } from "@/pages/Map/MapView/MapPopups";

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
          event.eventType === "special_event"
            ? specialEventIcon
            : starPartyEventIcon
        }
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
  });
}
