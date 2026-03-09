import { readStoredToken } from "@/features/auth/authStorage";
import { buildAuthUrl } from "./apiEndpoints";

const getAuthHeaders = () => {
  const token = String(readStoredToken() || "").trim();
  if (!token) {
    throw new Error("Sign in is required.");
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

const normalizeProfile = (value) => {
  const safe = value && typeof value === "object" ? value : {};
  return {
    displayName:
      typeof safe.displayName === "string" ? safe.displayName.trim() : "",
    avatarUrl: typeof safe.avatarUrl === "string" ? safe.avatarUrl.trim() : "",
    bio: typeof safe.bio === "string" ? safe.bio.trim() : "",
  };
};

export async function fetchUserProfile() {
  const response = await fetch(buildAuthUrl("profile"), {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not load profile"));
  }

  const data = await response.json().catch(() => null);
  return normalizeProfile(data);
}

export async function saveUserProfile(profile) {
  const response = await fetch(buildAuthUrl("profile"), {
    method: "PUT",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(normalizeProfile(profile)),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not save profile"));
  }

  const data = await response.json().catch(() => null);
  return normalizeProfile(data);
}
