const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const parseList = (value) =>
  String(value || "")
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const toDraftMultiline = (value) => {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)
      .join("\n");
  }
  return String(value).trim();
};

const normalizeHttpUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

const parseHttpUrlList = (value) => {
  const entries = parseList(value);
  const validUrls = [];
  const invalidUrls = [];
  const seen = new Set();

  entries.forEach((entry) => {
    const normalized = normalizeHttpUrl(entry);
    if (!normalized) {
      invalidUrls.push(entry);
      return;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    validUrls.push(normalized);
  });

  return { validUrls, invalidUrls };
};

export const buildLocationId = ({ name, country, region }) => {
  const base = [name, country || region].filter(Boolean).join(" ");
  const slug = slugify(base);
  return slug || `spot_${Date.now()}`;
};

export function buildLocationFromDraft(draft) {
  const name = String(draft.name || "").trim();
  const country = String(draft.country || "").trim();
  const region = String(draft.region || "").trim();
  const type = String(draft.type || "").trim();
  const bestTime = String(draft.bestTime || "").trim();
  const lat = Number.parseFloat(draft.lat);
  const lng = Number.parseFloat(draft.lng);
  const description = String(draft.description || "").trim();
  const { validUrls: photoUrls, invalidUrls: invalidPhotoUrls } =
    parseHttpUrlList(draft.photoUrls);
  const { validUrls: sourceUrls, invalidUrls: invalidSourceUrls } =
    parseHttpUrlList(draft.sourceUrls);

  return {
    name,
    country,
    region,
    type,
    bestTime,
    lat,
    lng,
    description,
    photoUrls,
    sourceUrls,
    invalidPhotoUrls,
    invalidSourceUrls,
  };
}

export function buildDraftFromLocation(location) {
  if (!location || typeof location !== "object") return null;

  const lat = Number(
    location.lat ??
      location.latitude ??
      location.coordinates?.lat ??
      location.coordinates?.latitude
  );
  const lng = Number(
    location.lng ??
      location.lon ??
      location.longitude ??
      location.coordinates?.lng ??
      location.coordinates?.lon ??
      location.coordinates?.longitude
  );

  return {
    id: String(location.id || location.spotId || "").trim(),
    name: String(location.name || "").trim(),
    country: String(location.country || "").trim(),
    region: String(location.region || "").trim(),
    type: String(location.type || "").trim(),
    bestTime: String(location.bestTime ?? location.best_time ?? "").trim(),
    lat: Number.isFinite(lat) ? String(lat) : "",
    lng: Number.isFinite(lng) ? String(lng) : "",
    description: String(location.description || "").trim(),
    photoUrls: toDraftMultiline(
      location.photoUrls ??
        location.photo_urls ??
        location.photoLinks ??
        location.photos
    ),
    sourceUrls: toDraftMultiline(
      location.sourceUrls ??
        location.source_urls ??
        location.sourceLinks ??
        location.sources
    ),
  };
}
