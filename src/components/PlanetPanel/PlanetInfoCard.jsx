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

export default function PlanetInfoCard({ hoveredCard, hasArrow }) {
  if (!hoveredCard) return null;

  return (
    <div
      className={`planet-info-card ${
        hoveredCard.isMiddle ? "middle-offset" : ""
      } ${!hasArrow ? "no-arrow" : ""}`}
      style={{ top: hoveredCard.top || 0 }}
    >
      <div className="planet-info-header">
        <div>
          <div className="planet-info-name">
            {hoveredCard.planet?.name || "Planet"}
          </div>
          <div className="planet-info-constellation">
            {hoveredCard.planet?.constellation || "Constellation unknown"}
          </div>
        </div>
        <div
          className={`planet-info-visibility ${
            hoveredCard.planet?.nakedEyeObject ? "naked-eye" : "dimmed"
          }`}
        >
          {hoveredCard.planet?.nakedEyeObject
            ? "Naked eye"
            : "Needs optics"}
        </div>
      </div>

      <div className="planet-info-grid">
        <div>
          <span className="planet-info-label">Altitude</span>
          <span className="planet-info-value">
            {formatDegrees(hoveredCard.planet?.altitude)}
          </span>
        </div>
        <div>
          <span className="planet-info-label">Azimuth</span>
          <span className="planet-info-value">
            {formatDegrees(hoveredCard.planet?.azimuth)}
          </span>
        </div>
        <div>
          <span className="planet-info-label">Magnitude</span>
          <span className="planet-info-value">
            {formatMagnitude(hoveredCard.planet?.magnitude)}
          </span>
        </div>
        <div>
          <span className="planet-info-label">RA / Dec</span>
          <span className="planet-info-value">
            {formatRightAscension(hoveredCard.planet?.rightAscension)} /{" "}
            {formatDeclination(hoveredCard.planet?.declination)}
          </span>
        </div>
      </div>

      <div className="planet-info-footnote">
        {hoveredCard.planet?.aboveHorizon === false
          ? "Below horizon right now"
          : "Above the horizon"}
      </div>
    </div>
  );
}
