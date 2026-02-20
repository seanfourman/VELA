import { INPUT_FIELDS, TEXTAREAS } from "./adminConstants";

export default function AdminLocationForm({
  draft,
  onFieldChange,
  onReset,
  onSubmit,
}) {
  return (
    <form className="admin-location-form" onSubmit={onSubmit}>
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
          onClick={onReset}
        >
          Clear
        </button>
        <button
          type="submit"
          className="glass-btn profile-action-btn profile-primary"
        >
          Add location
        </button>
      </div>
    </form>
  );
}
