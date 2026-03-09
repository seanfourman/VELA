export const NOTIFICATION_EVENT = "app:notification";

export function showNotification(
  message,
  type = "info",
  { duration = 2500 } = {},
) {
  if (!message) return;
  const detail = { message, type, duration };
  window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, { detail }));
}

export default showNotification;
