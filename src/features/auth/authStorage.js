const AUTH_SESSION_KEY = "vela:auth:session";

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
  const token = typeof session.token === "string" ? session.token.trim() : "";
  return token;
};
