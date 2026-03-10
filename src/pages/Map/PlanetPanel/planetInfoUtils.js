import showNotification from "@/utils/notifications";
import { copyTextToClipboard } from "@/utils/clipboard";

export const formatDegrees = (value) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "-";
  }
  return `${value.toFixed(1)}\u00b0`;
};

export const formatMagnitude = (value) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "-";
  }
  return value.toFixed(1);
};

export const formatRightAscension = (ra) => {
  if (!ra) return "-";
  const hours = Number.isFinite(ra.hours)
    ? ra.hours.toString().padStart(2, "0")
    : "00";
  const minutes = Number.isFinite(ra.minutes)
    ? ra.minutes.toString().padStart(2, "0")
    : "00";
  return `${hours}h ${minutes}m`;
};

export const formatDeclination = (dec) => {
  if (!dec) return "-";
  const sign = dec.negative ? "-" : "+";
  const degrees = Number.isFinite(dec.degrees) ? Math.abs(dec.degrees) : 0;
  const arcminutes = Number.isFinite(dec.arcminutes)
    ? Math.abs(dec.arcminutes)
    : 0;
  return `${sign}${degrees}\u00b0 ${arcminutes}'`;
};

const normalizeAzimuth = (value) => {
  if (!Number.isFinite(value)) return null;
  return ((value % 360) + 360) % 360;
};

export const formatDirection = (value) => {
  const normalized = normalizeAzimuth(Number(value));
  if (normalized === null) return "Unknown";
  const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(normalized / 45) % labels.length;
  return labels[index];
};

export const buildPlanetCopyPayload = (planet) => {
  const azimuth = formatDegrees(planet?.azimuth);
  const direction = formatDirection(planet?.azimuth);
  const magnitude = formatMagnitude(planet?.magnitude);
  const rightAscension = formatRightAscension(planet?.rightAscension);
  const declination = formatDeclination(planet?.declination);
  const horizonStatus =
    planet?.aboveHorizon === false ? "Below horizon right now" : "Above the horizon";

  return [
    `Name: ${planet?.name || "Planet"}`,
    `Constellation: ${planet?.constellation || "Constellation unknown"}`,
    `Visibility: ${planet?.nakedEyeObject ? "Naked eye" : "Needs optics"}`,
    `Altitude: ${formatDegrees(planet?.altitude)}`,
    `Azimuth: ${azimuth} (${direction})`,
    `Magnitude: ${magnitude}`,
    `RA / Dec: ${rightAscension} / ${declination}`,
    `Status: ${horizonStatus}`,
  ].join("\n");
};

export const copyPlanetDetailsToClipboard = async (planet) => {
  const copyPayload = buildPlanetCopyPayload(planet);
  if (!copyPayload) return false;

  try {
    const copied = await copyTextToClipboard(copyPayload);
    if (!copied) {
      throw new Error("Clipboard unavailable");
    }

    showNotification(`${planet?.name || "Planet"} info copied`, "success", {
      duration: 2000,
    });
    return true;
  } catch {
    showNotification("Could not copy planet info", "warning", {
      duration: 2200,
    });
    return false;
  }
};
