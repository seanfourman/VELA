import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
} from "three";
import neptuneMap from "@/assets/planets/2k_neptune.jpg";

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

function NeptuneSurface({ textureUrl }) {
  const baseTexture = useTexture(textureUrl);
  const surfaceMap = useMemo(() => tuneTexture(baseTexture, 6), [baseTexture]);
  const meshRef = useRef(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.08 * delta;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial map={surfaceMap} roughness={0.7} metalness={0.1} />
    </mesh>
  );
}

export default function NeptuneGlobe({ variant = "night", className }) {
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
      <ambientLight intensity={isDay ? 0.75 : 0.4} />
      <directionalLight
        position={[3, 2, 2]}
        intensity={isDay ? 1.1 : 0.8}
      />
      <directionalLight
        position={[-3, -2, -1]}
        intensity={isDay ? 0.35 : 0.2}
      />
      <Suspense fallback={null}>
        <NeptuneSurface textureUrl={neptuneMap} />
      </Suspense>
    </Canvas>
  );
}
