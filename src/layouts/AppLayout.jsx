import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import ToastNotifications from "@/components/ToastNotifications";
import useAppState from "@/features/app/useAppState";
import { normalizePath } from "@/utils/appState";
import { AppLayoutContext } from "./AppLayoutContext";

const ZOOM_OUT_ROUTES = new Set(["/auth", "/profile", "/settings", "/admin"]);

function AppLayout() {
  const [isThreeDModeActive, setIsThreeDModeActive] = useState(false);
  const appState = useAppState();
  const routerNavigate = useNavigate();
  const location = useLocation();
  const transitionTimeoutRef = useRef(null);

  const currentRoute = normalizePath(location.pathname);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const navigate = useCallback(
    (path) => {
      const nextPath = normalizePath(path);
      if (nextPath === currentRoute) return;

      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }

      const shouldZoomOut = currentRoute === "/" && ZOOM_OUT_ROUTES.has(nextPath);
      if (shouldZoomOut) {
        if (appState.mapViewRef.current?.zoomOutToMin) {
          appState.mapViewRef.current.zoomOutToMin();
        }

        transitionTimeoutRef.current = setTimeout(() => {
          routerNavigate(nextPath);
          transitionTimeoutRef.current = null;
        }, 700);
        return;
      }

      routerNavigate(nextPath);
    },
    [appState.mapViewRef, currentRoute, routerNavigate],
  );

  const value = useMemo(
    () => ({
      ...appState,
      currentRoute,
      navigate,
      isThreeDModeActive,
      setIsThreeDModeActive,
    }),
    [appState, currentRoute, isThreeDModeActive, navigate],
  );

  return (
    <AppLayoutContext.Provider value={value}>
      <div className="app">
        <Navbar
          mapType={appState.mapType}
          forceLight={currentRoute === "/" && isThreeDModeActive}
          auth={appState.auth}
          profile={appState.profileSettings}
          isAdmin={appState.isAdmin}
          onNavigate={navigate}
          currentRoute={currentRoute}
        />
        <Outlet />
        <ToastNotifications />
      </div>
    </AppLayoutContext.Provider>
  );
}

export default AppLayout;


