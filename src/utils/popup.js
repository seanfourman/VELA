export const POPUP_EVENT = "app:popup";

export default function showPopup(
  message,
  type = "info",
  { duration = 2500 } = {},
) {
  if (!message) return;
  const detail = { message, type, duration };
  window.dispatchEvent(new CustomEvent(POPUP_EVENT, { detail }));
}
