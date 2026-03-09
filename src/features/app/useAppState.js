import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import showPopup from "@/utils/popup";
import { isProbablyHardwareAccelerated } from "@/utils/hardwareUtils";
import { fetchRecommendations } from "@/utils/recommendationsApi";
import {
  deleteEventById,
  getRsvpUserId,
  readEventsFromStorage,
  saveEvent,
  toggleRsvp,
  writeEventsToStorage,
} from "@/features/starParty/starPartyStorage";
import {
  DEFAULT_MAP_TYPE,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  PROFILE_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  isAdminUser,
  loadProfileSettings,
  loadSettings,
  normalizeProfile,
  normalizeSettings,
  normalizeStargazeLocation,
  normalizeStargazePayload,
} from "@/utils/appState";

const safeSetJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
};

const useAppState = () => {
  const auth = useAuth();
  const mapViewRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState(() =>
    navigator.geolocation ? "searching" : "off",
  );
  const [mapType, setMapType] = useState(
    () => localStorage.getItem("mapType") || DEFAULT_MAP_TYPE,
  );
  const [settings, setSettings] = useState(() => loadSettings());
  const [profileSettings, setProfileSettings] = useState(() =>
    loadProfileSettings(),
  );
  const [stargazeLocations, setStargazeLocations] = useState([]);
  const [starPartyEvents, setStarPartyEvents] = useState(() =>
    readEventsFromStorage(),
  );

  useEffect(() => {
    localStorage.setItem("mapType", mapType);
  }, [mapType]);

  useEffect(() => {
    safeSetJson(SETTINGS_STORAGE_KEY, settings);
  }, [settings]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.toggle("a11y-mode", Boolean(settings.accessibilityMode));
    return () => {
      root.classList.remove("a11y-mode");
    };
  }, [settings.accessibilityMode]);

  useEffect(() => {
    writeEventsToStorage(starPartyEvents);
  }, [starPartyEvents]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchRecommendations();
        const normalized = normalizeStargazePayload(data);
        if (cancelled) return;
        setStargazeLocations(normalized);
      } catch (error) {
        if (cancelled) return;
        showPopup(
          error instanceof Error
            ? error.message
            : "Could not load recommended spots right now",
          "failure",
          { duration: 4500 },
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation({ lat: latitude, lng: longitude, accuracy });
        setLocationStatus("active");
      },
      () => {
        setLocationStatus("off");
      },
      {
        enableHighAccuracy: settings.highAccuracyLocation,
        timeout: 15000,
        maximumAge: 0,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [settings.highAccuracyLocation]);

  useEffect(() => {
    if (!isProbablyHardwareAccelerated()) {
      showPopup(
        "Hardware acceleration appears to be disabled. Performance and visuals may be affected",
        "failure",
        { duration: 6000 },
      );
    }
  }, []);

  const handleSaveProfile = useCallback((nextProfile) => {
    const normalized = normalizeProfile(nextProfile);
    setProfileSettings(normalized);
    safeSetJson(PROFILE_STORAGE_KEY, normalized);
  }, []);

  const handleResetProfile = useCallback(() => {
    setProfileSettings({ ...DEFAULT_PROFILE });
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  }, []);

  const handleUpdateSettings = useCallback((patch) => {
    setSettings((prev) => normalizeSettings({ ...prev, ...patch }));
  }, []);

  const handleResetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
    setMapType(DEFAULT_MAP_TYPE);
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
      localStorage.removeItem("mapType");
    } catch {
      return;
    }
  }, []);

  const handleSaveStargazeLocation = useCallback((location) => {
    const normalized = normalizeStargazeLocation(location);
    if (!normalized) return;

    setStargazeLocations((prev) => {
      const exists = prev.some((item) => item.id === normalized.id);
      return exists
        ? prev.map((item) => (item.id === normalized.id ? normalized : item))
        : [...prev, normalized];
    });
  }, []);

  const handleDeleteStargazeLocation = useCallback((id) => {
    setStargazeLocations((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleSaveStarPartyEvent = useCallback(
    (draft) => {
      const activeUser = auth?.user;
      if (!isAdminUser(activeUser)) return;
      const host = {
        id: getRsvpUserId(activeUser),
        name:
          String(activeUser?.name || activeUser?.preferred_username || "").trim() ||
          "Admin",
        email: String(activeUser?.email || "").trim(),
      };
      setStarPartyEvents((prev) => saveEvent({ events: prev, draft, host }).events);
    },
    [auth?.user],
  );

  const handleDeleteStarPartyEvent = useCallback(
    (eventId) => {
      const activeUser = auth?.user;
      if (!isAdminUser(activeUser)) return;
      setStarPartyEvents((prev) => deleteEventById({ events: prev, eventId }));
    },
    [auth?.user],
  );

  const handleSetStarPartyEventStatus = useCallback(
    ({ eventId, status }) => {
      const activeUser = auth?.user;
      if (!isAdminUser(activeUser)) return;
      setStarPartyEvents((prev) => {
        const target = prev.find((event) => event.id === eventId);
        if (!target) return prev;
        return saveEvent({
          events: prev,
          draft: { ...target, status },
          host: target.host || {
            id: getRsvpUserId(activeUser),
            name:
              String(
                activeUser?.name || activeUser?.preferred_username || ""
              ).trim() || "Admin",
            email: String(activeUser?.email || "").trim(),
          },
        }).events;
      });
    },
    [auth?.user],
  );

  const handleToggleStarPartyRsvp = useCallback(({ eventId, user }) => {
    setStarPartyEvents((prev) => toggleRsvp({ events: prev, eventId, user }).events);
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
