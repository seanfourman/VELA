import { useCallback, useEffect, useRef } from "react";
import L from "leaflet";
import { fetchDarkSpots } from "@/utils/darkSpots";
import { isCoarsePointerEnv } from "../core/mapUtils";
import { LOCATION_ZOOM, MARKER_EXIT_MS } from "../core/mapConfig";
import {
  buildPlanetRequestMeta,
  getPrimaryTarget,
  isPinnedPlanetSource,
} from "../core/mapInteractionTargets";

const MAP_DARK_SPOT_LIMIT = 3;

const useMapActionHandlers = ({
  mapRef,
  planetPanelRef,
  location,
  searchDistance,
  contextMenu,
  placedMarker,
  selectedDarkSpot,
  activeStargazeSpot,
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

  const showVisiblePlanetsForTarget = useCallback(
    (
      target,
      { label, source, force = true, openPanel = true } = {},
    ) => {
      if (!target) return;

      if (openPanel) {
        if (isCoarsePointerEnv()) {
          planetPanelRef.current?.nudgeToggle?.();
        } else {
          planetPanelRef.current?.openPanel("manual");
        }
      }

      fetchPlanetsForLocation(target.lat, target.lng, label, {
        force,
        source,
      });
    },
    [fetchPlanetsForLocation, planetPanelRef],
  );

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

    showVisiblePlanetsForTarget(location, {
      label: "Visible from your sky",
      force: true,
      source: "location",
      openPanel: true,
    });
  }, [location, mapRef, showVisiblePlanetsForTarget]);

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

  const handleGetVisiblePlanets = useCallback(
    (override = null) => {
      const target =
        override?.target ||
        getPrimaryTarget({
          selectedDarkSpot,
          placedMarker,
          activeStargazeSpot,
          location,
          contextMenu,
        });
      if (!target) return;

      const requestMeta = buildPlanetRequestMeta({
        selectedDarkSpot,
        placedMarker,
        activeStargazeSpot,
        location,
      });

      showVisiblePlanetsForTarget(target, {
        label: override?.label ?? requestMeta.label,
        source: override?.source ?? requestMeta.source,
        force: override?.force ?? true,
        openPanel: override?.openPanel ?? true,
      });
    },
    [
      activeStargazeSpot,
      contextMenu,
      location,
      placedMarker,
      selectedDarkSpot,
      showVisiblePlanetsForTarget,
    ],
  );

  const handleFetchDarkSpots = useCallback(async () => {
    const target = getPrimaryTarget({
      selectedDarkSpot,
      placedMarker,
      activeStargazeSpot,
      location,
      contextMenu,
    });
    if (!target) return;

    mapRef.current?.closePopup();
    const spots = await fetchDarkSpots(target.lat, target.lng, searchDistance);
    const visibleSpots = Array.isArray(spots)
      ? spots.slice(0, MAP_DARK_SPOT_LIMIT)
      : [];
    setDarkSpots(visibleSpots);

    if (visibleSpots.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds([[target.lat, target.lng]]);
      visibleSpots.forEach((spot) => bounds.extend([spot.lat, spot.lon]));
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
    activeStargazeSpot,
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
    if (planetQuerySource === "stargaze" && activeStargazeSpot) return;
    if (skipAutoLocationRef.current) return;

    fetchPlanetsForLocation(location.lat, location.lng, "Visible from your sky", {
      source: "location",
    });
  }, [activeStargazeSpot, location, planetQuerySource, fetchPlanetsForLocation]);

  return {
    handleSnapToLocation,
    handleDoubleClick,
    handleGetVisiblePlanets,
    handleFetchDarkSpots,
    handleCloseContextMenu,
  };
};

export default useMapActionHandlers;
