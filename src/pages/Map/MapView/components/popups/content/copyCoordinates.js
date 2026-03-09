import showNotification from "@/utils/notifications";

const formatCoordinates = (lat, lng) => `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

const legacyCopyText = (value) => {
  if (typeof document === "undefined") return false;
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  document.body.removeChild(textarea);
  return copied;
};

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
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else if (!legacyCopyText(value)) {
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
