import { readStoredToken } from "@/features/auth/authStorage";
import {
  buildStarPartyEventsUrl,
  buildStarPartyEventStatusUrl,
  buildStarPartyEventToggleRsvpUrl,
} from "./apiEndpoints";

const parseError = async (response, fallback = "Star party API error") => {
  const text = (await response.text().catch(() => "")).trim();
  return text || `${fallback}: ${response.status}`;
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
