import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ToastNotifications from "@/components/ToastNotifications";
import { registerNotificationDispatcher } from "@/utils/notifications";

const EXIT_ANIMATION_MS = 400;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const timeoutsRef = useRef(new Map());

  const clearNotificationTimers = useCallback((id) => {
    const timers = timeoutsRef.current.get(id);
    if (!timers) return;
    timers.forEach((timerId) => {
      clearTimeout(timerId);
    });
    timeoutsRef.current.delete(id);
  }, []);

  const dismissNotification = useCallback(
    (id) => {
      if (!id) return;

      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, show: false } : item)),
      );

      const removeTimerId = window.setTimeout(() => {
        setNotifications((prev) => prev.filter((item) => item.id !== id));
        clearNotificationTimers(id);
      }, EXIT_ANIMATION_MS);

      const timers = timeoutsRef.current.get(id) ?? [];
      timers.push(removeTimerId);
      timeoutsRef.current.set(id, timers);
    },
    [clearNotificationTimers],
  );

  const notify = useCallback(
    ({ message, type = "info", duration = 2500 }) => {
      if (!message) return null;

      const id = crypto.randomUUID?.() || Date.now().toString();
      const nextNotification = { id, message, type, show: false };
      setNotifications((prev) => [...prev, nextNotification]);

      const showTimerId = window.setTimeout(() => {
        setNotifications((prev) =>
          prev.map((item) => (item.id === id ? { ...item, show: true } : item)),
        );
      }, 10);

      const hideTimerId = window.setTimeout(() => {
        dismissNotification(id);
      }, duration);

      timeoutsRef.current.set(id, [showTimerId, hideTimerId]);
      return id;
    },
    [dismissNotification],
  );

  useEffect(() => {
    return registerNotificationDispatcher(notify);
  }, [notify]);

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach((timerIds) => {
        timerIds.forEach((timerId) => {
          clearTimeout(timerId);
        });
      });
      timeouts.clear();
    };
  }, []);

  return (
    <>
      {children}
      <ToastNotifications notifications={notifications} />
    </>
  );
}
