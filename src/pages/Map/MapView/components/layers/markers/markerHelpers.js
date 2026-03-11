export const openMarkerDirections = (url) => {
  if (!url) return;
  window.open(url, "_blank");
};

export const buildMarkerDirectionsHandler = ({
  buildDirectionsUrl,
  getDirectionsOrigin,
  target,
}) => {
  if (typeof buildDirectionsUrl !== "function") return null;
  const origin =
    typeof getDirectionsOrigin === "function" ? getDirectionsOrigin() : null;
  const directionsUrl = buildDirectionsUrl(origin, target);

  if (!directionsUrl) return null;
  return () => openMarkerDirections(directionsUrl);
};

export const coordinatesMatch = (left, right, rightLngKey = "lng") => {
  if (!left || !right) return false;
  return (
    Math.abs(Number(left.lat) - Number(right.lat)) < 1e-6 &&
    Math.abs(Number(left.lng) - Number(right[rightLngKey])) < 1e-6
  );
};

export const resolveFavoriteMarkerIcon = ({
  baseIcon,
  isFavorite = false,
  isEntering = false,
  favoriteIcon,
  favoriteTransitionIcon,
  isExiting = false,
  favoriteRemovingIcon = null,
}) => {
  if (isExiting && favoriteRemovingIcon) {
    return favoriteRemovingIcon;
  }

  if (!isFavorite) {
    return baseIcon;
  }

  return isEntering ? favoriteTransitionIcon : favoriteIcon;
};
