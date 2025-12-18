import { cloneElement, useEffect, useMemo, useRef, useState } from "react";
import PlanetCard from "./PlanetCard";
import "./planetPanelMobile.css";

const formatDegrees = (value) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "-";
  }
  return `${value.toFixed(1)}\u00b0`;
};

const formatMagnitude = (value) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "-";
  }
  return value.toFixed(1);
};

const formatRightAscension = (ra) => {
  if (!ra) return "-";
  const hours = Number.isFinite(ra.hours)
    ? ra.hours.toString().padStart(2, "0")
    : "00";
  const minutes = Number.isFinite(ra.minutes)
    ? ra.minutes.toString().padStart(2, "0")
    : "00";
  return `${hours}h ${minutes}m`;
};

const formatDeclination = (dec) => {
  if (!dec) return "-";
  const sign = dec.negative ? "-" : "+";
  const degrees = Number.isFinite(dec.degrees) ? Math.abs(dec.degrees) : 0;
  const arcminutes = Number.isFinite(dec.arcminutes)
    ? Math.abs(dec.arcminutes)
    : 0;
  return `${sign}${degrees}\u00b0 ${arcminutes}'`;
};

export default function PlanetPanelMobile({
  planets,
  loading,
  error,
  panelVisible,
  reducedMotion = false,
  toggleControl,
  toggleReady = false,
}) {
  const planetsToShow = useMemo(
    () =>
      (Array.isArray(planets) ? planets : []).filter(
        (planet) => planet.aboveHorizon !== false
      ),
    [planets]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [bounceDisabled, setBounceDisabled] = useState(false);
  const [slotReady, setSlotReady] = useState(false);
  const resetActiveTimeoutRef = useRef(null);
  const safeActiveIndex = Math.min(
    activeIndex,
    Math.max(planetsToShow.length - 1, 0)
  );
  const currentPlanet = planetsToShow[safeActiveIndex] || null;
  const hasPlanets = planetsToShow.length > 0;
  const canNavigate = !loading && !error && planetsToShow.length > 1;

  useEffect(() => {
    if (resetActiveTimeoutRef.current) {
      clearTimeout(resetActiveTimeoutRef.current);
    }
    resetActiveTimeoutRef.current = setTimeout(() => setActiveIndex(0), 0);
    return () => {
      if (resetActiveTimeoutRef.current) {
        clearTimeout(resetActiveTimeoutRef.current);
        resetActiveTimeoutRef.current = null;
      }
    };
  }, [planetsToShow.length]);

  useEffect(() => {
    let readyTimer = null;
    let resetTimer = null;

    if (toggleReady) {
      readyTimer = setTimeout(() => setSlotReady(true), 40);
    } else {
      resetTimer = setTimeout(() => {
        setSlotReady(false);
        setBounceDisabled(false);
      }, 0);
    }

    return () => {
      if (readyTimer) clearTimeout(readyTimer);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [toggleReady]);

  const handlePrev = () => {
    if (!hasPlanets) return;
    setActiveIndex((prev) => {
      const current = Math.min(prev, planetsToShow.length - 1);
      return current === 0 ? planetsToShow.length - 1 : current - 1;
    });
  };

  const handleNext = () => {
    if (!hasPlanets) return;
    setActiveIndex((prev) => {
      const current = Math.min(prev, planetsToShow.length - 1);
      return current === planetsToShow.length - 1 ? 0 : current + 1;
    });
  };

  const handleTogglePress = (eventHandler) => (event) => {
    setBounceDisabled(true);
    if (typeof eventHandler === "function") {
      eventHandler(event);
    }
  };

  const panelClasses = `planet-panel-mobile ${
    panelVisible ? "open" : "collapsed"
  } ${bounceDisabled ? "bounce-disabled" : ""}`.trim();

  return (
    <div className={panelClasses}>
      {toggleControl && (
        <div
          className={`panel-mobile-toggle-slot ${
            slotReady ? "ready" : ""
          }`.trim()}
        >
          {cloneElement(toggleControl, {
            onPointerDown: handleTogglePress(toggleControl.props.onPointerDown),
            onMouseDown: handleTogglePress(toggleControl.props.onMouseDown),
            onTouchStart: handleTogglePress(toggleControl.props.onTouchStart),
            onClick: handleTogglePress(toggleControl.props.onClick),
            className: `${toggleControl.props.className || ""} ${
              bounceDisabled ? "no-bounce" : ""
            }`.trim(),
          })}
        </div>
      )}
      <div className="panel-mobile-sheet">
        <div className="planet-mobile-card-row">
          <button
            className="panel-mobile-nav prev"
            onClick={handlePrev}
            aria-label="Previous planet"
            disabled={!canNavigate}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 5l-7 7 7 7" />
            </svg>
          </button>

          <div className="planet-mobile-card">
            {loading && (
              <div className="mobile-placeholder">Aligning the orbits…</div>
            )}
            {!loading && error && (
              <div className="mobile-placeholder error">{error}</div>
            )}
            {!loading && !error && hasPlanets && (
              <PlanetCard
                planet={currentPlanet}
                reducedMotion={reducedMotion}
              />
            )}
            {!loading && !error && !hasPlanets && (
              <div className="mobile-placeholder">No visible planets yet.</div>
            )}
          </div>

          <button
            className="panel-mobile-nav next"
            onClick={handleNext}
            aria-label="Next planet"
            disabled={!canNavigate}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {currentPlanet && !loading && !error && (
          <div className="planet-mobile-info">
            <div className="planet-mobile-title">
              {currentPlanet?.name || "Planet"}
            </div>
            <div className="planet-mobile-sub">
              {currentPlanet?.constellation || "Constellation unknown"}
            </div>

            <div className="planet-mobile-grid">
              <div>
                <span className="planet-mobile-label">Altitude</span>
                <span className="planet-mobile-value">
                  {formatDegrees(currentPlanet?.altitude)}
                </span>
              </div>
              <div>
                <span className="planet-mobile-label">Azimuth</span>
                <span className="planet-mobile-value">
                  {formatDegrees(currentPlanet?.azimuth)}
                </span>
              </div>
              <div>
                <span className="planet-mobile-label">Magnitude</span>
                <span className="planet-mobile-value">
                  {formatMagnitude(currentPlanet?.magnitude)}
                </span>
              </div>
              <div>
                <span className="planet-mobile-label">RA / Dec</span>
                <span className="planet-mobile-value">
                  {formatRightAscension(currentPlanet?.rightAscension)} /{" "}
                  {formatDeclination(currentPlanet?.declination)}
                </span>
              </div>
            </div>

            <div className="planet-mobile-footnote">
              {currentPlanet?.aboveHorizon === false
                ? "Below horizon right now"
                : "Above the horizon"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
