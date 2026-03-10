import { readStoredToken } from "@/features/auth/authStorage";
import { buildAuthUrl } from "./apiEndpoints";

const getAuthHeaders = () => {
  const token = String(readStoredToken() || "").trim();
  if (!token) {
    throw new Error("Sign in is required for this action.");
  }

  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const parseError = async (response, fallback) => {
  const text = (await response.text().catch(() => "")).trim();
  return text || `${fallback} (${response.status})`;
};

const normalizeManagedUser = (value) => {
  if (!value || typeof value !== "object") return null;

  const id = String(value.id || "").trim();
  const email = String(value.email || "").trim().toLowerCase();
  if (!id || !email) return null;

  const name = String(value.name || "").trim();
  const displayName = String(value.displayName || "").trim();
  const role = String(value.role || "").trim().toLowerCase() || "user";
  const isAdmin = Boolean(
    value.isAdmin === true || value.is_admin === true || role === "admin",
  );

  return {
    id,
    email,
    name,
    displayName,
    avatarUrl: String(value.avatarUrl || "").trim(),
    bio: String(value.bio || "").trim(),
    role: isAdmin ? "admin" : "user",
    isAdmin,
    is_admin: isAdmin,
    createdAtUtc:
      typeof value.createdAtUtc === "string" ? value.createdAtUtc.trim() : "",
  };
};

const parseManagedUsersPayload = (payload) => {
  if (!Array.isArray(payload)) return [];
  return payload.map(normalizeManagedUser).filter(Boolean);
};

export async function fetchManagedUsers() {
  const response = await fetch(buildAuthUrl("admin/manage"), {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not load users"));
  }

  const data = await response.json().catch(() => []);
  return parseManagedUsersPayload(data);
}

export async function updateManagedUserAccess({ userId, isAdmin, role }) {
  const normalizedId = String(userId || "").trim();
  if (!normalizedId) {
    throw new Error("A user id is required.");
  }

  const normalizedRole = String(role || "").trim().toLowerCase() || (isAdmin ? "admin" : "user");
  const response = await fetch(buildAuthUrl(`admin/manage/${normalizedId}`), {
    method: "PATCH",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      is_admin: Boolean(isAdmin),
      role: normalizedRole,
    }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not update user access"));
  }

  const data = await response.json().catch(() => null);
  const normalizedUser = normalizeManagedUser(data);
  if (!normalizedUser) {
    throw new Error("User access updated, but the response was incomplete.");
  }

  return normalizedUser;
}
