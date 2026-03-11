import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, useTexture } from "@react-three/drei";
import {
  BufferGeometry,
  DoubleSide,
  EllipseCurve,
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
  Vector3,
} from "three";
import { PLANET_TEXTURES, resolvePlanetTexture } from "@/utils/planetUtils";
import earthDayMap from "@/assets/planets/2k_earth_daymap.jpg";
import orbitIcon from "@/assets/icons/orbit-svgrepo-com.svg";
import "./styles/SolarSystemPage.css";

const BODY_DEFINITIONS = [
  {
    id: "sun",
    name: "Sun",
    radius: 2.2,
    orbitRadius: 0,
    orbitSpeed: 0,
    rotationSpeed: 0.08,
    phase: 0,
    accent: "#ffd36e",
    distance: "0 km",
    day: "25-35 Earth days",
    year: "Center of the system",
    moons: "N/A",
    temperature: "5,500°C surface",
    description:
      "The star that holds the whole system together. Every orbit, season, and sunrise starts here.",
    textureUrl: PLANET_TEXTURES.sun,
    isStar: true,
  },
  {
    id: "mercury",
    name: "Mercury",
    radius: 0.42,
    orbitRadius: 4.5,
    orbitSpeed: 1.55,
    rotationSpeed: 0.18,
    phase: 0.7,
    accent: "#d1b08d",
    distance: "57.9 million km",
    day: "58.6 Earth days",
    year: "88 days",
    moons: "0",
    temperature: "-173°C to 427°C",
    description:
      "The fastest planet around the Sun. Tiny, rocky, and packed with extreme day-night temperature swings.",
    textureUrl: resolvePlanetTexture("Mercury"),
  },
  {
    id: "venus",
    name: "Venus",
    radius: 0.65,
    orbitRadius: 6.5,
    orbitSpeed: 1.18,
    rotationSpeed: 0.06,
    phase: 1.2,
    accent: "#f1c58d",
    distance: "108.2 million km",
    day: "243 Earth days",
    year: "225 days",
    moons: "0",
    temperature: "465°C average",
    description:
      "Earth's size twin, but wrapped in thick clouds and runaway heat. It shines bright but hides a brutal surface.",
    textureUrl: resolvePlanetTexture("Venus"),
  },
  {
    id: "earth",
    name: "Earth",
    radius: 0.7,
    orbitRadius: 8.7,
    orbitSpeed: 1,
    rotationSpeed: 0.42,
    phase: 2,
    accent: "#68c6ff",
    distance: "149.6 million km",
    day: "24 hours",
    year: "365 days",
    moons: "1",
    temperature: "-89°C to 58°C",
    description:
      "The reference point for everything else. Ocean, atmosphere, life, and the place VELA helps you explore from.",
    textureUrl: earthDayMap,
  },
  {
    id: "mars",
    name: "Mars",
    radius: 0.55,
    orbitRadius: 11.4,
    orbitSpeed: 0.82,
    rotationSpeed: 0.38,
    phase: 2.6,
    accent: "#ff8d63",
    distance: "227.9 million km",
    day: "24.6 hours",
    year: "687 days",
    moons: "2",
    temperature: "-125°C to 20°C",
    description:
      "The red planet. Dry, dusty, and still the most realistic target when people talk about future exploration.",
    textureUrl: resolvePlanetTexture("Mars"),
  },
  {
    id: "jupiter",
    name: "Jupiter",
    radius: 1.3,
    orbitRadius: 15.8,
    orbitSpeed: 0.44,
    rotationSpeed: 0.68,
    phase: 3,
    accent: "#f4c9a6",
    distance: "778.5 million km",
    day: "9.9 hours",
    year: "11.9 years",
    moons: "95+",
    temperature: "-145°C cloud tops",
    description:
      "The giant of the system. Enormous storms, dozens of moons, and enough gravity to dominate the outer planets.",
    textureUrl: resolvePlanetTexture("Jupiter"),
  },
  {
    id: "saturn",
    name: "Saturn",
    radius: 1.15,
    orbitRadius: 20.5,
    orbitSpeed: 0.32,
    rotationSpeed: 0.6,
    phase: 3.7,
    accent: "#f3deb0",
    distance: "1.43 billion km",
    day: "10.7 hours",
    year: "29.5 years",
    moons: "140+",
    temperature: "-178°C average",
    description:
      "The signature ring world. It is lighter than water by density, but visually it is the most dramatic planet in the system.",
    textureUrl: resolvePlanetTexture("Saturn"),
    ringUrl: PLANET_TEXTURES.saturnRing,
    ringTilt: 0.5,
    ringInnerRadius: 1.45,
    ringOuterRadius: 2.15,
  },
  {
    id: "uranus",
    name: "Uranus",
    radius: 0.92,
    orbitRadius: 25.2,
    orbitSpeed: 0.22,
    rotationSpeed: 0.34,
    phase: 4.3,
    accent: "#96f1ff",
    distance: "2.87 billion km",
    day: "17.2 hours",
    year: "84 years",
    moons: "27",
    temperature: "-224°C average",
    description:
      "An ice giant tipped on its side. Its strange axial tilt makes its seasons unlike any other planet here.",
    textureUrl: resolvePlanetTexture("Uranus"),
  },
  {
    id: "neptune",
    name: "Neptune",
    radius: 0.9,
    orbitRadius: 29.6,
    orbitSpeed: 0.18,
    rotationSpeed: 0.35,
    phase: 5.1,
    accent: "#6ca7ff",
    distance: "4.5 billion km",
    day: "16.1 hours",
    year: "164.8 years",
    moons: "16",
    temperature: "-214°C average",
    description:
      "The outer blue giant. Dark, cold, and violently windy, with some of the fastest storms in the solar system.",
    textureUrl: resolvePlanetTexture("Neptune"),
  },
];

const BODY_LOOKUP = Object.fromEntries(
  BODY_DEFINITIONS.map((body) => [body.id, body]),
);

const CAMERA_HOME = new Vector3(0, 11, 31);
const TARGET_HOME = new Vector3(0, 0, 0);

const tuneTexture = (baseTexture, anisotropy = 4) => {
  if (!baseTexture) return baseTexture;
  const tuned = baseTexture.clone();
  tuned.colorSpace = SRGBColorSpace;
  tuned.minFilter = LinearMipmapLinearFilter;
  tuned.magFilter = LinearFilter;
  tuned.anisotropy = anisotropy;
  tuned.needsUpdate = true;
  return tuned;
};

function OrbitRing({ radius }) {
  const geometry = useMemo(() => {
    const points = new EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0)
      .getPoints(180)
      .map((point) => new Vector3(point.x, 0, point.y));
    return new BufferGeometry().setFromPoints(points);
  }, [radius]);

  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color="#d6e1ff" transparent opacity={0.18} />
    </lineLoop>
  );
}

function PlanetMesh({
  body,
  texture,
  ringTexture,
  registerRef,
  onSelect,
}) {
  const ringGeometryRef = useRef(null);

  useEffect(() => {
    if (!ringGeometryRef.current) return;
    const geometry = ringGeometryRef.current;
    const positions = geometry.attributes.position;
    const uvs = geometry.attributes.uv;
    const point = new Vector3();

    for (let index = 0; index < positions.count; index += 1) {
      point.fromBufferAttribute(positions, index);
      const radius = Math.sqrt(point.x * point.x + point.y * point.y);
      const u =
        (radius - body.ringInnerRadius) / (body.ringOuterRadius - body.ringInnerRadius);
      const angle = Math.atan2(point.y, point.x);
      const v = (angle + Math.PI) / (Math.PI * 2);
      uvs.setXY(index, u, v);
    }

    uvs.needsUpdate = true;
  }, [body.ringInnerRadius, body.ringOuterRadius]);

  return (
    <group ref={registerRef(body.id)}>
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelect(body.id);
        }}
      >
        <sphereGeometry args={[body.radius, 48, 48]} />
        {body.isStar ? (
          <meshBasicMaterial map={texture} color={body.accent} toneMapped={false} />
        ) : (
          <meshStandardMaterial
            map={texture}
            emissive="#04070d"
            emissiveIntensity={0.08}
            roughness={0.94}
            metalness={0.02}
          />
        )}
      </mesh>
      {body.ringUrl && ringTexture ? (
        <mesh rotation={[Math.PI / 2.14, 0, body.ringTilt || 0]}>
          <ringGeometry
            ref={ringGeometryRef}
            args={[body.ringInnerRadius, body.ringOuterRadius, 128]}
          />
          <meshStandardMaterial
            map={ringTexture}
            alphaMap={ringTexture}
            color="#fff5d4"
            emissive="#ac9370"
            emissiveIntensity={0.45}
            transparent
            depthWrite={false}
            side={DoubleSide}
            opacity={0.96}
            roughness={0.45}
            metalness={0.02}
            alphaTest={0.02}
          />
        </mesh>
      ) : null}
    </group>
  );
}

function SolarSystemScene({
  trackedBodyId,
  showOrbits,
  orbitSpeed,
  onSelect,
}) {
  const controlsRef = useRef(null);
  const bodyRefs = useRef({});
  const focusRequestRef = useRef(null);
  const autoFocusActiveRef = useRef(false);
  const trackedPositionRef = useRef(null);
  const cameraTargetRef = useRef(CAMERA_HOME.clone());
  const lookTargetRef = useRef(TARGET_HOME.clone());
  const camera = useThree((state) => state.camera);
  const textureEntries = useMemo(
    () =>
      BODY_DEFINITIONS.flatMap((body) =>
        body.ringUrl
          ? [
              [body.id, body.textureUrl],
              [`${body.id}-ring`, body.ringUrl],
            ]
          : [[body.id, body.textureUrl]],
      ),
    [],
  );
  const loadedTextures = useTexture(textureEntries.map(([, url]) => url));
  const textureMap = useMemo(() => {
    const tunedEntries = textureEntries.map(([key], index) => [
      key,
      tuneTexture(loadedTextures[index], key.endsWith("-ring") ? 8 : 6),
    ]);
    return Object.fromEntries(tunedEntries);
  }, [loadedTextures, textureEntries]);

  useEffect(() => {
    if (!trackedBodyId) return;
    focusRequestRef.current = trackedBodyId;
    trackedPositionRef.current = null;
  }, [trackedBodyId]);

  useFrame((state, delta) => {
    BODY_DEFINITIONS.forEach((body) => {
      const target = bodyRefs.current[body.id];
      if (!target) return;

      if (body.orbitRadius === 0) {
        target.position.set(0, 0, 0);
      } else {
        const angle = state.clock.getElapsedTime() * orbitSpeed * body.orbitSpeed + body.phase;
        target.position.set(
          Math.cos(angle) * body.orbitRadius,
          0,
          Math.sin(angle) * body.orbitRadius,
        );
      }

      target.rotation.y += delta * body.rotationSpeed;
    });

    const focusRequest = focusRequestRef.current;
    if (focusRequest === "__home__") {
      cameraTargetRef.current.copy(CAMERA_HOME);
      lookTargetRef.current.copy(TARGET_HOME);
      autoFocusActiveRef.current = true;
      focusRequestRef.current = null;
    } else if (focusRequest) {
      const body = BODY_LOOKUP[focusRequest];
      const target = bodyRefs.current[focusRequest];

      if (body && target) {
        const travelDistance = body.isStar
          ? 10
          : Math.max(body.radius * 9, body.orbitRadius > 16 ? 7.6 : 5.4);
        cameraTargetRef.current.copy(
          target.position.clone().add(
            new Vector3(travelDistance, travelDistance * 0.42 + 1.8, travelDistance),
          ),
        );
        lookTargetRef.current.copy(target.position);
        autoFocusActiveRef.current = true;
        focusRequestRef.current = null;
      }
    }

    if (autoFocusActiveRef.current) {
      camera.position.lerp(cameraTargetRef.current, 0.06);
      controlsRef.current.target.lerp(lookTargetRef.current, 0.08);

      if (
        camera.position.distanceTo(cameraTargetRef.current) < 0.08 &&
        controlsRef.current.target.distanceTo(lookTargetRef.current) < 0.08
      ) {
        autoFocusActiveRef.current = false;
      }
    }

    if (!autoFocusActiveRef.current && trackedBodyId) {
      const trackedBody = bodyRefs.current[trackedBodyId];

      if (trackedBody) {
        const currentTrackedPosition = trackedBody.position.clone();

        if (trackedPositionRef.current) {
          const deltaVector = currentTrackedPosition.clone().sub(trackedPositionRef.current);
          camera.position.add(deltaVector);
          controlsRef.current?.target.add(deltaVector);
        }

        trackedPositionRef.current = currentTrackedPosition;
      }
    } else if (!trackedBodyId) {
      trackedPositionRef.current = null;
    }

    controlsRef.current?.update();
  });

  return (
    <>
      <color attach="background" args={["#040912"]} />
      <ambientLight intensity={0.22} />
      <pointLight
        position={[0, 0, 0]}
        color="#ffd08a"
        intensity={420}
        distance={220}
        decay={2}
      />
      <directionalLight position={[12, 8, 6]} intensity={0.55} color="#d4e4ff" />
      <directionalLight position={[-10, -6, -8]} intensity={0.15} color="#8bb7ff" />
      <Stars
        radius={180}
        depth={90}
        count={5000}
        factor={3.2}
        saturation={0}
        fade
        speed={0.2}
      />

      {showOrbits
        ? BODY_DEFINITIONS.filter((body) => body.orbitRadius > 0).map((body) => (
            <OrbitRing key={`${body.id}-orbit`} radius={body.orbitRadius} />
          ))
        : null}

      {BODY_DEFINITIONS.map((body) => (
        <PlanetMesh
          key={body.id}
          body={body}
          texture={textureMap[body.id]}
          ringTexture={textureMap[`${body.id}-ring`]}
          onSelect={onSelect}
          registerRef={(id) => (node) => {
            bodyRefs.current[id] = node;
          }}
        />
      ))}

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={80}
        onStart={() => {
          autoFocusActiveRef.current = false;
          focusRequestRef.current = null;
        }}
      />
    </>
  );
}

function SolarSystemPanelContent({
  body,
  orbitSpeed,
  onOrbitSpeedChange,
  showOrbits,
  onToggleOrbits,
  selectedBodyId,
  onSelectBody,
}) {
  const statItems = [
    { label: "Distance", value: body.distance },
    { label: "Day", value: body.day },
    { label: "Year", value: body.year },
    { label: "Moons", value: body.moons },
    { label: "Temp", value: body.temperature },
  ];

  return (
    <>
      <div className="solar-system-focus-panel__eyebrow">Focused body</div>
      <h2 className="solar-system-focus-panel__title">{body.name}</h2>
      <p className="solar-system-focus-panel__copy">{body.description}</p>
      <div className="solar-system-focus-panel__stats">
        {statItems.map((item) => (
          <div key={item.label} className="solar-system-inline-stat">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="solar-system-panel__controls">
        <label className="solar-system-range" htmlFor="solar-system-speed">
          <div className="solar-system-range__row">
            <span>Orbit pace</span>
            <div className="solar-system-range__meta">
              <span>{Math.round(orbitSpeed * 100)}%</span>
              <span className="solar-system-tooltip-anchor">
                <button
                  type="button"
                  className={`solar-system-orbit-toggle${showOrbits ? " active" : ""}`}
                  onClick={onToggleOrbits}
                  aria-label={showOrbits ? "Hide orbit trails" : "Show orbit trails"}
                >
                  <img src={orbitIcon} alt="" aria-hidden="true" />
                </button>
                <span className="solar-system-tooltip-label" aria-hidden="true">
                  {showOrbits ? "Hide orbit trails" : "Show orbit trails"}
                </span>
              </span>
            </div>
          </div>
          <input
            id="solar-system-speed"
            type="range"
            min="0"
            max="160"
            step="5"
            value={Math.round(orbitSpeed * 100)}
            onChange={(event) => onOrbitSpeedChange(Number(event.target.value) / 100)}
          />
        </label>

        <div className="solar-system-body-list" role="list">
          {BODY_DEFINITIONS.map((planetBody) => (
            <button
              key={planetBody.id}
              type="button"
              className={`solar-system-body-option${
                selectedBodyId === planetBody.id ? " active" : ""
              }`}
              style={{ "--solar-accent": planetBody.accent }}
              onClick={() => onSelectBody(planetBody.id)}
            >
              <span
                className="solar-system-body-option__dot"
                aria-hidden="true"
              />
              <span className="solar-system-body-option__name">{planetBody.name}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function SolarSystemPanelToggle({ open, mobile = false, onClick }) {
  const rotation = mobile ? (open ? 90 : -90) : open ? 0 : 180;

  return (
    <button
      type="button"
      className={`solar-system-panel-toggle ${open ? "active" : ""}`}
      onClick={onClick}
      aria-label={open ? "Hide solar system panel" : "Show solar system panel"}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}

function SolarSystemPanel({
  isMobile,
  open,
  body,
  orbitSpeed,
  onOrbitSpeedChange,
  showOrbits,
  onToggleOrbits,
  selectedBodyId,
  onSelectBody,
  onToggleOpen,
}) {
  const content = (
    <SolarSystemPanelContent
      body={body}
      orbitSpeed={orbitSpeed}
      onOrbitSpeedChange={onOrbitSpeedChange}
      showOrbits={showOrbits}
      onToggleOrbits={onToggleOrbits}
      selectedBodyId={selectedBodyId}
      onSelectBody={onSelectBody}
    />
  );

  if (isMobile) {
    return (
      <div className={`solar-system-panel-mobile ${open ? "open" : "collapsed"}`}>
        <div className={`solar-system-panel-mobile__toggle-slot ${open ? "open" : "ready"}`}>
          <SolarSystemPanelToggle open={open} mobile onClick={onToggleOpen} />
        </div>
        <aside className="solar-system-panel-mobile__sheet">{content}</aside>
      </div>
    );
  }

  return (
    <div className={`solar-system-panel-wrapper ${open ? "open" : "collapsed"}`}>
      <aside className="solar-system-panel">
        <SolarSystemPanelToggle open={open} onClick={onToggleOpen} />
        {content}
      </aside>
    </div>
  );
}

function SolarSystemPage() {
  const initialIsMobile =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 768px)").matches;
  const [selectedBodyId, setSelectedBodyId] = useState("earth");
  const [trackedBodyId, setTrackedBodyId] = useState(null);
  const [showOrbits, setShowOrbits] = useState(true);
  const [orbitSpeed, setOrbitSpeed] = useState(1);
  const [isMobile, setIsMobile] = useState(initialIsMobile);
  const [focusPanelOpen, setFocusPanelOpen] = useState(!initialIsMobile);
  const selectedBody = BODY_LOOKUP[selectedBodyId] || BODY_LOOKUP.earth;

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleChange = (event) => {
      setIsMobile(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const handleSelectBody = (bodyId) => {
    setSelectedBodyId(bodyId);
    setTrackedBodyId(bodyId);
    setFocusPanelOpen(true);
  };

  return (
    <div className="solar-system-route">
      <section className="solar-system-stage solar-system-stage--fullscreen">
        <SolarSystemPanel
          isMobile={isMobile}
          open={focusPanelOpen}
          body={selectedBody}
          orbitSpeed={orbitSpeed}
          onOrbitSpeedChange={setOrbitSpeed}
          showOrbits={showOrbits}
          onToggleOrbits={() => setShowOrbits((value) => !value)}
          selectedBodyId={selectedBodyId}
          onSelectBody={handleSelectBody}
          onToggleOpen={() => setFocusPanelOpen((value) => !value)}
        />

        <Canvas
          className="solar-system-canvas"
          camera={{ position: CAMERA_HOME.toArray(), fov: 45 }}
          dpr={[1, 1.8]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
          }}
        >
          <Suspense fallback={null}>
            <SolarSystemScene
              trackedBodyId={trackedBodyId}
              showOrbits={showOrbits}
              orbitSpeed={orbitSpeed}
              onSelect={handleSelectBody}
            />
          </Suspense>
        </Canvas>
      </section>
    </div>
  );
}

export default SolarSystemPage;
