import orbitIcon from "@/assets/icons/orbit-svgrepo-com.svg";
import {
  BODY_DEFINITIONS,
  PLANET_ICON_URLS,
} from "../solarSystemData";

function SolarSystemPanelContent({
  body,
  orbitSpeed,
  onOrbitSpeedChange,
  showOrbits,
  onToggleOrbits,
  selectedBodyId,
  onSelectBody,
}) {
  const statItems = [
    { label: "Distance", value: body.distance },
    { label: "Day", value: body.day },
    { label: "Year", value: body.year },
    { label: "Moons", value: body.moons },
    { label: "Temp", value: body.temperature },
  ];

  return (
    <>
      <div className="solar-system-focus-panel__eyebrow">Focused body</div>
      <h2 className="solar-system-focus-panel__title">{body.name}</h2>
      <p className="solar-system-focus-panel__copy">{body.description}</p>
      <div className="solar-system-focus-panel__stats">
        {statItems.map((item) => (
          <div key={item.label} className="solar-system-inline-stat">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="solar-system-panel__controls">
        <label className="solar-system-range" htmlFor="solar-system-speed">
          <div className="solar-system-range__row">
            <span>Orbit pace</span>
            <div className="solar-system-range__meta">
              <span>{Math.round(orbitSpeed * 100)}%</span>
              <span className="solar-system-tooltip-anchor">
                <button
                  type="button"
                  className={`solar-system-orbit-toggle${showOrbits ? " active" : ""}`}
                  onClick={(event) => {
                    onToggleOrbits();
                    event.currentTarget.blur();
                  }}
                  aria-label={showOrbits ? "Hide orbit trails" : "Show orbit trails"}
                >
                  <img src={orbitIcon} alt="" aria-hidden="true" />
                </button>
                <span className="solar-system-tooltip-label" aria-hidden="true">
                  {showOrbits ? "Hide orbit trails" : "Show orbit trails"}
                </span>
              </span>
            </div>
          </div>
          <input
            id="solar-system-speed"
            type="range"
            min="0"
            max="160"
            step="5"
            value={Math.round(orbitSpeed * 100)}
            onChange={(event) => onOrbitSpeedChange(Number(event.target.value) / 100)}
          />
        </label>

        <div className="solar-system-body-list" role="list">
          {BODY_DEFINITIONS.map((planetBody) => (
            <button
              key={planetBody.id}
              type="button"
              className={`solar-system-body-option${selectedBodyId === planetBody.id ? " active" : ""}`}
              style={{ "--solar-accent": planetBody.accent }}
              onClick={() => onSelectBody(planetBody.id)}
            >
              <span className="solar-system-body-option__icon-shell" aria-hidden="true">
                <img
                  className="solar-system-body-option__icon"
                  src={PLANET_ICON_URLS[planetBody.id]}
                  alt=""
                />
              </span>
              <span className="solar-system-body-option__name">{planetBody.name}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function SolarSystemPanelToggle({ open, mobile = false, onClick }) {
  const rotation = mobile ? (open ? 90 : -90) : open ? 0 : 180;

  return (
    <button
      type="button"
      className={`solar-system-panel-toggle ${open ? "active" : ""}`}
      onClick={onClick}
      aria-label={open ? "Hide solar system panel" : "Show solar system panel"}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}

function SolarSystemPanel({
  isMobile,
  open,
  nudgeMobileToggle = false,
  body,
  orbitSpeed,
  onOrbitSpeedChange,
  showOrbits,
  onToggleOrbits,
  selectedBodyId,
  onSelectBody,
  onToggleOpen,
}) {
  const content = (
    <SolarSystemPanelContent
      body={body}
      orbitSpeed={orbitSpeed}
      onOrbitSpeedChange={onOrbitSpeedChange}
      showOrbits={showOrbits}
      onToggleOrbits={onToggleOrbits}
      selectedBodyId={selectedBodyId}
      onSelectBody={onSelectBody}
    />
  );

  if (isMobile) {
    return (
      <div
        className={`solar-system-panel-mobile ${open ? "open" : "collapsed"} ${
          nudgeMobileToggle ? "nudge" : ""
        }`.trim()}
      >
        <div className={`solar-system-panel-mobile__toggle-slot ${open ? "open" : "ready"}`}>
          <SolarSystemPanelToggle open={open} mobile onClick={onToggleOpen} />
        </div>
        <aside className="solar-system-panel-mobile__sheet">
          <div className="solar-system-panel-mobile__scroll">{content}</div>
        </aside>
      </div>
    );
  }

  return (
    <div className={`solar-system-panel-wrapper ${open ? "open" : "collapsed"}`}>
      <SolarSystemPanelToggle open={open} onClick={onToggleOpen} />
      <aside className="solar-system-panel">
        <div className="solar-system-panel__scroll">{content}</div>
      </aside>
    </div>
  );
}

export default SolarSystemPanel;
