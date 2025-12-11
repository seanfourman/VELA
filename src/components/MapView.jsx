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
import "./MapView/mapView.css";
import "./MapView/leaflet-overrides.css";
import PlanetPanelContainer from "./PlanetPanel/PlanetPanelContainer";
import MapTypeSwitcher from "./MapView/MapTypeSwitcher";
import LocationIndicator from "./MapView/LocationIndicator";
import ContextMenuPopup from "./MapView/ContextMenuPopup";
import usePlanets from "../hooks/usePlanets";

const MAPTILER_KEY = "QvyjnqdnkmG5VtE3d2xS";

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

function MapAnimator({ location }) {
  const map = useMap();
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (location && !hasAnimated.current) {
      hasAnimated.current = true;

      map.flyTo([location.lat, location.lng], 15, {
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
      L.DomEvent.stopPropagation(e);
      onDoubleClick(e.latlng);
    },
  });
  return null;
}

function MapView({ location, locationStatus, mapType, setMapType }) {
  const mapRef = useRef(null);
  const planetPanelRef = useRef(null);
  const [placedMarker, setPlacedMarker] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const skipAutoLocationRef = useRef(false);

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
    const lowCores =
      navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;
    return prefersReducedMotion || lowCores;
  }, []);

  const defaultCenter = [20, 0];
  const defaultZoom = 2;

  const handleSnapToLocation = () => {
    if (location && mapRef.current) {
      skipAutoLocationRef.current = false;
      mapRef.current.flyTo([location.lat, location.lng], 15, {
        duration: 2.5,
        easeLinearity: 0.25,
      });

      planetPanelRef.current?.openPanel("manual");
      fetchPlanetsForLocation(
        location.lat,
        location.lng,
        "Visible from your sky",
        { force: true, source: "location" }
      );
    }
  };

  const handleDoubleClick = (latlng) => {
    setPlacedMarker(latlng);
    setContextMenu({
      lat: latlng.lat,
      lng: latlng.lng,
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

    const isShowingPinPlanets = planetQuery?.source === "pin";
    skipAutoLocationRef.current = isShowingPinPlanets;

    if (isShowingPinPlanets) {
      planetPanelRef.current?.resetPanel?.(() => {
        clearPlanets();
      }, { hideToggle: true });
      return;
    }

    // If we weren't showing pin planets, keep current panel (e.g., live location)
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
        planetQuery={planetQuery}
        location={location}
      />

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
              <ContextMenuPopup
                coords={placedMarker}
                onGetVisiblePlanets={handleGetVisiblePlanets}
                onGetDirections={handleGetDirections}
                onRemovePin={handleCloseContextMenu}
                disableDirections={!location}
              />
            </Popup>
          </Marker>
        )}
      </MapContainer>

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
