export default function AdminAccessNotice({
  title,
  message,
  buttonLabel,
  onAction,
}) {
  return (
    <section className="profile-card glass-panel glass-panel-elevated">
      <h2 className="profile-section-title">{title}</h2>
      <p className="profile-section-copy">{message}</p>
      <button
        type="button"
        className="glass-btn profile-action-btn"
        onClick={onAction}
      >
        {buttonLabel}
      </button>
    </section>
  );
}
