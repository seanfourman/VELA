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
import { Outlet, useLoaderData, useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/features/auth/useAuth";
import { useLocationTracking } from "@/features/app/hooks/useLocationTracking";
import { useStarPartyEvents } from "@/features/app/hooks/useStarPartyEvents";
import { useStargazeLocations } from "@/features/app/hooks/useStargazeLocations";
import { useUserPreferences } from "@/features/app/hooks/useUserPreferences";
import showNotification from "@/utils/notifications";
import {
  isProbablyHardwareAccelerated,
  requiresHardwareAccelerationRoute,
} from "@/utils/hardwareUtils";
import { isAdminUser, normalizePath } from "@/utils/appState";
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
  const bootstrapData = useLoaderData();
  const auth = useAuth();
  const mapViewRef = useRef(null);
  const initialStargazeLocations = Array.isArray(bootstrapData?.stargazeLocations)
    ? bootstrapData.stargazeLocations
    : undefined;
  const initialStarPartyEvents = Array.isArray(bootstrapData?.starPartyEvents)
    ? bootstrapData.starPartyEvents
    : undefined;
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
  } = useStargazeLocations({ initialLocations: initialStargazeLocations });
  const {
    starPartyEvents,
    handleSaveStarPartyEvent,
    handleDeleteStarPartyEvent,
    handleSetStarPartyEventStatus,
    handleToggleStarPartyRsvp,
  } = useStarPartyEvents({
    activeUser: auth?.user,
    initialEvents: initialStarPartyEvents,
  });
  const routerNavigate = useNavigate();
  const routeLocation = useLocation();
  const transitionTimeoutRef = useRef(null);
  const hardwareAccelerationEnabled = useMemo(
    () => isProbablyHardwareAccelerated(),
    [],
  );

  const currentRoute = normalizePath(routeLocation.pathname);
  const isMapRoute = currentRoute === "/";
  const isAdmin = isAdminUser(auth?.user);
  const isLight = mapType === "light";
  const mapIsAuthenticated = Boolean(auth?.isAuthenticated);
  const routeIsLight = isMapRoute && isLight;

  useEffect(() => {
    if (!hardwareAccelerationEnabled) {
      showNotification(
        "Hardware acceleration appears to be disabled. Performance and visuals may be affected",
        "failure",
        { duration: 6000 },
      );
    }
  }, [hardwareAccelerationEnabled]);

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

      if (
        !hardwareAccelerationEnabled &&
        requiresHardwareAccelerationRoute(nextPath)
      ) {
        showNotification(
          "Enable browser hardware acceleration to open that page.",
          "failure",
          { duration: 2800 },
        );
        return;
      }

      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }

      const shouldZoomOut = currentRoute === "/" && nextPath !== "/";
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
    [currentRoute, hardwareAccelerationEnabled, routerNavigate],
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
      hardwareAccelerationEnabled,
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
      hardwareAccelerationEnabled,
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
          satelliteReadableShadowsEnabled={settings.satelliteReadableShadows}
          hardwareAccelerationEnabled={hardwareAccelerationEnabled}
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
