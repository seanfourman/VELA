const POPUP_EVENT = "app:popup";

export function showPopup(message, type = "info", { duration = 2500 } = {}) {
  if (!message) return;
  const detail = { message, type, duration };
  window.dispatchEvent(new CustomEvent(POPUP_EVENT, { detail }));
}

export { POPUP_EVENT };

export default showPopup;
