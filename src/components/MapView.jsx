import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./MapView.css";

const MAPTILER_KEY = "QvyjnqdnkmG5VtE3d2xS";
const PLANETS_API_CACHE_KEY = "visiblePlanetsCache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms

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

// Custom marker for double-click placed pins
const pinIcon = new L.DivIcon({
  className: "custom-marker placed-pin",
  html: `
    <div class="marker-pin placed">
      <div class="marker-dot placed"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// Fetch visible planets with caching
async function fetchVisiblePlanets(lat, lng) {
  const cacheKey = `${PLANETS_API_CACHE_KEY}_${lat.toFixed(2)}_${lng.toFixed(
    2
  )}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_DURATION) {
      console.log("Using cached planets data:", data);
      return data;
    }
  }

  try {
    const response = await fetch(
      `https://api.visibleplanets.dev/v3?latitude=${lat}&longitude=${lng}`
    );
    const data = await response.json();
    console.log("Fetched visible planets:", data);

    localStorage.setItem(
      cacheKey,
      JSON.stringify({ data, timestamp: Date.now() })
    );

    return data;
  } catch (error) {
    console.error("Failed to fetch visible planets:", error);
    return null;
  }
}

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

// Component to handle double-click events
function DoubleClickHandler({ onDoubleClick }) {
  useMapEvents({
    dblclick: (e) => {
      L.DomEvent.stopPropagation(e);
      onDoubleClick(e.latlng);
    },
  });
  return null;
}

function MapView({ location, locationStatus, mapType, setMapType }) {
  const mapRef = useRef(null);
  const [placedMarker, setPlacedMarker] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

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

  const handleDoubleClick = (latlng) => {
    setPlacedMarker(latlng);
    setContextMenu({
      lat: latlng.lat,
      lng: latlng.lng,
    });
  };

  const handleGetVisiblePlanets = async () => {
    if (contextMenu) {
      const data = await fetchVisiblePlanets(contextMenu.lat, contextMenu.lng);
      console.log("Visible planets at location:", {
        coordinates: { lat: contextMenu.lat, lng: contextMenu.lng },
        planets: data,
      });
    }
  };

  const handleGetDirections = () => {
    if (contextMenu && location) {
      const url = `https://www.google.com/maps/dir/${location.lat},${location.lng}/${contextMenu.lat},${contextMenu.lng}`;
      console.log("Directions URL:", url);
      window.open(url, "_blank");
    } else if (contextMenu) {
      console.log("Location not available for directions");
    }
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
    setPlacedMarker(null);
  };

  return (
    <div className={`map-container visible ${mapType}`}>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
        doubleClickZoom={false}
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
        <DoubleClickHandler onDoubleClick={handleDoubleClick} />
        {location && <MapAnimator location={location} />}

        {location && (
          <Marker
            position={[location.lat, location.lng]}
            icon={customIcon}
          ></Marker>
        )}

        {placedMarker && (
          <Marker
            position={[placedMarker.lat, placedMarker.lng]}
            icon={pinIcon}
          >
            <Popup>
              <div className="context-menu-popup">
                <div className="popup-coords">
                  {placedMarker.lat.toFixed(4)}, {placedMarker.lng.toFixed(4)}
                </div>
                <button className="popup-btn" onClick={handleGetVisiblePlanets}>
                  🔭 Visible Planets
                </button>
                <button
                  className="popup-btn"
                  onClick={handleGetDirections}
                  disabled={!location}
                >
                  🧭 Get Directions
                </button>
                <button
                  className="popup-btn close"
                  onClick={handleCloseContextMenu}
                >
                  ✕ Close
                </button>
              </div>
            </Popup>
          </Marker>
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
