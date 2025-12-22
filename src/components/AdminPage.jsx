import "./ProfilePage.css";

function AdminPage({ auth, isAdmin, isLight, onNavigate }) {
  const isAuthenticated = Boolean(auth?.isAuthenticated);

  const handleBackToMap = () => {
    if (onNavigate) {
      onNavigate("/");
      return;
    }
    window.location.assign("/");
  };

  return (
    <div className={`profile-page admin-page ${isLight ? "light" : ""}`}>
      <div className="profile-page__content">
        <header className="profile-page__header">
          <div>
            <h1 className="profile-page__title">Admin Panel</h1>
            <p className="profile-page__subtitle">
              Access admin-only tools and manage system settings.
            </p>
          </div>
          <div className="profile-page__header-actions">
            <button
              type="button"
              className="glass-btn profile-action-btn"
              onClick={handleBackToMap}
            >
              Back to map
            </button>
          </div>
        </header>

        {!isAuthenticated ? (
          <section className="profile-card glass-panel glass-panel-elevated">
            <h2 className="profile-section-title">Sign in required</h2>
            <p className="profile-section-copy">
              Sign in with an admin account to access this area.
            </p>
            <button
              type="button"
              className="glass-btn profile-action-btn"
              onClick={() => auth?.signIn?.()}
            >
              Sign In
            </button>
          </section>
        ) : !isAdmin ? (
          <section className="profile-card glass-panel glass-panel-elevated">
            <h2 className="profile-section-title">Access restricted</h2>
            <p className="profile-section-copy">
              You are signed in, but this account does not have admin access.
            </p>
            <button
              type="button"
              className="glass-btn profile-action-btn"
              onClick={handleBackToMap}
            >
              Return to map
            </button>
          </section>
        ) : (
          <section className="profile-card glass-panel glass-panel-elevated">
            <h2 className="profile-section-title">Admin tools</h2>
            <p className="profile-section-copy">
              This is a placeholder for admin-only tools. Let me know what
              controls you want to surface here.
            </p>
            <div className="admin-grid">
              <div className="profile-readonly">
                Manage users and permissions
              </div>
              <div className="profile-readonly">
                Review reports and analytics
              </div>
              <div className="profile-readonly">
                Configure system settings
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default AdminPage;
