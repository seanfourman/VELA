import { copyTextWithFeedback } from "@/utils/clipboard";

const formatCoordinates = (lat, lng) => `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

export async function copyCoordinates({ lat, lng }) {
  const latNumber = Number(lat);
  const lngNumber = Number(lng);
  if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
    return copyTextWithFeedback({
      value: "",
      missingMessage: "No coordinates available to copy",
      failureMessage: "",
      failureType: "warning",
      failureDuration: 2200,
    });
  }

  const value = formatCoordinates(latNumber, lngNumber);
  return copyTextWithFeedback({
    value,
    successMessage: `Copied coordinates: ${value}`,
    failureMessage: "Could not copy coordinates",
    successType: "info",
    failureType: "warning",
    successDuration: 1800,
    failureDuration: 2200,
  });
}

export function formatCoordinatesLabel({ lat, lng }) {
  const latNumber = Number(lat);
  const lngNumber = Number(lng);
  if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) return "--, --";
  return formatCoordinates(latNumber, lngNumber);
}
