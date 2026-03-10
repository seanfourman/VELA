const normalizeCoordinate = (value) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

const hasValidCoordinates = (coords) =>
  normalizeCoordinate(coords?.lat) !== null && normalizeCoordinate(coords?.lng) !== null;

export const buildExternalMapSearchUrl = ({ lat, lng, provider = "google" }) => {
  const resolvedLat = normalizeCoordinate(lat);
  const resolvedLng = normalizeCoordinate(lng);
  if (resolvedLat === null || resolvedLng === null) return null;

  if (provider === "waze") {
    const params = new URLSearchParams();
    params.set("ll", `${resolvedLat},${resolvedLng}`);
    params.set("navigate", "yes");
    return `https://www.waze.com/ul?${params.toString()}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${resolvedLat},${resolvedLng}`;
};

export const buildExternalMapDirectionsUrl = ({
  provider = "google",
  origin,
  destination,
}) => {
  const destLat = normalizeCoordinate(destination?.lat);
  const destLng = normalizeCoordinate(destination?.lng);
  if (destLat === null || destLng === null) return null;

  if (provider === "waze") {
    const params = new URLSearchParams();
    params.set("ll", `${destLat},${destLng}`);
    params.set("navigate", "yes");
    if (hasValidCoordinates(origin)) {
      params.set("from", `${Number(origin.lat)},${Number(origin.lng)}`);
    }
    return `https://www.waze.com/ul?${params.toString()}`;
  }

  if (hasValidCoordinates(origin)) {
    return `https://www.google.com/maps/dir/${Number(origin.lat)},${Number(origin.lng)}/${destLat},${destLng}`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
};
