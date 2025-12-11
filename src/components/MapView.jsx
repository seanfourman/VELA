import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
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
import {
  LinearFilter,
  LinearMipmapLinearFilter,
  DoubleSide,
  SRGBColorSpace,
  Vector3,
} from "three";
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

const planetTexture = (fileName) =>
  new URL(`../assets/planets/${fileName}`, import.meta.url).href;

const PLANET_TEXTURES = {
  sun: planetTexture("2k_sun.jpg"),
  moon: planetTexture("2k_moon.jpg"),
  mercury: planetTexture("2k_mercury.jpg"),
  venus: planetTexture("2k_venus_atmosphere.jpg"),
  earth: planetTexture("2k_stars_milky_way.jpg"),
  mars: planetTexture("2k_mars.jpg"),
  jupiter: planetTexture("2k_jupiter.jpg"),
  saturn: planetTexture("2k_saturn.jpg"),
  saturnRing: planetTexture("2k_saturn_ring_alpha.png"),
  uranus: planetTexture("2k_uranus.jpg"),
  neptune: planetTexture("2k_neptune.jpg"),
  pluto: planetTexture("2k_makemake_fictional.jpg"),
  ceres: planetTexture("2k_ceres_fictional.jpg"),
  eris: planetTexture("2k_eris_fictional.jpg"),
  haumea: planetTexture("2k_haumea_fictional.jpg"),
  makemake: planetTexture("2k_makemake_fictional.jpg"),
  stars: planetTexture("2k_stars_milky_way.jpg"),
  default: planetTexture("2k_stars_milky_way.jpg"),
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
      //`https://8gvuiadil2.execute-api.us-east-1.amazonaws.com/planets?lat=${lat}&lon=${lng}`
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

const resolvePlanetTexture = (name) => {
  if (!name) return PLANET_TEXTURES.default;
  const key = name.toLowerCase();

  if (PLANET_TEXTURES[key]) return PLANET_TEXTURES[key];
  if (key.includes("venus")) return PLANET_TEXTURES.venus;
  if (key.includes("saturn")) return PLANET_TEXTURES.saturn;
  if (key.includes("moon")) return PLANET_TEXTURES.moon;

  return PLANET_TEXTURES.default;
};

function PlanetGlobe({ textureUrl, name }) {
  const isSaturn = !!name && name.toLowerCase().includes("saturn");
  const innerRadius = 0.7;
  const outerRadius = 1.05;
  const [baseTexture, baseRingTexture] = useTexture(
    isSaturn ? [textureUrl, PLANET_TEXTURES.saturnRing] : [textureUrl]
  );
  const texture = useMemo(() => {
    if (!baseTexture) return baseTexture;

    const cloned = baseTexture.clone();
    cloned.colorSpace = SRGBColorSpace;
    cloned.minFilter = LinearMipmapLinearFilter;
    cloned.magFilter = LinearFilter;
    cloned.anisotropy = 4;
    cloned.needsUpdate = true;

    return cloned;
  }, [baseTexture]);
  const ringTexture = useMemo(() => {
    if (!baseRingTexture) return baseRingTexture;
    const cloned = baseRingTexture.clone();
    cloned.colorSpace = SRGBColorSpace;
    cloned.minFilter = LinearMipmapLinearFilter;
    cloned.magFilter = LinearFilter;
    cloned.anisotropy = 8;
    cloned.needsUpdate = true;
    return cloned;
  }, [baseRingTexture]);
  const meshRef = useRef();
  const ringGeoRef = useRef();

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.35 * delta;
      meshRef.current.rotation.x = Math.sin(Date.now() * 0.0003) * 0.08;
    }
  });

  useLayoutEffect(() => {
    if (!isSaturn || !ringGeoRef.current) return;

    const geo = ringGeoRef.current;
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const v3 = new Vector3();

    for (let i = 0; i < pos.count; i += 1) {
      v3.fromBufferAttribute(pos, i);
      const radius = Math.sqrt(v3.x * v3.x + v3.y * v3.y);
      const u = (radius - innerRadius) / (outerRadius - innerRadius);
      const theta = Math.atan2(v3.y, v3.x);
      const v = (theta + Math.PI) / (2 * Math.PI);
      uv.setXY(i, u, v);
    }

    uv.needsUpdate = true;
  }, [isSaturn, innerRadius, outerRadius]);

  return (
    <>
      <mesh ref={meshRef} castShadow receiveShadow>
        <sphereGeometry args={[0.45, 64, 64]} />
        <meshStandardMaterial map={texture} roughness={0.85} metalness={0.08} />
      </mesh>
      {isSaturn && ringTexture && (
        <mesh rotation={[Math.PI / 2.1, 0, 0]}>
          <ringGeometry
            ref={ringGeoRef}
            args={[innerRadius, outerRadius, 128]}
          />
          <meshStandardMaterial
            map={ringTexture}
            alphaMap={ringTexture}
            color="#ffffff"
            emissive="#b3a89a"
            emissiveIntensity={5}
            side={DoubleSide}
            transparent
            depthWrite={false}
            opacity={1}
            roughness={0.35}
            metalness={0.02}
            alphaTest={0.02}
          />
        </mesh>
      )}
    </>
  );
}

function PlanetCard({ planet, cardRef, onHover }) {
  const textureUrl = useMemo(
    () => resolvePlanetTexture(planet?.name),
    [planet?.name]
  );
  const [autoSpin, setAutoSpin] = useState(true);

  return (
    <div className="planet-card" ref={cardRef} onMouseEnter={onHover}>
      <div className="planet-canvas">
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 3.2], fov: 38 }}
          gl={{ antialias: true, powerPreference: "high-performance" }}
        >
          <ambientLight intensity={1.1} />
          <directionalLight position={[2.5, 2.5, 2.5]} intensity={1.2} />
          <directionalLight position={[-2, -1, -1]} intensity={0.35} />
          <Suspense fallback={null}>
            <PlanetGlobe textureUrl={textureUrl} name={planet?.name} />
          </Suspense>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate={autoSpin}
            autoRotateSpeed={0.55}
            rotateSpeed={1}
            onStart={() => setAutoSpin(false)}
            onEnd={() => setAutoSpin(true)}
          />
        </Canvas>
      </div>
    </div>
  );
}

function Planetarium({ planets, loading, error, mapType, panelVisible }) {
  const [page, setPage] = useState(0);
  const firstCardRef = useRef(null);
  const planetStackRef = useRef(null);
  const [cardHeight, setCardHeight] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const planetsToShow = useMemo(
    () =>
      (Array.isArray(planets) ? planets : []).filter(
        (planet) => planet.aboveHorizon !== false
      ),
    [planets]
  );

  const PAGE_SIZE = 3;
  const totalPages = Math.max(1, Math.ceil(planetsToShow.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const hasPlanets = planetsToShow.length > 0;

  useEffect(() => {
    setPage(0);
  }, [planetsToShow.length]);

  useLayoutEffect(() => {
    if (firstCardRef.current) {
      const rect = firstCardRef.current.getBoundingClientRect();
      if (rect?.height) {
        setCardHeight(rect.height);
      }
    }
  }, [planetsToShow.length, mapType, loading]);

  useEffect(() => {
    setHoveredCard(null);
  }, [safePage, loading, error, panelVisible, planetsToShow.length]);

  const formatDegrees = (value) => {
    if (value === undefined || value === null || Number.isNaN(value)) {
      return "-";
    }
    return `${value.toFixed(1)}\u00b0`;
  };

  const formatMagnitude = (value) => {
    if (value === undefined || value === null || Number.isNaN(value)) {
      return "-";
    }
    return value.toFixed(1);
  };

  const formatRightAscension = (ra) => {
    if (!ra) return "-";
    const hours = Number.isFinite(ra.hours)
      ? ra.hours.toString().padStart(2, "0")
      : "00";
    const minutes = Number.isFinite(ra.minutes)
      ? ra.minutes.toString().padStart(2, "0")
      : "00";
    return `${hours}h ${minutes}m`;
  };

  const formatDeclination = (dec) => {
    if (!dec) return "-";
    const sign = dec.negative ? "-" : "+";
    const degrees = Number.isFinite(dec.degrees) ? Math.abs(dec.degrees) : 0;
    const arcminutes = Number.isFinite(dec.arcminutes)
      ? Math.abs(dec.arcminutes)
      : 0;
    return `${sign}${degrees}\u00b0 ${arcminutes}'`;
  };

  const handlePlanetHover = useCallback(
    (planet, idx, event) => {
      if (!planet) return;

      if (!planetStackRef.current || !event?.currentTarget) {
        setHoveredCard({
          planet,
          top: 0,
          isMiddle: idx - safePage * PAGE_SIZE === 1,
        });
        return;
      }

      const stackRect = planetStackRef.current.getBoundingClientRect();
      const cardRect = event.currentTarget.getBoundingClientRect();
      const relativeTop = cardRect.top - stackRect.top + cardRect.height / 2;

      setHoveredCard({
        planet,
        top: relativeTop,
        isMiddle: idx - safePage * PAGE_SIZE === 1,
      });
    },
    [safePage, PAGE_SIZE]
  );

  const clearHover = useCallback(() => {
    setHoveredCard(null);
  }, []);

  const canScrollPrev =
    !loading && !error && totalPages > 1 && safePage > 0 && hasPlanets;
  const canScrollNext =
    !loading &&
    !error &&
    totalPages > 1 &&
    safePage < totalPages - 1 &&
    hasPlanets;

  if (!loading && !error && !hasPlanets) {
    return null;
  }

  const handlePage = (direction) => {
    setPage((prev) => {
      const next = prev + direction;
      if (next < 0 || next > totalPages - 1) return prev;
      return next;
    });
  };

  const pageHeight = cardHeight ? cardHeight * PAGE_SIZE : null;
  const trackTransform =
    !loading && !error && pageHeight
      ? `translateY(-${safePage * pageHeight}px)`
      : "translateY(0)";

  return (
    <div
      className={`planet-float-row ${mapType} ${
        panelVisible ? "open" : "collapsed"
      }`}
    >
      <div
        className="planet-stack"
        ref={planetStackRef}
        onMouseLeave={clearHover}
      >
        {canScrollPrev && (
          <button
            className="planet-scroll-btn prev"
            onClick={() => handlePage(-1)}
            aria-label="Previous planets"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M2 18L12 6M22 18L12 6" />
            </svg>
          </button>
        )}

        <div
          className="planet-cards-viewport"
          style={pageHeight ? { height: pageHeight } : {}}
        >
          <div className="planet-cards" style={{ transform: trackTransform }}>
            {loading && (
              <>
                <div className="planet-card skeleton" ref={firstCardRef} />
                <div className="planet-card skeleton" />
                <div className="planet-card skeleton" />
              </>
            )}

            {!loading && error && (
              <div className="planet-empty error" ref={firstCardRef}>
                {error}
              </div>
            )}

            {!loading &&
              !error &&
              planetsToShow.map((planet, idx) => (
                <PlanetCard
                  planet={planet}
                  key={planet.name}
                  cardRef={idx === 0 ? firstCardRef : undefined}
                  onHover={(event) => handlePlanetHover(planet, idx, event)}
                />
              ))}
          </div>
        </div>

        {hoveredCard && (
          <div
            className={`planet-info-card ${
              hoveredCard.isMiddle ? "middle-offset" : ""
            }`}
            style={{ top: hoveredCard.top || 0 }}
          >
            <div className="planet-info-header">
              <div>
                <div className="planet-info-name">
                  {hoveredCard.planet?.name || "Planet"}
                </div>
                <div className="planet-info-constellation">
                  {hoveredCard.planet?.constellation || "Constellation unknown"}
                </div>
              </div>
              <div
                className={`planet-info-visibility ${
                  hoveredCard.planet?.nakedEyeObject ? "naked-eye" : "dimmed"
                }`}
              >
                {hoveredCard.planet?.nakedEyeObject
                  ? "Naked eye"
                  : "Needs optics"}
              </div>
            </div>

            <div className="planet-info-grid">
              <div>
                <span className="planet-info-label">Altitude</span>
                <span className="planet-info-value">
                  {formatDegrees(hoveredCard.planet?.altitude)}
                </span>
              </div>
              <div>
                <span className="planet-info-label">Azimuth</span>
                <span className="planet-info-value">
                  {formatDegrees(hoveredCard.planet?.azimuth)}
                </span>
              </div>
              <div>
                <span className="planet-info-label">Magnitude</span>
                <span className="planet-info-value">
                  {formatMagnitude(hoveredCard.planet?.magnitude)}
                </span>
              </div>
              <div>
                <span className="planet-info-label">RA / Dec</span>
                <span className="planet-info-value">
                  {formatRightAscension(hoveredCard.planet?.rightAscension)} /{" "}
                  {formatDeclination(hoveredCard.planet?.declination)}
                </span>
              </div>
            </div>

            <div className="planet-info-footnote">
              {hoveredCard.planet?.aboveHorizon === false
                ? "Below horizon right now"
                : "Above the horizon"}
            </div>
          </div>
        )}

        {canScrollNext && (
          <button
            className="planet-scroll-btn next"
            onClick={() => handlePage(1)}
            aria-label="Next planets"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M2 6L12 18M22 6L12 18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
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
  const lastPlanetKey = useRef(null);
  const [placedMarker, setPlacedMarker] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [visiblePlanets, setVisiblePlanets] = useState([]);
  const [planetsLoading, setPlanetsLoading] = useState(false);
  const [planetsError, setPlanetsError] = useState(null);
  const [planetQuery, setPlanetQuery] = useState(null);
  const [planetPanelVisible, setPlanetPanelVisible] = useState(false);
  const [hasShownPanelToggle, setHasShownPanelToggle] = useState(false);
  const planetPanelTimerRef = useRef(null);
  const initialAutoHideScheduled = useRef(false);
  const initialRevealDelayRef = useRef(null);

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

  const revealPlanetPanel = useCallback((autoHide = false) => {
    if (planetPanelTimerRef.current) {
      clearTimeout(planetPanelTimerRef.current);
      planetPanelTimerRef.current = null;
    }
    setPlanetPanelVisible(true);
    if (autoHide) {
      planetPanelTimerRef.current = setTimeout(() => {
        setPlanetPanelVisible(false);
        setHasShownPanelToggle(true);
        planetPanelTimerRef.current = null;
      }, 3000);
    }
  }, []);

  const hidePlanetPanel = useCallback(() => {
    if (planetPanelTimerRef.current) {
      clearTimeout(planetPanelTimerRef.current);
      planetPanelTimerRef.current = null;
    }
    setPlanetPanelVisible(false);
    setHasShownPanelToggle(true);
  }, []);

  const togglePlanetPanel = useCallback(() => {
    if (planetPanelVisible) {
      hidePlanetPanel();
    } else {
      revealPlanetPanel(false);
    }
  }, [planetPanelVisible, hidePlanetPanel, revealPlanetPanel]);

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
      revealPlanetPanel(true);
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
  };

  useEffect(() => {
    if (!location) return;
    if (planetQuery?.source === "pin") return;

    fetchPlanetsForLocation(
      location.lat,
      location.lng,
      "Visible from your sky",
      { force: false, source: "location" }
    );
  }, [location, planetQuery?.source, fetchPlanetsForLocation]);

  useEffect(() => {
    const hasPlanets =
      Array.isArray(visiblePlanets) && visiblePlanets.length > 0;
    if (
      !hasShownPanelToggle &&
      !initialAutoHideScheduled.current &&
      (hasPlanets || location)
    ) {
      initialAutoHideScheduled.current = true;
      initialRevealDelayRef.current = setTimeout(() => {
        revealPlanetPanel(true);
        initialRevealDelayRef.current = null;
      }, 3000);
    }
  }, [visiblePlanets, location, hasShownPanelToggle, revealPlanetPanel]);

  useEffect(() => {
    return () => {
      if (planetPanelTimerRef.current) {
        clearTimeout(planetPanelTimerRef.current);
        planetPanelTimerRef.current = null;
      }
      if (initialRevealDelayRef.current) {
        clearTimeout(initialRevealDelayRef.current);
        initialRevealDelayRef.current = null;
      }
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
      >
        <Planetarium
          planets={visiblePlanets}
          loading={planetsLoading}
          error={planetsError}
          mapType={mapType}
          panelVisible={planetPanelVisible}
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
