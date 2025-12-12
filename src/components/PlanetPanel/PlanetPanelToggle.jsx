import "./planetPanel.css";

export default function PlanetPanelToggle({
  active,
  onClick,
  className = "",
  direction = "horizontal",
}) {
  const baseRotation = direction === "vertical" ? -90 : 0;
  const rotation = active ? baseRotation + 180 : baseRotation;

  return (
    <button
      className={`planet-panel-toggle ${active ? "active" : ""} ${className}`.trim()}
      onClick={onClick}
      aria-label={active ? "Hide visible planets panel" : "Show visible planets panel"}
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
