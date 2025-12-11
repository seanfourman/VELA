import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import PlanetPanel from "./PlanetPanel";
import { fetchVisiblePlanets } from "../utils/planetUtils";

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
  const lastPlanetKey = useRef(null);
  const [placedMarker, setPlacedMarker] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [visiblePlanets, setVisiblePlanets] = useState([]);
  const [planetsLoading, setPlanetsLoading] = useState(false);
  const [planetsError, setPlanetsError] = useState(null);
  const [planetQuery, setPlanetQuery] = useState(null);
  const [planetPanelVisible, setPlanetPanelVisible] = useState(false);
  const [hasShownPanelToggle, setHasShownPanelToggle] = useState(false);
  // 'manual' = user clicked "Visible Planets", 'auto' = auto-location reveal
  const [panelSource, setPanelSource] = useState(null);
  const [isHoveringPanel, setIsHoveringPanel] = useState(false);
  const planetPanelTimerRef = useRef(null);
  const hoverHideTimeoutRef = useRef(null);
  const initialAutoHideScheduled = useRef(false);
  const initialRevealDelayRef = useRef(null);
  
  // Detect if user prefers reduced motion or has low-end hardware
  const reducedMotion = useMemo(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const lowCores = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
    return prefersReducedMotion || lowCores;
  }, []);

  // Default center (world view) when no location yet
  const defaultCenter = [20, 0];
  const defaultZoom = 2;

  const fetchPlanetsForLocation = useCallback(
    async (lat, lng, label, { force = false, source = "location" } = {}) => {
      if (lat === undefined || lng === undefined) return;
      const roundedKey = `${lat.toFixed(2)}_${lng.toFixed(2)}`;

      if (!force && lastPlanetKey.current === roundedKey) {
        return;
      }

      setPlanetsLoading(true);
      setPlanetsError(null);

      try {
        const data = await fetchVisiblePlanets(lat, lng);

        if (!data) {
          throw new Error("No visible planets data returned");
        }

        const planetList = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];

        setVisiblePlanets(planetList);
        setPlanetQuery({ lat, lng, label, source });
        lastPlanetKey.current = roundedKey;
      } catch (error) {
        setVisiblePlanets([]);
        setPlanetsError("Could not load visible planets right now.");
        console.error("Failed to fetch visible planets:", error);
      } finally {
        setPlanetsLoading(false);
      }
    },
    []
  );

  // Reveal panel - source determines behavior
  // 'manual': show with arrow immediately, stays until closed
  // 'auto': show without arrow, hide after 3s (or on hover-out)
  const revealPlanetPanel = useCallback((source = 'manual') => {
    // Clear any pending timers
    if (planetPanelTimerRef.current) {
      clearTimeout(planetPanelTimerRef.current);
      planetPanelTimerRef.current = null;
    }
    if (hoverHideTimeoutRef.current) {
      clearTimeout(hoverHideTimeoutRef.current);
      hoverHideTimeoutRef.current = null;
    }
    
    setPanelSource(source);
    setPlanetPanelVisible(true);
    
    if (source === 'manual') {
      // Manual source: show toggle arrow immediately
      setHasShownPanelToggle(true);
    }
    // Auto source: don't show toggle arrow yet, wait for hover-out cycle
  }, []);

  const hidePlanetPanel = useCallback(() => {
    if (planetPanelTimerRef.current) {
      clearTimeout(planetPanelTimerRef.current);
      planetPanelTimerRef.current = null;
    }
    if (hoverHideTimeoutRef.current) {
      clearTimeout(hoverHideTimeoutRef.current);
      hoverHideTimeoutRef.current = null;
    }
    setPlanetPanelVisible(false);
    setHasShownPanelToggle(true);
    setPanelSource(null);
  }, []);

  const togglePlanetPanel = useCallback(() => {
    if (planetPanelVisible) {
      hidePlanetPanel();
    } else {
      revealPlanetPanel('manual');
    }
  }, [planetPanelVisible, hidePlanetPanel, revealPlanetPanel]);

  // Schedule auto-hide for auto-revealed panels (3s after reveal/hover-out)
  const scheduleAutoHide = useCallback(() => {
    if (panelSource !== 'auto' || hasShownPanelToggle || !planetPanelVisible) {
      return;
    }

    if (hoverHideTimeoutRef.current) {
      clearTimeout(hoverHideTimeoutRef.current);
    }

    hoverHideTimeoutRef.current = setTimeout(() => {
      hidePlanetPanel();
      hoverHideTimeoutRef.current = null;
    }, 3000);
  }, [panelSource, hasShownPanelToggle, planetPanelVisible, hidePlanetPanel]);

  // Hover handlers for auto-reveal mode
  const handlePanelMouseEnter = useCallback(() => {
    setIsHoveringPanel(true);
    // Cancel any pending hide timer
    if (hoverHideTimeoutRef.current) {
      clearTimeout(hoverHideTimeoutRef.current);
      hoverHideTimeoutRef.current = null;
    }
    if (planetPanelTimerRef.current) {
      clearTimeout(planetPanelTimerRef.current);
      planetPanelTimerRef.current = null;
    }
  }, []);

  const handlePanelMouseLeave = useCallback(() => {
    setIsHoveringPanel(false);
    scheduleAutoHide();
  }, [scheduleAutoHide]);

  const handleSnapToLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.flyTo([location.lat, location.lng], 15, {
        duration: 2.5,
        easeLinearity: 0.25,
      });

      // Only refresh/reopen if we aren't already viewing the location panel
      if (planetQuery?.source !== "location" || !hasShownPanelToggle) {
        revealPlanetPanel("manual");
        fetchPlanetsForLocation(
          location.lat,
          location.lng,
          "Visible from your sky",
          { force: true, source: "location" }
        );
      }
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
      revealPlanetPanel("manual");
      fetchPlanetsForLocation(
        contextMenu.lat,
        contextMenu.lng,
        "Visible from pinned spot",
        { force: true, source: "pin" }
      );
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

    // If we have a live location, return to its data but REMOVE the panel completely
    if (location) {
      hidePlanetPanel();
      setHasShownPanelToggle(false); // Helper to completely remove toggle button
      
      fetchPlanetsForLocation(
        location.lat,
        location.lng,
        "Visible from your sky",
        { force: true, source: "location" }
      );
    } else {
      // No live location, close panel completely
      hidePlanetPanel();
      setHasShownPanelToggle(false);
    }
  };

  useEffect(() => {
    if (!location) return;
    if (planetQuery?.source === "pin") return;

    fetchPlanetsForLocation(
      location.lat,
      location.lng,
      "Visible from your sky",
      { source: "location" }
    );
  }, [location, planetQuery?.source, fetchPlanetsForLocation]);

  // Initial auto-reveal logic
  useEffect(() => {
    if (location && !initialAutoHideScheduled.current && !planetPanelVisible && !hasShownPanelToggle) {
       // Only if we actually have visible planets to show
       if (Array.isArray(visiblePlanets) && visiblePlanets.length > 0) {
         if (initialRevealDelayRef.current) clearTimeout(initialRevealDelayRef.current);
         
         initialRevealDelayRef.current = setTimeout(() => {
           revealPlanetPanel('auto');
           initialAutoHideScheduled.current = true;
         }, 3000);
       }
    }
  }, [location, planetPanelVisible, hasShownPanelToggle, visiblePlanets, revealPlanetPanel]);

  // Auto-hide guard when panel was opened automatically (even if user never hovered)
  useEffect(() => {
    if (panelSource === 'auto' && planetPanelVisible && !isHoveringPanel) {
      scheduleAutoHide();
    }
  }, [panelSource, planetPanelVisible, isHoveringPanel, scheduleAutoHide]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (planetPanelTimerRef.current) clearTimeout(planetPanelTimerRef.current);
      if (hoverHideTimeoutRef.current) clearTimeout(hoverHideTimeoutRef.current);
      if (initialRevealDelayRef.current) clearTimeout(initialRevealDelayRef.current);
    };
  }, []);

  const showPlanetPanelToggle =
    hasShownPanelToggle &&
    (location || (Array.isArray(visiblePlanets) && visiblePlanets.length > 0));

  return (
    <div className={`map-container visible ${mapType}`}>
      <div
        className={`planet-panel-wrapper ${
          planetPanelVisible ? "open" : "collapsed"
        }`}
        onMouseEnter={handlePanelMouseEnter}
        onMouseLeave={handlePanelMouseLeave}
      >
        <PlanetPanel
          planets={visiblePlanets}
          loading={planetsLoading}
          error={planetsError}
          mapType={mapType}
          panelVisible={planetPanelVisible}
          hasArrow={showPlanetPanelToggle}
          reducedMotion={reducedMotion}
        />

        {showPlanetPanelToggle && (
          <button
            className={`planet-panel-toggle ${
              planetPanelVisible ? "active" : ""
            }`}
            onClick={togglePlanetPanel}
            aria-label={
              planetPanelVisible
                ? "Hide visible planets panel"
                : "Show visible planets panel"
            }
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                transform: planetPanelVisible ? "rotate(180deg)" : "none",
              }}
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        )}
      </div>

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
                  Visible Planets
                </button>
                <button
                  className="popup-btn"
                  onClick={handleGetDirections}
                  disabled={!location}
                >
                  Get Directions
                </button>
                <button
                  className="popup-btn"
                  onClick={handleCloseContextMenu}
                >
                  Remove Pin
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

      {/* Map Type Switcher */}
      <div className="map-type-switcher">
        <button
          className={`map-type-btn ${mapType === "dark" ? "active" : ""}`}
          onClick={() => setMapType("dark")}
          title="Dark Mode"
        >
          <div
            className="map-preview"
            style={{
              backgroundImage:
                "url('https://api.maptiler.com/maps/streets-v2-dark/0/0/0.png?key=" +
                MAPTILER_KEY +
                "')",
            }}
          ></div>
        </button>
        <button
          className={`map-type-btn ${mapType === "light" ? "active" : ""}`}
          onClick={() => setMapType("light")}
          title="Light Mode"
        >
          <div
            className="map-preview"
            style={{
              backgroundImage:
                "url('https://api.maptiler.com/maps/streets-v2/0/0/0.png?key=" +
                MAPTILER_KEY +
                "')",
            }}
          ></div>
        </button>
        <button
          className={`map-type-btn ${mapType === "satellite" ? "active" : ""}`}
          onClick={() => setMapType("satellite")}
          title="Satellite Mode"
        >
          <div
            className="map-preview"
            style={{
              backgroundImage:
                "url('https://api.maptiler.com/maps/hybrid/0/0/0.jpg?key=" +
                MAPTILER_KEY +
                "')",
            }}
          ></div>
        </button>
      </div>
    </div>
  );
}

export default MapView;
