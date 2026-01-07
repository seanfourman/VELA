import { useCallback, useEffect, useRef } from "react";
import L from "leaflet";
import { fetchDarkSpots } from "../../../utils/darkSpots";
import { isCoarsePointerEnv } from "./mapUtils";
import { LOCATION_ZOOM, MARKER_EXIT_MS, MIN_ZOOM } from "./mapConstants";

const useMapInteractions = ({
  mapRef,
  planetPanelRef,
  location,
  mapType,
  searchDistance,
  contextMenu,
  placedMarker,
  selectedDarkSpot,
  favoriteSpotKeys,
  planetQuerySource,
  fetchPlanetsForLocation,
  clearPlanets,
  setContextMenu,
  setPlacedMarker,
  setExitingMarker,
  setSelectedDarkSpot,
  setActiveStargazeId,
  setDarkSpots,
  setLatestGridShot,
  getSpotKey,
}) => {
  const skipAutoLocationRef = useRef(false);
  const removalTimeoutRef = useRef(null);
  const lastGridShotAtRef = useRef(0);

  const centerOnCoords = useCallback(
    (lat, lng) => {
      if (!mapRef.current) return;
      const map = mapRef.current;
      const zoom = map.getZoom();
      const targetPoint = map.latLngToContainerPoint([lat, lng]);
      const verticalOffset = Math.min(180, map.getSize().y);
      const adjustedLatLng = map.containerPointToLatLng([
        targetPoint.x,
        targetPoint.y - verticalOffset,
      ]);

      map.flyTo(adjustedLatLng, zoom, { duration: 0.5, easeLinearity: 0.35 });
    },
    [mapRef]
  );

  const flyToCoordinates = useCallback(
    (lat, lng, zoom = LOCATION_ZOOM) => {
      if (!mapRef.current) return;
      mapRef.current.flyTo([lat, lng], zoom, {
        duration: 1.1,
        easeLinearity: 0.25,
      });
    },
    [mapRef]
  );

  const handleCoordinateSearch = useCallback(
    ({ lat, lng }) => {
      const isFavorite = favoriteSpotKeys.has(getSpotKey(lat, lng));
      setContextMenu(null);
      setSelectedDarkSpot(null);
      setActiveStargazeId(null);
      setPlacedMarker({ lat, lng, id: Date.now(), isFavorite });
      flyToCoordinates(lat, lng, LOCATION_ZOOM);
    },
    [
      favoriteSpotKeys,
      flyToCoordinates,
      getSpotKey,
      setActiveStargazeId,
      setContextMenu,
      setPlacedMarker,
      setSelectedDarkSpot,
    ]
  );

  const handleStargazeSearch = useCallback(
    (locationItem) => {
      if (!locationItem) return;
      setActiveStargazeId(locationItem.id);
      flyToCoordinates(locationItem.lat, locationItem.lng, LOCATION_ZOOM);
    },
    [flyToCoordinates, setActiveStargazeId]
  );

  const handleTileLoad = useCallback(
    (event) => {
      const src = event?.tile?.src;
      if (!src) return;
      const now = Date.now();
      if (now - lastGridShotAtRef.current < 3000) return;
      lastGridShotAtRef.current = now;
      setLatestGridShot(src);
    },
    [setLatestGridShot]
  );

  useEffect(() => {
    setLatestGridShot(null);
  }, [mapType, setLatestGridShot]);

  useEffect(() => {
    return () => {
      if (removalTimeoutRef.current) clearTimeout(removalTimeoutRef.current);
    };
  }, []);

  const handleSnapToLocation = useCallback(() => {
    if (location && mapRef.current) {
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

      const isMobile = isCoarsePointerEnv();
      if (isMobile) {
        planetPanelRef.current?.nudgeToggle?.();
      } else {
        planetPanelRef.current?.openPanel("manual");
      }

      fetchPlanetsForLocation(
        location.lat,
        location.lng,
        "Visible from your sky",
        {
          force: true,
          source: "location",
        }
      );
    }
  }, [fetchPlanetsForLocation, location, mapRef, planetPanelRef]);

  const handleDoubleClick = useCallback(
    (latlng) => {
      if (removalTimeoutRef.current) {
        clearTimeout(removalTimeoutRef.current);
      }

      if (placedMarker) {
        setExitingMarker(placedMarker);
        removalTimeoutRef.current = setTimeout(() => {
          setExitingMarker(null);
        }, MARKER_EXIT_MS);
      }

      const isFavorite = favoriteSpotKeys.has(
        getSpotKey(latlng.lat, latlng.lng)
      );
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
      setContextMenu,
      setExitingMarker,
      setPlacedMarker,
    ]
  );

  const handleGetVisiblePlanets = useCallback(() => {
    const target = selectedDarkSpot || placedMarker || location || contextMenu;
    if (!target) return;

    const selectedLabel = selectedDarkSpot?.label || "stargazing spot";
    const selectedLabelLower = selectedLabel.toLowerCase();
    const label = selectedDarkSpot
      ? `Visible from ${selectedLabelLower}`
      : placedMarker
      ? "Visible from pinned spot"
      : location
      ? "Visible from your sky"
      : "Visible from here";
    const source = selectedDarkSpot
      ? "darkspot"
      : placedMarker
      ? "pin"
      : location
      ? "location"
      : "context";

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
    const target = selectedDarkSpot || placedMarker || location || contextMenu;
    if (!target) return;

    // Close any open popup, but keep the pinned (blue) marker on the map.
    mapRef.current?.closePopup();
    const spots = await fetchDarkSpots(target.lat, target.lng, searchDistance);
    setDarkSpots(spots);

    if (spots.length > 0 && mapRef.current) {
      // Create bounds from the origin and all spots
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
    if (removalTimeoutRef.current) clearTimeout(removalTimeoutRef.current);
    if (placedMarker) {
      setExitingMarker(placedMarker);
      removalTimeoutRef.current = setTimeout(() => {
        setExitingMarker(null);
      }, MARKER_EXIT_MS);
    }
    setPlacedMarker(null);

    const isShowingPinnedPlanets =
      planetQuerySource === "pin" || planetQuerySource === "darkspot";
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

    // Don't clear stargazing locations on simple menu close.

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
    setContextMenu,
    setExitingMarker,
    setPlacedMarker,
  ]);

  useEffect(() => {
    if (!location) return;
    if (planetQuerySource === "pin" || planetQuerySource === "darkspot") return;
    if (skipAutoLocationRef.current) return;

    fetchPlanetsForLocation(
      location.lat,
      location.lng,
      "Visible from your sky",
      { source: "location" }
    );
  }, [location, planetQuerySource, fetchPlanetsForLocation]);

  const zoomOutToMin = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const center = map.getCenter();
    const minZoom = map.getMinZoom?.() ?? MIN_ZOOM;
    if (map.stop) map.stop();
    map.flyTo(center, minZoom, {
      duration: 0.9,
      easeLinearity: 0.25,
    });
  }, [mapRef]);

  return {
    centerOnCoords,
    flyToCoordinates,
    handleCoordinateSearch,
    handleStargazeSearch,
    handleTileLoad,
    handleSnapToLocation,
    handleDoubleClick,
    handleGetVisiblePlanets,
    handleFetchDarkSpots,
    handleCloseContextMenu,
    zoomOutToMin,
  };
};

export default useMapInteractions;
