import { useEffect, useMemo, useRef, useState } from "react";
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
import "./MapView/mapView.css";
import "./MapView/leaflet-overrides.css";
import PlanetPanelContainer from "./PlanetPanel/PlanetPanelContainer";
import MapTypeSwitcher from "./MapView/MapTypeSwitcher";
import LocationIndicator from "./MapView/LocationIndicator";
import ContextMenuPopup from "./MapView/ContextMenuPopup";
import SkyQualityPanel from "./MapView/SkyQualityPanel";
import usePlanets from "../hooks/usePlanets";
import { preloadAllPlanetTextures } from "../utils/planetUtils";
import { isProbablyHardwareAccelerated } from "../utils/hardwareUtils";
import { fetchDarkSpots } from "../utils/darkSpots";
import SearchDistanceSelector from "./MapView/SearchDistanceSelector";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || "";
const LOCATION_ZOOM = 16;
const DEFAULT_CENTER = [20, 0];
const DEFAULT_ZOOM = 2;
const MIN_ZOOM = 4;
const MAX_ZOOM = 16;
const LONG_PRESS_MS = 750;
const MARKER_EXIT_MS = 280;

const isCoarsePointerEnv = () => {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(pointer: coarse)")?.matches) return true;
  return typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
};

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

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

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

const pinIconRemoving = new L.DivIcon({
  className: "custom-marker placed-pin removing",
  html: `
    <div class="marker-pin placed removing">
      <div class="marker-dot placed removing"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const darkSpotIcon = new L.DivIcon({
  className: "custom-marker dark-spot-marker",
  html: `
    <div class="marker-pin dark-spot">
      <div class="marker-pulse"></div>
      <div class="marker-dot dark-spot"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function MapAnimator({ location }) {
  const map = useMap();
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (location && !hasAnimated.current) {
      hasAnimated.current = true;

      map.flyTo([location.lat, location.lng], LOCATION_ZOOM, {
        duration: 2.5,
        easeLinearity: 0.25,
      });
    }
  }, [location, map]);

  return null;
}

function MapController({ mapRef }) {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  return null;
}

function DoubleClickHandler({ onDoubleClick }) {
  useMapEvents({
    dblclick: (e) => {
      const isTouchEvent =
        e.originalEvent?.pointerType === "touch" ||
        e.originalEvent?.pointerType === "pen" ||
        Boolean(e.originalEvent?.touches?.length);

      if (isTouchEvent || isCoarsePointerEnv()) return;

      L.DomEvent.stopPropagation(e);
      onDoubleClick(e.latlng);
    },
  });
  return null;
}

function LongPressHandler({ onLongPress, delayMs = LONG_PRESS_MS }) {
  const map = useMap();
  const timerRef = useRef(null);
  const startPointRef = useRef(null);
  const lastEventRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const cancelTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = (e) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    startPointRef.current = map.latLngToContainerPoint(e.latlng);
    lastEventRef.current = e;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (lastEventRef.current?.originalEvent) {
        L.DomEvent.stop(lastEventRef.current.originalEvent);
      }
      onLongPress(lastEventRef.current?.latlng ?? e.latlng);
    }, delayMs);
  };

  const handleMove = (e) => {
    if (!timerRef.current || !startPointRef.current) return;
    const currentPoint = map.latLngToContainerPoint(e.latlng);
    if (startPointRef.current.distanceTo(currentPoint) > 10) {
      cancelTimer();
    }
  };

  useMapEvents({
    // Pointer events (Leaflet uses these when available)
    pointerdown: (e) => {
      startTimer(e);
    },
    pointermove: handleMove,
    pointerup: cancelTimer,
    pointercancel: cancelTimer,

    // Fallback for older mobile browsers without Pointer Events
    touchstart: (e) => {
      if (e.originalEvent?.touches?.length !== 1) return;
      startTimer(e);
    },
    touchmove: handleMove,
    touchend: cancelTimer,
    touchcancel: cancelTimer,

    // Fallback: Leaflet fires contextmenu on long-press/right-click
    contextmenu: (e) => {
      const btn = e.originalEvent?.button;
      const pointerType = e.originalEvent?.pointerType;
      if (btn === 2 || pointerType === "mouse") return;
      cancelTimer();
      if (e.originalEvent) L.DomEvent.stop(e.originalEvent);
      onLongPress(e.latlng);
    },
  });

  return null;
}

function MapView({ location, locationStatus, mapType, setMapType }) {
  const mapRef = useRef(null);
  const planetPanelRef = useRef(null);
  const [placedMarker, setPlacedMarker] = useState(null);
  const [exitingMarker, setExitingMarker] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [searchDistance, setSearchDistance] = useState(10);
  const [darkSpots, setDarkSpots] = useState([]);
  const skipAutoLocationRef = useRef(false);
  const removalTimeoutRef = useRef(null);

  const {
    visiblePlanets,
    planetsLoading,
    planetsError,
    planetQuery,
    fetchPlanetsForLocation,
    clearPlanets,
  } = usePlanets();

  const reducedMotion = useMemo(() => {
    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;
    const hardwareOk = isProbablyHardwareAccelerated();
    return prefersReducedMotion || !hardwareOk;
  }, []);

  useEffect(() => {
    preloadAllPlanetTextures();
  }, []);

  const centerOnCoords = (lat, lng) => {
    if (!mapRef.current || !isCoarsePointerEnv()) return;
    const map = mapRef.current;
    const zoom = map.getZoom();
    map.flyTo([lat, lng], zoom, { duration: 0.5, easeLinearity: 0.35 });
  };

  useEffect(() => {
    return () => {
      if (removalTimeoutRef.current) clearTimeout(removalTimeoutRef.current);
    };
  }, []);

  const handleSnapToLocation = () => {
    if (location && mapRef.current) {
      skipAutoLocationRef.current = false;
      mapRef.current.flyTo([location.lat, location.lng], LOCATION_ZOOM, {
        duration: 2.5,
        easeLinearity: 0.25,
      });

      const isMobile = isCoarsePointerEnv();
      if (isMobile) {
        planetPanelRef.current?.nudgeToggle?.();
      } else {
        planetPanelRef.current?.openPanel("manual");
      }

      fetchPlanetsForLocation(location.lat, location.lng, "Visible from your sky", {
        force: true,
        source: "location",
      });
    }
  };

  const handleShowLocationPlanets = () => {
    if (!location) return;
    skipAutoLocationRef.current = false;
    planetPanelRef.current?.openPanel("manual");
    fetchPlanetsForLocation(
      location.lat,
      location.lng,
      "Visible from your sky",
      { force: true, source: "location" }
    );
  };

  const handleDoubleClick = (latlng) => {
    if (removalTimeoutRef.current) {
      clearTimeout(removalTimeoutRef.current);
    }

    if (placedMarker) {
      setExitingMarker(placedMarker);
      removalTimeoutRef.current = setTimeout(() => {
        setExitingMarker(null);
      }, MARKER_EXIT_MS);
    }

    const nextMarker = {
      lat: latlng.lat,
      lng: latlng.lng,
      id: Date.now(),
    };

    setPlacedMarker(nextMarker);
    setContextMenu({
      lat: nextMarker.lat,
      lng: nextMarker.lng,
    });
  };

  const handleGetVisiblePlanets = () => {
    if (contextMenu) {
      planetPanelRef.current?.openPanel("manual");
      fetchPlanetsForLocation(
        contextMenu.lat,
        contextMenu.lng,
        "Visible from pinned spot",
        { force: true, source: "pin" }
      );
    }
  };

  const handleFetchDarkSpots = async () => {
    let lat, lng;
    if (contextMenu) {
      lat = contextMenu.lat;
      lng = contextMenu.lng;
    } else if (location) {
      lat = location.lat;
      lng = location.lng;
    }

    if (lat && lng) {
      // Close any open popup, but keep the pinned (blue) marker on the map.
      mapRef.current?.closePopup();
      const spots = await fetchDarkSpots(lat, lng, searchDistance);
      setDarkSpots(spots);

      if (spots.length > 0 && mapRef.current) {
        // Create bounds from the origin and all spots
        const bounds = L.latLngBounds([[lat, lng]]);
        spots.forEach((spot) => bounds.extend([spot.lat, spot.lon]));

        mapRef.current.flyToBounds(bounds, {
          padding: [50, 50],
          duration: 2.5,
          easeLinearity: 0.25,
        });
      }
    }
  };

  const handleGetDirections = () => {
    if (contextMenu && location) {
      const url = `https://www.google.com/maps/dir/${location.lat},${location.lng}/${contextMenu.lat},${contextMenu.lng}`;
      window.open(url, "_blank");
    }
  };

  const getDirectionsOrigin = () => {
    // Blue pinned marker is stronger than the green live location dot.
    if (placedMarker)
      return {
        lat: placedMarker.lat,
        lng: placedMarker.lng,
        label: "Pinned spot",
      };
    if (location)
      return { lat: location.lat, lng: location.lng, label: "Your location" };
    return null;
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
    if (removalTimeoutRef.current) clearTimeout(removalTimeoutRef.current);
    if (placedMarker) {
      setExitingMarker(placedMarker);
      removalTimeoutRef.current = setTimeout(() => {
        setExitingMarker(null);
      }, MARKER_EXIT_MS);
    }
    setPlacedMarker(null);

    const isShowingPinPlanets = planetQuery?.source === "pin";
    skipAutoLocationRef.current = isShowingPinPlanets;

    if (isShowingPinPlanets) {
      planetPanelRef.current?.resetPanel?.(
        () => {
          clearPlanets();
        },
        { hideToggle: true }
      );
      return;
    }

    // Don't clear stargazing locations on simple menu close.

    if (!location) {
      planetPanelRef.current?.hidePanel();
      planetPanelRef.current?.resetToggle?.();
    }
  };

  useEffect(() => {
    if (!location) return;
    if (planetQuery?.source === "pin") return;
    if (skipAutoLocationRef.current) return;

    fetchPlanetsForLocation(
      location.lat,
      location.lng,
      "Visible from your sky",
      { source: "location" }
    );
  }, [location, planetQuery?.source, fetchPlanetsForLocation]);

  return (
    <div className={`map-container visible ${mapType}`}>
      <PlanetPanelContainer
        ref={planetPanelRef}
        planets={visiblePlanets}
        loading={planetsLoading}
        error={planetsError}
        mapType={mapType}
        reducedMotion={reducedMotion}
        location={location}
      />

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
        doubleClickZoom={false}
        minZoom={MIN_ZOOM}
        maxBounds={[
          [-85, -180],
          [85, 180],
        ]}
        maxBoundsViscosity={1.0}
        maxZoom={MAX_ZOOM}
      >
        <TileLayer
          key={mapType}
          attribution={MAP_TILES[mapType].attribution}
          url={MAP_TILES[mapType].url}
          maxZoom={MAX_ZOOM}
          keepBuffer={4}
          updateWhenIdle={true}
          updateWhenZooming={false}
          noWrap={true}
        />

        <MapController mapRef={mapRef} />
        <DoubleClickHandler onDoubleClick={handleDoubleClick} />
        <LongPressHandler
          onLongPress={handleDoubleClick}
          delayMs={LONG_PRESS_MS}
        />
        {location && <MapAnimator location={location} />}

        {location && (
          <Marker
            position={[location.lat, location.lng]}
            icon={customIcon}
            eventHandlers={{
              popupopen: () => centerOnCoords(location.lat, location.lng),
            }}
          >
            <Popup>
              <div className="context-menu-popup">
                <div className="popup-coords">
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </div>
                <button
                  className="popup-btn"
                  onClick={handleShowLocationPlanets}
                >
                  Visible Planets
                </button>
                <button className="popup-btn" onClick={handleFetchDarkSpots}>
                  Stargazing Locations
                </button>
              </div>
            </Popup>
          </Marker>
        )}

        {exitingMarker && (
          <Marker
            key={`removing-${exitingMarker.id || `${exitingMarker.lat}-${exitingMarker.lng}`}`}
            position={[exitingMarker.lat, exitingMarker.lng]}
            icon={pinIconRemoving}
            interactive={false}
          />
        )}

        {placedMarker && (
          <Marker
            key={`placed-${placedMarker.id}`}
            position={[placedMarker.lat, placedMarker.lng]}
            icon={pinIcon}
            eventHandlers={{
              popupopen: () => centerOnCoords(placedMarker.lat, placedMarker.lng),
            }}
          >
            <Popup>
              <ContextMenuPopup
                coords={placedMarker}
                onGetVisiblePlanets={handleGetVisiblePlanets}
                onGetDirections={location ? handleGetDirections : null}
                onRemovePin={handleCloseContextMenu}
                onFindDarkSpots={handleFetchDarkSpots}
              />
            </Popup>
          </Marker>
        )}

        {darkSpots.map((spot, i) => (
          <Marker
            key={`darkspot-${i}`}
            position={[spot.lat, spot.lon]}
            icon={darkSpotIcon}
            eventHandlers={{
              popupopen: () => centerOnCoords(spot.lat, spot.lon),
            }}
          >
            <Popup>
              <div className="context-menu-popup">
                <div className="popup-coords">Stargazing Location</div>
                <div className="popup-coords">
                  {spot.lat.toFixed(4)}, {spot.lon.toFixed(4)}
                </div>
                <div className="popup-coords">
                  Level: {spot.level}
                  <br />
                  Light Value: {spot.light_value?.toFixed(2)}
                </div>
                {getDirectionsOrigin() && (
                  <button
                    className="popup-btn"
                    onClick={() => {
                      const origin = getDirectionsOrigin();
                      if (!origin) return;
                      const url = `https://www.google.com/maps/dir/${origin.lat},${origin.lng}/${spot.lat},${spot.lon}`;
                      window.open(url, "_blank");
                    }}
                  >
                    Get Directions
                    <br />
                    (from {getDirectionsOrigin()?.label.toLowerCase()})
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <SkyQualityPanel coords={placedMarker} />

      <SearchDistanceSelector
        value={searchDistance}
        onChange={setSearchDistance}
      />

      <LocationIndicator
        status={locationStatus}
        onClick={locationStatus === "active" ? handleSnapToLocation : undefined}
      />

      <MapTypeSwitcher
        mapType={mapType}
        onChange={setMapType}
        previewKey={MAPTILER_KEY}
      />
    </div>
  );
}

export default MapView;
