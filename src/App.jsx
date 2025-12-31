import { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "./components/Navbar";
import MapView from "./pages/Map/MapView";
import ProfilePage from "./pages/Profile/ProfilePage";
import AdminPage from "./pages/Admin/AdminPage";
import SettingsPage from "./pages/Settings/SettingsPage";
import PopupPortal from "./components/PopupPortal";
import { useCognitoAuth } from "./hooks/useCognitoAuth";
import { showPopup } from "./utils/popup";
import { isProbablyHardwareAccelerated } from "./utils/hardwareUtils";
import stargazeSeed from "../data/stargazing_locations.json";
import "./App.css";

const PROFILE_STORAGE_KEY = "vela:profile:settings";
const STARGAZE_STORAGE_KEY = "vela:stargaze:locations";
const SETTINGS_STORAGE_KEY = "vela:settings";
const DEFAULT_MAP_TYPE = "satellite";
const SEARCH_DISTANCE_OPTIONS = [10, 25, 50, 100, 200, 250];
const DEFAULT_SETTINGS = {
  directionsProvider: "google",
  showRecommendedSpots: true,
  lightOverlayEnabled: false,
  autoCenterOnLocate: true,
  highAccuracyLocation: true,
  searchDistance: SEARCH_DISTANCE_OPTIONS[0],
};
const DEFAULT_PROFILE = {
  displayName: "",
  avatarUrl: "",
  bio: "",
};

const normalizeProfile = (value) => {
  const safe = value && typeof value === "object" ? value : {};
  return {
    displayName:
      typeof safe.displayName === "string" ? safe.displayName : "",
    avatarUrl: typeof safe.avatarUrl === "string" ? safe.avatarUrl : "",
    bio: typeof safe.bio === "string" ? safe.bio : "",
  };
};

const normalizeSettings = (value) => {
  const safe = value && typeof value === "object" ? value : {};
  const searchDistance = Number(safe.searchDistance);
  return {
    ...DEFAULT_SETTINGS,
    directionsProvider:
      safe.directionsProvider === "waze" ? "waze" : "google",
    showRecommendedSpots: safe.showRecommendedSpots !== false,
    lightOverlayEnabled: Boolean(safe.lightOverlayEnabled),
    autoCenterOnLocate: safe.autoCenterOnLocate !== false,
    highAccuracyLocation: safe.highAccuracyLocation !== false,
    searchDistance: SEARCH_DISTANCE_OPTIONS.includes(searchDistance)
      ? searchDistance
      : DEFAULT_SETTINGS.searchDistance,
  };
};

const createStargazeId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `spot-${Date.now()}-${Math.round(Math.random() * 1000)}`;
};

const normalizeImageList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeLinkList = (value) => normalizeImageList(value);

const isValidCoordinate = (value, min, max) =>
  Number.isFinite(value) && value >= min && value <= max;

const normalizeStargazeLocation = (value) => {
  if (!value || typeof value !== "object") return null;

  const name =
    typeof value.name === "string" ? value.name.trim() : "";
  const coordinates =
    value.coordinates && typeof value.coordinates === "object"
      ? value.coordinates
      : null;
  const lat = Number(
    value.lat ??
      value.latitude ??
      coordinates?.lat ??
      coordinates?.latitude
  );
  const lng = Number(
    value.lng ??
      value.lon ??
      value.longitude ??
      coordinates?.lng ??
      coordinates?.lon ??
      coordinates?.longitude
  );
  const description = normalizeText(value.description);
  const images = normalizeImageList(value.images);
  const photoLinks = normalizeLinkList(
    value.photo_urls ?? value.photoLinks ?? value.photos
  );
  const sourceLinks = normalizeLinkList(
    value.source_urls ?? value.sourceLinks ?? value.sources
  );
  const country = normalizeText(value.country);
  const region = normalizeText(value.region);
  const type = normalizeText(value.type);
  const bestTime = normalizeText(value.best_time ?? value.bestTime);

  if (!name) return null;
  if (!isValidCoordinate(lat, -90, 90) || !isValidCoordinate(lng, -180, 180)) {
    return null;
  }

  return {
    id:
      typeof value.id === "string" && value.id.trim()
        ? value.id.trim()
        : createStargazeId(),
    name,
    lat,
    lng,
    description,
    images,
    photoLinks,
    sourceLinks,
    country,
    region,
    type,
    bestTime,
  };
};

const normalizeStargazePayload = (payload) => {
  const locations = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.locations)
      ? payload.locations
      : [];
  return locations.map(normalizeStargazeLocation).filter(Boolean);
};

const STARGAZE_SEED_LOCATIONS = normalizeStargazePayload(stargazeSeed);

const loadProfileSettings = () => {
  if (typeof window === "undefined") return { ...DEFAULT_PROFILE };
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...normalizeProfile(parsed) };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
};

const loadSettings = () => {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return normalizeSettings(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

const loadStargazeLocations = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STARGAZE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizeStargazePayload(parsed);
  } catch {
    return [];
  }
};

const mergeStargazeLocations = (seed, local) => {
  const merged = new Map();
  (Array.isArray(seed) ? seed : []).forEach((item) => {
    merged.set(item.id, item);
  });
  (Array.isArray(local) ? local : []).forEach((item) => {
    merged.set(item.id, item);
  });
  return Array.from(merged.values());
};

const normalizePath = (path = "/") => {
  const cleaned = String(path).replace(/\/+$/, "");
  return cleaned === "" ? "/" : cleaned;
};

const normalizeRoleList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

const isAdminUser = (user) => {
  if (!user) return false;
  if (user.is_admin === true || user.isAdmin === true) return true;

  const groups = normalizeRoleList(user["cognito:groups"]);
  const roles = normalizeRoleList(user.roles || user.role || user.groups);
  const allRoles = [...groups, ...roles].map((role) =>
    String(role).toLowerCase()
  );
  return allRoles.includes("admin") || allRoles.includes("administrator");
};

function App() {
  const auth = useCognitoAuth();
  const mapViewRef = useRef(null);
  const transitionTimeoutRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState(() =>
    navigator.geolocation ? "searching" : "off"
  );
  const [mapType, setMapType] = useState(() => {
    return localStorage.getItem("mapType") || DEFAULT_MAP_TYPE;
  });
  const [settings, setSettings] = useState(() => loadSettings());
  const [profileSettings, setProfileSettings] = useState(() =>
    loadProfileSettings()
  );
  const [stargazeLocations, setStargazeLocations] = useState(() =>
    mergeStargazeLocations(STARGAZE_SEED_LOCATIONS, loadStargazeLocations())
  );
  const [route, setRoute] = useState(() =>
    normalizePath(window.location.pathname)
  );

  useEffect(() => {
    localStorage.setItem("mapType", mapType);
  }, [mapType]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage unavailable; ignore
    }
  }, [settings]);

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
      }
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
        { duration: 6000 }
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

      const shouldZoomOut =
        normalizePath(route) === "/" &&
        ["/profile", "/settings", "/admin"].includes(nextPath);

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
    [route]
  );

  const handleSaveProfile = useCallback((nextProfile) => {
    const normalized = normalizeProfile(nextProfile);
    setProfileSettings(normalized);
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalized));
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

  const persistStargazeLocations = useCallback((next) => {
    try {
      localStorage.setItem(STARGAZE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable; ignore
    }
  }, []);

  const handleSaveStargazeLocation = useCallback(
    (location) => {
      const normalized = normalizeStargazeLocation(location);
      if (!normalized) return;

      setStargazeLocations((prev) => {
        const exists = prev.some((item) => item.id === normalized.id);
        const next = exists
          ? prev.map((item) => (item.id === normalized.id ? normalized : item))
          : [...prev, normalized];
        persistStargazeLocations(next);
        return next;
      });
    },
    [persistStargazeLocations]
  );

  const handleDeleteStargazeLocation = useCallback(
    (id) => {
      setStargazeLocations((prev) => {
        const next = prev.filter((item) => item.id !== id);
        persistStargazeLocations(next);
        return next;
      });
    },
    [persistStargazeLocations]
  );

  const isAdmin = isAdminUser(auth?.user);
  const isLight = mapType === "light";
  const currentRoute = normalizePath(route);

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
      {currentRoute === "/profile" ? (
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
      ) : currentRoute === "/admin" ? (
        <AdminPage
          auth={auth}
          isAdmin={isAdmin}
          isLight={isLight}
          stargazeLocations={stargazeLocations}
          onSaveStargazeLocation={handleSaveStargazeLocation}
          onDeleteStargazeLocation={handleDeleteStargazeLocation}
          onNavigate={navigate}
        />
      ) : currentRoute === "/settings" ? (
        <SettingsPage
          mapType={mapType}
          isLight={isLight}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onResetSettings={handleResetSettings}
          onMapTypeChange={setMapType}
          onNavigate={navigate}
        />
      ) : (
        <MapView
          ref={mapViewRef}
          location={location}
          locationStatus={locationStatus}
          mapType={mapType}
          setMapType={setMapType}
          isAuthenticated={auth?.isAuthenticated}
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
      )}
      <PopupPortal />
    </div>
  );
}

export default App;
