import { createBrowserRouter } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import AdminRoute from "@/routes/AdminRoute";
import AuthRoute from "@/routes/AuthRoute";
import MapRoute from "@/routes/MapRoute";
import NotFoundRoute from "@/routes/NotFoundRoute";
import ProfileRoute from "@/routes/ProfileRoute";
import SettingsRoute from "@/routes/SettingsRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <MapRoute /> },
      { path: "auth", element: <AuthRoute /> },
      { path: "profile", element: <ProfileRoute /> },
      { path: "admin", element: <AdminRoute /> },
      { path: "settings", element: <SettingsRoute /> },
      { path: "*", element: <NotFoundRoute /> },
    ],
  },
]);
