import { useEffect, useMemo, useRef, useState } from "react";
import arZoneIcon from "@/assets/icons/ar-zone-svgrepo-com.svg";
import {
  buildPlanetCopyPayload,
  copyPlanetDetailsToClipboard,
  formatDegrees,
  formatDeclination,
  formatMagnitude,
  formatRightAscension,
} from "./planetInfoUtils";
import "./styles/planetInfoCard.css";

const EXIT_ANIMATION_MS = 180;
const DESKTOP_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

const hasDesktopPointer = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(DESKTOP_POINTER_QUERY).matches;
};

export default function PlanetInfoCard({
  hoveredCard,
  hasArrow,
  onMouseEnter,
  onMouseLeave,
  onOpenAr,
}) {
  const exitTimeoutRef = useRef(null);
  const [renderedCard, setRenderedCard] = useState(hoveredCard);
  const [isExiting, setIsExiting] = useState(false);
  const [desktopPointer, setDesktopPointer] = useState(() => hasDesktopPointer());
  const planet = renderedCard?.planet ?? null;
  const copyPayload = useMemo(() => buildPlanetCopyPayload(planet), [planet]);
  const arDisabled = desktopPointer;

  useEffect(() => {
    if (hoveredCard) {
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
        exitTimeoutRef.current = null;
      }
      const animationFrameId = window.requestAnimationFrame(() => {
        setRenderedCard(hoveredCard);
        setIsExiting(false);
      });
      return () => window.cancelAnimationFrame(animationFrameId);
    }

    if (!renderedCard) return;

    const animationFrameId = window.requestAnimationFrame(() => {
      setIsExiting(true);
    });
    exitTimeoutRef.current = setTimeout(() => {
      setRenderedCard(null);
      setIsExiting(false);
      exitTimeoutRef.current = null;
    }, EXIT_ANIMATION_MS);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [hoveredCard, renderedCard]);

  useEffect(() => {
    return () => {
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
        exitTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(DESKTOP_POINTER_QUERY);
    const handleChange = (event) => {
      setDesktopPointer(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const handleCopy = async () => {
    if (!renderedCard || !copyPayload) return;
    await copyPlanetDetailsToClipboard(planet);
  };

  const handleArOpen = (event) => {
    if (!planet || arDisabled) return;
    onOpenAr?.(planet);
    event.currentTarget.blur();
  };

  if (!renderedCard) return null;

  return (
    <div
      className={`planet-info-card ${
        renderedCard.isMiddle ? "middle-offset" : ""
      } ${!hasArrow ? "no-arrow" : ""} ${isExiting ? "exiting" : ""}`}
      style={{ top: renderedCard.top || 0 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="planet-info-header">
        <div>
          <div className="planet-info-name">
            {planet?.name || "Planet"}
          </div>
          <div className="planet-info-constellation">
            {planet?.constellation || "Constellation unknown"}
          </div>
        </div>
        <div
          className={`planet-info-visibility ${
            planet?.nakedEyeObject ? "naked-eye" : "dimmed"
          }`}
        >
          {planet?.nakedEyeObject ? "Naked eye" : "Needs optics"}
        </div>
      </div>

      <div className="planet-info-grid">
        <div>
          <span className="planet-info-label">Altitude</span>
          <span className="planet-info-value">{formatDegrees(planet?.altitude)}</span>
        </div>
        <div>
          <span className="planet-info-label">Azimuth</span>
          <span className="planet-info-value">
            {formatDegrees(planet?.azimuth)}
          </span>
        </div>
        <div>
          <span className="planet-info-label">Magnitude</span>
          <span className="planet-info-value">{formatMagnitude(planet?.magnitude)}</span>
        </div>
        <div>
          <span className="planet-info-label">RA / Dec</span>
          <span className="planet-info-value">
            {formatRightAscension(planet?.rightAscension)} /{" "}
            {formatDeclination(planet?.declination)}
          </span>
        </div>
      </div>

      <div className="planet-info-footer">
        <div className="planet-info-footnote">
          {planet?.aboveHorizon === false
            ? "Below horizon right now"
            : "Above the horizon"}
        </div>
        <div className="planet-info-actions">
          <div className="planet-info-action-wrap">
            <button
              type="button"
              className="planet-info-action-btn"
              onClick={handleArOpen}
              aria-label={arDisabled ? "AR is mobile only" : "Open AR view"}
              disabled={arDisabled}
            >
              <img
                src={arZoneIcon}
                alt=""
                aria-hidden="true"
                className="planet-info-action-icon"
              />
            </button>
            <span className="planet-info-action-label" aria-hidden="true">
              {arDisabled ? "Mobile only function" : "Open AR view"}
            </span>
          </div>
          <div className="planet-info-action-wrap">
            <button
              type="button"
              className="planet-info-action-btn"
              onClick={(event) => {
                handleCopy();
                event.currentTarget.blur();
              }}
              aria-label="Copy planet details"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <rect x="9" y="9" width="10" height="10" rx="2" ry="2" />
                <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            <span className="planet-info-action-label" aria-hidden="true">
              Copy details
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}






