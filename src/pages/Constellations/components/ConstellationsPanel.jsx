function ConstellationsPanelToggle({ open, mobile = false, onClick }) {
  const rotation = mobile ? (open ? 90 : -90) : open ? 0 : 180;

  return (
    <button
      type="button"
      className={`solar-system-panel-toggle ${open ? "active" : ""}`}
      onClick={onClick}
      aria-label={open ? "Hide constellation panel" : "Show constellation panel"}
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

function ConstellationsPanelContent({ constellation, leadingStars }) {
  return (
    <div className="constellations-detail">
      <div className="constellations-detail__eyebrow">Selected constellation</div>
      <h2 className="constellations-detail__title">{constellation.name}</h2>
      <p className="constellations-detail__headline">{constellation.headline}</p>
      <div className="constellations-detail__stats">
        <div className="constellations-stat">
          <span>Region</span>
          <strong>{constellation.region}</strong>
        </div>
        <div className="constellations-stat">
          <span>Best seen</span>
          <strong>{constellation.bestSeen}</strong>
        </div>
        <div className="constellations-stat">
          <span>Stars</span>
          <strong>{constellation.stars.length}</strong>
        </div>
        <div className="constellations-stat">
          <span>Links</span>
          <strong>{constellation.connections.length}</strong>
        </div>
      </div>
      <p className="constellations-detail__description">{constellation.description}</p>
      <div className="constellations-detail__known-for">
        <span>Known for</span>
        <strong>{constellation.knownFor}</strong>
      </div>
      <div className="constellations-detail__stars">
        {leadingStars.map((starName) => (
          <span key={starName} className="constellations-star-chip">
            {starName}
          </span>
        ))}
      </div>
    </div>
  );
}

function ConstellationsPanel({
  isMobile,
  open,
  nudgeMobileToggle = false,
  constellation,
  leadingStars,
  onToggleOpen,
}) {
  const content = (
    <ConstellationsPanelContent
      constellation={constellation}
      leadingStars={leadingStars}
    />
  );

  if (isMobile) {
    return (
      <div
        className={`solar-system-panel-mobile ${open ? "open" : "collapsed"} ${
          nudgeMobileToggle ? "nudge" : ""
        }`.trim()}
      >
        <div
          className={`solar-system-panel-mobile__toggle-slot ${open ? "open" : "ready"}`}
        >
          <ConstellationsPanelToggle open={open} mobile onClick={onToggleOpen} />
        </div>
        <aside className="solar-system-panel-mobile__sheet">
          <div className="solar-system-panel-mobile__scroll">{content}</div>
        </aside>
      </div>
    );
  }

  return (
    <div className={`solar-system-panel-wrapper ${open ? "open" : "collapsed"}`}>
      <ConstellationsPanelToggle open={open} onClick={onToggleOpen} />
      <aside className="solar-system-panel">
        <div className="solar-system-panel__scroll">{content}</div>
      </aside>
    </div>
  );
}

export default ConstellationsPanel;
