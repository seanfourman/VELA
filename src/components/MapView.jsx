import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./MapView.css";

const MAPTILER_KEY = "QvyjnqdnkmG5VtE3d2xS";

// Map tile configurations - all MapTiler
const MAP_TILES = {
  dark: {
    url: `https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
    attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>',
  },
  light: {
    url: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
    attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>',
  },
  satellite: {
    url: `https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`,
    attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>',
  },
};

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

// Component to handle snap-to-location
function MapController({ mapRef }) {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  return null;
}

function MapView({ location, locationStatus, mapType, setMapType }) {
  const mapRef = useRef(null);

  // Default center (world view) when no location yet
  const defaultCenter = [20, 0];
  const defaultZoom = 2;

  const handleSnapToLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.flyTo([location.lat, location.lng], 15, {
        duration: 1,
      });
    }
  };

  return (
    <div className={`map-container visible ${mapType}`}>
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
        <TileLayer
          key={mapType}
          attribution={MAP_TILES[mapType].attribution}
          url={MAP_TILES[mapType].url}
          maxZoom={19}
          keepBuffer={4}
          updateWhenIdle={true}
          updateWhenZooming={false}
          noWrap={true}
        />

        <MapController mapRef={mapRef} />
        {location && <MapAnimator location={location} />}

        {location && (
          <Marker
            position={[location.lat, location.lng]}
            icon={customIcon}
          ></Marker>
        )}
      </MapContainer>

      {/* Location status indicator */}
      <div
        className={`location-indicator ${
          locationStatus === "active" ? "clickable" : ""
        }`}
        onClick={locationStatus === "active" ? handleSnapToLocation : undefined}
        title={
          locationStatus === "active" ? "Click to go to your location" : ""
        }
      >
        <div className={`indicator-dot ${locationStatus}`}></div>
        <span className="indicator-text">
          {locationStatus === "active" && "Live Location"}
          {locationStatus === "searching" && "Searching..."}
          {locationStatus === "off" && "Location Off"}
        </span>
      </div>

      {/* Map type switcher */}
      <div className="map-type-switcher">
        <button
          className={`map-type-btn ${mapType === "dark" ? "active" : ""}`}
          onClick={() => setMapType("dark")}
          title="Dark Mode"
        >
          <div
            className="map-preview"
            style={{
              backgroundImage: `url(https://api.maptiler.com/maps/streets-v2-dark/256/2/2/1.png?key=${MAPTILER_KEY})`,
            }}
          />
        </button>
        <button
          className={`map-type-btn ${mapType === "light" ? "active" : ""}`}
          onClick={() => setMapType("light")}
          title="Light Mode"
        >
          <div
            className="map-preview"
            style={{
              backgroundImage: `url(https://api.maptiler.com/maps/streets-v2/256/2/2/1.png?key=${MAPTILER_KEY})`,
            }}
          />
        </button>
        <button
          className={`map-type-btn ${mapType === "satellite" ? "active" : ""}`}
          onClick={() => setMapType("satellite")}
          title="Satellite"
        >
          <div
            className="map-preview"
            style={{
              backgroundImage: `url(https://api.maptiler.com/maps/hybrid/256/2/2/1.jpg?key=${MAPTILER_KEY})`,
            }}
          />
        </button>
      </div>
    </div>
  );
}

export default MapView;
