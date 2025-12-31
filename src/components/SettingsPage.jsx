import { useMemo } from "react";
import ProfileMoon from "./ProfileMoon";
import showPopup from "../utils/popup";
import { isProbablyHardwareAccelerated } from "../utils/hardwareUtils";
import "./ProfilePage.css";
import "./SettingsPage.css";

const SEARCH_DISTANCE_OPTIONS = [10, 25, 50, 100, 200, 250];
const MAP_TYPE_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "satellite", label: "Satellite" },
];

function SettingsToggle({ title, description, checked, onChange }) {
  return (
    <label className="settings-row settings-row--toggle">
      <div className="settings-row__text">
        <div className="settings-row__title">{title}</div>
        {description ? (
          <div className="settings-row__subtitle">{description}</div>
        ) : null}
      </div>
      <span className="settings-toggle">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange?.(event.target.checked)}
        />
        <span className="settings-toggle__track" aria-hidden="true">
          <span className="settings-toggle__thumb" />
        </span>
      </span>
    </label>
  );
}

function SettingsPage({
  mapType,
  isLight,
  settings,
  onUpdateSettings,
  onResetSettings,
  onMapTypeChange,
  onNavigate,
}) {
  const showMoon = useMemo(() => isProbablyHardwareAccelerated(), []);
  const isDayMap = mapType === "light" || mapType === "satellite" || isLight;
  const moonVariant = isDayMap ? "day" : "night";
  const {
    directionsProvider = "google",
    showRecommendedSpots = true,
    lightOverlayEnabled = false,
    autoCenterOnLocate = true,
    highAccuracyLocation = true,
    searchDistance = SEARCH_DISTANCE_OPTIONS[0],
  } = settings || {};

  const handleBackToMap = () => {
    if (onNavigate) {
      onNavigate("/");
      return;
    }
    window.location.assign("/");
  };

  const handleReset = () => {
    onResetSettings?.();
    showPopup("Settings reset to defaults.", "info", { duration: 2200 });
  };

  return (
    <div className={`profile-page settings-page ${isLight ? "light" : ""}`}>
      {showMoon ? (
        <div className="profile-page__earth" aria-hidden="true">
          <ProfileMoon
            variant={moonVariant}
            className="profile-page__earth-canvas"
          />
        </div>
      ) : null}
      <div className="profile-page__content">
        <header className="profile-page__header">
          <div>
            <h1 className="profile-page__title">Settings</h1>
            <p className="profile-page__subtitle">
              Tune the map, directions, and default behaviors for VELA.
            </p>
          </div>
          <div className="profile-page__header-actions">
            <button
              type="button"
              className="glass-btn profile-action-btn"
              onClick={handleBackToMap}
            >
              Back to map
            </button>
          </div>
        </header>

        <section className="profile-card glass-panel glass-panel-elevated settings-card">
          <div className="settings-section">
            <h2 className="profile-section-title">Directions</h2>
            <p className="profile-section-copy">
              Choose which app opens when you request directions.
            </p>
            <div className="settings-row">
              <div className="settings-row__text">
                <div className="settings-row__title">Directions provider</div>
                <div className="settings-row__subtitle">
                  Switch between Google Maps and Waze.
                </div>
              </div>
              <div
                className="settings-switcher"
                role="group"
                aria-label="Directions provider"
              >
                <button
                  type="button"
                  className={`settings-switch${
                    directionsProvider === "google" ? " active" : ""
                  }`}
                  aria-pressed={directionsProvider === "google"}
                  onClick={() =>
                    onUpdateSettings?.({ directionsProvider: "google" })
                  }
                >
                  Google Maps
                </button>
                <button
                  type="button"
                  className={`settings-switch${
                    directionsProvider === "waze" ? " active" : ""
                  }`}
                  aria-pressed={directionsProvider === "waze"}
                  onClick={() =>
                    onUpdateSettings?.({ directionsProvider: "waze" })
                  }
                >
                  Waze
                </button>
              </div>
            </div>
            {directionsProvider === "waze" ? (
              <div className="settings-note">
                Waze uses your device location for routing.
              </div>
            ) : null}
          </div>

          <div className="settings-divider" role="presentation" />

          <div className="settings-section">
            <h2 className="profile-section-title">Map content</h2>
            <SettingsToggle
              title="Show recommended spots"
              description="Hide curated stargazing spots from the map and search."
              checked={showRecommendedSpots}
              onChange={(value) =>
                onUpdateSettings?.({ showRecommendedSpots: value })
              }
            />
            <SettingsToggle
              title="Light pollution overlay"
              description="Enable the light map overlay by default."
              checked={lightOverlayEnabled}
              onChange={(value) =>
                onUpdateSettings?.({ lightOverlayEnabled: value })
              }
            />
            <SettingsToggle
              title="Auto-center on my location"
              description="Fly the map to your location when VELA loads."
              checked={autoCenterOnLocate}
              onChange={(value) =>
                onUpdateSettings?.({ autoCenterOnLocate: value })
              }
            />
            <SettingsToggle
              title="High accuracy location"
              description="Use GPS for better accuracy (may use more battery)."
              checked={highAccuracyLocation}
              onChange={(value) =>
                onUpdateSettings?.({ highAccuracyLocation: value })
              }
            />
          </div>

          <div className="settings-divider" role="presentation" />

          <div className="settings-section">
            <h2 className="profile-section-title">Defaults</h2>
            <div className="settings-row">
              <div className="settings-row__text">
                <div className="settings-row__title">Map style</div>
                <div className="settings-row__subtitle">
                  Pick the base layer you want to start with.
                </div>
              </div>
              <div
                className="settings-switcher"
                role="group"
                aria-label="Map style"
              >
                {MAP_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`settings-switch${
                      mapType === option.value ? " active" : ""
                    }`}
                    aria-pressed={mapType === option.value}
                    onClick={() => onMapTypeChange?.(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-row__text">
                <div className="settings-row__title">
                  Dark spot search radius
                </div>
                <div className="settings-row__subtitle">
                  Choose how far to search for stargazing spots.
                </div>
              </div>
              <select
                className="profile-input settings-select"
                value={searchDistance}
                onChange={(event) =>
                  onUpdateSettings?.({
                    searchDistance: Number(event.target.value),
                  })
                }
              >
                {SEARCH_DISTANCE_OPTIONS.map((dist) => (
                  <option key={dist} value={dist}>
                    {dist} km
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="settings-actions">
            <div className="settings-hint">Changes save automatically.</div>
            <button
              type="button"
              className="glass-btn profile-action-btn profile-secondary"
              onClick={handleReset}
            >
              Reset to defaults
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default SettingsPage;
