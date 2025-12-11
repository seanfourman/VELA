import { Suspense, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import {
  LinearFilter,
  LinearMipmapLinearFilter,
  DoubleSide,
  SRGBColorSpace,
  Vector3,
} from "three";
import { resolvePlanetTexture, PLANET_TEXTURES } from "../../utils/planetUtils";
import "./planetCard.css";

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

export default function PlanetCard({ planet, cardRef, onHover, reducedMotion }) {
  const textureUrl = useMemo(
    () => resolvePlanetTexture(planet?.name),
    [planet?.name]
  );
  const safeTextureUrl = textureUrl || PLANET_TEXTURES.default;
  const [autoSpin, setAutoSpin] = useState(true);

  if (reducedMotion) {
    return (
      <div className="planet-card" ref={cardRef} onMouseEnter={onHover}>
        <div className="planet-canvas planet-static">
          <img
            src={safeTextureUrl}
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
            <PlanetGlobe textureUrl={safeTextureUrl} name={planet?.name} />
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
