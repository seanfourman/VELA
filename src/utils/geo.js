const EARTH_RADIUS_KM = 6371;

const toCoordinateNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export const getCoordinateKey = (lat, lng, precision = 5) => {
  const resolvedLat = toCoordinateNumber(lat);
  const resolvedLng = toCoordinateNumber(lng);
  if (resolvedLat === null || resolvedLng === null) return "";
  return `${resolvedLat.toFixed(precision)}:${resolvedLng.toFixed(precision)}`;
};

export const coordinatesMatch = (
  leftLat,
  leftLng,
  rightLat,
  rightLng,
  precision = 5,
) => {
  const leftKey = getCoordinateKey(leftLat, leftLng, precision);
  const rightKey = getCoordinateKey(rightLat, rightLng, precision);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
};

export const haversineDistanceKm = (fromLat, fromLng, toLat, toLng) => {
  const leftLat = toCoordinateNumber(fromLat);
  const leftLng = toCoordinateNumber(fromLng);
  const rightLat = toCoordinateNumber(toLat);
  const rightLng = toCoordinateNumber(toLng);

  if (
    leftLat === null ||
    leftLng === null ||
    rightLat === null ||
    rightLng === null
  ) {
    return null;
  }

  const dLat = toRadians(rightLat - leftLat);
  const dLng = toRadians(rightLng - leftLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(leftLat)) *
      Math.cos(toRadians(rightLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

export const formatDistanceKm = (distanceKm) => {
  if (!Number.isFinite(distanceKm)) return "Distance unavailable";
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km away`;
  return `${Math.round(distanceKm)} km away`;
};
