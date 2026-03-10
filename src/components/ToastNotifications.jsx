import { createPortal } from "react-dom";
import usePortalTarget from "@/hooks/usePortalTarget";
import "./styles/ToastNotifications.css";

function ToastMessage({ notification }) {
  return (
    <div
      className={`popup-toast ${notification.type} ${
        notification.show ? "show" : ""
      }`}
    >
      {notification.message}
    </div>
  );
}

export default function ToastNotifications({ notifications = [] }) {
  const portalTarget = usePortalTarget("notification-root");

  if (!portalTarget || notifications.length === 0) return null;

  return createPortal(
    <div className="popup-container">
      {notifications.map((notification) => (
        <ToastMessage key={notification.id} notification={notification} />
      ))}
    </div>,
    portalTarget,
  );
}
