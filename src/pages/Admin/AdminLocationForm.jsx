import { INPUT_FIELDS, TEXTAREAS } from "./adminConstants";

export default function AdminLocationForm({
  draft,
  onFieldChange,
  onReset,
  onCancelEdit,
  onSubmit,
  isEditing = false,
}) {
  const secondaryAction = isEditing ? onCancelEdit : onReset;
  const secondaryLabel = isEditing ? "Cancel edit" : "Clear";
  const submitLabel = isEditing ? "Save changes" : "Add location";

  return (
    <form className="admin-location-form" onSubmit={onSubmit}>
      {isEditing ? (
        <div className="profile-readonly admin-location-editing">
          Editing location ID: {draft.id}
        </div>
      ) : null}

      <div className="admin-location-grid">
        {INPUT_FIELDS.map(
          ({
            key,
            label,
            className,
            type = "text",
            step,
            min,
            max,
            placeholder,
          }) => (
            <label key={key} className={`profile-field ${className}`}>
              <span className="profile-label">{label}</span>
              <input
                className="profile-input"
                type={type}
                step={step}
                min={min}
                max={max}
                value={draft[key]}
                onChange={onFieldChange(key)}
                placeholder={placeholder}
              />
            </label>
          ),
        )}
      </div>

      {TEXTAREAS.map(({ key, label, placeholder, note }) => (
        <label key={key} className="profile-field">
          <span className="profile-label">{label}</span>
          <textarea
            className="profile-textarea"
            rows="3"
            value={draft[key]}
            onChange={onFieldChange(key)}
            placeholder={placeholder}
          />
          {note ? <span className="admin-location-note">{note}</span> : null}
        </label>
      ))}

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
