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
  LinearFilter,
  LinearMipmapLinearFilter,
  DoubleSide,
  SRGBColorSpace,
  Vector3,
} from "three";
import { resolvePlanetTexture, PLANET_TEXTURES } from "../utils/planetUtils";
import "./PlanetPanel.css";

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

function PlanetCard({ planet, cardRef, onHover, reducedMotion = false }) {
  const textureUrl = useMemo(
    () => resolvePlanetTexture(planet?.name),
    [planet?.name]
  );
  const [autoSpin, setAutoSpin] = useState(true);

  if (reducedMotion) {
    return (
      <div className="planet-card" ref={cardRef} onMouseEnter={onHover}>
        <div className="planet-canvas planet-static">
          <img
            src={textureUrl}
            alt={planet?.name || "Planet"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "50%",
              filter: "drop-shadow(0 18px 26px rgba(0, 0, 0, 0.15))",
            }}
          />
        </div>
      </div>
    );
  }

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

export default function PlanetPanel({ 
  planets, 
  loading, 
  error, 
  mapType, 
  panelVisible, 
  hasArrow = true, 
  reducedMotion = false 
}) {
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
    setHoveredCard(null);
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
              strokeWidth="2"
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
                  reducedMotion={reducedMotion}
                />
              ))}
          </div>
        </div>

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
              strokeWidth="2"
            >
              <path d="M2 6L12 18M22 6L12 18" />
            </svg>
          </button>
        )}
      </div>

      {/* Planet info card - OUTSIDE planet-stack so backdrop-filter works */}
      {hoveredCard && (
        <div
          className={`planet-info-card ${
            hoveredCard.isMiddle ? "middle-offset" : ""
          } ${!hasArrow ? "no-arrow" : ""}`}
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
    </div>
  );
}
