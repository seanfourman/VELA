import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";
import * as THREE from "three";

function Globe({ isAnimating, targetRotation }) {
  const globeRef = useRef();
  const atmosphereRef = useRef();
  const cloudsRef = useRef();

  // Create Earth texture with a procedural approach for dark mode
  const earthTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");

    // Dark ocean background
    ctx.fillStyle = "#0a1628";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw simplified continents with glow effect
    const continents = [
      // North America
      { x: 200, y: 250, w: 350, h: 300, color: "#1a3a5c" },
      // South America
      { x: 350, y: 500, w: 150, h: 350, color: "#1a3a5c" },
      // Europe
      { x: 900, y: 200, w: 200, h: 150, color: "#1a3a5c" },
      // Africa
      { x: 950, y: 350, w: 200, h: 350, color: "#1a3a5c" },
      // Asia
      { x: 1100, y: 150, w: 450, h: 350, color: "#1a3a5c" },
      // Australia
      { x: 1500, y: 550, w: 200, h: 150, color: "#1a3a5c" },
    ];

    continents.forEach((c) => {
      // Glow effect
      const gradient = ctx.createRadialGradient(
        c.x + c.w / 2,
        c.y + c.h / 2,
        0,
        c.x + c.w / 2,
        c.y + c.h / 2,
        Math.max(c.w, c.h)
      );
      gradient.addColorStop(0, "#2d5a87");
      gradient.addColorStop(0.5, "#1a3a5c");
      gradient.addColorStop(1, "#0a1628");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(
        c.x + c.w / 2,
        c.y + c.h / 2,
        c.w / 2,
        c.h / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // Add grid lines for a tech feel
    ctx.strokeStyle = "rgba(102, 126, 234, 0.15)";
    ctx.lineWidth = 1;

    // Latitude lines
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * (canvas.height / 18));
      ctx.lineTo(canvas.width, i * (canvas.height / 18));
      ctx.stroke();
    }

    // Longitude lines
    for (let i = 0; i < 36; i++) {
      ctx.beginPath();
      ctx.moveTo(i * (canvas.width / 36), 0);
      ctx.lineTo(i * (canvas.width / 36), canvas.height);
      ctx.stroke();
    }

    // Add some glowing dots for cities
    const cities = [
      { x: 280, y: 320 }, // NYC
      { x: 180, y: 350 }, // LA
      { x: 920, y: 280 }, // London
      { x: 970, y: 290 }, // Paris
      { x: 1300, y: 350 }, // Tokyo
      { x: 1280, y: 400 }, // Shanghai
      { x: 1550, y: 620 }, // Sydney
      { x: 380, y: 650 }, // Sao Paulo
      { x: 1100, y: 300 }, // Moscow
      { x: 1200, y: 450 }, // Mumbai
    ];

    cities.forEach((city) => {
      const gradient = ctx.createRadialGradient(
        city.x,
        city.y,
        0,
        city.x,
        city.y,
        20
      );
      gradient.addColorStop(0, "rgba(102, 126, 234, 1)");
      gradient.addColorStop(0.3, "rgba(102, 126, 234, 0.5)");
      gradient.addColorStop(1, "rgba(102, 126, 234, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(city.x, city.y, 20, 0, Math.PI * 2);
      ctx.fill();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  useFrame((state, delta) => {
    if (globeRef.current) {
      if (isAnimating) {
        // Continuous rotation when animating
        globeRef.current.rotation.y += delta * 0.3;
      } else if (targetRotation) {
        // Smooth interpolation to target rotation
        globeRef.current.rotation.y = THREE.MathUtils.lerp(
          globeRef.current.rotation.y,
          targetRotation.y,
          0.05
        );
        globeRef.current.rotation.x = THREE.MathUtils.lerp(
          globeRef.current.rotation.x,
          targetRotation.x,
          0.05
        );
      }
    }

    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.05;
    }

    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <group>
      {/* Main Earth sphere */}
      <Sphere ref={globeRef} args={[2, 64, 64]}>
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.8}
          metalness={0.2}
        />
      </Sphere>

      {/* Cloud layer */}
      <Sphere ref={cloudsRef} args={[2.02, 64, 64]}>
        <meshStandardMaterial
          transparent
          opacity={0.15}
          color="#667eea"
          depthWrite={false}
        />
      </Sphere>

      {/* Atmosphere glow */}
      <Sphere ref={atmosphereRef} args={[2.15, 64, 64]}>
        <meshBasicMaterial
          transparent
          opacity={0.1}
          color="#667eea"
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Outer glow */}
      <Sphere args={[2.5, 32, 32]}>
        <meshBasicMaterial
          transparent
          opacity={0.05}
          color="#764ba2"
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}

export default Globe;
