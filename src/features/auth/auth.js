import { buildAuthUrl } from "@/utils/apiEndpoints";
import { persistStoredSession, readStoredSession } from "./authStorage";

const SESSION_EXPIRY_SKEW_MS = 60 * 1000;

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeRoleList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    return value
      .split(/[,\s]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeUser = (value) => {
  if (!value || typeof value !== "object") return null;
  const id = String(value.id ?? value.sub ?? "").trim();
  const email = normalizeEmail(value.email);
  if (!id || !email) return null;

  const name =
    String(
      value.name ?? value.preferred_username ?? value.given_name ?? email.split("@")[0]
    ).trim() || "Explorer";
  const rawRoles = normalizeRoleList(value.roles || value.role || value.groups);
  const hasAdminRole = rawRoles.some((role) =>
    ["admin", "administrator"].includes(String(role).toLowerCase())
  );
  const isAdmin = Boolean(value.is_admin === true || value.isAdmin === true || hasAdminRole);

  return {
    sub: id,
    id,
    email,
    name,
    preferred_username: name,
    is_admin: isAdmin,
    role: isAdmin ? "admin" : "user",
    roles: isAdmin ? ["admin"] : ["user"],
    groups: isAdmin ? ["admin"] : ["user"],
    auth_source: "server",
  };
};

const normalizeSession = (value) => {
  if (!value || typeof value !== "object") return null;
  const token = String(value.token || "").trim();
  if (!token) return null;
  const expiresAtUtc =
    typeof value.expiresAtUtc === "string" && value.expiresAtUtc.trim()
      ? value.expiresAtUtc
      : "";
  const user = normalizeUser(value.user);
  return {
    token,
    expiresAtUtc,
    user,
  };
};

const isExpired = (session) => {
  const expiresAt = Date.parse(String(session?.expiresAtUtc || ""));
  if (!Number.isFinite(expiresAt)) return false;
  return Date.now() >= expiresAt - SESSION_EXPIRY_SKEW_MS;
};

const parseApiError = async (response, fallbackMessage) => {
  const text = (await response.text().catch(() => "")).trim();
  if (text) return text;
  return `${fallbackMessage} (${response.status})`;
};

const requestAuth = async ({ endpoint, payload }) => {
  const response = await fetch(buildAuthUrl(endpoint), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Authentication failed"));
  }

  const data = await response.json().catch(() => null);
  const session = normalizeSession(data);
  if (!session || !session.user) {
    throw new Error("Authentication response is missing session data.");
  }

  return session;
};

export const readAuthState = () => {
  const session = readStoredSession(normalizeSession);
  if (!session || isExpired(session)) {
    persistAuthSession(null);
    return { session: null };
  }
  return { session };
};

export const persistAuthSession = (session) => {
  persistStoredSession(session, normalizeSession);
};

export const mapUserToAuthUser = (user) => normalizeUser(user);

export async function loginUser({ email, password }) {
  return requestAuth({
    endpoint: "login",
    payload: { email: normalizeEmail(email), password: String(password || "") },
  });
}

export async function registerUser({ name, email, password }) {
  return requestAuth({
    endpoint: "register",
    payload: {
      name: String(name || "").trim(),
      email: normalizeEmail(email),
      password: String(password || ""),
    },
  });
}

export async function fetchSessionUser(token) {
  const response = await fetch(buildAuthUrl("me"), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response, "Could not validate session"));
  }

  const data = await response.json().catch(() => null);
  return normalizeUser(data);
}
