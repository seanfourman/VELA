import SpaceWeatherPanelContent from "./SpaceWeatherPanelContent";
import "./styles/SpaceWeatherPanel.css";

export default function SpaceWeatherPanel({
  isOpen,
  onClose,
  snapshot,
  location,
  loading,
  error,
  focusLabel,
}) {
  return (
    <aside
      className={`space-weather-panel glass-panel glass-panel-elevated${
        isOpen ? " open" : ""
      }`}
      aria-hidden={!isOpen}
    >
      <div className="space-weather-panel__header">
        <div className="space-weather-panel__header-main">
          <div className="space-weather-panel__title">Space Weather</div>
          <div className="space-weather-panel__subtitle">
            DONKI geomagnetic storms and Earth-directed CME models
          </div>
        </div>
        <button
          type="button"
          className="space-weather-panel__close"
          onClick={onClose}
          aria-label="Close space weather panel"
        >
          <span aria-hidden="true">X</span>
        </button>
      </div>

      <SpaceWeatherPanelContent
        snapshot={snapshot}
        location={location}
        loading={loading}
        error={error}
        focusLabel={focusLabel}
      />
    </aside>
  );
}

