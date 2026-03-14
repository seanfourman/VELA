import { useEffect, useMemo, useState } from "react";
import {
  MOON_MARKS,
  computeMoonPhase,
  isMoonPhaseSimulation,
  buildLiveObservationPlan,
  buildFallbackObservationPlan,
  buildSimulatedObservationPlan,
} from "./moonPhaseCore";

export { MOON_MARKS, computeMoonPhase, isMoonPhaseSimulation };

export function useLiveMoonPhase(refreshIntervalMs = 60000) {
  const [actualMoon, setActualMoon] = useState(() => computeMoonPhase());

  useEffect(() => {
    const refreshMoon = () => {
      setActualMoon(computeMoonPhase());
    };

    refreshMoon();
    const refreshIntervalId = window.setInterval(refreshMoon, refreshIntervalMs);

    return () => {
      window.clearInterval(refreshIntervalId);
    };
  }, [refreshIntervalMs]);

  return actualMoon;
}

export function useMoonSliderEffects(sliderRootRef, activeFraction) {
  useEffect(() => {
    const sliderRoot = sliderRootRef.current;
    if (!sliderRoot) return;

    const thumbIndex = Math.round(activeFraction * 64);
    const marks = sliderRoot.querySelectorAll(".MuiSlider-mark");

    marks.forEach((mark) => {
      const idx = parseInt(mark.getAttribute("data-index"), 10);
      if (Number.isNaN(idx)) return;

      const distance = Math.abs(idx - thumbIndex);
      let scaleY = 1;
      let scaleX = 1;

      if (distance === 0) {
        scaleY = 1.8;
        scaleX = 1.25;
      } else if (distance === 1) {
        scaleY = 1.4;
        scaleX = 1.15;
      } else if (distance === 2) {
        scaleY = 1.2;
        scaleX = 1.05;
      } else if (distance === 3) {
        scaleY = 1.05;
        scaleX = 1.02;
      }

      mark.style.transform = `translate(-50%, -50%) scale(${scaleX}, ${scaleY})`;
      mark.style.transition = "transform 0.1s ease-out";
    });

    const labels = sliderRoot.querySelectorAll(".MuiSlider-markLabel");

    labels.forEach((label) => {
      const idx = parseInt(label.getAttribute("data-index"), 10);
      if (Number.isNaN(idx)) return;

      const distance = Math.abs(idx - thumbIndex);
      let scale = 1;
      let color = "rgba(255, 255, 255, 0.5)";
      let textShadow = "none";

      if (distance <= 2) {
        scale = 1.25;
        color = "rgba(255, 255, 255, 1)";
        textShadow = "0 0 10px rgba(255,255,255,0.8)";
      } else if (distance <= 4) {
        scale = 1.1;
        color = "rgba(255, 255, 255, 0.8)";
        textShadow = "0 0 5px rgba(255,255,255,0.3)";
      }

      label.style.transform = `translateX(-50%) scale(${scale})`;
      label.style.transition =
        "transform 0.1s ease-out, color 0.1s ease-out, text-shadow 0.1s ease-out";
      label.style.color = color;
      label.style.textShadow = textShadow;
    });
  }, [activeFraction, sliderRootRef]);
}

export function useObservationPlan({
  actualMoon,
  moon,
  isSimulating,
  location,
  locationStatus,
}) {
  const liveObservationPlan = useMemo(
    () =>
      buildLiveObservationPlan(new Date(), location, actualMoon.illumination) ??
      buildFallbackObservationPlan(actualMoon.illumination, locationStatus),
    [actualMoon.illumination, location, locationStatus],
  );
  const simulatedObservationPlan = useMemo(
    () => buildSimulatedObservationPlan(moon.illumination),
    [moon.illumination],
  );

  return isSimulating ? simulatedObservationPlan : liveObservationPlan;
}
