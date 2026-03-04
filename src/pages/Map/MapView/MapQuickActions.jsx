import planetsIcon from "@/assets/icons/planets-icon.svg";
import stargazingIcon from "@/assets/icons/stargazing-icon.svg";
import locationIcon from "@/assets/icons/location-icon.svg";
import lightmapIcon from "@/assets/icons/lightmap-icon.svg";
import cubeIcon from "@/assets/icons/cube-svgrepo-com.svg";
import "./MapQuickActions.css";

function QuickActionButton({
  icon,
  label,
  title,
  disabled,
  onClick,
  active = undefined,
}) {
  const text = title || label;

  const handleClick = (event) => {
    if (disabled) return;
    onClick?.(event);
    event.currentTarget.blur();
  };

  return (
    <div className="quick-action">
      <button
        className={`glass-icon-btn quick-action-btn${active ? " active" : ""}`}
        onClick={handleClick}
        disabled={disabled}
        aria-label={title || label}
        aria-pressed={active ?? undefined}
        type="button"
      >
        <img src={icon} alt="" className="quick-action-icon" />
      </button>
      <span
        className={`quick-action-label${disabled ? " disabled" : ""}`}
        aria-hidden="true"
      >
        {text}
      </span>
    </div>
  );
}

function LocationStatusButton({ status, onClick, disabled = false }) {
  const isActive = status === "active";
  const isSearching = status === "searching";
  const statusClass = isActive ? "active" : isSearching ? "searching" : "off";
  const label =
    status === "active"
      ? "Live location"
      : status === "searching"
      ? "Searching..."
      : "Location off";
  const hoverLabel = isActive
    ? "Snap to your location"
    : isSearching
    ? "Locating you..."
    : "Location off";

  const handleClick = (event) => {
    if (!isActive || disabled) return;
    onClick?.(event);
    event.currentTarget.blur();
  };

  return (
    <div className="quick-action location-control">
      <button
        className={`glass-icon-btn location-btn ${statusClass}`}
        onClick={handleClick}
        disabled={!isActive || disabled}
        aria-label={label}
      >
        <span className="location-ping" aria-hidden="true" />
        <img src={locationIcon} alt="" className="quick-action-icon" />
      </button>
      <span
        className={`quick-action-label${
          !isActive || disabled ? " disabled" : ""
        }`}
        aria-hidden="true"
      >
        {disabled ? "Disabled in 3D mode" : hoverLabel}
      </span>
    </div>
  );
}

export default function MapQuickActions({
  isThreeDMode = false,
  onToggleThreeDMode,
  onShowPlanets,
  onFindDarkSpots,
  canShowPlanets,
  canFindDarkSpots,
  planetsTitle,
  darkSpotsTitle,
  locationStatus,
  onSnapToLocation,
  lightOverlayEnabled,
  onToggleLightOverlay,
}) {
  const disableOtherActions = isThreeDMode;

  return (
    <div className="map-quick-actions">
      <QuickActionButton
        icon={cubeIcon}
        label="3D"
        title={isThreeDMode ? "Disable 3D view" : "Enable 3D view"}
        active={isThreeDMode}
        onClick={onToggleThreeDMode}
      />
      <QuickActionButton
        icon={planetsIcon}
        label="Planets"
        title={planetsTitle}
        disabled={disableOtherActions || !canShowPlanets}
        onClick={onShowPlanets}
      />
      <QuickActionButton
        icon={stargazingIcon}
        label="Stargaze"
        title={darkSpotsTitle}
        disabled={disableOtherActions || !canFindDarkSpots}
        onClick={onFindDarkSpots}
      />
      <QuickActionButton
        icon={lightmapIcon}
        label="Light map"
        title={
          lightOverlayEnabled
            ? "Hide light pollution overlay"
            : "Show light pollution overlay"
        }
        active={Boolean(lightOverlayEnabled && !disableOtherActions)}
        disabled={disableOtherActions}
        onClick={onToggleLightOverlay}
      />
      <LocationStatusButton
        status={locationStatus}
        onClick={onSnapToLocation}
        disabled={disableOtherActions}
      />
    </div>
  );
}
