import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import Globe from "./Globe";
import "./GlobeScene.css";

function GlobeScene({ isAnimating, targetRotation, onZoomComplete }) {
  return (
    <div className="globe-container">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#050510"]} />

        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 3, 5]} intensity={1} color="#ffffff" />
        <pointLight position={[-5, -3, -5]} intensity={0.5} color="#667eea" />

        {/* Stars background */}
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />

        {/* Globe */}
        <Globe isAnimating={isAnimating} targetRotation={targetRotation} />

        {/* Controls - disabled during animation */}
        <OrbitControls
          enableZoom={!isAnimating}
          enablePan={false}
          enableRotate={!isAnimating}
          minDistance={4}
          maxDistance={12}
        />
      </Canvas>

      {isAnimating && (
        <div className="location-prompt">
          <div className="prompt-content">
            <div className="pulse-ring"></div>
            <div className="prompt-icon">📍</div>
            <h3>Discovering Your Location</h3>
            <p>Please allow location access to continue</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default GlobeScene;
