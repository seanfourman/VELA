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
  const [route, setRoute] = useState(() =>
    normalizePath(window.location.pathname)
  );

  useEffect(() => {
    localStorage.setItem("mapType", mapType);
  }, [mapType]);

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
          onNavigate={navigate}
        />
      ) : (
        <MapView
          ref={mapViewRef}
          location={location}
          locationStatus={locationStatus}
          mapType={mapType}
          setMapType={setMapType}
        />
      )}
      <PopupPortal />
    </div>
  );
}

export default App;
