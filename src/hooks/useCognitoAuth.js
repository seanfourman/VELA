import { useCallback, useEffect, useMemo, useState } from "react";
import showPopup from "../utils/popup";
import {
  completeLoginFromRedirect,
  decodeJwtPayload,
  ensureValidSession,
  getStoredSession,
  isSessionValid,
  isCognitoConfigured,
  beginLogin,
  signOutToCognito,
} from "../utils/cognitoAuth";
import { getPasswordValidationError } from "../utils/passwordRules";

const LOCAL_AUTH_USERS_KEY = "vela:local:auth:users";
const LOCAL_AUTH_SESSION_KEY = "vela:local:auth:session";

const normalizeLocalEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const createLocalUserId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.round(Math.random() * 1000)}`;
};

const bytesToHex = (bytes) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

const createPasswordSalt = () => {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
  }
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
  return bytesToHex(bytes);
};

const fallbackHash = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `f-${Math.abs(hash).toString(16)}-${value.length}`;
};

const hashPassword = async (password, salt) => {
  const normalizedPassword = String(password || "");
  const normalizedSalt = String(salt || "");
  const payload = `${normalizedSalt}:${normalizedPassword}`;

  if (
    typeof crypto !== "undefined" &&
    crypto.subtle &&
    typeof TextEncoder !== "undefined"
  ) {
    const encoded = new TextEncoder().encode(payload);
    const digestBuffer = await crypto.subtle.digest("SHA-256", encoded);
    return bytesToHex(new Uint8Array(digestBuffer));
  }

  return fallbackHash(payload);
};

const readJsonFromStorage = (key, fallbackValue) => {
  if (typeof window === "undefined") return fallbackValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallbackValue;
    return JSON.parse(raw);
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
    // Ignore storage errors in local mode.
  }
};

const normalizeLocalUser = (value) => {
  if (!value || typeof value !== "object") return null;

  const id =
    typeof value.id === "string" && value.id.trim() ? value.id.trim() : null;
  const email = normalizeLocalEmail(value.email);
  const passwordHash =
    typeof value.passwordHash === "string" ? value.passwordHash : "";
  const passwordSalt =
    typeof value.passwordSalt === "string" ? value.passwordSalt : "";
  const legacyPassword =
    typeof value.password === "string" ? value.password : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";

  if (!id || !email || (!passwordHash && !legacyPassword)) return null;

  return {
    id,
    email,
    passwordHash,
    passwordSalt,
    legacyPassword,
    name,
    createdAt:
      typeof value.createdAt === "string" && value.createdAt
        ? value.createdAt
        : new Date().toISOString(),
    is_admin: value.is_admin !== false,
    roles: Array.isArray(value.roles) ? value.roles : ["admin"],
    groups: Array.isArray(value.groups) ? value.groups : ["admin"],
  };
};

const serializeLocalUser = (user) => {
  const normalized = normalizeLocalUser(user);
  if (!normalized) return null;
  return {
    id: normalized.id,
    email: normalized.email,
    name: normalized.name,
    createdAt: normalized.createdAt,
    is_admin: normalized.is_admin,
    roles: normalized.roles,
    groups: normalized.groups,
    passwordHash: normalized.passwordHash,
    passwordSalt: normalized.passwordSalt,
  };
};

const readLocalUsers = () => {
  const parsed = readJsonFromStorage(LOCAL_AUTH_USERS_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.map(normalizeLocalUser).filter(Boolean);
};

const persistLocalUsers = (users) => {
  const payload = Array.isArray(users)
    ? users.map(serializeLocalUser).filter(Boolean)
    : [];
  writeJsonToStorage(LOCAL_AUTH_USERS_KEY, payload);
};

const normalizeLocalSession = (value) => {
  if (!value || typeof value !== "object") return null;
  const userId =
    typeof value.userId === "string" && value.userId.trim()
      ? value.userId.trim()
      : "";
  if (!userId) return null;
  return { userId };
};

const readLocalSession = () =>
  normalizeLocalSession(readJsonFromStorage(LOCAL_AUTH_SESSION_KEY, null));

const readLocalAuthState = () => {
  const users = readLocalUsers();
  const session = readLocalSession();
  if (session && !users.some((entry) => entry.id === session.userId)) {
    persistLocalSession(null);
    return { users, session: null };
  }
  return { users, session };
};

const persistLocalSession = (session) => {
  if (!session) {
    writeJsonToStorage(LOCAL_AUTH_SESSION_KEY, null);
    return;
  }
  writeJsonToStorage(LOCAL_AUTH_SESSION_KEY, normalizeLocalSession(session));
};

const mapLocalUserToAuthUser = (localUser) => {
  if (!localUser) return null;
  const fallbackName = localUser.email.split("@")[0] || "Explorer";
  return {
    sub: localUser.id,
    email: localUser.email,
    name: localUser.name || fallbackName,
    preferred_username: localUser.name || fallbackName,
    is_admin: localUser.is_admin !== false,
    roles: localUser.roles || ["admin"],
    groups: localUser.groups || ["admin"],
    auth_source: "local",
  };
};

export function useCognitoAuth() {
  const localOnlyMode =
    String(import.meta.env.VITE_LOCAL_ONLY ?? "true").toLowerCase() !== "false";
  const [session, setSession] = useState(() =>
    localOnlyMode ? null : getStoredSession(),
  );
  const [localState, setLocalState] = useState(() =>
    localOnlyMode ? readLocalAuthState() : { users: [], session: null },
  );
  const [remoteLoading, setRemoteLoading] = useState(() => !localOnlyMode);
  const localUsers = localState.users;
  const localSession = localState.session;
  const isLoading = localOnlyMode ? false : remoteLoading;

  const updateLocalUsers = useCallback((users) => {
    setLocalState((prev) => ({ ...prev, users }));
  }, []);

  const updateLocalSession = useCallback((session) => {
    setLocalState((prev) => ({ ...prev, session }));
  }, []);

  useEffect(() => {
    if (localOnlyMode) return undefined;

    let cancelled = false;

    (async () => {
      setRemoteLoading(true);

      try {
        const result = await completeLoginFromRedirect();
        if (result?.status === "error" && result?.error) {
          showPopup(result.error, "failure", { duration: 7000 });
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Login failed. Please retry.";
        showPopup(message, "failure", { duration: 7000 });
      }

      const nextSession = await ensureValidSession();
      if (!cancelled) {
        setSession(nextSession);
        setRemoteLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [localOnlyMode]);

  const activeLocalUser = useMemo(() => {
    if (!localOnlyMode || !localSession?.userId) return null;
    return localUsers.find((entry) => entry.id === localSession.userId) || null;
  }, [localOnlyMode, localSession, localUsers]);

  const isAuthenticated = localOnlyMode
    ? Boolean(activeLocalUser)
    : isSessionValid(session);
  const user = localOnlyMode
    ? mapLocalUserToAuthUser(activeLocalUser)
    : decodeJwtPayload(session?.id_token);

  const signIn = useCallback(async () => {
    if (localOnlyMode) {
      showPopup(
        "Local mode uses the login/register page. Open Sign In to continue.",
        "info",
        {
          duration: 3500,
        },
      );
      return;
    }
    try {
      await beginLogin();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Login is unavailable.";
      showPopup(message, "failure", { duration: 4500 });
    }
  }, [localOnlyMode]);

  const signOut = useCallback(() => {
    if (localOnlyMode) {
      persistLocalSession(null);
      updateLocalSession(null);
      return;
    }
    try {
      if (!isCognitoConfigured()) return;
      signOutToCognito();
    } catch {
      // Ignore sign-out errors in local mode.
    }
  }, [localOnlyMode, updateLocalSession]);

  const login = useCallback(
    async ({ email, password } = {}) => {
      if (!localOnlyMode) {
        await signIn();
        return null;
      }

      const normalizedEmail = normalizeLocalEmail(email);
      const normalizedPassword = typeof password === "string" ? password : "";

      if (!normalizedEmail || !normalizedPassword) {
        throw new Error("Email and password are required.");
      }

      const existingUser = localUsers.find(
        (entry) => entry.email === normalizedEmail,
      );
      if (!existingUser) {
        throw new Error("Invalid email or password.");
      }

      let passwordMatches = false;
      let resolvedUser = existingUser;
      if (existingUser.passwordHash && existingUser.passwordSalt) {
        const hashedInput = await hashPassword(
          normalizedPassword,
          existingUser.passwordSalt,
        );
        passwordMatches = hashedInput === existingUser.passwordHash;
      } else if (existingUser.legacyPassword) {
        passwordMatches = existingUser.legacyPassword === normalizedPassword;
        if (passwordMatches) {
          const migratedSalt = createPasswordSalt();
          const migratedHash = await hashPassword(
            normalizedPassword,
            migratedSalt,
          );
          const migratedUsers = localUsers.map((entry) =>
            entry.id === existingUser.id
              ? {
                  ...entry,
                  passwordHash: migratedHash,
                  passwordSalt: migratedSalt,
                  legacyPassword: "",
                }
              : entry,
          );
          persistLocalUsers(migratedUsers);
          updateLocalUsers(migratedUsers);
          resolvedUser =
            migratedUsers.find((entry) => entry.id === existingUser.id) ||
            existingUser;
        }
      }

      if (!passwordMatches) {
        throw new Error("Invalid email or password.");
      }

      const nextSession = { userId: resolvedUser.id };
      persistLocalSession(nextSession);
      updateLocalSession(nextSession);
      return mapLocalUserToAuthUser(resolvedUser);
    },
    [localOnlyMode, localUsers, signIn, updateLocalSession, updateLocalUsers],
  );

  const register = useCallback(
    async ({ name, email, password } = {}) => {
      if (!localOnlyMode) {
        await signIn();
        return null;
      }

      const normalizedName = typeof name === "string" ? name.trim() : "";
      const normalizedEmail = normalizeLocalEmail(email);
      const normalizedPassword = typeof password === "string" ? password : "";

      if (!normalizedEmail || !normalizedPassword) {
        throw new Error("Email and password are required.");
      }
      const passwordError = getPasswordValidationError(normalizedPassword);
      if (passwordError) {
        throw new Error(passwordError);
      }
      if (localUsers.some((entry) => entry.email === normalizedEmail)) {
        throw new Error("An account with that email already exists.");
      }

      const passwordSalt = createPasswordSalt();
      const passwordHash = await hashPassword(normalizedPassword, passwordSalt);

      const nextUser = normalizeLocalUser({
        id: createLocalUserId(),
        email: normalizedEmail,
        passwordHash,
        passwordSalt,
        name: normalizedName,
        createdAt: new Date().toISOString(),
        is_admin: true,
        roles: ["admin"],
        groups: ["admin"],
      });
      if (!nextUser) {
        throw new Error("Unable to create local account.");
      }

      const nextUsers = [...localUsers, nextUser];
      persistLocalUsers(nextUsers);
      updateLocalUsers(nextUsers);

      const nextSession = { userId: nextUser.id };
      persistLocalSession(nextSession);
      updateLocalSession(nextSession);
      return mapLocalUserToAuthUser(nextUser);
    },
    [localOnlyMode, localUsers, signIn, updateLocalSession, updateLocalUsers],
  );

  return {
    session,
    user,
    isAuthenticated,
    isLoading,
    localOnlyMode,
    signIn,
    signOut,
    login,
    register,
  };
}

export default useCognitoAuth;
