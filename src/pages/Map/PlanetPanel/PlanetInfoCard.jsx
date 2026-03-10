import { useEffect, useMemo, useRef, useState } from "react";
import showNotification from "@/utils/notifications";
import { copyTextToClipboard } from "@/utils/clipboard";
import arZoneIcon from "@/assets/icons/ar-zone-svgrepo-com.svg";
import "./styles/planetInfoCard.css";

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
  const copyPayload = useMemo(() => buildCopyPayload(planet), [planet]);
  const arDisabled = desktopPointer;

  useEffect(() => {
    if (hoveredCard) {
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
        exitTimeoutRef.current = null;
      }
      setRenderedCard(hoveredCard);
      setIsExiting(false);
      return;
    }

    if (!renderedCard) return;

    setIsExiting(true);
    exitTimeoutRef.current = setTimeout(() => {
      setRenderedCard(null);
      setIsExiting(false);
      exitTimeoutRef.current = null;
    }, EXIT_ANIMATION_MS);
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

    setDesktopPointer(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const handleCopy = async () => {
    if (!renderedCard || !copyPayload) return;

    try {
      const copied = await copyTextToClipboard(copyPayload);
      if (!copied) {
        throw new Error("Clipboard unavailable");
      }

      showNotification(`${planet?.name || "Planet"} info copied`, "success", {
        duration: 2000,
      });
    } catch {
      showNotification("Could not copy planet info", "warning", {
        duration: 2200,
      });
    }
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






