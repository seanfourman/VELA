import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./MapView/mapView.css";
import "./MapView/leaflet-overrides.css";
import PlanetPanelContainer from "./PlanetPanel/PlanetPanelContainer";
import MapTypeSwitcher from "./MapView/MapTypeSwitcher";
import ContextMenuPopup from "./MapView/ContextMenuPopup";
import SkyQualityInfo from "./MapView/SkyQualityInfo";
import MapQuickActions from "./MapView/MapQuickActions";
import LocationSearchBar from "./MapView/LocationSearchBar";
import StargazePanel from "./MapView/StargazePanel";
import StargazePanelMobile from "./MapView/StargazePanelMobile";
import usePlanets from "../../hooks/usePlanets";
import { preloadAllPlanetTextures } from "../../utils/planetUtils";
import { isProbablyHardwareAccelerated } from "../../utils/hardwareUtils";
import { fetchDarkSpots } from "../../utils/darkSpots";
import { getLightmapTileUrlTemplate } from "../../utils/awsEndpoints";
import {
  deleteFavoriteSpot,
  fetchFavoriteSpots,
  saveFavoriteSpot,
} from "../../utils/favoritesApi";
import showPopup from "../../utils/popup";
import SearchDistanceSelector from "./MapView/SearchDistanceSelector";
import targetIcon from "../../assets/icons/target-icon.svg";
import favoriteIcon from "../../assets/icons/favorite-icon.svg";
import favoriteFullIcon from "../../assets/icons/favorite-full-icon.svg";
import starFullIcon from "../../assets/icons/star-full-icon.svg";
import shareIcon from "../../assets/icons/share-icon.svg";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || "";
const LOCATION_ZOOM = 16;
const DEFAULT_CENTER = [20, 0];
const DEFAULT_ZOOM = 2;
const MIN_ZOOM = 4;
const MAX_ZOOM = 16;
const LONG_PRESS_MS = 750;
const MARKER_EXIT_MS = 280;
const FAVORITE_EXIT_MS = 260;
const STARGAZE_PANEL_EXIT_MS = 320;
const LIGHT_TILE_URL = getLightmapTileUrlTemplate();

const isCoarsePointerEnv = () => {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(pointer: coarse)")?.matches) return true;
  return typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
};

const MAP_TILES = {
  dark: {
    url: `https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
    attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>',
  },
  light: {
    url: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
    attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>',
  },
  satellite: {
    url: `https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`,
    attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>',
  },
};

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const customIcon = new L.DivIcon({
  className: "custom-marker",
  html: `
    <div class="marker-pin">
      <div class="marker-pulse"></div>
      <div class="marker-dot"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const pinIcon = new L.DivIcon({
  className: "custom-marker placed-pin",
  html: `
    <div class="marker-pin placed">
      <div class="marker-dot placed"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const pinIconRemoving = new L.DivIcon({
  className: "custom-marker placed-pin removing",
  html: `
    <div class="marker-pin placed removing">
      <div class="marker-dot placed removing"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const favoritePinIconRemoving = new L.DivIcon({
  className: "custom-marker favorite-marker removing",
  html: `
    <div class="marker-pin favorite-pin removing">
      <div class="marker-dot favorite-dot removing">
        <img class="favorite-heart" src="${favoriteFullIcon}" alt="" aria-hidden="true" />
      </div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const darkSpotIcon = new L.DivIcon({
  className: "custom-marker dark-spot-marker",
  html: `
    <div class="marker-pin dark-spot">
      <div class="marker-pulse"></div>
      <div class="marker-dot dark-spot"></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const stargazeIcon = new L.DivIcon({
  className: "custom-marker stargaze-marker",
  html: `
    <div class="marker-pin stargaze-pin">
      <div class="marker-dot stargaze-dot">
        <img class="stargaze-star" src="${starFullIcon}" alt="" aria-hidden="true" />
      </div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const favoriteSpotIcon = new L.DivIcon({
  className: "custom-marker favorite-marker",
  html: `
    <div class="marker-pin favorite-pin">
      <div class="marker-dot favorite-dot">
        <img class="favorite-heart" src="${favoriteFullIcon}" alt="" aria-hidden="true" />
      </div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const favoriteSpotIconTransition = new L.DivIcon({
  className: "custom-marker favorite-marker favorite-transition",
  html: `
    <div class="marker-pin favorite-pin">
      <div class="marker-dot favorite-dot">
        <img class="favorite-heart" src="${favoriteFullIcon}" alt="" aria-hidden="true" />
      </div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

function MapAnimator({ location, shouldAutoCenter }) {
  const map = useMap();
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!shouldAutoCenter) return;
    if (location && !hasAnimated.current) {
      hasAnimated.current = true;

      map.flyTo([location.lat, location.lng], LOCATION_ZOOM, {
        duration: 2.5,
        easeLinearity: 0.25,
      });
    }
  }, [location, map, shouldAutoCenter]);

  return null;
}

function MapController({ mapRef }) {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  return null;
}

function DoubleClickHandler({ onDoubleClick }) {
  useMapEvents({
    dblclick: (e) => {
      const isTouchEvent =
        e.originalEvent?.pointerType === "touch" ||
        e.originalEvent?.pointerType === "pen" ||
        Boolean(e.originalEvent?.touches?.length);

      if (isTouchEvent || isCoarsePointerEnv()) return;

      L.DomEvent.stopPropagation(e);
      onDoubleClick(e.latlng);
    },
  });
  return null;
}

function LongPressHandler({ onLongPress, delayMs = LONG_PRESS_MS }) {
  const map = useMap();
  const timerRef = useRef(null);
  const startPointRef = useRef(null);
  const lastEventRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const cancelTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = (e) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    startPointRef.current = map.latLngToContainerPoint(e.latlng);
    lastEventRef.current = e;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (lastEventRef.current?.originalEvent) {
        L.DomEvent.stop(lastEventRef.current.originalEvent);
      }
      onLongPress(lastEventRef.current?.latlng ?? e.latlng);
    }, delayMs);
  };

  const handleMove = (e) => {
    if (!timerRef.current || !startPointRef.current) return;
    const currentPoint = map.latLngToContainerPoint(e.latlng);
    if (startPointRef.current.distanceTo(currentPoint) > 10) {
      cancelTimer();
    }
  };

  useMapEvents({
    // Pointer events (Leaflet uses these when available)
    pointerdown: (e) => {
      startTimer(e);
    },
    pointermove: handleMove,
    pointerup: cancelTimer,
    pointercancel: cancelTimer,

    // Fallback for older mobile browsers without Pointer Events
    touchstart: (e) => {
      if (e.originalEvent?.touches?.length !== 1) return;
      startTimer(e);
    },
    touchmove: handleMove,
    touchend: cancelTimer,
    touchcancel: cancelTimer,

    // Fallback: Leaflet fires contextmenu on long-press/right-click
    contextmenu: (e) => {
      const btn = e.originalEvent?.button;
      const pointerType = e.originalEvent?.pointerType;
      if (btn === 2 || pointerType === "mouse") return;
      cancelTimer();
      if (e.originalEvent) L.DomEvent.stop(e.originalEvent);
      onLongPress(e.latlng);
    },
  });

  return null;
}

function PopupStateHandler({ onPopupStateChange, onPopupClose }) {
  const map = useMapEvents({});

  useEffect(() => {
    if (!map || !onPopupStateChange) return undefined;

    const refresh = () => {
      const popup = map._popup;
      const hasPopup = Boolean(popup && map.hasLayer(popup));
      onPopupStateChange(hasPopup);
    };

    const handleOpen = () => {
      requestAnimationFrame(refresh);
    };

    const handleClose = (event) => {
      requestAnimationFrame(refresh);
      onPopupClose?.(event);
    };

    map.on("popupopen", handleOpen);
    map.on("popupclose", handleClose);
    refresh();

    return () => {
      map.off("popupopen", handleOpen);
      map.off("popupclose", handleClose);
    };
  }, [map, onPopupClose, onPopupStateChange]);

  return null;
}

const MapView = forwardRef(function MapView(
  {
    location,
    locationStatus,
    mapType,
    setMapType,
    stargazeLocations = [],
    isAuthenticated,
    authToken,
    directionsProvider = "google",
    showRecommendedSpots = true,
    lightOverlayEnabled = false,
    onToggleLightOverlay,
    searchDistance = 10,
    onSearchDistanceChange,
    autoCenterOnLocate = true,
  },
  ref
) {
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

  const centerOnCoords = (lat, lng) => {
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
  };

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
    (location) => {
      if (!location) return;
      setActiveStargazeId(location.id);
      flyToCoordinates(location.lat, location.lng, LOCATION_ZOOM);
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
  }, [
    activeStargazeSpot,
    closeStargazePanel,
    isMobileView,
    openStargazePanel,
  ]);

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

  const handleSnapToLocation = () => {
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
  };

  const handleDoubleClick = (latlng) => {
    if (removalTimeoutRef.current) {
      clearTimeout(removalTimeoutRef.current);
    }

    if (placedMarker) {
      setExitingMarker(placedMarker);
      removalTimeoutRef.current = setTimeout(() => {
        setExitingMarker(null);
      }, MARKER_EXIT_MS);
    }

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
  };

  const handleGetVisiblePlanets = () => {
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
  };

  const handleFetchDarkSpots = async () => {
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
  };

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
    async (coords, label = "Location") => {
      const lat = Number(coords?.lat);
      const lng = Number(coords?.lng);
      const url = buildShareUrl({ lat, lng });
      if (!url) {
        showPopup("No coordinates available to share.", "warning", {
          duration: 2200,
        });
        return;
      }

      const coordsLabel = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      if (navigator?.share) {
        try {
          await navigator.share({
            title: label || "Location",
            text: coordsLabel,
            url,
          });
          return;
        } catch (error) {
          if (error?.name === "AbortError") return;
        }
      }

      window.open(url, "_blank", "noopener,noreferrer");
      showPopup("Opened Google Maps.", "info", { duration: 2000 });
    },
    [buildShareUrl, showPopup]
  );

  const handleGetDirections = () => {
    const target = placedMarker || contextMenu;
    if (!target) return;
    const origin = location
      ? { lat: location.lat, lng: location.lng }
      : null;
    const url = buildDirectionsUrl(origin, target);
    if (!url) return;
    window.open(url, "_blank");
  };

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

  const handleCloseContextMenu = () => {
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
  };

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

  useImperativeHandle(ref, () => ({ zoomOutToMin }), [zoomOutToMin]);

  const isPinnedTarget =
    placedMarker?.isFavorite &&
    selectedDarkSpot &&
    getSpotKey(placedMarker.lat, placedMarker.lng) ===
      getSpotKey(selectedDarkSpot.lat, selectedDarkSpot.lng);

  return (
    <div
      className={`map-container visible ${mapType}${
        isSearchFocused ? " search-focused" : ""
      }${isPopupOpen ? " popup-open" : ""}`}
    >
      <PlanetPanelContainer
        ref={planetPanelRef}
        planets={visiblePlanets}
        loading={planetsLoading}
        error={planetsError}
        mapType={mapType}
        reducedMotion={reducedMotion}
        location={location}
        onVisibilityChange={setIsPlanetPanelOpen}
      />

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
        doubleClickZoom={false}
        minZoom={MIN_ZOOM}
        maxBounds={[
          [-85, -180],
          [85, 180],
        ]}
        maxBoundsViscosity={1.0}
        maxZoom={MAX_ZOOM}
      >
        <TileLayer
          key={mapType}
          attribution={MAP_TILES[mapType].attribution}
          url={MAP_TILES[mapType].url}
          maxZoom={MAX_ZOOM}
          keepBuffer={4}
          updateWhenIdle={true}
          updateWhenZooming={false}
          noWrap={true}
          eventHandlers={{
            tileload: handleTileLoad,
          }}
        />

        {lightOverlayEnabled && (
          <TileLayer
            url={LIGHT_TILE_URL}
            attribution="WA2015 artificial sky brightness"
            opacity={0.72}
            zIndex={5}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            tileSize={256}
          />
        )}

        <MapController mapRef={mapRef} />
        <DoubleClickHandler onDoubleClick={handleDoubleClick} />
        <LongPressHandler
          onLongPress={handleDoubleClick}
          delayMs={LONG_PRESS_MS}
        />
        <PopupStateHandler
          onPopupStateChange={setIsPopupOpen}
          onPopupClose={handlePopupClose}
        />
        {location && (
          <MapAnimator
            location={location}
            shouldAutoCenter={autoCenterOnLocate}
          />
        )}

        {location && (
          <Marker
            position={[location.lat, location.lng]}
            icon={customIcon}
            eventHandlers={{
              popupopen: () => centerOnCoords(location.lat, location.lng),
            }}
          >
            <Popup>
              <div className="context-menu-popup">
                <div className="popup-coords">
                  <span className="popup-coords-label">Your location</span>
                  <span className="popup-coords-value">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </span>
                </div>

                <SkyQualityInfo
                  lat={location.lat}
                  lng={location.lng}
                  variant="compact"
                />
              </div>
            </Popup>
          </Marker>
        )}

        {exitingMarker && (
          <Marker
            key={`removing-${
              exitingMarker.id || `${exitingMarker.lat}-${exitingMarker.lng}`
            }`}
            position={[exitingMarker.lat, exitingMarker.lng]}
            icon={
              exitingMarker.isFavorite
                ? favoritePinIconRemoving
                : pinIconRemoving
            }
            interactive={false}
          />
        )}

        {placedMarker && (
          <Marker
            key={`placed-${placedMarker.id}`}
            position={[placedMarker.lat, placedMarker.lng]}
            icon={placedMarker.isFavorite ? favoriteSpotIcon : pinIcon}
            ref={(marker) => {
              placedMarkerRef.current = marker || null;
            }}
            eventHandlers={{
              popupopen: () =>
                centerOnCoords(placedMarker.lat, placedMarker.lng),
            }}
          >
            <Popup>
              <ContextMenuPopup
                coords={placedMarker}
                onGetDirections={handleGetDirections}
                onRemovePin={handleCloseContextMenu}
                isAuthenticated={Boolean(isAuthenticated)}
                isFavorite={Boolean(placedMarker.isFavorite)}
                onToggleFavorite={handleTogglePinnedFavorite}
                coordsLabel={
                  placedMarker.isFavorite ? "Favorited spot" : "Pinned location"
                }
                isTarget={Boolean(isPinnedTarget)}
                onToggleTarget={
                  placedMarker.isFavorite ? handleTogglePinnedTarget : null
                }
                onShareLocation={() =>
                  handleShareLocation(
                    placedMarker,
                    placedMarker.isFavorite ? "Favorite spot" : "Pinned location"
                  )
                }
              />
            </Popup>
          </Marker>
        )}

        {Array.isArray(visibleStargazeLocations) &&
          visibleStargazeLocations.map((spot) => {
            const spotKey = getSpotKey(spot.lat, spot.lng);
            const isFavoriteSpot = favoriteSpotKeys.has(spotKey);
            const isTarget =
              selectedDarkSpot &&
              Math.abs(selectedDarkSpot.lat - spot.lat) < 1e-6 &&
              Math.abs(selectedDarkSpot.lng - spot.lng) < 1e-6;
            const directionsOrigin = getDirectionsOrigin();
            const directionsUrl = buildDirectionsUrl(directionsOrigin, spot);
            const handleDirections = directionsUrl
              ? () => {
                  window.open(directionsUrl, "_blank");
                }
              : null;

            return (
              <Marker
                key={`stargaze-${spot.id}`}
                position={[spot.lat, spot.lng]}
                icon={stargazeIcon}
                ref={(marker) => {
                  if (marker) {
                    stargazeMarkerRefs.current.set(spot.id, marker);
                  } else {
                    stargazeMarkerRefs.current.delete(spot.id);
                  }
                }}
                eventHandlers={{
                  click: () => {
                    setActiveStargazeId(spot.id);
                  },
                  popupopen: () => {
                    setActiveStargazeId(spot.id);
                    centerOnCoords(spot.lat, spot.lng);
                    if (!isMobileView) {
                      openStargazePanel(spot);
                    }
                  },
                  popupclose: () => {
                    setActiveStargazeId((prev) =>
                      prev === spot.id ? null : prev
                    );
                  },
                }}
              >
                <Popup>
                  <ContextMenuPopup
                    coords={{ lat: spot.lat, lng: spot.lng }}
                    onGetDirections={handleDirections}
                    onExtraAction={
                      isMobileView
                        ? () => {
                            openStargazePanel(spot);
                            mapRef.current?.closePopup();
                          }
                        : null
                    }
                    isAuthenticated={Boolean(isAuthenticated)}
                    isFavorite={Boolean(isFavoriteSpot)}
                    onToggleFavorite={
                      isAuthenticated
                        ? () => handleToggleStargazeFavorite(spot)
                        : null
                    }
                    coordsLabel="Recommended spot"
                    extraActionLabel="Details"
                    isTarget={Boolean(isTarget)}
                    onToggleTarget={() => handleToggleStargazeTarget(spot)}
                    onShareLocation={() =>
                      handleShareLocation(
                        { lat: spot.lat, lng: spot.lng },
                        spot.name || "Recommended spot"
                      )
                    }
                  />
                </Popup>
              </Marker>
            );
          })}

        {favoriteStargazeSpots.map((spot) => {
          const spotKey = getSpotKey(spot.lat, spot.lng);
          const isExiting = exitingFavoriteKeySet.has(spotKey);
          return (
            <Marker
              key={`favorite-stargaze-${spot.id}`}
              position={[spot.lat, spot.lng]}
              icon={
                isExiting ? favoritePinIconRemoving : favoriteSpotIconTransition
              }
              interactive={false}
            />
          );
        })}

        {darkSpots.map((spot, i) => {
          const isFavoriteSpot = favoriteSpotKeys.has(
            getSpotKey(spot.lat, spot.lon)
          );
          return (
            <Marker
              key={`darkspot-${i}`}
              position={[spot.lat, spot.lon]}
              icon={isFavoriteSpot ? favoriteSpotIcon : darkSpotIcon}
              eventHandlers={{
                popupopen: () => centerOnCoords(spot.lat, spot.lon),
              }}
            >
              <Popup>
                <div className="context-menu-popup darkspot-popup">
                  {(() => {
                    const isSelected =
                      selectedDarkSpot &&
                      Math.abs(selectedDarkSpot.lat - spot.lat) < 1e-6 &&
                      Math.abs(selectedDarkSpot.lng - spot.lon) < 1e-6;
                    const buttonLabel = isSelected
                      ? "This spot is the active target"
                      : "Use this spot for quick actions";
                    const hoverLabel = isSelected
                      ? "Active target"
                      : "Set as target";
                    const favoriteLabel = isFavoriteSpot
                      ? "Favorited"
                      : "Favorite";
                    const favoriteButtonLabel = isFavoriteSpot
                      ? "Remove from favorites"
                      : "Add to favorites";
                    const canFavorite = Boolean(isAuthenticated);
                    const canShare = true;
                    const toggleCount =
                      1 + Number(canFavorite) + Number(canShare);
                    const toggleLayout =
                      toggleCount > 1 ? "dual" : "single";
                    return (
                      <div
                        className="target-toggle-row"
                        data-layout={toggleLayout}
                      >
                        <div className="target-toggle-wrapper">
                          <button
                            className={`target-toggle${
                              isSelected ? " active" : ""
                            }`}
                            aria-label={buttonLabel}
                            onClick={(event) => {
                              event.currentTarget.blur();
                              if (isSelected) {
                                setSelectedDarkSpot(null);
                                return;
                              }
                              setSelectedDarkSpot({
                                lat: spot.lat,
                                lng: spot.lon,
                                label: "Stargazing spot",
                              });
                            }}
                          >
                            <img
                              src={targetIcon}
                              alt=""
                              aria-hidden="true"
                              className="target-toggle-icon"
                            />
                          </button>
                          <span
                            className={`target-toggle-label${
                              isSelected ? " active" : ""
                            }`}
                            aria-hidden="true"
                          >
                            {hoverLabel}
                          </span>
                        </div>
                        {canFavorite ? (
                          <div className="target-toggle-wrapper">
                            <button
                              className={`target-toggle favorite-toggle${
                                isFavoriteSpot ? " active" : ""
                              }`}
                              aria-label={favoriteButtonLabel}
                              onClick={(event) => {
                                event.currentTarget.blur();
                                handleToggleDarkSpotFavorite(spot);
                              }}
                            >
                              <img
                                src={favoriteIcon}
                                alt=""
                                aria-hidden="true"
                                className="favorite-toggle-icon"
                              />
                            </button>
                            <span
                              className={`target-toggle-label favorite-toggle-label${
                                isFavoriteSpot ? " active" : ""
                              }`}
                              aria-hidden="true"
                            >
                              {favoriteLabel}
                            </span>
                          </div>
                        ) : null}
                        {canShare ? (
                          <div className="target-toggle-wrapper">
                            <button
                              className="target-toggle share-toggle"
                              aria-label="Share this location"
                              onClick={(event) => {
                                event.currentTarget.blur();
                                handleShareLocation(
                                  { lat: spot.lat, lng: spot.lon },
                                  "Stargazing spot"
                                );
                              }}
                            >
                              <img
                                src={shareIcon}
                                alt=""
                                aria-hidden="true"
                                className="target-toggle-icon"
                              />
                            </button>
                            <span className="target-toggle-label" aria-hidden="true">
                              Share
                            </span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                  <div className="popup-coords">
                    <span className="popup-coords-label">
                      Stargazing location
                    </span>
                    <span className="popup-coords-value">
                      {spot.lat.toFixed(4)}, {spot.lon.toFixed(4)}
                    </span>
                  </div>

                  <SkyQualityInfo
                    lat={spot.lat}
                    lng={spot.lon}
                    variant="compact"
                  />

                  <div className="darkspot-stats">
                    <div className="darkspot-stat">
                      <span className="darkspot-stat-label">
                        Level
                        <span
                          className="stat-help"
                          tabIndex={0}
                          aria-label="Darkness rating: lower numbers are darker skies (1-5)"
                          data-tooltip="Darkness rating: lower numbers are darker skies (1-5)"
                        >
                          ?
                        </span>
                      </span>
                      <span className="darkspot-stat-value">
                        {spot.level ?? "--"}
                      </span>
                    </div>
                    <div className="darkspot-stat">
                      <span className="darkspot-stat-label">
                        Light value
                        <span
                          className="stat-help"
                          tabIndex={0}
                          aria-label="Modeled brightness at the site (ucd/m²)"
                          data-tooltip="Modeled brightness at the site (ucd/m²)"
                        >
                          ?
                        </span>
                      </span>
                      <span className="darkspot-stat-value">
                        {spot.light_value != null
                          ? spot.light_value.toFixed(2)
                          : "--"}
                      </span>
                    </div>
                  </div>
                  <div className="popup-actions">
                    {(() => {
                      const origin = getDirectionsOrigin();
                      const directionsUrl = buildDirectionsUrl(origin, {
                        lat: spot.lat,
                        lng: spot.lon,
                      });
                      if (!directionsUrl) return null;
                      return (
                        <button
                          className="popup-btn"
                          onClick={() => {
                            window.open(directionsUrl, "_blank");
                          }}
                        >
                          Get Directions
                          {origin ? (
                            <>
                              <br />
                              (from {origin.label.toLowerCase()})
                            </>
                          ) : null}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {favoriteOnlySpots.map((spot) => {
          const directionsOrigin = getDirectionsOrigin();
          const isExiting = exitingFavoriteKeySet.has(spot.key);
          const isSelected =
            selectedDarkSpot &&
            Math.abs(selectedDarkSpot.lat - spot.lat) < 1e-6 &&
            Math.abs(selectedDarkSpot.lng - spot.lng) < 1e-6;
          const directionsUrl = buildDirectionsUrl(directionsOrigin, spot);
          const handleDirections = directionsUrl
            ? () => {
                window.open(directionsUrl, "_blank");
              }
            : null;
          const handleRemoveFavorite = () =>
            handleRemoveFavoriteSpotAnimated(spot.key);
          const handleToggleTarget = () => {
            if (isSelected) {
              setSelectedDarkSpot(null);
              return;
            }
            setSelectedDarkSpot({
              lat: spot.lat,
              lng: spot.lng,
              label: "Favorite spot",
            });
          };

          return (
            <Marker
              key={`favorite-${spot.key}`}
              position={[spot.lat, spot.lng]}
              icon={isExiting ? favoritePinIconRemoving : favoriteSpotIcon}
            >
              <Popup className={isExiting ? "popup-exiting" : undefined}>
                <ContextMenuPopup
                  coords={{ lat: spot.lat, lng: spot.lng }}
                  onGetDirections={handleDirections}
                  onRemovePin={isAuthenticated ? handleRemoveFavorite : null}
                  isAuthenticated={Boolean(isAuthenticated)}
                  isFavorite={true}
                  onToggleFavorite={
                    isAuthenticated ? handleRemoveFavorite : null
                  }
                  coordsLabel="Favorited spot"
                  removeLabel="Remove Favorite"
                  isTarget={Boolean(isSelected)}
                  onToggleTarget={handleToggleTarget}
                  onShareLocation={() =>
                    handleShareLocation(
                      { lat: spot.lat, lng: spot.lng },
                      "Favorite spot"
                    )
                  }
                />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <StargazePanel
        spot={stargazePanelSpot}
        isOpen={isStargazePanelOpen && !isMobileView}
        onClose={handleCloseStargazePanel}
        directionsProvider={directionsProvider}
      />
      <StargazePanelMobile
        spot={stargazePanelSpot}
        isOpen={isStargazePanelOpen && isMobileView}
        onClose={handleCloseStargazePanel}
        directionsProvider={directionsProvider}
      />

      <MapQuickActions
        onShowPlanets={handleGetVisiblePlanets}
        onFindDarkSpots={handleFetchDarkSpots}
        canShowPlanets={hasAnyLocation}
        canFindDarkSpots={hasAnyLocation}
        planetsTitle={quickPlanetsTitle}
        darkSpotsTitle={quickDarkSpotsTitle}
        locationStatus={locationStatus}
        onSnapToLocation={
          locationStatus === "active" ? handleSnapToLocation : undefined
        }
        lightOverlayEnabled={lightOverlayEnabled}
        onToggleLightOverlay={handleToggleLightOverlay}
      />

      <SearchDistanceSelector
        value={searchDistance}
        onChange={handleSearchDistanceChange}
        hidden={isPlanetPanelOpen}
      />

      <LocationSearchBar
        locations={visibleStargazeLocations}
        placeholder={searchPlaceholder}
        onSelectCoordinates={handleCoordinateSearch}
        onSelectLocation={handleStargazeSearch}
        onFocusChange={setIsSearchFocused}
      />

      <MapTypeSwitcher
        mapType={mapType}
        onChange={setMapType}
        previewKey={MAPTILER_KEY}
        latestGridShot={latestGridShot}
      />
    </div>
  );
});

MapView.displayName = "MapView";

export default MapView;
