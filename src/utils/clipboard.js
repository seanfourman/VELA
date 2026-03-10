import showNotification from "@/utils/notifications";

const legacyCopyText = (value) => {
  if (typeof document === "undefined") return false;

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
};

export async function copyTextToClipboard(value) {
  if (!value) return false;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    return legacyCopyText(value);
  } catch {
    return false;
  }
}

export async function copyTextWithFeedback({
  value,
  missingMessage = "",
  successMessage = "Copied",
  failureMessage = "Could not copy",
  successType = "info",
  failureType = "warning",
  successDuration = 1800,
  failureDuration = 2200,
}) {
  const normalizedValue =
    typeof value === "string"
      ? value
      : value === undefined || value === null
        ? ""
        : String(value);

  if (!normalizedValue) {
    if (missingMessage) {
      showNotification(missingMessage, failureType, { duration: failureDuration });
    }
    return false;
  }

  const copied = await copyTextToClipboard(normalizedValue);
  if (copied) {
    if (successMessage) {
      showNotification(successMessage, successType, { duration: successDuration });
    }
    return true;
  }

  if (failureMessage) {
    showNotification(failureMessage, failureType, { duration: failureDuration });
  }
  return false;
}
