let notificationDispatcher = null;

export function registerNotificationDispatcher(dispatcher) {
  notificationDispatcher = dispatcher;

  return () => {
    if (notificationDispatcher === dispatcher) {
      notificationDispatcher = null;
    }
  };
}

const showNotification = (message, type = "info", { duration = 2500 } = {}) => {
  if (!message || typeof notificationDispatcher !== "function") return;

  notificationDispatcher({
    message,
    type,
    duration,
  });
};

export default showNotification;
