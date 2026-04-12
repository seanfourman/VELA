import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
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
import {
  BODY_DEFINITIONS,
  BODY_LOOKUP,
  CAMERA_HOME,
  TARGET_HOME,
} from "../solarSystemData";

// Applies common tuning to planet textures for better appearance in the scene.
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
    const points = new EllipseCurve(
      0,
      0,
      radius,
      radius,
      0,
      Math.PI * 2,
      false,
      0,
    )
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

function PlanetMesh({ body, texture, ringTexture, registerRef, onSelect }) {
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
        (radius - body.ringInnerRadius) /
        (body.ringOuterRadius - body.ringInnerRadius);
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
          <meshBasicMaterial
            map={texture}
            color={body.accent}
            toneMapped={false}
          />
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

function SolarSystemScene({ trackedBodyId, showOrbits, orbitSpeed, onSelect }) {
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
        const angle =
          state.clock.getElapsedTime() * orbitSpeed * body.orbitSpeed +
          body.phase;
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
          target.position
            .clone()
            .add(
              new Vector3(
                travelDistance,
                travelDistance * 0.42 + 1.8,
                travelDistance,
              ),
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
          const deltaVector = currentTrackedPosition
            .clone()
            .sub(trackedPositionRef.current);
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
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={0.22} />
      <pointLight
        position={[0, 0, 0]}
        color="#ffd08a"
        intensity={420}
        distance={220}
        decay={2}
      />
      <directionalLight
        position={[12, 8, 6]}
        intensity={0.55}
        color="#d4e4ff"
      />
      <directionalLight
        position={[-10, -6, -8]}
        intensity={0.15}
        color="#8bb7ff"
      />
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
        ? BODY_DEFINITIONS.filter((body) => body.orbitRadius > 0).map(
            (body) => (
              <OrbitRing key={`${body.id}-orbit`} radius={body.orbitRadius} />
            ),
          )
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

export default SolarSystemScene;
