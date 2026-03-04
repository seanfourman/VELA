import { useEffect, useMemo, useRef, useState } from "react";
import showPopup from "@/utils/popup";
import "./planetInfoCard.css";

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

const EXIT_ANIMATION_MS = 180;

export default function PlanetInfoCard({
  hoveredCard,
  hasArrow,
  onMouseEnter,
  onMouseLeave,
}) {
  const exitTimeoutRef = useRef(null);
  const [renderedCard, setRenderedCard] = useState(hoveredCard);
  const [isExiting, setIsExiting] = useState(false);
  const [arGuideOpen, setArGuideOpen] = useState(false);
  const planet = renderedCard?.planet ?? null;
  const hoveredIndex = renderedCard?.index ?? null;
  const normalizedAzimuth = normalizeAzimuth(Number(planet?.azimuth));
  const directionLabel = formatDirection(planet?.azimuth);
  const copyPayload = useMemo(() => buildCopyPayload(planet), [planet]);
  const altitudeValue = Number(planet?.altitude);
  const hasAltitude = Number.isFinite(altitudeValue);
  const hasAzimuth = normalizedAzimuth !== null;

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
    setArGuideOpen(false);
  }, [hoveredIndex]);

  const handleCopy = async () => {
    if (!renderedCard || !copyPayload) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyPayload);
      } else if (!legacyCopyText(copyPayload)) {
        throw new Error("Clipboard unavailable");
      }

      showPopup(`${planet?.name || "Planet"} info copied.`, "success", {
        duration: 2000,
      });
    } catch {
      showPopup("Could not copy planet info.", "warning", {
        duration: 2200,
      });
    }
  };

  const arHint = useMemo(() => {
    if (!hasAzimuth || !hasAltitude) {
      return "Direction data is unavailable for this object right now.";
    }

    const altitudeLabel =
      altitudeValue >= 0
        ? `${altitudeValue.toFixed(1)}\u00b0 above the horizon`
        : `${Math.abs(altitudeValue).toFixed(1)}\u00b0 below the horizon`;

    return `Face ${directionLabel} (${normalizedAzimuth.toFixed(
      1
    )}\u00b0) and tilt ${altitudeLabel}.`;
  }, [altitudeValue, directionLabel, hasAltitude, hasAzimuth, normalizedAzimuth]);

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

      <div className="planet-info-actions">
        <button
          type="button"
          className={`planet-info-action-btn ${arGuideOpen ? "active" : ""}`.trim()}
          onClick={() => setArGuideOpen((previous) => !previous)}
          aria-pressed={arGuideOpen}
        >
          AR
        </button>
        <button
          type="button"
          className="planet-info-action-btn"
          onClick={handleCopy}
        >
          Copy
        </button>
      </div>

      {arGuideOpen && (
        <div className="planet-info-ar-guide">
          <div className="planet-info-ar-title">AR Sky Guide</div>
          <div className="planet-info-ar-hint">{arHint}</div>
          {hasAzimuth && (
            <div className="planet-info-ar-bearing">
              <span>Heading</span>
              <strong>
                {directionLabel} ({normalizedAzimuth.toFixed(1)}\u00b0)
              </strong>
            </div>
          )}
        </div>
      )}

      <div className="planet-info-footnote">
        {planet?.aboveHorizon === false
          ? "Below horizon right now"
          : "Above the horizon"}
      </div>
    </div>
  );
}
