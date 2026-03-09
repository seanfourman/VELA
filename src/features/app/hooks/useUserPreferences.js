import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_MAP_TYPE,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  PROFILE_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  loadProfileSettings,
  loadSettings,
  normalizeProfile,
  normalizeSettings,
} from "@/utils/appState";

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

export const useUserPreferences = () => {
  const [mapType, setMapType] = useState(() => readMapType());
  const [settings, setSettings] = useState(() => loadSettings());
  const [profileSettings, setProfileSettings] = useState(() =>
    loadProfileSettings(),
  );

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

  const handleSaveProfile = useCallback((nextProfile) => {
    const normalized = normalizeProfile(nextProfile);
    setProfileSettings(normalized);
    safeSetJson(PROFILE_STORAGE_KEY, normalized);
  }, []);

  const handleResetProfile = useCallback(() => {
    setProfileSettings({ ...DEFAULT_PROFILE });
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch {
      return;
    }
  }, []);

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
    profileSettings,
    handleSaveProfile,
    handleResetProfile,
    handleUpdateSettings,
    handleResetSettings,
  };
};
