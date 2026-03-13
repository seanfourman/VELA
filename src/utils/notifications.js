let notificationDispatcher = null;
const pendingNotifications = [];

export function registerNotificationDispatcher(dispatcher) {
  notificationDispatcher = dispatcher;

  if (typeof notificationDispatcher === "function" && pendingNotifications.length > 0) {
    const queued = pendingNotifications.splice(0, pendingNotifications.length);
    queued.forEach((notification) => {
      notificationDispatcher(notification);
    });
  }

  return () => {
    if (notificationDispatcher === dispatcher) {
      notificationDispatcher = null;
    }
  };
}

const showNotification = (message, type = "info", { duration = 2500 } = {}) => {
  if (!message) return;

  const notification = {
    message,
    type,
    duration,
  };

  if (typeof notificationDispatcher !== "function") {
    pendingNotifications.push(notification);
    return;
  }

  notificationDispatcher(notification);
};

export default showNotification;
