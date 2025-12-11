import "./ContextMenuPopup.css";

export default function ContextMenuPopup({
  coords,
  onGetVisiblePlanets,
  onGetDirections,
  onRemovePin,
  disableDirections,
}) {
  return (
    <div className="context-menu-popup">
      <div className="popup-coords">
        {coords?.lat.toFixed(4)}, {coords?.lng.toFixed(4)}
      </div>
      <button className="popup-btn" onClick={onGetVisiblePlanets}>
        Visible Planets
      </button>
      {onGetDirections && !disableDirections && (
        <button className="popup-btn" onClick={onGetDirections}>
          Get Directions
        </button>
      )}
      <button className="popup-btn" onClick={onRemovePin}>
        Remove Pin
      </button>
    </div>
  );
}
