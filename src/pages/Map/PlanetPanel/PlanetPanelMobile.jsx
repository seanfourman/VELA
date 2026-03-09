import {
  cloneElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PlanetCard from "./PlanetCard";
import PlanetArOverlay from "./PlanetArOverlay";
import showNotification from "@/utils/notifications";
import arZoneIcon from "@/assets/icons/ar-zone-svgrepo-com.svg";
import "./styles/planetPanelMobile.css";

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

const normalizeAzimuth = (value) => {
  if (!Number.isFinite(value)) return null;
  return ((value % 360) + 360) % 360;
};

const formatDirection = (value) => {
  const normalized = normalizeAzimuth(Number(value));
  if (normalized === null) return "Unknown";
  const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(normalized / 45) % labels.length;
  return labels[index];
};

const legacyCopyText = (text) => {
  if (typeof document === "undefined") return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
};

const buildCopyPayload = (planet) => {
  const azimuth = formatDegrees(planet?.azimuth);
  const direction = formatDirection(planet?.azimuth);
  const magnitude = formatMagnitude(planet?.magnitude);
  const rightAscension = formatRightAscension(planet?.rightAscension);
  const declination = formatDeclination(planet?.declination);
  const horizonStatus =
    planet?.aboveHorizon === false ? "Below horizon right now" : "Above the horizon";

  return [
    `Name: ${planet?.name || "Planet"}`,
    `Constellation: ${planet?.constellation || "Constellation unknown"}`,
    `Visibility: ${planet?.nakedEyeObject ? "Naked eye" : "Needs optics"}`,
    `Altitude: ${formatDegrees(planet?.altitude)}`,
    `Azimuth: ${azimuth} (${direction})`,
    `Magnitude: ${magnitude}`,
    `RA / Dec: ${rightAscension} / ${declination}`,
    `Status: ${horizonStatus}`,
  ].join("\n");
};

export default function PlanetPanelMobile({
  planets,
  loading,
  error,
  panelVisible,
  reducedMotion = false,
  forceHideToggle = false,
  containerRef,
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
  const [sheetHeight, setSheetHeight] = useState(null);
  const [arOverlayOpen, setArOverlayOpen] = useState(false);
  const [arOverlayPlanet, setArOverlayPlanet] = useState(null);
  const resetActiveTimeoutRef = useRef(null);
  const sheetContentRef = useRef(null);
  const safeActiveIndex = Math.min(
    activeIndex,
    Math.max(planetsToShow.length - 1, 0)
  );
  const currentPlanet = planetsToShow[safeActiveIndex] || null;
  const hasPlanets = planetsToShow.length > 0;
  const canNavigate = !loading && !error && planetsToShow.length > 1;

  const updateSheetHeight = useCallback(() => {
    const content = sheetContentRef.current;
    if (!content) return;

    const nextHeight = content.offsetHeight;
    setSheetHeight((previous) =>
      previous === nextHeight ? previous : nextHeight
    );
  }, []);

  useLayoutEffect(() => {
    updateSheetHeight();
  }, [
    updateSheetHeight,
    panelVisible,
    loading,
    error,
    safeActiveIndex,
    hasPlanets,
  ]);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return undefined;
    const content = sheetContentRef.current;
    if (!content) return undefined;

    let rafId = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => updateSheetHeight());
    });

    observer.observe(content);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [updateSheetHeight]);

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

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const className = "map-ui-shifted";
    const body = document.body;
    if (!body) return undefined;

    if (panelVisible) {
      body.classList.add(className);
    } else {
      body.classList.remove(className);
    }

    return () => {
      body.classList.remove(className);
    };
  }, [panelVisible]);

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

  const handleArOpen = (event) => {
    if (!currentPlanet) return;
    setArOverlayPlanet(currentPlanet);
    setArOverlayOpen(true);
    event.currentTarget.blur();
  };

  const handleArClose = () => {
    setArOverlayOpen(false);
  };

  const handleCopy = async (event) => {
    if (!currentPlanet) return;
    const copyPayload = buildCopyPayload(currentPlanet);

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyPayload);
      } else if (!legacyCopyText(copyPayload)) {
        throw new Error("Clipboard unavailable");
      }

      showNotification(`${currentPlanet?.name || "Planet"} info copied`, "success", {
        duration: 2000,
      });
    } catch {
      showNotification("Could not copy planet info", "warning", {
        duration: 2200,
      });
    } finally {
      event.currentTarget.blur();
    }
  };

  const panelClasses = `planet-panel-mobile ${
    panelVisible ? "open" : "collapsed"
  } ${bounceDisabled ? "bounce-disabled" : ""}`.trim();

  return (
    <div
      className={panelClasses}
      ref={containerRef}
      data-force-hide-toggle={forceHideToggle ? "true" : "false"}
    >
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
      <div
        className="panel-mobile-sheet"
        style={sheetHeight != null ? { height: sheetHeight } : undefined}
      >
        <div className="panel-mobile-sheet-inner" ref={sheetContentRef}>
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
              {!loading && error && (
                <div className="mobile-placeholder error">{error}</div>
              )}
              {!loading && !error && hasPlanets && (
                <PlanetCard planet={currentPlanet} reducedMotion={reducedMotion} />
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

              <div className="planet-mobile-footer">
                <div className="planet-mobile-footnote">
                  {currentPlanet?.aboveHorizon === false
                    ? "Below horizon right now"
                    : "Above the horizon"}
                </div>
                <div className="planet-mobile-actions">
                  <button
                    type="button"
                    className="planet-mobile-action-btn"
                    onClick={handleArOpen}
                    aria-label="Open AR view"
                  >
                    <img
                      src={arZoneIcon}
                      alt=""
                      aria-hidden="true"
                      className="planet-mobile-action-icon"
                    />
                  </button>
                  <button
                    type="button"
                    className="planet-mobile-action-btn"
                    onClick={handleCopy}
                    aria-label="Copy planet details"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <rect x="9" y="9" width="10" height="10" rx="2" ry="2" />
                      <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {arOverlayOpen && (
        <PlanetArOverlay
          planet={arOverlayPlanet}
          onClose={handleArClose}
        />
      )}
    </div>
  );
}



