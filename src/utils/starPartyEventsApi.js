import { readStoredToken } from "@/features/auth/authStorage";
import {
  buildStarPartyEventsUrl,
  buildStarPartyEventStatusUrl,
  buildStarPartyEventToggleRsvpUrl,
} from "./apiEndpoints";

const parseError = async (response, fallback = "Star party API error") => {
  const contentType = String(response.headers.get("content-type") || "");
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    const message = extractErrorMessage(payload);
    if (message) return message;
  }

  const text = (await response.text().catch(() => "")).trim();
  return text || `${fallback}: ${response.status}`;
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
    if (messages.length) {
      const hasEndsAtParseError = messages.some((message) =>
        message.toLowerCase().includes("$.endsat")
      );
      const filtered = hasEndsAtParseError
        ? messages.filter(
            (message) =>
              !message.toLowerCase().includes("the request field is required")
          )
        : messages;

      if (
        filtered.some((message) =>
          message.toLowerCase().includes("could not be converted")
        )
      ) {
        return "End date is invalid. Leave it empty or choose a valid date.";
      }

      if (filtered.length) return filtered.join(" ");
    }
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

const parseEventsPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.events)) return payload.events;
  return [];
};

export async function fetchStarPartyEvents() {
  const response = await fetch(buildStarPartyEventsUrl(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not load events"));
  }

  const data = await response.json().catch(() => []);
  return parseEventsPayload(data);
}

export async function saveStarPartyEvent({ event }) {
  const response = await fetch(buildStarPartyEventsUrl(), {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event || {}),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not save event"));
  }

  return response.json().catch(() => null);
}

export async function deleteStarPartyEvent({ eventId }) {
  const normalizedId = String(eventId || "").trim();
  if (!normalizedId) return;

  const response = await fetch(buildStarPartyEventsUrl(normalizedId), {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (response.status === 404) return;
  if (!response.ok) {
    throw new Error(await parseError(response, "Could not delete event"));
  }
}

export async function setStarPartyEventStatus({ eventId, status }) {
  const normalizedId = String(eventId || "").trim();
  const normalizedStatus = String(status || "").trim();
  if (!normalizedId || !normalizedStatus) return null;

  const response = await fetch(buildStarPartyEventStatusUrl(normalizedId), {
    method: "PATCH",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: normalizedStatus }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not update event status"));
  }

  return response.json().catch(() => null);
}

export async function toggleStarPartyRsvp({ eventId }) {
  const normalizedId = String(eventId || "").trim();
  if (!normalizedId) return null;

  const response = await fetch(buildStarPartyEventToggleRsvpUrl(normalizedId), {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not toggle RSVP"));
  }

  return response.json().catch(() => null);
}
