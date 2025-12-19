import SkyQualityInfo from "./SkyQualityInfo";
import "./ContextMenuPopup.css";

export default function ContextMenuPopup({
  coords,
  onGetDirections,
  onRemovePin,
}) {
  if (!coords) return null;

  return (
    <div className="context-menu-popup">
      <div className="popup-coords">
        <span className="popup-coords-label">Pinned location</span>
        <span className="popup-coords-value">
          {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </span>
      </div>

      <SkyQualityInfo
        lat={coords.lat}
        lng={coords.lng}
        variant="compact"
      />

      <div className="popup-actions">
        {onGetDirections && (
          <button className="popup-btn" onClick={onGetDirections}>
            Get Directions
          </button>
        )}
        {onRemovePin && (
          <button className="popup-btn danger" onClick={onRemovePin}>
            Remove Pin
          </button>
        )}
      </div>
    </div>
  );
}
