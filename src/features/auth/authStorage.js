const AUTH_SESSION_KEY = "vela:auth:session";
const SESSION_EXPIRY_SKEW_MS = 60 * 1000;

const readJsonFromStorage = (key, fallbackValue) => {
  if (typeof window === "undefined") return fallbackValue;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallbackValue;
  } catch {
    return fallbackValue;
  }
};

const writeJsonToStorage = (key, value) => {
  if (typeof window === "undefined") return;
  try {
    if (value === undefined || value === null) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
};

const isSessionExpired = (session) => {
  const expiresAt = Date.parse(String(session?.expiresAtUtc || ""));
  if (!Number.isFinite(expiresAt)) return false;
  return Date.now() >= expiresAt - SESSION_EXPIRY_SKEW_MS;
};

export const readStoredSession = (normalizeSession) =>
  normalizeSession(readJsonFromStorage(AUTH_SESSION_KEY, null));

export const persistStoredSession = (session, normalizeSession) => {
  if (!session) {
    writeJsonToStorage(AUTH_SESSION_KEY, null);
    return;
  }
  writeJsonToStorage(AUTH_SESSION_KEY, normalizeSession(session));
};

export const readStoredToken = () => {
  const session = readJsonFromStorage(AUTH_SESSION_KEY, null);
  if (!session || typeof session !== "object") return "";
  if (isSessionExpired(session)) {
    writeJsonToStorage(AUTH_SESSION_KEY, null);
    return "";
  }
  const token = typeof session.token === "string" ? session.token.trim() : "";
  return token;
};

export const clearStoredSession = () => {
  writeJsonToStorage(AUTH_SESSION_KEY, null);
};
