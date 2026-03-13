import { useCallback, useRef } from "react";
import "./styles/PageShell.css";
import { navigateToMapHome } from "@/utils/navigation";

export default function PageShell({
  title,
  subtitle,
  isLight = false,
  className,
  hero,
  headerActions,
  onNavigate,
  onBack,
  hideHeader = false,
  hideBackButton = false,
  children,
}) {
  const pageRef = useRef(null);
  const contentRef = useRef(null);
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
    navigateToMapHome({ navigate: onNavigate });
  };

  const handleBackgroundWheel = useCallback((event) => {
    const pageNode = pageRef.current;
    const contentNode = contentRef.current;
    const targetNode = event.target;

    if (!pageNode || !contentNode || !(targetNode instanceof Node)) {
      return;
    }

    if (contentNode.contains(targetNode)) {
      return;
    }

    if (pageNode.scrollHeight <= pageNode.clientHeight) {
      return;
    }

    const deltaMultiplier =
      event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
          ? pageNode.clientHeight
          : 1;

    event.preventDefault();
    pageNode.scrollBy({
      top: event.deltaY * deltaMultiplier,
      left: event.deltaX * deltaMultiplier,
      behavior: "auto",
    });
  }, []);

  return (
    <div ref={pageRef} className={rootClassName} onWheel={handleBackgroundWheel}>
      {hero ? (
        <div className="profile-page__earth" aria-hidden="true">
          {hero}
        </div>
      ) : null}
      <div ref={contentRef} className="profile-page__content">
        {!hideHeader ? (
          <header className="profile-page__header">
            <div>
              <h1 className="profile-page__title">{title}</h1>
              {subtitle ? (
                <p className="profile-page__subtitle">{subtitle}</p>
              ) : null}
            </div>
            <div className="profile-page__header-actions">
              {!hideBackButton && (
                <button
                  type="button"
                  className="glass-btn profile-action-btn"
                  onClick={handleBackToMap}
                >
                  Back to map
                </button>
              )}
              {headerActions}
            </div>
          </header>
        ) : null}
        {children}
      </div>
    </div>
  );
}
