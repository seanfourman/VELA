import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import L from "leaflet";
import usePlanets from "../../../hooks/usePlanets";
import { preloadAllPlanetTextures } from "../../../utils/planetUtils";
import { isProbablyHardwareAccelerated } from "../../../utils/hardwareUtils";
import { fetchDarkSpots } from "../../../utils/darkSpots";
import {
  deleteFavoriteSpot,
  fetchFavoriteSpots,
  saveFavoriteSpot,
} from "../../../utils/favoritesApi";
import showPopup from "../../../utils/popup";
import {
  FAVORITE_EXIT_MS,
  LOCATION_ZOOM,
  MARKER_EXIT_MS,
  MIN_ZOOM,
  STARGAZE_PANEL_EXIT_MS,
} from "./mapConstants";
import { isCoarsePointerEnv } from "./mapUtils";

const useMapViewState = ({
  location,
  mapType,
  stargazeLocations = [],
  isAuthenticated,
  authToken,
  directionsProvider = "google",
  showRecommendedSpots = true,
  lightOverlayEnabled = false,
  onToggleLightOverlay,
  searchDistance = 10,
  onSearchDistanceChange,
}) => {
  const mapRef = useRef(null);
  const planetPanelRef = useRef(null);
  const [placedMarker, setPlacedMarker] = useState(null);
  const [exitingMarker, setExitingMarker] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [darkSpots, setDarkSpots] = useState([]);
  const [selectedDarkSpot, setSelectedDarkSpot] = useState(null);
  const [latestGridShot, setLatestGridShot] = useState(null);
  const [activeStargazeId, setActiveStargazeId] = useState(null);
  const [favoriteSpots, setFavoriteSpots] = useState([]);
  const [stargazePanelSpot, setStargazePanelSpot] = useState(null);
  const [isStargazePanelOpen, setIsStargazePanelOpen] = useState(false);
  const [isPlanetPanelOpen, setIsPlanetPanelOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(max-width: 768px)")?.matches ?? false;
  });
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const skipAutoLocationRef = useRef(false);
  const removalTimeoutRef = useRef(null);
  const favoriteTransitionTimeoutRef = useRef(null);
  const favoriteRemovalTimeoutsRef = useRef(new Map());
  const stargazePanelCloseTimeoutRef = useRef(null);
  const lastGridShotAtRef = useRef(0);
  const stargazeMarkerRefs = useRef(new Map());
  const placedMarkerRef = useRef(null);
  const prevPlacedFavoriteRef = useRef(false);
  const [exitingFavoriteKeys, setExitingFavoriteKeys] = useState([]);
  const favoriteSpotKeys = useMemo(
    () => new Set(favoriteSpots.map((spot) => spot.key)),
    [favoriteSpots]
  );
  const exitingFavoriteKeySet = useMemo(
    () => new Set(exitingFavoriteKeys),
    [exitingFavoriteKeys]
  );
  const visibleStargazeLocations = useMemo(
    () => (showRecommendedSpots ? stargazeLocations : []),
    [showRecommendedSpots, stargazeLocations]
  );
  const activeStargazeSpot = useMemo(() => {
    if (!activeStargazeId) return null;
    return (
      visibleStargazeLocations.find((spot) => spot.id === activeStargazeId) ||
      null
    );
  }, [activeStargazeId, visibleStargazeLocations]);

  const {
    visiblePlanets,
    planetsLoading,
    planetsError,
    planetQuery,
    fetchPlanetsForLocation,
    clearPlanets,
  } = usePlanets();

  const reducedMotion = useMemo(() => {
    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    )?.matches;
    const hardwareOk = isProbablyHardwareAccelerated();
    return prefersReducedMotion || !hardwareOk;
  }, []);

  useEffect(() => {
    preloadAllPlanetTextures();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const media = window.matchMedia("(max-width: 768px)");
    const handleChange = (event) => {
      setIsMobileView(event.matches);
    };

    handleChange(media);
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  const centerOnCoords = useCallback((lat, lng) => {
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
  }, []);

  const flyToCoordinates = useCallback((lat, lng, zoom = LOCATION_ZOOM) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([lat, lng], zoom, {
      duration: 1.1,
      easeLinearity: 0.25,
    });
  }, []);

  const getSpotKey = useCallback(
    (lat, lng) => `${lat.toFixed(5)}:${lng.toFixed(5)}`,
    []
  );

  useEffect(() => {
    let cancelled = false;

    if (!authToken || !isAuthenticated) {
      setFavoriteSpots([]);
      return undefined;
    }

    (async () => {
      try {
        const items = await fetchFavoriteSpots({ idToken: authToken });
        if (cancelled) return;

        const unique = new Map();
        items.forEach((item) => {
          const lat = Number(item.lat);
          const lon = Number(item.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
          const key = getSpotKey(lat, lon);
          unique.set(key, {
            key,
            lat,
            lng: lon,
            spotId: item.spotId ?? null,
            createdAt: item.createdAt ?? null,
          });
        });

        setFavoriteSpots([...unique.values()]);
      } catch (error) {
        if (cancelled) return;
        showPopup(
          error instanceof Error
            ? error.message
            : "Could not load favorites right now.",
          "failure"
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authToken, getSpotKey, isAuthenticated]);

  const handleCoordinateSearch = useCallback(
    ({ lat, lng }) => {
      const isFavorite = favoriteSpotKeys.has(getSpotKey(lat, lng));
      setContextMenu(null);
      setSelectedDarkSpot(null);
      setActiveStargazeId(null);
      setPlacedMarker({ lat, lng, id: Date.now(), isFavorite });
      flyToCoordinates(lat, lng, LOCATION_ZOOM);
    },
    [favoriteSpotKeys, flyToCoordinates, getSpotKey]
  );

  const handleStargazeSearch = useCallback(
    (locationItem) => {
      if (!locationItem) return;
      setActiveStargazeId(locationItem.id);
      flyToCoordinates(locationItem.lat, locationItem.lng, LOCATION_ZOOM);
    },
    [flyToCoordinates]
  );

  const openStargazePanel = useCallback((spot) => {
    if (!spot) return;
    if (stargazePanelCloseTimeoutRef.current) {
      clearTimeout(stargazePanelCloseTimeoutRef.current);
      stargazePanelCloseTimeoutRef.current = null;
    }
    setStargazePanelSpot(spot);
    setIsStargazePanelOpen(true);
  }, []);

  const closeStargazePanel = useCallback(() => {
    setIsStargazePanelOpen(false);
    if (stargazePanelCloseTimeoutRef.current) {
      clearTimeout(stargazePanelCloseTimeoutRef.current);
    }
    stargazePanelCloseTimeoutRef.current = setTimeout(() => {
      setStargazePanelSpot(null);
      stargazePanelCloseTimeoutRef.current = null;
    }, STARGAZE_PANEL_EXIT_MS);
  }, []);

  const handleCloseStargazePanel = useCallback(() => {
    setActiveStargazeId(null);
    mapRef.current?.closePopup();
    closeStargazePanel();
  }, [closeStargazePanel]);

  const handlePopupClose = useCallback(
    (event) => {
      if (isMobileView) return;
      if (!activeStargazeId) return;
      const marker = stargazeMarkerRefs.current.get(activeStargazeId);
      if (!marker) return;
      if (event?.popup?._source !== marker) return;
      setActiveStargazeId(null);
      closeStargazePanel();
    },
    [activeStargazeId, closeStargazePanel, isMobileView]
  );

  const handleTileLoad = useCallback((event) => {
    const src = event?.tile?.src;
    if (!src) return;
    const now = Date.now();
    if (now - lastGridShotAtRef.current < 3000) return;
    lastGridShotAtRef.current = now;
    setLatestGridShot(src);
  }, []);

  useEffect(() => {
    setLatestGridShot(null);
  }, [mapType]);

  useEffect(() => {
    return () => {
      if (removalTimeoutRef.current) clearTimeout(removalTimeoutRef.current);
      if (favoriteTransitionTimeoutRef.current) {
        clearTimeout(favoriteTransitionTimeoutRef.current);
      }
      favoriteRemovalTimeoutsRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      favoriteRemovalTimeoutsRef.current.clear();
      if (stargazePanelCloseTimeoutRef.current) {
        clearTimeout(stargazePanelCloseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeStargazeId) return;
    if (activeStargazeSpot) return;
    setActiveStargazeId(null);
  }, [activeStargazeId, activeStargazeSpot]);

  useEffect(() => {
    if (!activeStargazeSpot) return;
    const marker = stargazeMarkerRefs.current.get(activeStargazeSpot.id);
    if (marker?.openPopup) {
      marker.openPopup();
    }
  }, [activeStargazeSpot]);

  useEffect(() => {
    if (isMobileView) return;
    if (!activeStargazeSpot) {
      closeStargazePanel();
      return;
    }
    openStargazePanel(activeStargazeSpot);
  }, [activeStargazeSpot, closeStargazePanel, isMobileView, openStargazePanel]);

  useEffect(() => {
    if (!isMobileView) return;
    if (!activeStargazeSpot) return;
    if (isStargazePanelOpen) {
      setStargazePanelSpot(activeStargazeSpot);
    }
  }, [activeStargazeSpot, isMobileView, isStargazePanelOpen]);

  useEffect(() => {
    if (!placedMarker) return;
    const isFavorite = favoriteSpotKeys.has(
      getSpotKey(placedMarker.lat, placedMarker.lng)
    );
    if (placedMarker.isFavorite === isFavorite) return;
    setPlacedMarker((prev) => {
      if (!prev) return prev;
      return { ...prev, isFavorite };
    });
  }, [favoriteSpotKeys, getSpotKey, placedMarker]);

  useEffect(() => {
    const isFavorite = Boolean(placedMarker?.isFavorite);
    const hadFavorite = prevPlacedFavoriteRef.current;

    if (!placedMarker) {
      prevPlacedFavoriteRef.current = false;
      return;
    }

    if (isFavorite && !hadFavorite) {
      const marker = placedMarkerRef.current;
      const element = marker?.getElement?.();
      if (element) {
        element.classList.remove("favorite-transition");
        void element.offsetWidth;
        element.classList.add("favorite-transition");
        if (favoriteTransitionTimeoutRef.current) {
          clearTimeout(favoriteTransitionTimeoutRef.current);
        }
        favoriteTransitionTimeoutRef.current = setTimeout(() => {
          element.classList.remove("favorite-transition");
        }, 360);
      }
    }

    prevPlacedFavoriteRef.current = isFavorite;
  }, [placedMarker]);

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
  }, [fetchPlanetsForLocation, location]);

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
    [favoriteSpotKeys, getSpotKey, placedMarker]
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
  }, [contextMenu, location, placedMarker, searchDistance, selectedDarkSpot]);

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
    [directionsProvider]
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
            { duration: 2600 }
          );
          return;
        }
        try {
          opened.opener = null;
        } catch (error) {
          // Ignore if the browser prevents access to the new window handle.
        }
        showPopup(`Opened ${resolvedLabel} in Google Maps.`, "info", {
          duration: 2000,
        });
      }, 1500);
    },
    [buildShareUrl, showPopup]
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
      planetQuery?.source === "pin" || planetQuery?.source === "darkspot";
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
  }, [clearPlanets, location, placedMarker, planetQuery?.source]);

  const persistFavoriteSpot = useCallback(
    async (lat, lng) => {
      if (!authToken) return;
      try {
        await saveFavoriteSpot({ lat, lon: lng, idToken: authToken });
      } catch (error) {
        showPopup(
          error instanceof Error
            ? error.message
            : "Could not save favorite right now.",
          "failure"
        );
      }
    },
    [authToken]
  );

  const persistRemoveFavoriteSpot = useCallback(
    async ({ lat, lng, spotId }) => {
      if (!authToken) return;
      try {
        await deleteFavoriteSpot({ lat, lon: lng, spotId, idToken: authToken });
      } catch (error) {
        showPopup(
          error instanceof Error
            ? error.message
            : "Could not remove favorite right now.",
          "failure"
        );
      }
    },
    [authToken]
  );

  const handleToggleDarkSpotFavorite = useCallback(
    (spot) => {
      if (!spot) return;
      const key = getSpotKey(spot.lat, spot.lon);
      const isFavorite = favoriteSpotKeys.has(key);
      setFavoriteSpots((prev) => {
        const exists = prev.some((item) => item.key === key);
        if (exists) {
          return prev.filter((item) => item.key !== key);
        }
        return [...prev, { key, lat: spot.lat, lng: spot.lon }];
      });
      if (isFavorite) {
        persistRemoveFavoriteSpot({ lat: spot.lat, lng: spot.lon });
      } else {
        persistFavoriteSpot(spot.lat, spot.lon);
      }
    },
    [
      favoriteSpotKeys,
      getSpotKey,
      persistFavoriteSpot,
      persistRemoveFavoriteSpot,
    ]
  );

  useEffect(() => {
    if (!location) return;
    if (planetQuery?.source === "pin" || planetQuery?.source === "darkspot")
      return;
    if (skipAutoLocationRef.current) return;

    fetchPlanetsForLocation(
      location.lat,
      location.lng,
      "Visible from your sky",
      { source: "location" }
    );
  }, [location, planetQuery?.source, fetchPlanetsForLocation]);

  const hasPinnedSpot = Boolean(placedMarker);
  const hasAnyLocation =
    hasPinnedSpot || Boolean(location) || Boolean(selectedDarkSpot);
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
  const searchPlaceholder = showRecommendedSpots
    ? "Search coordinates or best stargazing spots"
    : "Search coordinates";
  const handleToggleLightOverlay = useCallback(() => {
    onToggleLightOverlay?.(!lightOverlayEnabled);
  }, [lightOverlayEnabled, onToggleLightOverlay]);
  const handleSearchDistanceChange = useCallback(
    (value) => {
      onSearchDistanceChange?.(value);
    },
    [onSearchDistanceChange]
  );
  const favoriteOnlySpots = useMemo(() => {
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
  }, [
    darkSpots,
    favoriteSpots,
    getSpotKey,
    placedMarker,
    visibleStargazeLocations,
  ]);
  const favoriteStargazeSpots = useMemo(() => {
    if (
      !Array.isArray(visibleStargazeLocations) ||
      visibleStargazeLocations.length === 0
    ) {
      return [];
    }
    if (favoriteSpotKeys.size === 0) return [];
    return visibleStargazeLocations.filter((spot) =>
      favoriteSpotKeys.has(getSpotKey(spot.lat, spot.lng))
    );
  }, [favoriteSpotKeys, getSpotKey, visibleStargazeLocations]);

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
  }, []);

  const handleTogglePinnedFavorite = useCallback(() => {
    if (!placedMarker) return;
    const { lat, lng } = placedMarker;
    const key = getSpotKey(lat, lng);
    const isCurrentlyFavorite = favoriteSpotKeys.has(key);
    setFavoriteSpots((prev) => {
      const exists = prev.some((item) => item.key === key);
      if (exists) {
        return prev.filter((item) => item.key !== key);
      }
      return [...prev, { key, lat, lng }];
    });
    if (isCurrentlyFavorite) {
      persistRemoveFavoriteSpot({ lat, lng });
      setSelectedDarkSpot((prev) => {
        if (!prev) return prev;
        const currentKey = getSpotKey(prev.lat, prev.lng);
        if (currentKey !== key) return prev;
        return null;
      });
    } else {
      setSelectedDarkSpot({ lat, lng, label: "Favorite spot" });
      persistFavoriteSpot(lat, lng);
    }
    setPlacedMarker((prev) => {
      if (!prev) return prev;
      return { ...prev, isFavorite: !prev.isFavorite };
    });
  }, [
    favoriteSpotKeys,
    getSpotKey,
    placedMarker,
    persistFavoriteSpot,
    persistRemoveFavoriteSpot,
  ]);

  const handleTogglePinnedTarget = useCallback(() => {
    if (!placedMarker?.isFavorite) return;
    const { lat, lng } = placedMarker;
    const key = getSpotKey(lat, lng);
    const isSelected =
      selectedDarkSpot &&
      getSpotKey(selectedDarkSpot.lat, selectedDarkSpot.lng) === key;
    if (isSelected) {
      setSelectedDarkSpot(null);
      return;
    }
    setSelectedDarkSpot({ lat, lng, label: "Favorite spot" });
  }, [getSpotKey, placedMarker, selectedDarkSpot]);

  const handleToggleStargazeTarget = useCallback(
    (spot) => {
      if (!spot) return;
      const spotKey = getSpotKey(spot.lat, spot.lng);
      const isSelected =
        selectedDarkSpot &&
        getSpotKey(selectedDarkSpot.lat, selectedDarkSpot.lng) === spotKey;
      if (isSelected) {
        setSelectedDarkSpot(null);
        return;
      }
      setSelectedDarkSpot({
        lat: spot.lat,
        lng: spot.lng,
        label: spot.name || "Stargazing spot",
      });
    },
    [getSpotKey, selectedDarkSpot]
  );

  const handleRemoveFavoriteSpot = useCallback(
    (spotKey) => {
      if (!spotKey) return;
      const existing = favoriteSpots.find((item) => item.key === spotKey);
      if (existing) {
        persistRemoveFavoriteSpot({
          lat: existing.lat,
          lng: existing.lng,
          spotId: existing.spotId,
        });
      }
      setFavoriteSpots((prev) => prev.filter((item) => item.key !== spotKey));
      setSelectedDarkSpot((prev) => {
        if (!prev) return prev;
        const currentKey = getSpotKey(prev.lat, prev.lng);
        if (currentKey !== spotKey) return prev;
        return null;
      });
      setPlacedMarker((prev) => {
        if (!prev) return prev;
        const currentKey = getSpotKey(prev.lat, prev.lng);
        if (currentKey !== spotKey) return prev;
        return { ...prev, isFavorite: false };
      });
    },
    [favoriteSpots, getSpotKey, persistRemoveFavoriteSpot]
  );

  const handleRemoveFavoriteSpotAnimated = useCallback(
    (spotKey) => {
      if (!spotKey) return;
      if (favoriteRemovalTimeoutsRef.current.has(spotKey)) return;

      setSelectedDarkSpot((prev) => {
        if (!prev) return prev;
        const currentKey = getSpotKey(prev.lat, prev.lng);
        if (currentKey !== spotKey) return prev;
        return null;
      });
      setExitingFavoriteKeys((prev) =>
        prev.includes(spotKey) ? prev : [...prev, spotKey]
      );

      const timeoutId = setTimeout(() => {
        favoriteRemovalTimeoutsRef.current.delete(spotKey);
        setExitingFavoriteKeys((prev) => prev.filter((key) => key !== spotKey));
        handleRemoveFavoriteSpot(spotKey);
      }, FAVORITE_EXIT_MS);

      favoriteRemovalTimeoutsRef.current.set(spotKey, timeoutId);
    },
    [getSpotKey, handleRemoveFavoriteSpot]
  );

  const handleToggleStargazeFavorite = useCallback(
    (spot) => {
      if (!spot) return;
      const key = getSpotKey(spot.lat, spot.lng);
      const isFavorite = favoriteSpotKeys.has(key);
      if (isFavorite) {
        handleRemoveFavoriteSpotAnimated(key);
        return;
      }
      setFavoriteSpots((prev) => [
        ...prev,
        { key, lat: spot.lat, lng: spot.lng },
      ]);
      persistFavoriteSpot(spot.lat, spot.lng);
    },
    [
      favoriteSpotKeys,
      getSpotKey,
      handleRemoveFavoriteSpotAnimated,
      persistFavoriteSpot,
    ]
  );

  const handleToggleDarkSpotTarget = useCallback(
    (spot) => {
      if (!spot) return;
      const isSelected =
        selectedDarkSpot &&
        Math.abs(selectedDarkSpot.lat - spot.lat) < 1e-6 &&
        Math.abs(selectedDarkSpot.lng - spot.lon) < 1e-6;
      if (isSelected) {
        setSelectedDarkSpot(null);
        return;
      }
      setSelectedDarkSpot({
        lat: spot.lat,
        lng: spot.lon,
        label: "Stargazing spot",
      });
    },
    [selectedDarkSpot]
  );

  const isPinnedTarget =
    placedMarker?.isFavorite &&
    selectedDarkSpot &&
    getSpotKey(placedMarker.lat, placedMarker.lng) ===
      getSpotKey(selectedDarkSpot.lat, selectedDarkSpot.lng);

  return {
    refs: {
      mapRef,
      planetPanelRef,
      stargazeMarkerRefs,
      placedMarkerRef,
    },
    ui: {
      isMobileView,
      isPopupOpen,
      isSearchFocused,
      isPlanetPanelOpen,
      setIsPopupOpen,
      setIsSearchFocused,
      setIsPlanetPanelOpen,
    },
    state: {
      placedMarker,
      exitingMarker,
      contextMenu,
      darkSpots,
      selectedDarkSpot,
      latestGridShot,
      activeStargazeId,
      stargazePanelSpot,
      isStargazePanelOpen,
    },
    derived: {
      visibleStargazeLocations,
      activeStargazeSpot,
      favoriteSpotKeys,
      exitingFavoriteKeySet,
      reducedMotion,
      hasAnyLocation,
      quickPlanetsTitle,
      quickDarkSpotsTitle,
      searchPlaceholder,
      favoriteOnlySpots,
      favoriteStargazeSpots,
      isPinnedTarget,
    },
    planets: {
      visiblePlanets,
      planetsLoading,
      planetsError,
      planetQuery,
    },
    handlers: {
      setActiveStargazeId,
      setSelectedDarkSpot,
      setPlacedMarker,
      setExitingMarker,
      setContextMenu,
      setDarkSpots,
      setFavoriteSpots,
      setStargazePanelSpot,
      setIsStargazePanelOpen,
      setExitingFavoriteKeys,
      centerOnCoords,
      getSpotKey,
      openStargazePanel,
      closeStargazePanel,
      handleCoordinateSearch,
      handleStargazeSearch,
      handleCloseStargazePanel,
      handlePopupClose,
      handleTileLoad,
      handleSnapToLocation,
      handleDoubleClick,
      handleGetVisiblePlanets,
      handleFetchDarkSpots,
      buildDirectionsUrl,
      getDirectionsOrigin,
      handleShareLocation,
      flashShareToggle,
      handleGetDirections,
      handleCloseContextMenu,
      handleToggleDarkSpotFavorite,
      handleToggleDarkSpotTarget,
      handleTogglePinnedFavorite,
      handleTogglePinnedTarget,
      handleToggleStargazeTarget,
      handleRemoveFavoriteSpotAnimated,
      handleToggleStargazeFavorite,
      handleToggleLightOverlay,
      handleSearchDistanceChange,
      zoomOutToMin,
    },
  };
};

export default useMapViewState;
