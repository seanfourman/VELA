import planetsIcon from "../../assets/icons/planets-icon.svg";
import stargazingIcon from "../../assets/icons/stargazing-icon.svg";
import locationIcon from "../../assets/icons/location-icon.svg";
import "./MapQuickActions.css";

function QuickActionButton({ icon, label, title, disabled, onClick }) {
  return (
    <div className="quick-action">
      <button
        className="glass-icon-btn quick-action-btn"
        onClick={onClick}
        disabled={disabled}
        aria-label={title || label}
        title={title || label}
      >
        <img src={icon} alt="" className="quick-action-icon" />
      </button>
      <span className="quick-action-label">{label}</span>
    </div>
  );
}

function LocationStatusButton({ status, onClick }) {
  const isActive = status === "active";
  const isSearching = status === "searching";
  const statusClass = isActive ? "active" : isSearching ? "searching" : "off";
  const label =
    status === "active"
      ? "Live location"
      : status === "searching"
      ? "Searching..."
      : "Location off";

  return (
    <div className="location-control">
      <button
        className={`glass-icon-btn location-btn ${statusClass}`}
        onClick={isActive ? onClick : undefined}
        disabled={!isActive}
        aria-label={label}
        title={label}
      >
        <span className="location-ping" aria-hidden="true" />
        <img src={locationIcon} alt="" className="quick-action-icon" />
      </button>
      <span className="quick-action-label">{label}</span>
    </div>
  );
}

export default function MapQuickActions({
  onShowPlanets,
  onFindDarkSpots,
  canShowPlanets,
  canFindDarkSpots,
  planetsTitle,
  darkSpotsTitle,
  locationStatus,
  onSnapToLocation,
}) {
  return (
    <div className="map-quick-actions">
      <div className="quick-action-row">
        <QuickActionButton
          icon={planetsIcon}
          label="Planets"
          title={planetsTitle}
          disabled={!canShowPlanets}
          onClick={onShowPlanets}
        />

        <QuickActionButton
          icon={stargazingIcon}
          label="Stargaze"
          title={darkSpotsTitle}
          disabled={!canFindDarkSpots}
          onClick={onFindDarkSpots}
        />
      </div>

      <LocationStatusButton
        status={locationStatus}
        onClick={onSnapToLocation}
      />
    </div>
  );
}
