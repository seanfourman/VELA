import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_MAP_TYPE,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  loadSettings,
  normalizeProfile,
  normalizeSettings,
} from "@/utils/appState";
import { fetchUserProfile, saveUserProfile } from "@/utils/profileApi";

const safeSetJson = (key, value) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
};

const readMapType = () => {
  if (typeof window === "undefined") return DEFAULT_MAP_TYPE;
  try {
    return localStorage.getItem("mapType") || DEFAULT_MAP_TYPE;
  } catch {
    return DEFAULT_MAP_TYPE;
  }
};

export const useUserPreferences = ({ auth }) => {
  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const userId = String(auth?.user?.id || auth?.user?.sub || "").trim();
  const [mapType, setMapType] = useState(() => readMapType());
  const [settings, setSettings] = useState(() => loadSettings());
  const [profileSettings, setProfileSettings] = useState(() => ({ ...DEFAULT_PROFILE }));

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("mapType", mapType);
    } catch {
      return;
    }
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
    if (!isAuthenticated || !userId) return;

    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchUserProfile();
        if (cancelled) return;
        setProfileSettings({ ...DEFAULT_PROFILE, ...normalizeProfile(profile) });
      } catch {
        if (cancelled) return;
        setProfileSettings({ ...DEFAULT_PROFILE });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId]);

  const handleSaveProfile = useCallback(async (nextProfile) => {
    const normalized = normalizeProfile(nextProfile);
    if (!isAuthenticated || !userId) {
      setProfileSettings(normalized);
      return normalized;
    }

    const saved = await saveUserProfile(normalized);
    const resolved = { ...DEFAULT_PROFILE, ...normalizeProfile(saved) };
    setProfileSettings(resolved);
    return resolved;
  }, [isAuthenticated, userId]);

  const handleResetProfile = useCallback(async () => {
    const cleared = { ...DEFAULT_PROFILE };
    if (!isAuthenticated || !userId) {
      setProfileSettings(cleared);
      return cleared;
    }

    const saved = await saveUserProfile(cleared);
    const resolved = { ...DEFAULT_PROFILE, ...normalizeProfile(saved) };
    setProfileSettings(resolved);
    return resolved;
  }, [isAuthenticated, userId]);

  const handleUpdateSettings = useCallback((patch) => {
    setSettings((prev) => normalizeSettings({ ...prev, ...patch }));
  }, []);

  const handleResetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
    setMapType(DEFAULT_MAP_TYPE);
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
      localStorage.removeItem("mapType");
    } catch {
      return;
    }
  }, []);

  return {
    mapType,
    setMapType,
    settings,
    profileSettings: isAuthenticated ? profileSettings : DEFAULT_PROFILE,
    handleSaveProfile,
    handleResetProfile,
    handleUpdateSettings,
    handleResetSettings,
  };
};
