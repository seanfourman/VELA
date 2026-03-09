import { useEffect } from "react";
import SpaceWeatherPanelContent from "./SpaceWeatherPanelContent";
import "./styles/SpaceWeatherPanelMobile.css";

export default function SpaceWeatherPanelMobile({
  isOpen,
  onClose,
  snapshot,
  location,
  loading,
  error,
  focusLabel,
}) {
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const body = document.body;
    if (!body) return undefined;
    const className = "map-ui-shifted-space-weather";

    if (isOpen) {
      body.classList.add(className);
    } else {
      body.classList.remove(className);
    }

    return () => {
      body.classList.remove(className);
    };
  }, [isOpen]);

  return (
    <div
      className={`space-weather-panel-mobile ${isOpen ? "open" : "collapsed"}`}
      aria-hidden={!isOpen}
      onClick={onClose}
    >
      <div
        className="space-weather-panel-mobile__sheet glass-panel glass-panel-elevated"
        onClick={(event) => event.stopPropagation()}
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
      </div>
    </div>
  );
}

