import { EVENT_STATUS_OPTIONS, EVENT_TYPE_OPTIONS } from "./adminConstants";
import AdminDatePicker from "./AdminDatePicker";

export default function AdminEventForm({
  draft,
  onFieldChange,
  onSubmit,
  onReset,
  onCancelEdit,
  isEditing = false,
}) {
  const secondaryAction = isEditing ? onCancelEdit : onReset;
  const secondaryLabel = isEditing ? "Cancel edit" : "Clear";
  const submitLabel = isEditing ? "Save event" : "Create event";
  const eventTypeIndex = Math.max(
    0,
    EVENT_TYPE_OPTIONS.findIndex((option) => option.value === draft.eventType),
  );
  const statusIndex = Math.max(
    0,
    EVENT_STATUS_OPTIONS.findIndex((option) => option.value === draft.status),
  );
  const typeSwitcherStyle = {
    "--switch-index": eventTypeIndex,
    "--switch-count": EVENT_TYPE_OPTIONS.length,
  };
  const statusSwitcherStyle = {
    "--switch-index": statusIndex,
    "--switch-count": EVENT_STATUS_OPTIONS.length,
  };
  const emitFieldValue = (key, value) =>
    onFieldChange(key)({
      target: { value },
    });

  return (
    <form className="admin-event-form" onSubmit={onSubmit}>
      {isEditing ? (
        <div className="profile-readonly admin-location-editing">
          Editing event ID: {draft.id}
        </div>
      ) : null}

      <label className="profile-field">
        <span className="profile-label">Event title</span>
        <input
          className="profile-input"
          type="text"
          value={draft.title}
          onChange={onFieldChange("title")}
          placeholder="Negev Milky Way Meetup"
        />
      </label>

      <div className="settings-row admin-inline-switch-row">
        <div className="settings-row__text">
          <div className="settings-row__title">Event type</div>
          <div className="settings-row__subtitle">
            Party markers and special event markers look different on the map.
          </div>
        </div>
        <div
          className="settings-switcher admin-form-switcher"
          role="group"
          aria-label="Event type"
          style={typeSwitcherStyle}
        >
          {EVENT_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`settings-switch${
                draft.eventType === option.value ? " active" : ""
              }`}
              aria-pressed={draft.eventType === option.value}
              onClick={() =>
                onFieldChange("eventType")({
                  target: { value: option.value },
                })
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-row admin-inline-switch-row">
        <div className="settings-row__text">
          <div className="settings-row__title">Publish status</div>
          <div className="settings-row__subtitle">
            Only published events appear on the map for users.
          </div>
        </div>
        <div
          className="settings-switcher admin-form-switcher"
          role="group"
          aria-label="Event status"
          style={statusSwitcherStyle}
        >
          {EVENT_STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`settings-switch${
                draft.status === option.value ? " active" : ""
              }`}
              aria-pressed={draft.status === option.value}
              onClick={() =>
                onFieldChange("status")({
                  target: { value: option.value },
                })
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-event-grid">
        <label className="profile-field admin-grid-span-2">
          <span className="profile-label">Starts at</span>
          <AdminDatePicker
            value={draft.startsAt}
            onChange={(next) => emitFieldValue("startsAt", next)}
          />
        </label>

        <label className="profile-field admin-grid-span-2">
          <span className="profile-label">Latitude</span>
          <input
            className="profile-input"
            type="number"
            min="-90"
            max="90"
            step="0.0001"
            value={draft.lat}
            onChange={onFieldChange("lat")}
            placeholder="31.4012"
          />
        </label>

        <label className="profile-field admin-grid-span-2">
          <span className="profile-label">Longitude</span>
          <input
            className="profile-input"
            type="number"
            min="-180"
            max="180"
            step="0.0001"
            value={draft.lng}
            onChange={onFieldChange("lng")}
            placeholder="35.1012"
          />
        </label>
      </div>

      <details className="admin-advanced-block">
        <summary>Advanced details</summary>
        <div className="admin-advanced-content">
          <label className="profile-field">
            <span className="profile-label">Ends at</span>
            <AdminDatePicker
              value={draft.endsAt}
              onChange={(next) => emitFieldValue("endsAt", next)}
            />
          </label>

          <label className="profile-field">
            <span className="profile-label">Description</span>
            <textarea
              className="profile-textarea"
              rows="3"
              value={draft.description}
              onChange={onFieldChange("description")}
              placeholder="Public night-sky event with guided telescope stations."
            />
          </label>

          <label className="profile-field">
            <span className="profile-label">Meetup notes</span>
            <textarea
              className="profile-textarea"
              rows="2"
              value={draft.meetupDetails}
              onChange={onFieldChange("meetupDetails")}
              placeholder="Park near the south gate and follow red lights."
            />
          </label>

          <label className="profile-field">
            <span className="profile-label">Host checklist</span>
            <textarea
              className="profile-textarea"
              rows="3"
              value={draft.hostChecklist}
              onChange={onFieldChange("hostChecklist")}
              placeholder={"Bring power bank\nCheck weather radar\nPrepare backup site"}
            />
            <span className="admin-location-note">
              Separate checklist items with commas or new lines.
            </span>
          </label>
        </div>
      </details>

      <div className="admin-location-actions">
        <button
          type="button"
          className="glass-btn profile-action-btn profile-secondary"
          onClick={secondaryAction}
        >
          {secondaryLabel}
        </button>
        <button
          type="submit"
          className="glass-btn profile-action-btn profile-primary"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
