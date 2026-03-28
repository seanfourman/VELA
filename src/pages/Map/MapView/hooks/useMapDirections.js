import { useCallback } from "react";
import showNotification from "@/utils/notifications";
import {
  buildExternalMapDirectionsUrl,
  buildExternalMapSearchUrl,
} from "@/utils/mapLinks";

const useMapDirections = ({
  directionsProvider = "google",
  location,
  placedMarker,
  contextMenu,
}) => {
  const buildDirectionsUrl = useCallback(
    (origin, destination) =>
      buildExternalMapDirectionsUrl({
        provider: directionsProvider,
        origin,
        destination,
      }),
    [directionsProvider],
  );

  const buildShareUrl = useCallback(
    (coords) =>
      buildExternalMapSearchUrl({
        lat: coords?.lat,
        lng: coords?.lng,
        provider: "google",
      }),
    [],
  );

  const handleShareLocation = useCallback(
    (coords, label = "Location") => {
      const lat = Number(coords?.lat);
      const lng = Number(coords?.lng);
      const url = buildShareUrl({ lat, lng });
      if (!url) {
        showNotification("No coordinates available to share", "warning", {
          duration: 2200,
        });
        return;
      }

      const resolvedLabel = label || "Location";
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        showNotification(
          "Pop-up blocked. Allow pop-ups to open Google Maps",
          "warning",
          { duration: 2600 },
        );
        return;
      }

      showNotification(`Opened ${resolvedLabel} in Google Maps`, "info", {
        duration: 2000,
      });
    },
    [buildShareUrl],
  );

  const flashShareToggle = useCallback((button) => {
    if (!button) return;
    button.classList.remove("share-flash");
    void button.offsetHeight;
    button.classList.add("share-flash");
    window.setTimeout(() => {
      button.classList.remove("share-flash");
    }, 2000);
  }, []);

  const handleGetDirections = useCallback(() => {
    const target = placedMarker || contextMenu;
    if (!target) return;
    const origin = location ? { lat: location.lat, lng: location.lng } : null;
    const url = buildDirectionsUrl(origin, target);
    if (!url) return;
    window.open(url, "_blank");
  }, [buildDirectionsUrl, contextMenu, location, placedMarker]);

  const getDirectionsOrigin = useCallback(() => {
    if (directionsProvider === "waze") {
      if (location) {
        return { lat: location.lat, lng: location.lng, label: "Your location" };
      }
      return null;
    }
    // Blue pinned marker is stronger than the green live location dot.
    if (placedMarker) {
      return {
        lat: placedMarker.lat,
        lng: placedMarker.lng,
        label: "Pinned spot",
      };
    }
    if (location) {
      return { lat: location.lat, lng: location.lng, label: "Your location" };
    }
    return null;
  }, [directionsProvider, location, placedMarker]);

  return {
    buildDirectionsUrl,
    getDirectionsOrigin,
    handleShareLocation,
    flashShareToggle,
    handleGetDirections,
  };
};

export default useMapDirections;
