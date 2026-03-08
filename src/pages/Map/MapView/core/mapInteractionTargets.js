export function getPrimaryTarget({
  selectedDarkSpot,
  placedMarker,
  location,
  contextMenu,
}) {
  return selectedDarkSpot || placedMarker || location || contextMenu || null;
}

export function buildPlanetRequestMeta({
  selectedDarkSpot,
  placedMarker,
  location,
}) {
  const selectedLabel = selectedDarkSpot?.label || "stargazing spot";
  const selectedLabelLower = selectedLabel.toLowerCase();

  if (selectedDarkSpot) {
    return {
      label: `Visible from ${selectedLabelLower}`,
      source: "darkspot",
    };
  }
  if (placedMarker) {
    return {
      label: "Visible from pinned spot",
      source: "pin",
    };
  }
  if (location) {
    return {
      label: "Visible from your sky",
      source: "location",
    };
  }
  return {
    label: "Visible from here",
    source: "context",
  };
}

export function isPinnedPlanetSource(source) {
  return source === "pin" || source === "darkspot";
}
