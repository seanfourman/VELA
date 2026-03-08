import { useCallback, useEffect, useRef } from "react";
import L from "leaflet";
import { fetchDarkSpots } from "@/utils/darkSpots";
import { isCoarsePointerEnv } from "./mapUtils";
import { LOCATION_ZOOM, MARKER_EXIT_MS } from "./mapConstants";
import {
  buildPlanetRequestMeta,
  getPrimaryTarget,
  isPinnedPlanetSource,
} from "./mapInteractionTargets";

const useMapActionHandlers = ({
  mapRef,
  planetPanelRef,
  location,
  searchDistance,
  contextMenu,
  placedMarker,
  selectedDarkSpot,
  favoriteSpotKeys,
  planetQuerySource,
  fetchPlanetsForLocation,
  clearPlanets,
  getSpotKey,
  setContextMenu,
  setPlacedMarker,
  setExitingMarker,
  setDarkSpots,
}) => {
  const skipAutoLocationRef = useRef(false);
  const removalTimeoutRef = useRef(null);

  const queueMarkerExit = useCallback(
    (marker) => {
      if (!marker) return;
      if (removalTimeoutRef.current) {
        clearTimeout(removalTimeoutRef.current);
      }
      setExitingMarker(marker);
      removalTimeoutRef.current = setTimeout(() => {
        setExitingMarker(null);
      }, MARKER_EXIT_MS);
    },
    [setExitingMarker]
  );

  useEffect(() => {
    return () => {
      if (removalTimeoutRef.current) clearTimeout(removalTimeoutRef.current);
    };
  }, []);

  const handleSnapToLocation = useCallback(() => {
    if (!location || !mapRef.current) return;

    skipAutoLocationRef.current = false;
    const map = mapRef.current;
    const target = L.latLng(location.lat, location.lng);
    const currentCenter = map.getCenter();
    const alreadyCentered =
      map.distance(currentCenter, target) < 5 &&
      map.getZoom() >= LOCATION_ZOOM - 0.1;

    if (!alreadyCentered) {
      map.flyTo(target, LOCATION_ZOOM, {
        duration: 2.5,
        easeLinearity: 0.25,
      });
    }

    if (isCoarsePointerEnv()) {
      planetPanelRef.current?.nudgeToggle?.();
    } else {
      planetPanelRef.current?.openPanel("manual");
    }

    fetchPlanetsForLocation(location.lat, location.lng, "Visible from your sky", {
      force: true,
      source: "location",
    });
  }, [fetchPlanetsForLocation, location, mapRef, planetPanelRef]);

  const handleDoubleClick = useCallback(
    (latlng) => {
      queueMarkerExit(placedMarker);

      const isFavorite = favoriteSpotKeys.has(getSpotKey(latlng.lat, latlng.lng));
      const nextMarker = {
        lat: latlng.lat,
        lng: latlng.lng,
        id: Date.now(),
        isFavorite,
      };

      setPlacedMarker(nextMarker);
      setContextMenu({
        lat: nextMarker.lat,
        lng: nextMarker.lng,
      });
    },
    [
      favoriteSpotKeys,
      getSpotKey,
      placedMarker,
      queueMarkerExit,
      setContextMenu,
      setPlacedMarker,
    ]
  );

  const handleGetVisiblePlanets = useCallback(() => {
    const target = getPrimaryTarget({
      selectedDarkSpot,
      placedMarker,
      location,
      contextMenu,
    });
    if (!target) return;

    const { label, source } = buildPlanetRequestMeta({
      selectedDarkSpot,
      placedMarker,
      location,
    });
    planetPanelRef.current?.openPanel("manual");
    fetchPlanetsForLocation(target.lat, target.lng, label, {
      force: true,
      source,
    });
  }, [
    contextMenu,
    fetchPlanetsForLocation,
    location,
    placedMarker,
    planetPanelRef,
    selectedDarkSpot,
  ]);

  const handleFetchDarkSpots = useCallback(async () => {
    const target = getPrimaryTarget({
      selectedDarkSpot,
      placedMarker,
      location,
      contextMenu,
    });
    if (!target) return;

    mapRef.current?.closePopup();
    const spots = await fetchDarkSpots(target.lat, target.lng, searchDistance);
    setDarkSpots(spots);

    if (spots.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds([[target.lat, target.lng]]);
      spots.forEach((spot) => bounds.extend([spot.lat, spot.lon]));
      mapRef.current.flyToBounds(bounds, {
        padding: [50, 50],
        duration: 2.5,
        easeLinearity: 0.25,
      });
    }
  }, [
    contextMenu,
    location,
    mapRef,
    placedMarker,
    searchDistance,
    selectedDarkSpot,
    setDarkSpots,
  ]);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
    queueMarkerExit(placedMarker);
    setPlacedMarker(null);

    const isShowingPinnedPlanets = isPinnedPlanetSource(planetQuerySource);
    skipAutoLocationRef.current = isShowingPinnedPlanets;
    if (isShowingPinnedPlanets) {
      planetPanelRef.current?.resetPanel?.(
        () => {
          clearPlanets();
        },
        { hideToggle: true }
      );
      return;
    }

    if (!location) {
      planetPanelRef.current?.hidePanel();
      planetPanelRef.current?.resetToggle?.();
    }
  }, [
    clearPlanets,
    location,
    planetPanelRef,
    placedMarker,
    planetQuerySource,
    queueMarkerExit,
    setContextMenu,
    setPlacedMarker,
  ]);

  useEffect(() => {
    if (!location) return;
    if (isPinnedPlanetSource(planetQuerySource)) return;
    if (skipAutoLocationRef.current) return;

    fetchPlanetsForLocation(location.lat, location.lng, "Visible from your sky", {
      source: "location",
    });
  }, [location, planetQuerySource, fetchPlanetsForLocation]);

  return {
    handleSnapToLocation,
    handleDoubleClick,
    handleGetVisiblePlanets,
    handleFetchDarkSpots,
    handleCloseContextMenu,
  };
};

export default useMapActionHandlers;
