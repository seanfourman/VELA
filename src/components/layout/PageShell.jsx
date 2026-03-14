import { useEffect, useRef } from "react";
import "./styles/PageShell.css";
import { navigateToMapHome } from "@/utils/navigation";

const SCROLL_EASING = 0.18;
const MIN_SCROLL_DELTA = 0.5;

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
  const scrollAnimationFrameRef = useRef(0);
  const targetScrollTopRef = useRef(0);
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

  useEffect(() => {
    const pageNode = pageRef.current;
    if (!pageNode) {
      return undefined;
    }

    const animateScrollToTarget = () => {
      const activePageNode = pageRef.current;

      if (!activePageNode) {
        scrollAnimationFrameRef.current = 0;
        return;
      }

      const distance = targetScrollTopRef.current - activePageNode.scrollTop;

      if (Math.abs(distance) <= MIN_SCROLL_DELTA) {
        activePageNode.scrollTop = targetScrollTopRef.current;
        scrollAnimationFrameRef.current = 0;
        return;
      }

      activePageNode.scrollTop += distance * SCROLL_EASING;
      scrollAnimationFrameRef.current =
        requestAnimationFrame(animateScrollToTarget);
    };

    const queueSmoothScroll = (delta) => {
      if (!Number.isFinite(delta) || delta === 0) {
        return;
      }

      const maxScrollTop = Math.max(
        0,
        pageNode.scrollHeight - pageNode.clientHeight,
      );

      if (!scrollAnimationFrameRef.current) {
        targetScrollTopRef.current = pageNode.scrollTop;
      }

      targetScrollTopRef.current = Math.min(
        maxScrollTop,
        Math.max(0, targetScrollTopRef.current + delta),
      );

      if (!scrollAnimationFrameRef.current) {
        scrollAnimationFrameRef.current =
          requestAnimationFrame(animateScrollToTarget);
      }
    };

    const handleNativeWheel = (event) => {
      const contentNode = contentRef.current;
      const targetNode = event.target;

      if (
        !contentNode ||
        !(targetNode instanceof Node) ||
        event.ctrlKey
      ) {
        return;
      }

      if (
        contentNode.contains(targetNode) ||
        pageNode.scrollHeight <= pageNode.clientHeight
      ) {
        return;
      }

      const computedLineHeight = Number.parseFloat(
        window.getComputedStyle(pageNode).lineHeight,
      );
      const lineHeight = Number.isFinite(computedLineHeight)
        ? computedLineHeight
        : 16;
      const deltaMultiplier =
        event.deltaMode === 1
          ? lineHeight
          : event.deltaMode === 2
            ? pageNode.clientHeight
            : 1;

      event.preventDefault();
      queueSmoothScroll(event.deltaY * deltaMultiplier);
    };

    pageNode.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      pageNode.removeEventListener("wheel", handleNativeWheel);
      if (scrollAnimationFrameRef.current) {
        cancelAnimationFrame(scrollAnimationFrameRef.current);
      }
    };
  }, []);

  return (
    <div ref={pageRef} className={rootClassName}>
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
