import defaultPlanetIcon from "@/assets/icons/planets/planet.svg";
import sunIcon from "@/assets/icons/planets/sun.svg";
import mercuryIcon from "@/assets/icons/planets/mercury.svg";
import venusIcon from "@/assets/icons/planets/venus.svg";
import earthIcon from "@/assets/icons/planets/earth.svg";
import marsIcon from "@/assets/icons/planets/mars.svg";
import jupiterIcon from "@/assets/icons/planets/jupiter.svg";
import saturnIcon from "@/assets/icons/planets/saturn.svg";
import uranusIcon from "@/assets/icons/planets/uranus.svg";
import neptuneIcon from "@/assets/icons/planets/neptune.svg";

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const normalizeAzimuth = (value) => {
  if (!Number.isFinite(value)) return null;
  return ((value % 360) + 360) % 360;
};

export const shortestAngleDelta = (target, current) => {
  if (!Number.isFinite(target) || !Number.isFinite(current)) return null;
  return ((target - current + 540) % 360) - 180;
};

export const formatDegrees = (value) => {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(1)}\u00b0`;
};

export const getHeadingFromEvent = (event) => {
  if (!event) return null;
  if (Number.isFinite(event.webkitCompassHeading)) {
    return normalizeAzimuth(event.webkitCompassHeading);
  }
  if (!Number.isFinite(event.alpha)) return null;
  return normalizeAzimuth(360 - event.alpha);
};

export const getAltitudeFromEvent = (event) => {
  if (!event || !Number.isFinite(event.beta)) return null;
  return clamp(event.beta - 90, -90, 90);
};

export const getCameraError = (error) => {
  const name = error?.name || "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera permission is required for AR mode";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No suitable camera was found on this device";
  }
  return "Could not start the camera";
};

export const getCameraAvailabilityIssue = () => {
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

export const detectOrientationSupport = () => {
  if (typeof window === "undefined") {
    return { supported: false, needsPermissionPrompt: false };
  }
  const supported = "DeviceOrientationEvent" in window;
  const needsPermissionPrompt =
    supported &&
    typeof window.DeviceOrientationEvent?.requestPermission === "function";
  return { supported, needsPermissionPrompt };
};

const DEFAULT_PLANET_BADGE = {
  icon: defaultPlanetIcon,
  color: "#94a3b8",
  glow: "rgba(148, 163, 184, 0.44)",
};

const PLANET_BADGE_META = {
  sun: { icon: sunIcon, color: "#f59e0b", glow: "rgba(245, 158, 11, 0.5)" },
  moon: {
    icon: defaultPlanetIcon,
    color: "#cbd5e1",
    glow: "rgba(203, 213, 225, 0.44)",
  },
  mercury: {
    icon: mercuryIcon,
    color: "#a8a29e",
    glow: "rgba(168, 162, 158, 0.44)",
  },
  venus: {
    icon: venusIcon,
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.44)",
  },
  earth: { icon: earthIcon, color: "#38bdf8", glow: "rgba(56, 189, 248, 0.46)" },
  mars: { icon: marsIcon, color: "#fb7185", glow: "rgba(251, 113, 133, 0.46)" },
  jupiter: {
    icon: jupiterIcon,
    color: "#fca5a5",
    glow: "rgba(252, 165, 165, 0.46)",
  },
  saturn: {
    icon: saturnIcon,
    color: "#fcd34d",
    glow: "rgba(252, 211, 77, 0.46)",
  },
  uranus: {
    icon: uranusIcon,
    color: "#67e8f9",
    glow: "rgba(103, 232, 249, 0.46)",
  },
  neptune: {
    icon: neptuneIcon,
    color: "#60a5fa",
    glow: "rgba(96, 165, 250, 0.46)",
  },
  pluto: {
    icon: defaultPlanetIcon,
    color: "#c4b5fd",
    glow: "rgba(196, 181, 253, 0.46)",
  },
  ceres: {
    icon: defaultPlanetIcon,
    color: "#d6d3d1",
    glow: "rgba(214, 211, 209, 0.46)",
  },
  eris: {
    icon: defaultPlanetIcon,
    color: "#a5b4fc",
    glow: "rgba(165, 180, 252, 0.46)",
  },
  haumea: {
    icon: defaultPlanetIcon,
    color: "#93c5fd",
    glow: "rgba(147, 197, 253, 0.46)",
  },
  makemake: {
    icon: defaultPlanetIcon,
    color: "#fdba74",
    glow: "rgba(253, 186, 116, 0.46)",
  },
};

export const resolvePlanetBadge = (name) => {
  const normalized = `${name || ""}`.trim().toLowerCase();
  if (!normalized) return DEFAULT_PLANET_BADGE;
  if (PLANET_BADGE_META[normalized]) return PLANET_BADGE_META[normalized];
  const partialMatchKey = Object.keys(PLANET_BADGE_META).find((key) =>
    normalized.includes(key),
  );
  return partialMatchKey
    ? PLANET_BADGE_META[partialMatchKey]
    : DEFAULT_PLANET_BADGE;
};
