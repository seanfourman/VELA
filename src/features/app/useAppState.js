import { useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/useAuth";
import showNotification from "@/utils/notifications";
import { isProbablyHardwareAccelerated } from "@/utils/hardwareUtils";
import { isAdminUser } from "@/utils/appState";
import { useLocationTracking } from "./hooks/useLocationTracking";
import { useStarPartyEvents } from "./hooks/useStarPartyEvents";
import { useStargazeLocations } from "./hooks/useStargazeLocations";
import { useUserPreferences } from "./hooks/useUserPreferences";

const useAppState = () => {
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
  } = useUserPreferences();
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

  useEffect(() => {
    if (!isProbablyHardwareAccelerated()) {
      showNotification(
        "Hardware acceleration appears to be disabled. Performance and visuals may be affected",
        "failure",
        { duration: 6000 },
      );
    }
  }, []);

  const isAdmin = isAdminUser(auth?.user);
  const isLight = mapType === "light";
  const mapIsAuthenticated = Boolean(auth?.isAuthenticated);

  return {
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
    isLight,
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
  };
};

export default useAppState;


