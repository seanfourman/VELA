import SkyQualityInfo from "../SkyQualityInfo";
import { copyCoordinates, formatCoordinatesLabel } from "./copyCoordinates";

export default function LocationPopupContent({ location, onOpenSpaceWeather }) {
  if (!location) return null;
  const coordinatesLabel = formatCoordinatesLabel({
    lat: location.lat,
    lng: location.lng,
  });
  const handleCopyCoords = (event) => {
    event.stopPropagation();
    void copyCoordinates({ lat: location.lat, lng: location.lng });
  };
  const handleCopyCoordsKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    void copyCoordinates({ lat: location.lat, lng: location.lng });
  };

  return (
    <div className="context-menu-popup location-popup">
      <div className="context-menu-popup__scroll">
        <div className="popup-coords location-popup__title-block">
          <span className="popup-coords-label-row">
            <span className="popup-coords-label">Your location</span>
          </span>
          <span
            className="popup-coords-value popup-coords-value--copyable"
            role="button"
            tabIndex={0}
            aria-label={`Copy coordinates ${coordinatesLabel}`}
            onClick={handleCopyCoords}
            onKeyDown={handleCopyCoordsKeyDown}
          >
            {coordinatesLabel}
          </span>
        </div>

        <SkyQualityInfo lat={location.lat} lng={location.lng} variant="compact" />

        {onOpenSpaceWeather ? (
          <div className="popup-actions">
            <button className="popup-btn" onClick={onOpenSpaceWeather}>
              Get Space Weather
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
