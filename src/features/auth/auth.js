import { buildAuthUrl } from "@/utils/apiEndpoints";
import { persistStoredSession, readStoredSession } from "./authStorage";

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeUser = (value) => {
  if (!value || typeof value !== "object") return null;
  const id = String(value.id ?? "").trim();
  const email = normalizeEmail(value.email);
  if (!id || !email) return null;

  const name =
    String(value.name ?? value.preferred_username ?? email.split("@")[0]).trim() ||
    "Explorer";
  const role = String(value.role || "").trim().toLowerCase();
  const isAdmin = Boolean(value.isAdmin === true || value.is_admin === true || role === "admin");
  const normalizedRole = isAdmin ? "admin" : "user";

  return {
    sub: id,
    id,
    email,
    name,
    preferred_username: name,
    is_admin: isAdmin,
    role: normalizedRole,
    roles: [normalizedRole],
    groups: [normalizedRole],
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

const extractErrorMessage = (value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || "";
  }
  if (!value || typeof value !== "object") return "";

  if (Array.isArray(value.errors)) {
    const joined = value.errors
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)
      .join(" ");
    if (joined) return joined;
  }

  if (value.errors && typeof value.errors === "object") {
    const messages = Object.values(value.errors)
      .flatMap((entry) => (Array.isArray(entry) ? entry : [entry]))
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    if (messages.length) return messages.join(" ");
  }

  if (typeof value.detail === "string" && value.detail.trim()) {
    return value.detail.trim();
  }
  if (typeof value.message === "string" && value.message.trim()) {
    return value.message.trim();
  }
  if (typeof value.title === "string" && value.title.trim()) {
    return value.title.trim();
  }

  return "";
};

const parseApiError = async (response, fallbackMessage) => {
  const contentType = String(response.headers.get("content-type") || "");
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    const jsonMessage = extractErrorMessage(payload);
    if (jsonMessage) return jsonMessage;
  }

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
  return { session: session || null };
};

export const persistAuthSession = (session) => {
  persistStoredSession(session, normalizeSession);
};

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
