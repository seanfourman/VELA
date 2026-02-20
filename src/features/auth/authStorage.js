const AUTH_USERS_KEY = "vela:local:auth:users";
const AUTH_SESSION_KEY = "vela:local:auth:session";

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

export const readStoredUsers = (normalizeUser) => {
  const parsed = readJsonFromStorage(AUTH_USERS_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeUser).filter(Boolean);
};

export const persistStoredUsers = (users, serializeUser) => {
  const payload = Array.isArray(users)
    ? users.map(serializeUser).filter(Boolean)
    : [];
  writeJsonToStorage(AUTH_USERS_KEY, payload);
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
