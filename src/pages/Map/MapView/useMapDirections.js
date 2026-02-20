import { useCallback } from "react";
import showPopup from "../../../utils/popup";

const useMapDirections = ({
  directionsProvider = "google",
  location,
  placedMarker,
  contextMenu,
}) => {
  const buildDirectionsUrl = useCallback(
    (origin, destination) => {
      const destLat = Number(destination?.lat);
      const destLng = Number(destination?.lng);
      if (!Number.isFinite(destLat) || !Number.isFinite(destLng)) return null;

      if (directionsProvider === "waze") {
        const params = new URLSearchParams();
        params.set("ll", `${destLat},${destLng}`);
        params.set("navigate", "yes");
        if (
          origin &&
          Number.isFinite(origin.lat) &&
          Number.isFinite(origin.lng)
        ) {
          params.set("from", `${origin.lat},${origin.lng}`);
        }
        return `https://www.waze.com/ul?${params.toString()}`;
      }

      if (
        origin &&
        Number.isFinite(origin.lat) &&
        Number.isFinite(origin.lng)
      ) {
        return `https://www.google.com/maps/dir/${origin.lat},${origin.lng}/${destLat},${destLng}`;
      }

      return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
    },
    [directionsProvider],
  );

  const buildShareUrl = useCallback((coords) => {
    const lat = Number(coords?.lat);
    const lng = Number(coords?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const query = encodeURIComponent(`${lat},${lng}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }, []);

  const handleShareLocation = useCallback(
    (coords, label = "Location") => {
      const lat = Number(coords?.lat);
      const lng = Number(coords?.lng);
      const url = buildShareUrl({ lat, lng });
      if (!url) {
        showPopup("No coordinates available to share.", "warning", {
          duration: 2200,
        });
        return;
      }

      const resolvedLabel = label || "Location";
      window.setTimeout(() => {
        const opened = window.open(url, "_blank");
        if (!opened) {
          showPopup(
            "Pop-up blocked. Allow pop-ups to open Google Maps.",
            "warning",
            { duration: 2600 },
          );
          return;
        }
        try {
          opened.opener = null;
        } catch {
          // Ignore if the browser prevents access to the new window handle.
        }
        showPopup(`Opened ${resolvedLabel} in Google Maps.`, "info", {
          duration: 2000,
        });
      }, 1500);
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
