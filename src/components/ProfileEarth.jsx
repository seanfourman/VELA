import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  AdditiveBlending,
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
} from "three";
import earthDayMap from "../assets/planets/2k_earth_daymap.jpg";
import earthNightMap from "../assets/planets/2k_earth_nightmap.jpg";
import earthCloudsMap from "../assets/planets/2k_earth_clouds.jpg";

const EARTH_TILT = 0.23;

const tuneTexture = (baseTexture, anisotropy = 4) => {
  if (!baseTexture) return baseTexture;
  const cloned = baseTexture.clone();
  cloned.colorSpace = SRGBColorSpace;
  cloned.minFilter = LinearMipmapLinearFilter;
  cloned.magFilter = LinearFilter;
  cloned.anisotropy = anisotropy;
  cloned.needsUpdate = true;
  return cloned;
};

function EarthGroup({ textureUrl, variant, showClouds }) {
  const [baseTexture, cloudsTexture] = useTexture([textureUrl, earthCloudsMap]);
  const surfaceMap = useMemo(() => tuneTexture(baseTexture, 6), [baseTexture]);
  const cloudMap = useMemo(
    () => tuneTexture(cloudsTexture, 4),
    [cloudsTexture]
  );
  const groupRef = useRef(null);
  const cloudsRef = useRef(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.08 * delta;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += 0.12 * delta;
    }
  });

  const isNight = variant === "night";

  return (
    <group ref={groupRef} rotation={[0, 0, EARTH_TILT]}>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={surfaceMap}
          emissive={isNight ? "#ffffff" : "#000000"}
          emissiveMap={isNight ? surfaceMap : null}
          emissiveIntensity={isNight ? 1.1 : 0.1}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>
      {showClouds ? (
        <mesh ref={cloudsRef} scale={1.015}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial
            map={cloudMap}
            transparent
            opacity={0.45}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}

export default function ProfileEarth({
  variant = "night",
  showClouds = false,
  className,
}) {
  const textureUrl = variant === "day" ? earthDayMap : earthNightMap;

  return (
    <Canvas
      className={className}
      dpr={[1, 1.6]}
      camera={{ position: [0, 0, 2.8], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <ambientLight intensity={variant === "night" ? 0.28 : 0.65} />
      <directionalLight
        position={[3, 2, 2]}
        intensity={variant === "night" ? 0.7 : 1.1}
      />
      <directionalLight
        position={[-3, -2, -1]}
        intensity={variant === "night" ? 0.18 : 0.35}
      />
      <Suspense fallback={null}>
        <EarthGroup
          textureUrl={textureUrl}
          variant={variant}
          showClouds={showClouds && variant === "day"}
        />
      </Suspense>
    </Canvas>
  );
}
