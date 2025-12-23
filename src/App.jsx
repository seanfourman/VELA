import { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "./components/Navbar";
import MapView from "./components/MapView";
import ProfilePage from "./components/ProfilePage";
import AdminPage from "./components/AdminPage";
import PopupPortal from "./components/PopupPortal";
import { useCognitoAuth } from "./hooks/useCognitoAuth";
import { showPopup } from "./utils/popup";
import { isProbablyHardwareAccelerated } from "./utils/hardwareUtils";
import "./App.css";

const PROFILE_STORAGE_KEY = "vela:profile:settings";
const STARGAZE_STORAGE_KEY = "vela:stargaze:locations";
const STARGAZE_DATA_URL = "/data/stargazing-spots.json";
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

const isValidCoordinate = (value, min, max) =>
  Number.isFinite(value) && value >= min && value <= max;

const normalizeStargazeLocation = (value) => {
  if (!value || typeof value !== "object") return null;

  const name =
    typeof value.name === "string" ? value.name.trim() : "";
  const lat = Number(value.lat);
  const lng = Number(value.lng);
  const description =
    typeof value.description === "string" ? value.description.trim() : "";
  const images = normalizeImageList(value.images);

  if (!name) return null;
  if (!isValidCoordinate(lat, -90, 90) || !isValidCoordinate(lng, -180, 180)) {
    return null;
  }

  return {
    id: typeof value.id === "string" ? value.id : createStargazeId(),
    name,
    lat,
    lng,
    description,
    images,
  };
};

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

const loadStargazeLocations = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STARGAZE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeStargazeLocation).filter(Boolean);
  } catch {
    return [];
  }
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
    return localStorage.getItem("mapType") || "satellite";
  });
  const [profileSettings, setProfileSettings] = useState(() =>
    loadProfileSettings()
  );
  const [stargazeLocations, setStargazeLocations] = useState(() =>
    loadStargazeLocations()
  );
  const [route, setRoute] = useState(() =>
    normalizePath(window.location.pathname)
  );

  useEffect(() => {
    localStorage.setItem("mapType", mapType);
  }, [mapType]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STARGAZE_STORAGE_KEY)) return;
    let isActive = true;

    const loadSeedLocations = async () => {
      try {
        const response = await fetch(STARGAZE_DATA_URL);
        if (!response.ok) return;
        const payload = await response.json();
        if (!Array.isArray(payload) || !isActive) return;
        const normalized = payload
          .map(normalizeStargazeLocation)
          .filter(Boolean);
        if (normalized.length === 0) return;
        setStargazeLocations(normalized);
      } catch {
        // Seed data unavailable; ignore.
      }
    };

    loadSeedLocations();

    return () => {
      isActive = false;
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
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

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

      if (nextPath === "/profile" && normalizePath(route) === "/") {
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
      ) : (
        <MapView
          ref={mapViewRef}
          location={location}
          locationStatus={locationStatus}
          mapType={mapType}
          setMapType={setMapType}
          isAuthenticated={auth?.isAuthenticated}
          stargazeLocations={stargazeLocations}
        />
      )}
      <PopupPortal />
    </div>
  );
}

export default App;
