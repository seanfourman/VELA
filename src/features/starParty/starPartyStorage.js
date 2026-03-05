const STAR_PARTY_STORAGE_KEY = "vela:star-party:events";

const EVENT_TYPES = new Set(["party", "special_event"]);
const EVENT_STATUSES = new Set(["published", "draft", "cancelled"]);

const cleanText = (value) => (typeof value === "string" ? value.trim() : "");

const parseNumber = (value) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

const toIsoDateTime = (value) => {
  const raw = cleanText(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
};

const normalizeChecklist = (value) => {
  if (!value) return [];
  const list = Array.isArray(value)
    ? value
    : String(value)
        .split(/[\n,]+/)
        .map((entry) => entry.trim())
        .filter(Boolean);

  const deduped = [];
  const seen = new Set();
  list.forEach((item) => {
    const label = cleanText(item);
    if (!label) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(label);
  });
  return deduped;
};

const normalizeEventType = (value) => {
  const key = cleanText(value).toLowerCase();
  return EVENT_TYPES.has(key) ? key : "party";
};

const normalizeEventStatus = (value) => {
  const key = cleanText(value).toLowerCase();
  return EVENT_STATUSES.has(key) ? key : "draft";
};

const getRsvpUserId = (user) => {
  if (!user || typeof user !== "object") return "";
  const candidates = [user.sub, user.id, user.userId, user.email];
  for (const candidate of candidates) {
    const normalized = cleanText(candidate);
    if (normalized) return normalized.toLowerCase();
  }
  return "";
};

const normalizeRsvpUser = (user) => {
  const userId = getRsvpUserId(user);
  if (!userId) return null;
  return {
    userId,
    name: cleanText(user?.name || user?.preferred_username) || "Explorer",
    email: cleanText(user?.email),
  };
};

const normalizeRsvps = (value) => {
  if (!Array.isArray(value)) return [];
  const list = [];
  const seen = new Set();
  value.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const userId = cleanText(item.userId).toLowerCase();
    if (!userId || seen.has(userId)) return;
    seen.add(userId);
    list.push({
      userId,
      name: cleanText(item.name) || "Explorer",
      email: cleanText(item.email),
      joinedAt: toIsoDateTime(item.joinedAt) || new Date().toISOString(),
    });
  });
  return list;
};

const createEventId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `event-${crypto.randomUUID()}`;
  }
  return `event-${Date.now()}-${Math.round(Math.random() * 100000)}`;
};

const sortByStartTime = (events) =>
  [...events].sort((a, b) => {
    const aStart = new Date(a.startsAt || a.createdAt || 0).getTime();
    const bStart = new Date(b.startsAt || b.createdAt || 0).getTime();
    if (aStart !== bStart) return aStart - bStart;
    return String(a.title).localeCompare(String(b.title));
  });

const normalizeHost = (value) => {
  if (!value || typeof value !== "object") return null;
  const id = cleanText(value.id).toLowerCase();
  const name = cleanText(value.name);
  const email = cleanText(value.email);
  if (!id && !name && !email) return null;
  return {
    id: id || "",
    name: name || "Admin",
    email,
  };
};

const normalizeEvent = (value) => {
  if (!value || typeof value !== "object") return null;

  const title = cleanText(value.title || value.name);
  const lat = parseNumber(value.lat ?? value.latitude ?? value.coordinates?.lat);
  const lng = parseNumber(
    value.lng ??
      value.lon ??
      value.longitude ??
      value.coordinates?.lng ??
      value.coordinates?.lon
  );

  if (!title) return null;
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null;

  const startsAt = toIsoDateTime(value.startsAt || value.startAt || value.start_at);
  if (!startsAt) return null;

  const endsAt = toIsoDateTime(value.endsAt || value.endAt || value.end_at);
  const createdAt = toIsoDateTime(value.createdAt || value.created_at);
  const updatedAt = toIsoDateTime(value.updatedAt || value.updated_at);

  return {
    id: cleanText(value.id) || createEventId(),
    title,
    eventType: normalizeEventType(value.eventType || value.type),
    status: normalizeEventStatus(value.status),
    lat,
    lng,
    startsAt,
    endsAt,
    description: cleanText(value.description),
    meetupDetails: cleanText(value.meetupDetails || value.meetup_details),
    hostChecklist: normalizeChecklist(value.hostChecklist || value.checklist),
    host: normalizeHost(value.host),
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: updatedAt || new Date().toISOString(),
    rsvps: normalizeRsvps(value.rsvps),
  };
};

const normalizeEventList = (value) => {
  if (!Array.isArray(value)) return [];
  return sortByStartTime(value.map(normalizeEvent).filter(Boolean));
};

const readEventsFromStorage = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STAR_PARTY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizeEventList(parsed);
  } catch {
    return [];
  }
};

const writeEventsToStorage = (events) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STAR_PARTY_STORAGE_KEY,
      JSON.stringify(normalizeEventList(events))
    );
  } catch {
    return;
  }
};

const saveEvent = ({ events, draft, host }) => {
  const normalized = normalizeEvent({
    ...draft,
    host,
    updatedAt: new Date().toISOString(),
  });
  if (!normalized) return { events: normalizeEventList(events), savedEvent: null };

  const next = Array.isArray(events) ? [...events] : [];
  const existingIndex = next.findIndex((event) => event.id === normalized.id);
  if (existingIndex >= 0) {
    normalized.createdAt = next[existingIndex]?.createdAt || normalized.createdAt;
    normalized.rsvps = next[existingIndex]?.rsvps || normalized.rsvps;
    next.splice(existingIndex, 1, normalized);
  } else {
    next.push(normalized);
  }
  const sorted = sortByStartTime(next);
  return { events: sorted, savedEvent: normalized };
};

const deleteEventById = ({ events, eventId }) =>
  normalizeEventList((events || []).filter((event) => event.id !== eventId));

const toggleRsvp = ({ events, eventId, user }) => {
  const rsvpUser = normalizeRsvpUser(user);
  if (!rsvpUser) {
    return { events: normalizeEventList(events), updatedEvent: null, joined: false };
  }

  const nextEvents = (events || []).map((event) => {
    if (event.id !== eventId) return event;
    const rsvps = Array.isArray(event.rsvps) ? [...event.rsvps] : [];
    const existingIndex = rsvps.findIndex(
      (entry) => entry.userId === rsvpUser.userId
    );

    if (existingIndex >= 0) {
      rsvps.splice(existingIndex, 1);
      return {
        ...event,
        rsvps,
        updatedAt: new Date().toISOString(),
      };
    }

    rsvps.push({
      userId: rsvpUser.userId,
      name: rsvpUser.name,
      email: rsvpUser.email,
      joinedAt: new Date().toISOString(),
    });
    return {
      ...event,
      rsvps,
      updatedAt: new Date().toISOString(),
    };
  });

  const updatedEvents = normalizeEventList(nextEvents);
  const updatedEvent = updatedEvents.find((event) => event.id === eventId) || null;
  const joined = Boolean(
    updatedEvent?.rsvps?.some((entry) => entry.userId === rsvpUser.userId)
  );
  return { events: updatedEvents, updatedEvent, joined };
};

export {
  STAR_PARTY_STORAGE_KEY,
  readEventsFromStorage,
  writeEventsToStorage,
  normalizeEvent,
  normalizeEventList,
  saveEvent,
  deleteEventById,
  toggleRsvp,
  getRsvpUserId,
  normalizeChecklist,
};
