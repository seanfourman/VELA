import { formatDateTime } from "@/utils/dateTime";

const typeLabel = (value) =>
  value === "special_event" ? "Special event" : "Star party";
const statusLabel = (value) => {
  if (value === "published") return "Published";
  if (value === "archived") return "Archived";
  return "Draft";
};

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
              <div className="admin-location-content admin-event-content">
                <div className="admin-location-title-row">
                  <div className="admin-location-title">{event.title}</div>
                  {isEditing ? (
                    <span className="admin-meta-chip admin-meta-chip--status admin-meta-chip--status-draft">
                      Editing
                    </span>
                  ) : null}
                </div>
                <div className="admin-location-meta admin-location-meta--datetime">
                  {formatDateTime(event.startsAt, { includeYear: true })}
                  {event.endsAt
                    ? ` - ${formatDateTime(event.endsAt, { includeYear: true })}`
                    : ""}
                </div>
                <div className="admin-location-meta admin-location-meta--coords">
                  {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
                </div>
                <div className="admin-location-chip-row">
                  <span className="admin-meta-chip admin-meta-chip--type">
                    {typeLabel(event.eventType)}
                  </span>
                  <span
                    className={`admin-meta-chip admin-meta-chip--status admin-meta-chip--status-${event.status}`}
                  >
                    {statusLabel(event.status)}
                  </span>
                  <span className="admin-meta-chip">RSVP {rsvpCount}</span>
                  <span className="admin-meta-chip">
                    Checklist {hostChecklistCount}
                  </span>
                </div>
              </div>
              <div className="admin-location-actions">
                <button
                  type="button"
                  className="glass-btn profile-action-btn admin-card-btn admin-card-btn--primary"
                  onClick={() => onEditEvent?.(event)}
                  disabled={isEditing}
                >
                  {isEditing ? "Editing" : "Edit"}
                </button>
                {onSetStatus ? (
                  <button
                    type="button"
                    className="glass-btn profile-action-btn admin-card-btn admin-card-btn--soft"
                    onClick={() => onSetStatus?.(event.id, statusActionNext)}
                    disabled={isArchived}
                  >
                    {statusActionLabel}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="glass-btn profile-action-btn admin-card-btn admin-card-btn--danger"
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
              <p className="admin-card-note">
                Meetup: {event.meetupDetails}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
