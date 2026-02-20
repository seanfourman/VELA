const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const parseImageList = (value) =>
  String(value || "")
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

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
  const photoUrls = parseImageList(draft.photoUrls);
  const sourceUrls = parseImageList(draft.sourceUrls);

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
  };
}
