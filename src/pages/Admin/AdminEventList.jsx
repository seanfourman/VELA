import { formatDateTime } from "@/utils/dateTime";

const typeLabel = (value) =>
  value === "special_event" ? "Special event" : "Star party";

export default function AdminEventList({
  events,
  onEditEvent,
  onDeleteEvent,
  onSetStatus,
  activeEventId = null,
}) {
  if (!Array.isArray(events) || events.length === 0) {
    return <div className="profile-readonly">No events created yet</div>;
  }

  return (
    <div className="admin-location-list">
      {events.map((event) => {
        const eventId = String(event.id || "").trim();
        const isEditing =
          Boolean(activeEventId) &&
          Boolean(eventId) &&
          activeEventId === eventId;
        const rsvpCount = Array.isArray(event.rsvps) ? event.rsvps.length : 0;
        const isPublished = event.status === "published";
        const isArchived = event.status === "archived";
        const hostChecklistCount = Array.isArray(event.hostChecklist)
          ? event.hostChecklist.length
          : 0;
        const statusActionLabel = isPublished ? "Set draft" : "Publish";
        const statusActionNext = isPublished ? "draft" : "published";

        return (
          <article
            key={event.id}
            className={`admin-location-card admin-event-card${
              isEditing ? " is-editing" : ""
            }`}
          >
            <div className="admin-location-card-header">
              <div>
                <div className="admin-location-title">{event.title}</div>
                <div className="admin-location-meta">
                  {formatDateTime(event.startsAt, { includeYear: true })}
                  {event.endsAt
                    ? ` - ${formatDateTime(event.endsAt, { includeYear: true })}`
                    : ""}
                </div>
                <div className="admin-location-meta">
                  {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
                </div>
                <div className="admin-location-meta">
                  {typeLabel(event.eventType)} | Status: {event.status} | RSVP:{" "}
                  {rsvpCount}
                  {" | "}Checklist: {hostChecklistCount}
                </div>
              </div>
              <div className="admin-location-actions">
                <button
                  type="button"
                  className="glass-btn profile-action-btn"
                  onClick={() => onEditEvent?.(event)}
                  disabled={isEditing}
                >
                  {isEditing ? "Editing" : "Edit"}
                </button>
                {onSetStatus ? (
                  <button
                    type="button"
                    className="glass-btn profile-action-btn"
                    onClick={() => onSetStatus?.(event.id, statusActionNext)}
                    disabled={isArchived}
                  >
                    {statusActionLabel}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="glass-btn profile-action-btn"
                  onClick={() => onDeleteEvent?.(event)}
                >
                  Remove
                </button>
              </div>
            </div>

            {event.description ? (
              <p className="admin-location-description">{event.description}</p>
            ) : null}
            {event.meetupDetails ? (
              <p className="admin-location-meta">
                Meetup: {event.meetupDetails}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
