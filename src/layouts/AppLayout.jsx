/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/features/auth/useAuth";
import { useLocationTracking } from "@/features/app/hooks/useLocationTracking";
import { useStarPartyEvents } from "@/features/app/hooks/useStarPartyEvents";
import { useStargazeLocations } from "@/features/app/hooks/useStargazeLocations";
import { useUserPreferences } from "@/features/app/hooks/useUserPreferences";
import showNotification from "@/utils/notifications";
import { isProbablyHardwareAccelerated } from "@/utils/hardwareUtils";
import { isAdminUser, normalizePath } from "@/utils/appState";

const ZOOM_OUT_ROUTES = new Set([
  "/auth",
  "/profile",
  "/settings",
  "/admin",
  "/moon-phase",
  "/night-planner",
]);
export const AppLayoutContext = createContext(null);

export const useAppLayoutContext = () => {
  const context = useContext(AppLayoutContext);
  if (!context) {
    throw new Error("useAppLayoutContext must be used within AppLayout.");
  }
  return context;
};

function AppLayout() {
  const [isThreeDModeActive, setIsThreeDModeActive] = useState(false);
  const auth = useAuth();
  const mapViewRef = useRef(null);
  const {
    mapType,
    setMapType,
    settings,
    profileSettings,
    handleSaveProfile,
    handleResetProfile,
    handleUpdateSettings,
    handleResetSettings,
  } = useUserPreferences({ auth });
  const { location, locationStatus } = useLocationTracking({
    highAccuracyLocation: settings.highAccuracyLocation,
  });
  const {
    stargazeLocations,
    handleSaveStargazeLocation,
    handleDeleteStargazeLocation,
  } = useStargazeLocations();
  const {
    starPartyEvents,
    handleSaveStarPartyEvent,
    handleDeleteStarPartyEvent,
    handleSetStarPartyEventStatus,
    handleToggleStarPartyRsvp,
  } = useStarPartyEvents({ activeUser: auth?.user });
  const routerNavigate = useNavigate();
  const routeLocation = useLocation();
  const transitionTimeoutRef = useRef(null);

  const currentRoute = normalizePath(routeLocation.pathname);
  const isMapRoute = currentRoute === "/";
  const isAdmin = isAdminUser(auth?.user);
  const isLight = mapType === "light";
  const mapIsAuthenticated = Boolean(auth?.isAuthenticated);
  const routeIsLight = isMapRoute && isLight;

  useEffect(() => {
    if (!isProbablyHardwareAccelerated()) {
      showNotification(
        "Hardware acceleration appears to be disabled. Performance and visuals may be affected",
        "failure",
        { duration: 6000 },
      );
    }
  }, []);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const navigate = useCallback(
    (path, options = {}) => {
      const nextPath = normalizePath(path);
      const hasRouteState = options && Object.prototype.hasOwnProperty.call(options, "state");
      if (nextPath === currentRoute && !hasRouteState && !options.replace) return;

      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }

      const shouldZoomOut = currentRoute === "/" && ZOOM_OUT_ROUTES.has(nextPath);
      if (shouldZoomOut) {
        if (mapViewRef.current?.zoomOutToMin) {
          mapViewRef.current.zoomOutToMin();
        }

        transitionTimeoutRef.current = setTimeout(() => {
          routerNavigate(nextPath, options);
          transitionTimeoutRef.current = null;
        }, 700);
        return;
      }

      routerNavigate(nextPath, options);
    },
    [currentRoute, routerNavigate],
  );

  const value = useMemo(
    () => ({
      auth,
      mapViewRef,
      location,
      locationStatus,
      mapType,
      setMapType,
      settings,
      profileSettings,
      stargazeLocations,
      starPartyEvents,
      isAdmin,
      isLight: routeIsLight,
      mapIsAuthenticated,
      handleSaveProfile,
      handleResetProfile,
      handleUpdateSettings,
      handleResetSettings,
      handleSaveStargazeLocation,
      handleDeleteStargazeLocation,
      handleSaveStarPartyEvent,
      handleDeleteStarPartyEvent,
      handleSetStarPartyEventStatus,
      handleToggleStarPartyRsvp,
      currentRoute,
      navigate,
      isThreeDModeActive,
      setIsThreeDModeActive,
    }),
    [
      auth,
      currentRoute,
      handleDeleteStargazeLocation,
      handleDeleteStarPartyEvent,
      handleResetProfile,
      handleResetSettings,
      handleSaveProfile,
      handleSaveStargazeLocation,
      handleSaveStarPartyEvent,
      handleSetStarPartyEventStatus,
      handleToggleStarPartyRsvp,
      handleUpdateSettings,
      isAdmin,
      isThreeDModeActive,
      location,
      locationStatus,
      mapIsAuthenticated,
      mapType,
      navigate,
      profileSettings,
      routeIsLight,
      setMapType,
      settings,
      starPartyEvents,
      stargazeLocations,
    ],
  );

  return (
    <AppLayoutContext.Provider value={value}>
      <div className="app">
        <Navbar
          mapType={mapType}
          forceLight={isMapRoute && isThreeDModeActive}
          auth={auth}
          profile={profileSettings}
          isAdmin={isAdmin}
          onNavigate={navigate}
          currentRoute={currentRoute}
        />
        <Outlet />
      </div>
    </AppLayoutContext.Provider>
  );
}

export default AppLayout;
