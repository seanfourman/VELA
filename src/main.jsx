import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { NotificationProvider } from "@/features/notifications/NotificationProvider";
import "./index.css";
import "./styles/app/App.css";
import { router } from "./router";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")).render(
  <NotificationProvider>
    <RouterProvider router={router} />
  </NotificationProvider>,
);
