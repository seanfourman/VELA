const utcDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const utcDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const KP_LEVELS = [
  { min: 9, scale: "G5", label: "Extreme storm", shortLabel: "G5 Extreme", tone: "critical" },
  { min: 8, scale: "G4", label: "Severe storm", shortLabel: "G4 Severe", tone: "high" },
  { min: 7, scale: "G3", label: "Strong storm", shortLabel: "G3 Strong", tone: "high" },
  { min: 6, scale: "G2", label: "Moderate storm", shortLabel: "G2 Moderate", tone: "elevated" },
  { min: 5, scale: "G1", label: "Minor storm", shortLabel: "G1 Minor", tone: "elevated" },
  { min: 4, scale: "-", label: "Unsettled", shortLabel: "Unsettled", tone: "watch" },
  { min: 0, scale: "-", label: "Quiet", shortLabel: "Quiet", tone: "quiet" },
];

const AURORA_BANDS = [
  { minLat: 66, minKp: 2 },
  { minLat: 60, minKp: 3 },
  { minLat: 55, minKp: 4 },
  { minLat: 50, minKp: 5 },
  { minLat: 45, minKp: 6 },
  { minLat: 40, minKp: 7 },
  { minLat: 35, minKp: 8 },
  { minLat: 0, minKp: 9.5 },
];

const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

export const parseUtcDate = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatUtcDateTime = (value) => {
  const parsed = value instanceof Date ? value : parseUtcDate(value);
  if (!parsed) return "Unknown";
  return `${utcDateTimeFormatter.format(parsed)} UTC`;
};

export const formatUtcDate = (value) => {
  const parsed = value instanceof Date ? value : parseUtcDate(value);
  if (!parsed) return "Unknown";
  return utcDateFormatter.format(parsed);
};

export const formatKpValue = (value) =>
  isFiniteNumber(value) ? value.toFixed(1) : "--";

export const classifyKpIndex = (value) => {
  if (!isFiniteNumber(value)) {
    return {
      scale: "--",
      label: "No recent Kp data",
      shortLabel: "No data",
      tone: "muted",
    };
  }

  const rounded = Math.max(0, Number(value));
  const match = KP_LEVELS.find((entry) => rounded >= entry.min) ?? KP_LEVELS[KP_LEVELS.length - 1];
  return { ...match };
};

const getRequiredKpForLatitude = (latitude) => {
  if (!isFiniteNumber(latitude)) return null;
  const absoluteLatitude = Math.min(90, Math.abs(latitude));
  const band = AURORA_BANDS.find((entry) => absoluteLatitude >= entry.minLat);
  return band?.minKp ?? null;
};

export const estimateAuroraChance = ({ latitude, kpIndex }) => {
  if (!isFiniteNumber(latitude)) {
    return {
      label: "Unknown",
      tone: "muted",
      detail: "Enable location to estimate aurora visibility for your latitude",
      requiredKp: null,
    };
  }

  const requiredKp = getRequiredKpForLatitude(latitude);
  if (!isFiniteNumber(requiredKp)) {
    return {
      label: "Unknown",
      tone: "muted",
      detail: "Unable to estimate aurora threshold at this latitude",
      requiredKp: null,
    };
  }

  if (!isFiniteNumber(kpIndex)) {
    return {
      label: "Unknown",
      tone: "muted",
      detail: `At ${Math.abs(latitude).toFixed(1)} degrees latitude, aurora usually needs Kp ${requiredKp.toFixed(1)}+`,
      requiredKp,
    };
  }

  const gap = kpIndex - requiredKp;
  if (gap >= 1) {
    return {
      label: "High",
      tone: "high",
      detail: `Aurora is plausible at ${Math.abs(latitude).toFixed(1)} degrees latitude`,
      requiredKp,
    };
  }
  if (gap >= 0) {
    return {
      label: "Possible",
      tone: "elevated",
      detail: `You are near the threshold for visible aurora at your latitude`,
      requiredKp,
    };
  }
  if (gap >= -1) {
    return {
      label: "Low",
      tone: "watch",
      detail: `A slightly stronger storm could make aurora visible at your latitude`,
      requiredKp,
    };
  }

  return {
    label: "Very low",
    tone: "quiet",
    detail: `At ${Math.abs(latitude).toFixed(1)} degrees latitude, visible aurora usually needs Kp ${requiredKp.toFixed(1)}+`,
    requiredKp,
  };
};

export const getCmeImpactLabel = (cme) => {
  if (!cme || typeof cme !== "object") return "Unknown impact";
  if (cme.isMinorImpact) return "Minor Earth impact";
  if (cme.isGlancing) return "Glancing Earth blow";
  return "Earth-directed CME";
};
