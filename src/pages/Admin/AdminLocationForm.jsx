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
  const primaryFieldKeys = new Set(["name", "country", "region", "lat", "lng"]);
  const primaryFields = INPUT_FIELDS.filter((field) => primaryFieldKeys.has(field.key));
  const advancedFields = INPUT_FIELDS.filter(
    (field) => !primaryFieldKeys.has(field.key),
  );
  const primaryTextareas = TEXTAREAS.filter((item) => item.key === "description");
  const advancedTextareas = TEXTAREAS.filter((item) => item.key !== "description");

  return (
    <form className="admin-location-form" onSubmit={onSubmit}>
      {isEditing ? (
        <div className="profile-readonly admin-location-editing">
          Editing location ID: {draft.id}
        </div>
      ) : null}

      <div className="admin-location-grid">
        {primaryFields.map(
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

      {primaryTextareas.map(({ key, label, placeholder, note }) => (
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

      <details className="admin-advanced-block">
        <summary>Advanced details</summary>
        <div className="admin-advanced-content">
          <div className="admin-location-grid">
            {advancedFields.map(
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

          {advancedTextareas.map(({ key, label, placeholder, note }) => (
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
          className={`glass-btn profile-action-btn profile-primary admin-submit-btn${
            isEditing ? "" : " admin-submit-btn--create"
          }`}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
