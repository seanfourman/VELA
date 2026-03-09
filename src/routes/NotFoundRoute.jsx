import PageShell from "@/components/layout/PageShell";
import { useAppLayoutContext } from "@/layouts/AppLayoutContext";

function NotFoundRoute() {
  const { isLight, navigate } = useAppLayoutContext();

  return (
    <PageShell
      title="Page not found"
      subtitle="The page you requested does not exist."
      isLight={isLight}
      onNavigate={navigate}
    >
      <section className="profile-card glass-panel glass-panel-elevated">
        <h2 className="profile-section-title">404</h2>
        <p className="profile-section-copy">
          Check the URL or go back to the map.
        </p>
        <div className="profile-actions">
          <button
            type="button"
            className="glass-btn profile-action-btn profile-primary"
            onClick={() => navigate("/")}
          >
            Open map
          </button>
        </div>
      </section>
    </PageShell>
  );
}

export default NotFoundRoute;
