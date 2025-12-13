import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PlanetCard from "./PlanetPanel/PlanetCard";
import PlanetInfoCard from "./PlanetPanel/PlanetInfoCard";
import "./PlanetPanel/planetPanel.css";
import "./PlanetPanel/planetCard.css";
import "./PlanetPanel/planetInfoCard.css";

export default function PlanetPanel({
  planets,
  loading,
  error,
  mapType,
  panelVisible,
  hasArrow = true,
  reducedMotion = false,
}) {
  const [page, setPage] = useState(0);
  const firstCardRef = useRef(null);
  const planetStackRef = useRef(null);
  const [cardHeight, setCardHeight] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoverBlocked, setHoverBlocked] = useState(false);
  const resetPageTimeoutRef = useRef(null);

  const planetsToShow = useMemo(
    () =>
      (Array.isArray(planets) ? planets : []).filter(
        (planet) => planet.aboveHorizon !== false
      ),
    [planets]
  );

  const PAGE_SIZE = 3;
  const totalPages = Math.max(1, Math.ceil(planetsToShow.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const hasPlanets = planetsToShow.length > 0;

  useEffect(() => {
    if (resetPageTimeoutRef.current) {
      clearTimeout(resetPageTimeoutRef.current);
    }
    resetPageTimeoutRef.current = setTimeout(() => setPage(0), 0);
    return () => {
      if (resetPageTimeoutRef.current) {
        clearTimeout(resetPageTimeoutRef.current);
        resetPageTimeoutRef.current = null;
      }
    };
  }, [planetsToShow.length]);

  useLayoutEffect(() => {
    if (firstCardRef.current) {
      const rect = firstCardRef.current.getBoundingClientRect();
      if (rect?.height) {
        setCardHeight(rect.height);
      }
    }
  }, [planetsToShow.length, mapType, loading]);

  const handlePlanetHover = useCallback(
    (planet, idx, event) => {
      if (hoverBlocked) return;
      if (!planet) return;

      const pageStart = safePage * PAGE_SIZE;
      const indexWithinPage = idx - pageStart;
      if (indexWithinPage < 0 || indexWithinPage > PAGE_SIZE - 1) return;

      const baseHover = {
        planet,
        index: idx,
        top: 0,
        isMiddle: indexWithinPage === 1,
      };

      if (!planetStackRef.current || !event?.currentTarget) {
        setHoveredCard(baseHover);
        return;
      }

      const stackRect = planetStackRef.current.getBoundingClientRect();
      const cardRect = event.currentTarget.getBoundingClientRect();
      const relativeTop = cardRect.top - stackRect.top + cardRect.height / 2;

      setHoveredCard({ ...baseHover, top: relativeTop });
    },
    [safePage, hoverBlocked]
  );

  const clearHover = useCallback(() => {
    setHoveredCard(null);
  }, []);

  const canScrollPrev =
    !loading && !error && totalPages > 1 && safePage > 0 && hasPlanets;
  const canScrollNext =
    !loading &&
    !error &&
    totalPages > 1 &&
    safePage < totalPages - 1 &&
    hasPlanets;

  const handlePage = (direction) => {
    setHoveredCard(null);
    setHoverBlocked(true);
    setTimeout(() => setHoverBlocked(false), 250);
    setPage((prev) => {
      const current = Math.min(prev, Math.max(totalPages - 1, 0));
      const next = current + direction;
      if (next < 0 || next > totalPages - 1) return current;
      return next;
    });
  };

  const pageHeight = cardHeight ? cardHeight * PAGE_SIZE : null;
  const viewportHeight = pageHeight || 0;
  const trackTransform =
    !loading && !error && pageHeight
      ? `translateY(-${safePage * pageHeight}px)`
      : "translateY(0)";

  const displayedHoverCard = useMemo(() => {
    if (!hoveredCard || loading || error || !panelVisible) return null;
    if (!planetsToShow.length) return null;
    if (hoveredCard.index >= planetsToShow.length) return null;

    const pageStart = safePage * PAGE_SIZE;
    const pageEnd = pageStart + PAGE_SIZE - 1;
    if (hoveredCard.index < pageStart || hoveredCard.index > pageEnd) {
      return null;
    }

    return hoveredCard;
  }, [
    error,
    hoveredCard,
    loading,
    panelVisible,
    planetsToShow.length,
    safePage,
  ]);

  return (
    <div
      className={`planet-float-row ${mapType} ${
        panelVisible ? "open" : "collapsed"
      }`}
    >
      <div
        className="planet-stack"
        ref={planetStackRef}
        onMouseLeave={clearHover}
      >
        {canScrollPrev && (
          <button
            className="planet-scroll-btn prev"
            onClick={() => handlePage(-1)}
            aria-label="Previous planets"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M2 18L12 6M22 18L12 6" />
            </svg>
          </button>
        )}

        <div
          className="planet-cards-viewport"
          style={{ height: viewportHeight }}
        >
          <div className="planet-cards" style={{ transform: trackTransform }}>
            {loading && null}

            {!loading && error && (
              <div className="planet-empty error" ref={firstCardRef}>
                {error}
              </div>
            )}

            {!loading &&
              !error &&
              planetsToShow.map((planet, idx) => (
                <PlanetCard
                  planet={planet}
                  key={planet.name}
                  cardRef={idx === 0 ? firstCardRef : undefined}
                  onHover={(event) => handlePlanetHover(planet, idx, event)}
                  reducedMotion={reducedMotion}
                />
              ))}
          </div>
        </div>

        {canScrollNext && (
          <button
            className="planet-scroll-btn next"
            onClick={() => handlePage(1)}
            aria-label="Next planets"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M2 6L12 18M22 6L12 18" />
            </svg>
          </button>
        )}
      </div>

      <PlanetInfoCard hoveredCard={displayedHoverCard} hasArrow={hasArrow} />
    </div>
  );
}
