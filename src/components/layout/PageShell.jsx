import "./PageShell.css";

export default function PageShell({
  title,
  subtitle,
  isLight = false,
  className,
  hero,
  headerActions,
  onNavigate,
  onBack,
  children,
}) {
  const rootClassName = [
    "profile-page",
    className,
    isLight ? "light" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleBackToMap = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (onNavigate) {
      onNavigate("/");
      return;
    }
    window.location.assign("/");
  };

  return (
    <div className={rootClassName}>
      {hero ? (
        <div className="profile-page__earth" aria-hidden="true">
          {hero}
        </div>
      ) : null}
      <div className="profile-page__content">
        <header className="profile-page__header">
          <div>
            <h1 className="profile-page__title">{title}</h1>
            {subtitle ? (
              <p className="profile-page__subtitle">{subtitle}</p>
            ) : null}
          </div>
          <div className="profile-page__header-actions">
            <button
              type="button"
              className="glass-btn profile-action-btn"
              onClick={handleBackToMap}
            >
              Back to map
            </button>
            {headerActions}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
