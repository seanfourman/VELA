import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./MapView.css";

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom marker icon
const customIcon = new L.DivIcon({
  className: "custom-marker",
  html: `
    <div class="marker-pin">
      <div class="marker-pulse"></div>
      <div class="marker-dot"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// Component to handle map animations
function MapAnimator({ location }) {
  const map = useMap();
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (location && !hasAnimated.current) {
      hasAnimated.current = true;

      // Animate zoom in to location
      map.flyTo([location.lat, location.lng], 15, {
        duration: 2.5,
        easeLinearity: 0.25,
      });
    }
  }, [location, map]);

  return null;
}

function MapView({ location, isVisible, isLoading }) {
  // Default center (world view) when no location yet
  const defaultCenter = [20, 0];
  const defaultZoom = 2;

  return (
    <div className={`map-container ${isVisible ? "visible" : ""}`}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
        minZoom={4}
        maxBounds={[
          [-85, -180],
          [85, 180],
        ]}
        maxBoundsViscosity={1.0}
      >
        {/* CARTO Dark Matter - slightly brightened */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
          keepBuffer={4}
          updateWhenIdle={true}
          updateWhenZooming={false}
          noWrap={true}
        />

        {location && <MapAnimator location={location} />}

        {location && (
          <Marker position={[location.lat, location.lng]} icon={customIcon}>
            <Popup className="custom-popup">
              <div className="popup-content">
                <h4>📍 Your Location</h4>
                <p>Lat: {location.lat.toFixed(4)}</p>
                <p>Lng: {location.lng.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {location && (
        <div className="map-overlay">
          <div className="location-badge">
            <span className="badge-dot"></span>
            <span>Live Location</span>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p>Getting your location...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapView;
