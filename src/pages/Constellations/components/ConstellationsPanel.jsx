import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

const VELA_MORSE_DURATION_MS = 2600;
const SAIL_MESSAGES = [
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
          <svg viewBox="0 0 160 120" width="160" height="120" fill="none">
            {/* main sail */}
            <path
              d="M80 12 C80 12 112 38 108 78 L80 78 Z"
              fill="rgba(230,240,255,0.85)"
              stroke="rgba(180,210,255,0.4)"
              strokeWidth="0.8"
            />
            {/* secondary sail */}
            <path
              d="M78 20 C78 20 52 42 56 78 L78 78 Z"
              fill="rgba(200,220,245,0.65)"
              stroke="rgba(160,195,240,0.3)"
              strokeWidth="0.8"
            />
            {/* front jib sail */}
            <path
              d="M82 18 C82 18 120 40 118 62 L108 70 Z"
              fill="rgba(210,230,255,0.5)"
              stroke="rgba(170,205,245,0.3)"
              strokeWidth="0.6"
            />
            {/* mast */}
            <line x1="80" y1="10" x2="80" y2="82" stroke="rgba(190,170,140,0.9)" strokeWidth="2.5" strokeLinecap="round" />
            {/* hull */}
            <path
              d="M30 82 C30 82 38 100 80 100 C122 100 130 82 130 82 Z"
              fill="rgba(90,65,40,0.9)"
              stroke="rgba(120,90,60,0.6)"
              strokeWidth="1"
            />
            {/* hull trim */}
            <path
              d="M36 86 C36 86 45 98 80 98 C115 98 124 86 124 86"
              fill="none"
              stroke="rgba(160,130,90,0.5)"
              strokeWidth="1"
            />
            {/* flag */}
            <path
              d="M80 10 Q88 6 80 2"
              stroke="#66e6ff"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
            {/* water line */}
            <path
              d="M10 102 Q25 96 40 102 Q55 108 70 102 Q85 96 100 102 Q115 108 130 102 Q145 96 155 102"
              stroke="rgba(102,230,255,0.35)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* second wave */}
            <path
              d="M5 110 Q20 104 35 110 Q50 116 65 110 Q80 104 95 110 Q110 116 125 110 Q140 104 155 110"
              stroke="rgba(102,230,255,0.2)"
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
            />
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
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 20 Q6 18 12 18 Q18 18 22 20" />
          <path d="M12 4 L12 18" />
          <path d="M12 4 Q18 10 12 16" />
        </svg>
      </button>
      {sailing && <SailingShip onDone={handleDone} />}
    </>
  );
}

function VelaMorseSignal({ enabled }) {
  const [visible, setVisible] = useState(enabled);

  useEffect(() => {
    setVisible(Boolean(enabled));
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !visible || typeof window === "undefined") {
      return undefined;
    }

    const dismiss = () => setVisible(false);
    const timer = window.setTimeout(dismiss, VELA_MORSE_DURATION_MS);

    window.addEventListener("pointerdown", dismiss, { passive: true });
    window.addEventListener("keydown", dismiss);
    window.addEventListener("wheel", dismiss, { passive: true });
    window.addEventListener("touchstart", dismiss, { passive: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", dismiss);
      window.removeEventListener("wheel", dismiss);
      window.removeEventListener("touchstart", dismiss);
    };
  }, [enabled, visible]);

  if (!visible) return null;

  return (
    <div className="vela-morse-signal" aria-label="Morse signal for V">
      <div className="vela-morse-signal__header">
        <span className="vela-morse-signal__eyebrow">Signal</span>
        <span className="vela-morse-signal__code">V</span>
      </div>
      <div className="vela-morse-signal__pulses" aria-hidden="true">
        <span className="vela-morse-signal__pulse vela-morse-signal__pulse--short" />
        <span className="vela-morse-signal__pulse vela-morse-signal__pulse--short" />
        <span className="vela-morse-signal__pulse vela-morse-signal__pulse--short" />
        <span className="vela-morse-signal__pulse vela-morse-signal__pulse--long" />
      </div>
      <div className="vela-morse-signal__legend">...-</div>
    </div>
  );
}

function ConstellationsPanelToggle({ open, mobile = false, onClick }) {
  const rotation = mobile ? (open ? 90 : -90) : open ? 0 : 180;

  return (
    <button
      type="button"
      className={`solar-system-panel-toggle ${open ? "active" : ""}`}
      onClick={onClick}
      aria-label={
        open ? "Hide constellation panel" : "Show constellation panel"
      }
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

function ConstellationsPanelContent({
  constellation,
  leadingStars,
  isPanelOpen,
}) {
  return (
    <div className="constellations-detail">
      <div className="constellations-detail__header">
        <div className="constellations-detail__eyebrow">
          Selected constellation
        </div>
        {constellation.id === "vela" && <VelaSailButton />}
      </div>
      <h2 className="constellations-detail__title">{constellation.name}</h2>
      <p className="constellations-detail__headline">
        {constellation.headline}
      </p>
      <VelaMorseSignal
        enabled={constellation.id === "vela" && isPanelOpen}
      />
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
      <p className="constellations-detail__description">
        {constellation.description}
      </p>
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
      isPanelOpen={open}
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
          <ConstellationsPanelToggle
            open={open}
            mobile
            onClick={onToggleOpen}
          />
        </div>
        <aside className="solar-system-panel-mobile__sheet">
          <div className="solar-system-panel-mobile__scroll">{content}</div>
        </aside>
      </div>
    );
  }

  return (
    <div
      className={`solar-system-panel-wrapper ${open ? "open" : "collapsed"}`}
    >
      <ConstellationsPanelToggle open={open} onClick={onToggleOpen} />
      <aside className="solar-system-panel">
        <div className="solar-system-panel__scroll">{content}</div>
      </aside>
    </div>
  );
}

export default ConstellationsPanel;
