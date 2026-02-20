import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import Navbar from "./components/Navbar";
import MapView from "./pages/Map/MapView";
import PopupPortal from "./components/PopupPortal";
import { useAuth } from "./hooks/useAuth";
import { showPopup } from "./utils/popup";
import { isProbablyHardwareAccelerated } from "./utils/hardwareUtils";
import { fetchRecommendations } from "./utils/recommendationsApi";
import {
  DEFAULT_MAP_TYPE,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  PROFILE_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  isAdminUser,
  loadProfileSettings,
  loadSettings,
  normalizePath,
  normalizeProfile,
  normalizeSettings,
  normalizeStargazeLocation,
  normalizeStargazePayload,
} from "./utils/appState";
import "./App.css";

const AuthPage = lazy(() => import("./pages/Auth/AuthPage"));
const ProfilePage = lazy(() => import("./pages/Profile/ProfilePage"));
const AdminPage = lazy(() => import("./pages/Admin/AdminPage"));
const SettingsPage = lazy(() => import("./pages/Settings/SettingsPage"));
const ZOOM_OUT_ROUTES = new Set(["/auth", "/profile", "/settings", "/admin"]);
const safeSetJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable; ignore
  }
};

function App() {
  const auth = useAuth();
  const mapViewRef = useRef(null);
  const transitionTimeoutRef = useRef(null);
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
  const [route, setRoute] = useState(() =>
    normalizePath(window.location.pathname),
  );

  useEffect(() => {
    localStorage.setItem("mapType", mapType);
  }, [mapType]);

  useEffect(() => {
    safeSetJson(SETTINGS_STORAGE_KEY, settings);
  }, [settings]);

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
            : "Could not load recommended spots right now.",
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
    const handlePopState = () => {
      setRoute(normalizePath(window.location.pathname));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
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
        "Hardware acceleration appears to be disabled. Performance and visuals may be affected.",
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
    (path) => {
      const nextPath = normalizePath(path);
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
      if (nextPath === route) return;

      const shouldZoomOut = normalizePath(route) === "/" && ZOOM_OUT_ROUTES.has(nextPath);

      if (shouldZoomOut) {
        if (mapViewRef.current?.zoomOutToMin) {
          mapViewRef.current.zoomOutToMin();
        }

        transitionTimeoutRef.current = setTimeout(() => {
          window.history.pushState({}, document.title, nextPath);
          setRoute(nextPath);
          transitionTimeoutRef.current = null;
        }, 700);
        return;
      }

      window.history.pushState({}, document.title, nextPath);
      setRoute(nextPath);
    },
    [route],
  );

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
      // Storage unavailable; ignore
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

  const currentRoute = normalizePath(route);
  const isAdmin = isAdminUser(auth?.user);
  const isLight = mapType === "light";
  const mapIsAuthenticated = Boolean(auth?.isAuthenticated);

  let currentPage;
  switch (currentRoute) {
    case "/auth":
      currentPage = (
      <AuthPage auth={auth} isLight={isLight} onNavigate={navigate} />
      );
      break;
    case "/profile":
      currentPage = (
      <ProfilePage
        auth={auth}
        profile={profileSettings}
        isAdmin={isAdmin}
        isLight={isLight}
        mapType={mapType}
        onSave={handleSaveProfile}
        onReset={handleResetProfile}
        onNavigate={navigate}
      />
      );
      break;
    case "/admin":
      currentPage = (
      <AdminPage
        auth={auth}
        isAdmin={isAdmin}
        isLight={isLight}
        stargazeLocations={stargazeLocations}
        onSaveStargazeLocation={handleSaveStargazeLocation}
        onDeleteStargazeLocation={handleDeleteStargazeLocation}
        onNavigate={navigate}
      />
      );
      break;
    case "/settings":
      currentPage = (
      <SettingsPage
        mapType={mapType}
        isLight={isLight}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetSettings={handleResetSettings}
        onMapTypeChange={setMapType}
        onNavigate={navigate}
      />
      );
      break;
    default:
      currentPage = (
      <MapView
        ref={mapViewRef}
        location={location}
        locationStatus={locationStatus}
        mapType={mapType}
        setMapType={setMapType}
        isAuthenticated={mapIsAuthenticated}
        stargazeLocations={stargazeLocations}
        directionsProvider={settings.directionsProvider}
        showRecommendedSpots={settings.showRecommendedSpots}
        lightOverlayEnabled={settings.lightOverlayEnabled}
        onToggleLightOverlay={(next) =>
          handleUpdateSettings({ lightOverlayEnabled: next })
        }
        searchDistance={settings.searchDistance}
        onSearchDistanceChange={(next) =>
          handleUpdateSettings({ searchDistance: next })
        }
        autoCenterOnLocate={settings.autoCenterOnLocate}
      />
      );
  }

  return (
    <div className="app">
      <Navbar
        mapType={mapType}
        auth={auth}
        profile={profileSettings}
        isAdmin={isAdmin}
        onNavigate={navigate}
        currentRoute={currentRoute}
      />
      <Suspense fallback={null}>{currentPage}</Suspense>
      <PopupPortal />
    </div>
  );
}

export default App;
