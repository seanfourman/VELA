import { useEffect, useState } from "react";
import "./TransitionOverlay.css";

function TransitionOverlay({ isActive, onComplete }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (isActive) {
      // Phase 1: Start zoom effect
      setPhase(1);

      // Phase 2: White flash
      const timer1 = setTimeout(() => setPhase(2), 1500);

      // Phase 3: Fade out
      const timer2 = setTimeout(() => setPhase(3), 2000);

      // Complete
      const timer3 = setTimeout(() => {
        setPhase(0);
        onComplete?.();
      }, 2500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [isActive, onComplete]);

  if (!isActive && phase === 0) return null;

  return (
    <div className={`transition-overlay phase-${phase}`}>
      <div className="zoom-lines">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="zoom-line" style={{ "--i": i }} />
        ))}
      </div>
      <div className="flash-overlay" />
    </div>
  );
}

export default TransitionOverlay;
