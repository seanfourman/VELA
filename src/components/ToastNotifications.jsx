import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import usePortalTarget from "@/hooks/usePortalTarget";
import { NOTIFICATION_EVENT } from "@/utils/notifications";
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

export default function ToastNotifications() {
  const [notifications, setNotifications] = useState([]);
  const portalTarget = usePortalTarget("notification-root");

  useEffect(() => {
    const handler = (event) => {
      const { message, type = "info", duration = 2500 } = event.detail || {};
      if (!message) return;

      const id = crypto.randomUUID?.() || Date.now().toString();
      const next = { id, message, type, show: false };
      setNotifications((prev) => [...prev, next]);

      setTimeout(() => {
        setNotifications((prev) =>
          prev.map((item) => (item.id === id ? { ...item, show: true } : item)),
        );
      }, 10);

      setTimeout(() => {
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, show: false } : item,
          ),
        );
        setTimeout(() => {
          setNotifications((prev) => prev.filter((item) => item.id !== id));
        }, 400);
      }, duration);
    };

    window.addEventListener(NOTIFICATION_EVENT, handler);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handler);
  }, []);

  if (!portalTarget) return null;

  return createPortal(
    <div className="popup-container">
      {notifications.map((notification) => (
        <ToastMessage key={notification.id} notification={notification} />
      ))}
    </div>,
    portalTarget,
  );
}
