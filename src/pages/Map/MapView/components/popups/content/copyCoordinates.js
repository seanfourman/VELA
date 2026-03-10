import showNotification from "@/utils/notifications";
import { copyTextToClipboard } from "@/utils/clipboard";

const formatCoordinates = (lat, lng) => `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

export async function copyCoordinates({ lat, lng }) {
  const latNumber = Number(lat);
  const lngNumber = Number(lng);
  if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) {
    showNotification("No coordinates available to copy", "warning", {
      duration: 2200,
    });
    return false;
  }

  const value = formatCoordinates(latNumber, lngNumber);

  try {
    const copied = await copyTextToClipboard(value);
    if (!copied) {
      throw new Error("Clipboard API unavailable.");
    }

    showNotification(`Copied coordinates: ${value}`, "info", { duration: 1800 });
    return true;
  } catch {
    showNotification("Could not copy coordinates", "warning", { duration: 2200 });
    return false;
  }
}

export function formatCoordinatesLabel({ lat, lng }) {
  const latNumber = Number(lat);
  const lngNumber = Number(lng);
  if (!Number.isFinite(latNumber) || !Number.isFinite(lngNumber)) return "--, --";
  return formatCoordinates(latNumber, lngNumber);
}
