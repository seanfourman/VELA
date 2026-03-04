import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import showPopup from "@/utils/popup";
import "./planetArOverlay.css";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeAzimuth = (value) => {
  if (!Number.isFinite(value)) return null;
  return ((value % 360) + 360) % 360;
};

const shortestAngleDelta = (target, current) => {
  if (!Number.isFinite(target) || !Number.isFinite(current)) return null;
  return ((target - current + 540) % 360) - 180;
};

const formatDegrees = (value) => {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(1)}\u00b0`;
};

const getHeadingFromEvent = (event) => {
  if (!event) return null;
  if (Number.isFinite(event.webkitCompassHeading)) {
    return normalizeAzimuth(event.webkitCompassHeading);
  }
  if (!Number.isFinite(event.alpha)) return null;
  return normalizeAzimuth(360 - event.alpha);
};

const getAltitudeFromEvent = (event) => {
  if (!event || !Number.isFinite(event.beta)) return null;
  return clamp(event.beta - 90, -90, 90);
};

const getCameraError = (error) => {
  const name = error?.name || "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera permission is required for AR mode";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No suitable camera was found on this device";
  }
  return "Could not start the camera";
};

const getCameraAvailabilityIssue = () => {
  if (typeof window === "undefined") {
    return "Camera is unavailable in this environment";
  }

  if (!window.isSecureContext) {
    return "Camera requires HTTPS on mobile. Open this site from an https:// URL";
  }

  if (!navigator?.mediaDevices) {
    return "Media devices are unavailable in this browser";
  }

  if (typeof navigator.mediaDevices.getUserMedia !== "function") {
    return "Camera API is unavailable in this browser";
  }

  return "";
};

const detectOrientationSupport = () => {
  if (typeof window === "undefined") {
    return { supported: false, needsPermissionPrompt: false };
  }
  const supported = "DeviceOrientationEvent" in window;
  const needsPermissionPrompt =
    supported &&
    typeof window.DeviceOrientationEvent?.requestPermission === "function";
  return { supported, needsPermissionPrompt };
};

export default function PlanetArOverlay({ planet, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [orientationSupport] = useState(() => detectOrientationSupport());
  const [cameraStatus, setCameraStatus] = useState("idle");
  const [cameraError, setCameraError] = useState("");
  const [sensorStatus, setSensorStatus] = useState(() =>
    orientationSupport.supported
      ? orientationSupport.needsPermissionPrompt
        ? "idle"
        : "loading"
      : "error",
  );
  const [sensorError, setSensorError] = useState(() =>
    orientationSupport.supported
      ? ""
      : "Orientation sensors are unavailable in this browser",
  );
  const [heading, setHeading] = useState(null);
  const [deviceAltitude, setDeviceAltitude] = useState(null);
  const [motionAccess, setMotionAccess] = useState(() =>
    orientationSupport.supported
      ? orientationSupport.needsPermissionPrompt
        ? "required"
        : "granted"
      : "denied",
  );

  const portalTarget = useMemo(() => {
    if (typeof document === "undefined") return null;
    let target = document.getElementById("planet-ar-overlay-root");
    if (!target) {
      target = document.createElement("div");
      target.id = "planet-ar-overlay-root";
      document.body.appendChild(target);
    }
    return target;
  }, []);

  const targetAzimuth = normalizeAzimuth(Number(planet?.azimuth));
  const targetAltitude = Number.isFinite(Number(planet?.altitude))
    ? Number(planet?.altitude)
    : null;

  const stopCameraStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video && video.srcObject) {
      video.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  useEffect(() => {
    let disposed = false;

    const startCamera = async () => {
      const availabilityIssue = getCameraAvailabilityIssue();
      if (availabilityIssue) {
        if (disposed) return;
        setCameraStatus("error");
        setCameraError(availabilityIssue);
        return;
      }

      setCameraStatus("loading");
      setCameraError("");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });

        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {});
          }
        }
        setCameraStatus("ready");
      } catch (error) {
        setCameraStatus("error");
        setCameraError(getCameraError(error));
      }
    };

    startCamera();

    return () => {
      disposed = true;
      stopCameraStream();
    };
  }, [stopCameraStream]);

  useEffect(() => {
    if (motionAccess !== "granted") return undefined;

    let hasReading = false;
    const handleOrientation = (event) => {
      const nextHeading = getHeadingFromEvent(event);
      const nextAltitude = getAltitudeFromEvent(event);

      if (nextHeading !== null) {
        setHeading(nextHeading);
      }
      if (nextAltitude !== null) {
        setDeviceAltitude(nextAltitude);
      }

      if (!hasReading && (nextHeading !== null || nextAltitude !== null)) {
        hasReading = true;
        setSensorStatus("ready");
      }
    };

    const timeoutId = window.setTimeout(() => {
      if (hasReading) return;
      setSensorStatus("error");
      setSensorError("Move your phone to calibrate direction sensors");
    }, 3500);

    window.addEventListener("deviceorientation", handleOrientation, true);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [motionAccess]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const requestMotionAccess = useCallback(async () => {
    if (typeof window === "undefined") return;
    const permissionRequester = window.DeviceOrientationEvent?.requestPermission;
    if (typeof permissionRequester !== "function") {
      setMotionAccess("granted");
      setSensorError("");
      setSensorStatus("loading");
      return;
    }

    try {
      const result = await permissionRequester.call(window.DeviceOrientationEvent);
      if (result === "granted") {
        setSensorError("");
        setSensorStatus("loading");
        setMotionAccess("granted");
        return;
      }
      setMotionAccess("denied");
      setSensorStatus("error");
      setSensorError("Motion permission was denied");
      showPopup("Motion permission is needed for AR direction", "warning", {
        duration: 2600,
      });
    } catch {
      setMotionAccess("denied");
      setSensorStatus("error");
      setSensorError("Could not enable motion sensors");
    }
  }, []);

  const headingDelta = useMemo(
    () => shortestAngleDelta(targetAzimuth, heading),
    [heading, targetAzimuth],
  );
  const altitudeDelta = useMemo(() => {
    if (!Number.isFinite(targetAltitude) || !Number.isFinite(deviceAltitude)) {
      return null;
    }
    return targetAltitude - deviceAltitude;
  }, [deviceAltitude, targetAltitude]);

  const aligned =
    headingDelta !== null &&
    altitudeDelta !== null &&
    Math.abs(headingDelta) <= 6 &&
    Math.abs(altitudeDelta) <= 6;

  const targetOffset = useMemo(() => {
    if (headingDelta === null || altitudeDelta === null) {
      return { x: 0, y: 0, visible: false };
    }
    return {
      x: clamp(headingDelta * 4.4, -180, 180),
      y: clamp(-altitudeDelta * 4.4, -180, 180),
      visible: true,
    };
  }, [altitudeDelta, headingDelta]);

  const guideText = useMemo(() => {
    if (targetAzimuth === null || targetAltitude === null) {
      return "Direction data is unavailable for this object right now";
    }
    if (headingDelta === null || altitudeDelta === null) {
      return "Move your phone to calibrate compass and tilt";
    }
    if (aligned) {
      return `${planet?.name || "Object"} should be close to the center marker`;
    }

    const turnDirection = headingDelta > 0 ? "right" : "left";
    const tiltDirection = altitudeDelta > 0 ? "up" : "down";
    const turnText =
      Math.abs(headingDelta) >= 2
        ? `Turn ${turnDirection} ${Math.abs(headingDelta).toFixed(0)}\u00b0`
        : "";
    const tiltText =
      Math.abs(altitudeDelta) >= 2
        ? `tilt ${tiltDirection} ${Math.abs(altitudeDelta).toFixed(0)}\u00b0`
        : "";

    if (!turnText && !tiltText) {
      return "Fine tune your phone angle toward the center marker";
    }
    if (!turnText) return tiltText;
    if (!tiltText) return turnText;
    return `${turnText} and ${tiltText}`;
  }, [
    aligned,
    altitudeDelta,
    headingDelta,
    planet?.name,
    targetAltitude,
    targetAzimuth,
  ]);

  const cameraHelpText = useMemo(() => {
    if (!cameraError) return "";
    if (cameraError.includes("HTTPS")) {
      return "Use a secure tunnel URL like ngrok/cloudflared and open it in Safari or Chrome";
    }
    if (cameraError.includes("permission")) {
      return "Allow camera access in browser settings, then reload this page";
    }
    return "";
  }, [cameraError]);

  if (!portalTarget) return null;

  return createPortal(
    <div
      className="planet-ar-overlay-root"
      role="dialog"
      aria-modal="true"
      aria-label={`${planet?.name || "Planet"} AR view`}
    >
      <div className="planet-ar-overlay">
        <video
          ref={videoRef}
          className={`planet-ar-video ${cameraStatus === "ready" ? "ready" : ""}`.trim()}
          autoPlay
          playsInline
          muted
        />
        <div className="planet-ar-vignette" aria-hidden="true" />

        {cameraStatus !== "ready" && (
          <div className="planet-ar-camera-fallback" role="status">
            <div className="planet-ar-fallback-title">AR Camera</div>
            <div className="planet-ar-fallback-text">
              {cameraStatus === "loading"
                ? "Starting camera feed"
                : cameraError || "Camera is unavailable"}
            </div>
            {cameraHelpText && (
              <div className="planet-ar-fallback-help">{cameraHelpText}</div>
            )}
          </div>
        )}

        <div className="planet-ar-target-layer" aria-hidden="true">
          <div className="planet-ar-crosshair">
            <span />
          </div>
          <div
            className={`planet-ar-target ${targetOffset.visible ? "visible" : ""}`.trim()}
            style={{
              "--planet-ar-offset-x": `${targetOffset.x}px`,
              "--planet-ar-offset-y": `${targetOffset.y}px`,
            }}
          />
        </div>

        <div className="planet-ar-ui">
          <div className="planet-ar-topbar">
            <div className="planet-ar-meta">
              <div className="planet-ar-name">{planet?.name || "Planet"}</div>
              <div className="planet-ar-sub">
                {planet?.constellation || "Constellation unknown"}
              </div>
              <div className="planet-ar-meta-row">
                <span>Target {formatDegrees(targetAzimuth)}</span>
                <span>Alt {formatDegrees(targetAltitude)}</span>
              </div>
            </div>
            <button
              type="button"
              className="planet-ar-close"
              onClick={onClose}
              aria-label="Close AR mode"
            >
              Close
            </button>
          </div>

          <div className="planet-ar-status">
            <div className="planet-ar-status-line">{guideText}</div>
            <div className="planet-ar-readings">
              <span>Heading {formatDegrees(heading)}</span>
              <span>Tilt {formatDegrees(deviceAltitude)}</span>
            </div>
            {motionAccess === "required" && (
              <button
                type="button"
                className="planet-ar-motion-btn"
                onClick={requestMotionAccess}
              >
                Enable motion access
              </button>
            )}
            {motionAccess === "denied" && (
              <div className="planet-ar-warning">
                Motion sensors are disabled. Compass guidance is limited
              </div>
            )}
            {sensorStatus === "error" && sensorError && (
              <div className="planet-ar-warning">{sensorError}</div>
            )}
          </div>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
