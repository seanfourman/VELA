import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./SkyCameraOverlay.css";

const HORIZONTAL_FOV_DEG = 62;
const VERTICAL_FOV_DEG = 42;
const MARKER_VIEW_MARGIN_PERCENT = 16;
const MAX_PROJECTED_PLANETS = 10;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const wrap360 = (value) => {
  const wrapped = Number(value) % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
};

const shortestSignedAngle = (value) => {
  const wrapped = wrap360(value);
  return wrapped > 180 ? wrapped - 360 : wrapped;
};

const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

const extractHeading = (event) => {
  if (isFiniteNumber(event?.webkitCompassHeading)) {
    return wrap360(event.webkitCompassHeading);
  }
  if (isFiniteNumber(event?.alpha)) {
    return wrap360(360 - event.alpha);
  }
  return null;
};

const extractPitch = (event) => {
  const beta = Number(event?.beta);
  if (!Number.isFinite(beta)) return null;
  return clamp(90 - beta, -90, 90);
};

const resolvePlanetAzimuth = (planet) => {
  const value = Number(planet?.azimuth);
  return Number.isFinite(value) ? wrap360(value) : null;
};

const resolvePlanetAltitude = (planet) => {
  const value = Number(planet?.altitude);
  return Number.isFinite(value) ? clamp(value, -90, 90) : null;
};

const projectPlanetPoint = ({ azimuth, altitude }, heading, pitch) => {
  const deltaAzimuth = shortestSignedAngle(azimuth - heading);
  const deltaAltitude = altitude - pitch;

  const xPercent = 50 + (deltaAzimuth / (HORIZONTAL_FOV_DEG / 2)) * 50;
  const yPercent = 50 - (deltaAltitude / (VERTICAL_FOV_DEG / 2)) * 50;

  const isInView =
    xPercent >= -MARKER_VIEW_MARGIN_PERCENT &&
    xPercent <= 100 + MARKER_VIEW_MARGIN_PERCENT &&
    yPercent >= -MARKER_VIEW_MARGIN_PERCENT &&
    yPercent <= 100 + MARKER_VIEW_MARGIN_PERCENT;

  if (!isInView) return null;

  return {
    xPercent,
    yPercent,
    deltaAzimuth,
    deltaAltitude,
  };
};

export default function SkyCameraOverlay({
  isOpen,
  planets = [],
  location = null,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const orientationHandlerRef = useRef(null);

  const [heading, setHeading] = useState(null);
  const [pitch, setPitch] = useState(0);

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stopOrientationTracking = useCallback(() => {
    if (orientationHandlerRef.current) {
      window.removeEventListener(
        "deviceorientation",
        orientationHandlerRef.current,
        true
      );
      orientationHandlerRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      return;
    }
  }, []);

  const startOrientationTracking = useCallback(async () => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      return;
    }

    stopOrientationTracking();

    try {
      const permissionRequest = window.DeviceOrientationEvent?.requestPermission;
      if (typeof permissionRequest === "function") {
        const permissionState = await permissionRequest.call(
          window.DeviceOrientationEvent
        );
        if (permissionState !== "granted") {
          return;
        }
      }

      const nextHandler = (event) => {
        const nextHeading = extractHeading(event);
        const nextPitch = extractPitch(event);
        if (isFiniteNumber(nextHeading)) {
          setHeading(nextHeading);
        }
        if (isFiniteNumber(nextPitch)) {
          setPitch(nextPitch);
        }
      };

      orientationHandlerRef.current = nextHandler;
      window.addEventListener("deviceorientation", nextHandler, true);
    } catch {
      return;
    }
  }, [stopOrientationTracking]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      stopOrientationTracking();
      return;
    }

    void startCamera();
    void startOrientationTracking();

    return () => {
      stopCamera();
      stopOrientationTracking();
    };
  }, [isOpen, startCamera, startOrientationTracking, stopCamera, stopOrientationTracking]);

  const normalizedPlanets = useMemo(() => {
    const source = Array.isArray(planets) ? planets : [];
    return source
      .filter((planet) => planet?.aboveHorizon !== false)
      .map((planet) => {
        const azimuth = resolvePlanetAzimuth(planet);
        const altitude = resolvePlanetAltitude(planet);
        if (!isFiniteNumber(azimuth) || !isFiniteNumber(altitude)) return null;
        return {
          id: String(planet?.name || `${azimuth}-${altitude}`),
          name: String(planet?.name || "Object"),
          azimuth,
          altitude,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.altitude - a.altitude)
      .slice(0, MAX_PROJECTED_PLANETS);
  }, [planets]);

  const projectedPlanets = useMemo(() => {
    if (!isFiniteNumber(heading) || !isFiniteNumber(pitch)) return [];

    return normalizedPlanets
      .map((planet) => {
        const point = projectPlanetPoint(planet, heading, pitch);
        if (!point) return null;
        return { ...planet, ...point };
      })
      .filter(Boolean);
  }, [heading, normalizedPlanets, pitch]);

  const locationLabel = isFiniteNumber(location?.lat) && isFiniteNumber(location?.lng)
    ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
    : "Location unavailable";

  if (!isOpen) return null;

  return (
    <div className="sky-camera-overlay" role="dialog" aria-modal="true">
      <video
        ref={videoRef}
        className="sky-camera-overlay__video"
        autoPlay
        muted
        playsInline
      />

      <div className="sky-camera-overlay__gradient" aria-hidden="true" />
      <div className="sky-camera-overlay__crosshair" aria-hidden="true" />

      <div className="sky-camera-overlay__hud">
        <div className="sky-camera-overlay__status">
          <div>Location: {locationLabel}</div>
          <div>
            Heading: {isFiniteNumber(heading) ? `${heading.toFixed(0)} deg` : "--"}
          </div>
          <div>Pitch: {isFiniteNumber(pitch) ? `${pitch.toFixed(0)} deg` : "--"}</div>
          <div>
            API planets: {normalizedPlanets.length} | In frame: {projectedPlanets.length}
          </div>
        </div>

        <div className="sky-camera-overlay__points" aria-hidden="true">
          {projectedPlanets.map((planet) => (
            <div
              key={planet.id}
              className="sky-camera-point"
              style={{
                left: `${planet.xPercent}%`,
                top: `${planet.yPercent}%`,
              }}
            >
              <span className="sky-camera-point__dot" />
              <span className="sky-camera-point__label">{planet.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
