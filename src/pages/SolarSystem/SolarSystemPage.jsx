import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import SolarSystemPanel from "./components/SolarSystemPanel";
import SolarSystemScene from "./components/SolarSystemScene";
import { BODY_LOOKUP, CAMERA_HOME } from "./solarSystemData";
import "./styles/SolarSystemPage.css";

function SolarSystemPage() {
  const initialIsMobile =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 768px)").matches;
  const [selectedBodyId, setSelectedBodyId] = useState("sun");
  const [trackedBodyId, setTrackedBodyId] = useState("null");
  const [showOrbits, setShowOrbits] = useState(true);
  const [orbitSpeed, setOrbitSpeed] = useState(1);
  const [isMobile, setIsMobile] = useState(initialIsMobile);
  const [focusPanelOpen, setFocusPanelOpen] = useState(false);
  const [mobilePanelNudge, setMobilePanelNudge] = useState(false);
  const mobilePanelNudgeTimeoutRef = useRef(null);
  const selectedBody = BODY_LOOKUP[selectedBodyId] || BODY_LOOKUP.earth;

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleChange = (event) => {
      setIsMobile(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    return () => {
      if (mobilePanelNudgeTimeoutRef.current) {
        clearTimeout(mobilePanelNudgeTimeoutRef.current);
      }
    };
  }, []);

  const triggerMobilePanelNudge = () => {
    if (!isMobile || focusPanelOpen) return;

    if (mobilePanelNudgeTimeoutRef.current) {
      clearTimeout(mobilePanelNudgeTimeoutRef.current);
    }

    setMobilePanelNudge(false);

    requestAnimationFrame(() => {
      setMobilePanelNudge(true);
      mobilePanelNudgeTimeoutRef.current = setTimeout(() => {
        setMobilePanelNudge(false);
      }, 5000);
    });
  };

  const handleSelectBody = (bodyId) => {
    setSelectedBodyId(bodyId);
    setTrackedBodyId(bodyId);

    if (isMobile) {
      triggerMobilePanelNudge();
      return;
    }

    setFocusPanelOpen(true);
  };

  const handleTogglePanel = () => {
    setMobilePanelNudge(false);
    setFocusPanelOpen((value) => !value);
  };

  return (
    <div className="solar-system-route">
      <section className="solar-system-stage solar-system-stage--fullscreen">
        <SolarSystemPanel
          isMobile={isMobile}
          open={focusPanelOpen}
          nudgeMobileToggle={mobilePanelNudge}
          body={selectedBody}
          orbitSpeed={orbitSpeed}
          onOrbitSpeedChange={setOrbitSpeed}
          showOrbits={showOrbits}
          onToggleOrbits={() => setShowOrbits((value) => !value)}
          selectedBodyId={selectedBodyId}
          onSelectBody={handleSelectBody}
          onToggleOpen={handleTogglePanel}
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
