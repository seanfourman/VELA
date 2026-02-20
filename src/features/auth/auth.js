import { getPasswordValidationError } from "@/utils/passwordRules";
import { createPasswordSalt, hashPassword } from "./authCrypto";
import {
  persistStoredSession,
  persistStoredUsers,
  readStoredSession,
  readStoredUsers,
} from "./authStorage";

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const createUserId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.round(Math.random() * 1000)}`;
};

const normalizeUser = (value) => {
  if (!value || typeof value !== "object") return null;
  const id =
    typeof value.id === "string" && value.id.trim() ? value.id.trim() : null;
  const email = normalizeEmail(value.email);
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

const serializeUser = (user) => {
  const normalized = normalizeUser(user);
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

const normalizeSession = (value) => {
  if (!value || typeof value !== "object") return null;
  const userId =
    typeof value.userId === "string" && value.userId.trim()
      ? value.userId.trim()
      : "";
  return userId ? { userId } : null;
};

const readUsers = () => readStoredUsers(normalizeUser);
const persistUsers = (users) => persistStoredUsers(users, serializeUser);
const readSession = () => readStoredSession(normalizeSession);

export const readAuthState = () => {
  const users = readUsers();
  const session = readSession();
  if (session && !users.some((entry) => entry.id === session.userId)) {
    persistAuthSession(null);
    return { users, session: null };
  }
  return { users, session };
};

export const persistAuthSession = (session) => {
  persistStoredSession(session, normalizeSession);
};

export const mapUserToAuthUser = (user) => {
  if (!user) return null;
  const fallbackName = user.email.split("@")[0] || "Explorer";
  return {
    sub: user.id,
    email: user.email,
    name: user.name || fallbackName,
    preferred_username: user.name || fallbackName,
    is_admin: user.is_admin !== false,
    roles: user.roles || ["admin"],
    groups: user.groups || ["admin"],
    auth_source: "local",
  };
};

export async function loginUser({ users, email, password, updateUsers }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = typeof password === "string" ? password : "";
  if (!normalizedEmail || !normalizedPassword) {
    throw new Error("Email and password are required.");
  }

  const existingUser = users.find((entry) => entry.email === normalizedEmail);
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
      const migratedUsers = users.map((entry) =>
        entry.id === existingUser.id
          ? {
              ...entry,
              passwordHash: migratedHash,
              passwordSalt: migratedSalt,
              legacyPassword: "",
            }
          : entry,
      );
      persistUsers(migratedUsers);
      updateUsers(migratedUsers);
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

export async function registerUser({ users, name, email, password, updateUsers }) {
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = typeof password === "string" ? password : "";

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error("Email and password are required.");
  }

  const passwordError = getPasswordValidationError(normalizedPassword);
  if (passwordError) throw new Error(passwordError);

  if (users.some((entry) => entry.email === normalizedEmail)) {
    throw new Error("An account with that email already exists.");
  }

  const passwordSalt = createPasswordSalt();
  const passwordHash = await hashPassword(normalizedPassword, passwordSalt);
  const nextUser = normalizeUser({
    id: createUserId(),
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

  const nextUsers = [...users, nextUser];
  persistUsers(nextUsers);
  updateUsers(nextUsers);
  return nextUser;
}
