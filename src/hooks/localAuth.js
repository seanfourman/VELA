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
  const payload = `${String(salt || "")}:${String(password || "")}`;
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
  return userId ? { userId } : null;
};

const readLocalSession = () =>
  normalizeLocalSession(readJsonFromStorage(LOCAL_AUTH_SESSION_KEY, null));

export const readLocalAuthState = () => {
  const users = readLocalUsers();
  const session = readLocalSession();
  if (session && !users.some((entry) => entry.id === session.userId)) {
    persistLocalSession(null);
    return { users, session: null };
  }
  return { users, session };
};

export const persistLocalSession = (session) => {
  if (!session) {
    writeJsonToStorage(LOCAL_AUTH_SESSION_KEY, null);
    return;
  }
  writeJsonToStorage(LOCAL_AUTH_SESSION_KEY, normalizeLocalSession(session));
};

export const mapLocalUserToAuthUser = (localUser) => {
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

export async function loginLocalUser({
  localUsers,
  email,
  password,
  updateLocalUsers,
}) {
  const normalizedEmail = normalizeLocalEmail(email);
  const normalizedPassword = typeof password === "string" ? password : "";
  if (!normalizedEmail || !normalizedPassword) {
    throw new Error("Email and password are required.");
  }

  const existingUser = localUsers.find((entry) => entry.email === normalizedEmail);
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
      const migratedHash = await hashPassword(normalizedPassword, migratedSalt);
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

  return resolvedUser;
}

export async function registerLocalUser({
  localUsers,
  name,
  email,
  password,
  updateLocalUsers,
}) {
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail = normalizeLocalEmail(email);
  const normalizedPassword = typeof password === "string" ? password : "";

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error("Email and password are required.");
  }

  const passwordError = getPasswordValidationError(normalizedPassword);
  if (passwordError) throw new Error(passwordError);

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
  return nextUser;
}
