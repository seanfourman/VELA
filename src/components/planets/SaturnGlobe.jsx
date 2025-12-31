import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  DoubleSide,
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
  Vector3,
} from "three";
import saturnMap from "../../assets/planets/2k_saturn.jpg";
import saturnRingMap from "../../assets/planets/2k_saturn_ring_alpha.png";

const SATURN_TILT = 0.45;

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

function SaturnSurface() {
  const [baseTexture, ringTexture] = useTexture([saturnMap, saturnRingMap]);
  const surfaceMap = useMemo(() => tuneTexture(baseTexture, 6), [baseTexture]);
  const ringMap = useMemo(() => tuneTexture(ringTexture, 8), [ringTexture]);
  const groupRef = useRef(null);
  const ringGeoRef = useRef(null);
  const innerRadius = 1.2;
  const outerRadius = 1.8;

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.04 * delta;
    }
  });

  useLayoutEffect(() => {
    if (!ringGeoRef.current) return;
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
  }, [innerRadius, outerRadius]);

  return (
    <group ref={groupRef} rotation={[0, 0, SATURN_TILT]}>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={surfaceMap}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>
      {ringMap ? (
        <mesh rotation={[Math.PI / 2.1, 0, 0]}>
          <ringGeometry
            ref={ringGeoRef}
            args={[innerRadius, outerRadius, 128]}
          />
          <meshStandardMaterial
            map={ringMap}
            alphaMap={ringMap}
            color="#ffffff"
            emissive="#b3a89a"
            emissiveIntensity={5}
            transparent
            depthWrite={false}
            side={DoubleSide}
            opacity={1}
            roughness={0.35}
            metalness={0.02}
            alphaTest={0.02}
          />
        </mesh>
      ) : null}
    </group>
  );
}

export default function SaturnGlobe({ variant = "night", className }) {
  const isDay = variant === "day";

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
      <ambientLight intensity={isDay ? 0.65 : 0.35} />
      <directionalLight position={[3, 2, 2]} intensity={isDay ? 1.05 : 0.7} />
      <directionalLight
        position={[-3, -2, -1]}
        intensity={isDay ? 0.35 : 0.18}
      />
      <Suspense fallback={null}>
        <SaturnSurface />
      </Suspense>
    </Canvas>
  );
}
