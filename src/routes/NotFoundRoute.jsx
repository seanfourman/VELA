import PageShell from "@/components/layout/PageShell";
import { useAppLayoutContext } from "@/layouts/AppLayoutContext";
import brokenWebLinkIcon from "@/assets/icons/broken-web-link-svgrepo-com.svg";

function NotFoundRoute() {
  const { isLight, navigate } = useAppLayoutContext();

  return (
    <PageShell
      title="Page not found"
      subtitle="The page you requested does not exist."
      isLight={isLight}
      onNavigate={navigate}
    >
      <section className="profile-card glass-panel glass-panel-elevated not-found-card">
        <img
          src={brokenWebLinkIcon}
          alt=""
          aria-hidden="true"
          className="not-found-card__icon"
        />
        <h2 className="profile-section-title not-found-card__code">404</h2>
        <p className="profile-section-copy">
          Check the URL and try again
        </p>
      </section>
    </PageShell>
  );
}

export default NotFoundRoute;
