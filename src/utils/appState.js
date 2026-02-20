export const PROFILE_STORAGE_KEY = "vela:profile:settings";
export const SETTINGS_STORAGE_KEY = "vela:settings";
export const DEFAULT_MAP_TYPE = "satellite";
export const SEARCH_DISTANCE_OPTIONS = [10, 25, 50, 75, 100];
export const DEFAULT_SETTINGS = {
  directionsProvider: "google",
  showRecommendedSpots: true,
  lightOverlayEnabled: true,
  autoCenterOnLocate: true,
  highAccuracyLocation: true,
  searchDistance: SEARCH_DISTANCE_OPTIONS[0],
};
export const DEFAULT_PROFILE = {
  displayName: "",
  avatarUrl: "",
  bio: "",
};
export const LOCAL_ONLY_MODE =
  String(import.meta.env.VITE_LOCAL_ONLY ?? "true").toLowerCase() !== "false";

export const normalizeProfile = (value) => {
  const safe = value && typeof value === "object" ? value : {};
  return {
    displayName: typeof safe.displayName === "string" ? safe.displayName : "",
    avatarUrl: typeof safe.avatarUrl === "string" ? safe.avatarUrl : "",
    bio: typeof safe.bio === "string" ? safe.bio : "",
  };
};

export const normalizeSettings = (value) => {
  const safe = value && typeof value === "object" ? value : {};
  const searchDistance = Number(safe.searchDistance);
  return {
    ...DEFAULT_SETTINGS,
    directionsProvider: safe.directionsProvider === "waze" ? "waze" : "google",
    showRecommendedSpots: safe.showRecommendedSpots !== false,
    lightOverlayEnabled:
      safe.lightOverlayEnabled === undefined
        ? DEFAULT_SETTINGS.lightOverlayEnabled
        : Boolean(safe.lightOverlayEnabled),
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

const unwrapDdbValue = (value) => {
  if (!value || typeof value !== "object") return value;
  if (Object.prototype.hasOwnProperty.call(value, "S")) return value.S;
  if (Object.prototype.hasOwnProperty.call(value, "N")) return value.N;
  if (Object.prototype.hasOwnProperty.call(value, "BOOL")) return value.BOOL;
  if (Object.prototype.hasOwnProperty.call(value, "NULL")) return null;
  if (Object.prototype.hasOwnProperty.call(value, "SS")) return value.SS;
  if (Object.prototype.hasOwnProperty.call(value, "NS")) return value.NS;
  if (Object.prototype.hasOwnProperty.call(value, "L")) {
    return Array.isArray(value.L) ? value.L.map(unwrapDdbValue) : [];
  }
  if (Object.prototype.hasOwnProperty.call(value, "M")) {
    const mapped = {};
    Object.entries(value.M || {}).forEach(([key, entry]) => {
      mapped[key] = unwrapDdbValue(entry);
    });
    return mapped;
  }
  return value;
};

const normalizeLinkList = (value) => normalizeImageList(value);

const isValidCoordinate = (value, min, max) =>
  Number.isFinite(value) && value >= min && value <= max;

export const normalizeStargazeLocation = (value) => {
  if (!value || typeof value !== "object") return null;
  const top = unwrapDdbValue(value);
  const raw = unwrapDdbValue(top?.data ?? top);

  const name = typeof raw?.name === "string" ? raw.name.trim() : "";
  const coordinates =
    raw?.coordinates && typeof raw.coordinates === "object"
      ? raw.coordinates
      : null;
  const coordArray =
    Array.isArray(coordinates) && coordinates.length >= 2
      ? { lat: coordinates[0], lon: coordinates[1] }
      : null;
  const lat = Number(
    raw?.lat ??
      raw?.latitude ??
      coordinates?.lat ??
      coordinates?.latitude ??
      coordArray?.lat
  );
  const lng = Number(
    raw?.lng ??
      raw?.lon ??
      raw?.longitude ??
      coordinates?.lng ??
      coordinates?.lon ??
      coordinates?.longitude ??
      coordArray?.lon
  );
  const description = normalizeText(raw?.description);
  const images = normalizeImageList(raw?.images);
  const photoLinks = normalizeLinkList(
    raw?.photo_urls ?? raw?.photoLinks ?? raw?.photos
  );
  const sourceLinks = normalizeLinkList(
    raw?.source_urls ?? raw?.sourceLinks ?? raw?.sources
  );
  const country = normalizeText(raw?.country);
  const region = normalizeText(raw?.region);
  const type = normalizeText(raw?.type);
  const bestTime = normalizeText(raw?.best_time ?? raw?.bestTime);
  const fallbackId = normalizeText(top?.spotId ?? top?.id);

  if (!name) return null;
  if (!isValidCoordinate(lat, -90, 90) || !isValidCoordinate(lng, -180, 180)) {
    return null;
  }

  return {
    id:
      typeof raw?.id === "string" && raw.id.trim()
        ? raw.id.trim()
        : fallbackId || createStargazeId(),
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

export const normalizeStargazePayload = (payload) => {
  const locations = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.locations)
    ? payload.locations
    : [];
  return locations.map(normalizeStargazeLocation).filter(Boolean);
};

export const loadProfileSettings = () => {
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

export const loadSettings = () => {
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

export const normalizePath = (path = "/") => {
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

export const isAdminUser = (user) => {
  if (!user) return false;
  if (user.is_admin === true || user.isAdmin === true) return true;

  const groups = normalizeRoleList(user["cognito:groups"]);
  const roles = normalizeRoleList(user.roles || user.role || user.groups);
  const allRoles = [...groups, ...roles].map((role) =>
    String(role).toLowerCase()
  );
  return allRoles.includes("admin") || allRoles.includes("administrator");
};
