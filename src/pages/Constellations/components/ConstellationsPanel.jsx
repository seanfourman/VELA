import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

const SAIL_MESSAGES = [
  "You found me! I AM the app.",
  "Gamma Velorum says hi.",
  "Argo Navis didn't break up... it evolved.",
  "Fun fact: Vela was once part of a mega-constellation shaped like a ship.",
  "The devs named this app after me. No pressure.",
  "Winds are strong tonight. Perfect sailing weather.",
  "You're now an honorary crew member of the Argo.",
  "Plot twist: every other constellation is jealous.",
  "If this app crashes, blame the iceberg.",
  "Seriously though, go outside and look up.",
];

function SailingShip({ onDone }) {
  const [message] = useState(
    () => SAIL_MESSAGES[Math.floor(Math.random() * SAIL_MESSAGES.length)],
  );

  useEffect(() => {
    const timer = setTimeout(onDone, 8500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return createPortal(
    <div className="vela-ship-overlay" aria-hidden="true">
      <div className="vela-ship-runner">
        <div className="vela-ship-sprite">
          <svg viewBox="0 0 120 100" width="120" height="100" fill="none">
            {/* hull */}
            <path d="M10 68 Q20 82 60 82 Q100 82 110 68 L100 68 Q90 76 60 76 Q30 76 20 68 Z" fill="rgba(180,140,90,0.9)" />
            {/* mast */}
            <line x1="60" y1="18" x2="60" y2="76" stroke="rgba(200,170,120,0.85)" strokeWidth="3" />
            {/* sail */}
            <path d="M62 22 Q85 40 62 62 Z" fill="rgba(240,240,255,0.88)" />
            <path d="M58 26 Q38 42 58 58 Z" fill="rgba(220,230,255,0.72)" />
            {/* flag */}
            <path d="M60 18 Q70 14 60 10" stroke="#66e6ff" strokeWidth="2" fill="none" />
            {/* waves */}
            <path d="M0 74 Q15 70 30 74 Q45 78 60 74 Q75 70 90 74 Q105 78 120 74" stroke="rgba(102,230,255,0.5)" strokeWidth="2" fill="none" />
          </svg>
        </div>
        <p className="vela-ship-message">{message}</p>
      </div>
    </div>,
    document.body,
  );
}

function VelaSailButton() {
  const [sailing, setSailing] = useState(false);

  const handleClick = useCallback(() => {
    if (!sailing) setSailing(true);
  }, [sailing]);

  const handleDone = useCallback(() => setSailing(false), []);

  return (
    <>
      <button
        type="button"
        className="vela-sail-button"
        onClick={handleClick}
        data-tooltip="Set Sail!"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 20 Q6 18 12 18 Q18 18 22 20" />
          <path d="M12 4 L12 18" />
          <path d="M12 4 Q18 10 12 16" />
        </svg>
      </button>
      {sailing && <SailingShip onDone={handleDone} />}
    </>
  );
}

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
      <div className="constellations-detail__header">
        <div className="constellations-detail__eyebrow">Selected constellation</div>
        {constellation.id === "vela" && <VelaSailButton />}
      </div>
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
