import { useMemo } from "react";
import SaturnGlobe from "../../components/planets/SaturnGlobe";
import PageShell from "../../components/layout/PageShell";
import showPopup from "../../utils/popup";
import { isProbablyHardwareAccelerated } from "../../utils/hardwareUtils";
import SearchDistanceSelector from "../Map/MapView/SearchDistanceSelector";
import "./SettingsPage.css";

const SEARCH_DISTANCE_OPTIONS = [10, 25, 50, 75, 100];
const MAP_TYPE_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "satellite", label: "Satellite" },
];

function SettingsToggle({ title, description, checked, onChange, disabled }) {
  return (
    <label
      className={`settings-row settings-row--toggle${
        disabled ? " settings-row--disabled" : ""
      }`}
    >
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
          disabled={disabled}
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
  const saturnVariant = "day";
  const mapTypeIndex = Math.max(
    0,
    MAP_TYPE_OPTIONS.findIndex((option) => option.value === mapType)
  );
  const mapTypeSwitcherStyle = {
    "--switch-index": mapTypeIndex,
    "--switch-count": MAP_TYPE_OPTIONS.length,
  };
  const {
    directionsProvider = "google",
    showRecommendedSpots = true,
    lightOverlayEnabled = false,
    autoCenterOnLocate = true,
    highAccuracyLocation = true,
    searchDistance = SEARCH_DISTANCE_OPTIONS[0],
  } = settings || {};
  const directionsSwitcherStyle = {
    "--switch-index": directionsProvider === "waze" ? 1 : 0,
    "--switch-count": 2,
  };

  const handleReset = () => {
    onResetSettings?.();
    showPopup("Settings reset to defaults.", "info", { duration: 2200 });
  };

  const hero = showMoon ? (
    <SaturnGlobe
      variant={saturnVariant}
      className="profile-page__earth-canvas"
    />
  ) : null;

  return (
    <PageShell
      title="Settings"
      subtitle="Tune the map, directions, and default behaviors."
      isLight={isLight}
      onNavigate={onNavigate}
      hero={hero}
      className="settings-page"
    >
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
              style={directionsSwitcherStyle}
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
            description="Temporarily disabled while the light map service is offline."
            checked={false}
            disabled={true}
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
              style={mapTypeSwitcherStyle}
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
              <div className="settings-row__title">Dark spot search radius</div>
              <div className="settings-row__subtitle">
                Choose how far to search for stargazing spots.
              </div>
            </div>
            <SearchDistanceSelector
              value={searchDistance}
              onChange={(next) =>
                onUpdateSettings?.({ searchDistance: Number(next) })
              }
            />
          </div>
        </div>

        <div className="settings-actions">
          <div className="settings-hint">Changes save automatically.</div>
          <button
            type="button"
            className="glass-btn profile-action-btn profile-secondary"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>
      </section>
    </PageShell>
  );
}

export default SettingsPage;
