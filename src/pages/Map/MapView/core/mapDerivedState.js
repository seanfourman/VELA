export function getQuickActionTitles({ selectedDarkSpot, hasPinnedSpot, hasAnyLocation }) {
  const selectedTargetLabel = selectedDarkSpot?.label || "stargazing spot";
  const selectedTargetLabelLower = selectedTargetLabel.toLowerCase();

  const quickPlanetsTitle = selectedDarkSpot
    ? `Visible planets from ${selectedTargetLabelLower}`
    : hasPinnedSpot
    ? "Visible planets from pinned spot"
    : hasAnyLocation
    ? "Visible planets from your location"
    : "Drop a pin or enable location";

  const quickDarkSpotsTitle = selectedDarkSpot
    ? `Find spots near the ${selectedTargetLabelLower}`
    : hasPinnedSpot
    ? "Find stargazing spots near the pin"
    : hasAnyLocation
    ? "Find stargazing spots near you"
    : "Drop a pin or enable location";

  return { quickPlanetsTitle, quickDarkSpotsTitle };
}

export function getSearchPlaceholder() {
  return "Search anything";
}

export function getFavoriteOnlySpots({
  favoriteSpots,
  darkSpots,
  visibleStargazeLocations,
  placedMarker,
  getSpotKey,
}) {
  if (favoriteSpots.length === 0) return [];

  const activeDarkSpotKeys = new Set(
    darkSpots.map((spot) => getSpotKey(spot.lat, spot.lon))
  );
  const stargazeKeys = new Set(
    visibleStargazeLocations.map((spot) => getSpotKey(spot.lat, spot.lng))
  );
  const placedKey = placedMarker
    ? getSpotKey(placedMarker.lat, placedMarker.lng)
    : null;

  return favoriteSpots.filter((spot) => {
    if (placedKey && spot.key === placedKey) return false;
    if (activeDarkSpotKeys.has(spot.key)) return false;
    if (stargazeKeys.has(spot.key)) return false;
    return true;
  });
}

export function getPinnedTargetState({ placedMarker, selectedDarkSpot, getSpotKey }) {
  return Boolean(
    placedMarker?.isFavorite &&
      selectedDarkSpot &&
      getSpotKey(placedMarker.lat, placedMarker.lng) ===
        getSpotKey(selectedDarkSpot.lat, selectedDarkSpot.lng)
  );
}
