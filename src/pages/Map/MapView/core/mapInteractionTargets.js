export function getPrimaryTarget({
  selectedDarkSpot,
  placedMarker,
  activeStargazeSpot,
  location,
  contextMenu,
}) {
  return (
    selectedDarkSpot ||
    placedMarker ||
    activeStargazeSpot ||
    location ||
    contextMenu ||
    null
  );
}

export function buildPlanetRequestMeta({
  selectedDarkSpot,
  placedMarker,
  activeStargazeSpot,
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
  if (activeStargazeSpot) {
    return {
      label: `Visible from ${activeStargazeSpot.name || "selected spot"}`,
      source: "stargaze",
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
