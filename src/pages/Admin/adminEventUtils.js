const cleanText = (value) => (typeof value === "string" ? value.trim() : "");

const pad2 = (value) => String(value).padStart(2, "0");

const toIsoDateTime = (value) => {
  const raw = cleanText(value);
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
};

const toLocalDateInput = (value) => {
  const raw = cleanText(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = pad2(parsed.getMonth() + 1);
  const day = pad2(parsed.getDate());
  return `${year}-${month}-${day}`;
};

const parseChecklist = (value) =>
  String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const buildEventId = ({ title, startsAt }) => {
  const titleSlug = slugify(title);
  const dateSlug = slugify(startsAt || "");
  const base = [titleSlug, dateSlug].filter(Boolean).join("_");
  if (base) return `event_${base}`;
  return `event_${Date.now()}`;
};

const buildEventFromDraft = (draft) => {
  const title = cleanText(draft?.title);
  const startsAt = toIsoDateTime(draft?.startsAt);
  const endsAt = toIsoDateTime(draft?.endsAt);
  const eventType = cleanText(draft?.eventType) || "party";
  const status = cleanText(draft?.status) || "draft";
  const lat = Number.parseFloat(draft?.lat);
  const lng = Number.parseFloat(draft?.lng);

  return {
    id: cleanText(draft?.id),
    title,
    eventType,
    status,
    startsAt,
    endsAt,
    lat,
    lng,
    meetupDetails: cleanText(draft?.meetupDetails),
    description: cleanText(draft?.description),
    hostChecklist: parseChecklist(draft?.hostChecklist),
  };
};

const buildDraftFromEvent = (event) => {
  if (!event || typeof event !== "object") return null;
  return {
    id: cleanText(event.id),
    title: cleanText(event.title),
    eventType: cleanText(event.eventType || event.type || "party"),
    status: cleanText(event.status || "draft"),
    startsAt: toLocalDateInput(event.startsAt),
    endsAt: toLocalDateInput(event.endsAt),
    lat: Number.isFinite(event.lat) ? String(event.lat) : "",
    lng: Number.isFinite(event.lng) ? String(event.lng) : "",
    meetupDetails: cleanText(event.meetupDetails),
    description: cleanText(event.description),
    hostChecklist: Array.isArray(event.hostChecklist)
      ? event.hostChecklist.join("\n")
      : "",
  };
};

export { buildEventId, buildEventFromDraft, buildDraftFromEvent };
