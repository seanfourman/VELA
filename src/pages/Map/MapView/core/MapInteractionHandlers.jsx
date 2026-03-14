import { useCallback, useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { isCoarsePointerEnv } from "./mapUtils";
import { LOCATION_ZOOM, LONG_PRESS_MS } from "./mapConfig";

const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

const getClientPoint = (event) => {
  if (!Number.isFinite(event?.clientX) || !Number.isFinite(event?.clientY)) {
    return null;
  }
  return { x: event.clientX, y: event.clientY };
};

const isInteractiveTarget = (target) => {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      ".leaflet-control, .leaflet-popup, .leaflet-marker-icon, .leaflet-marker-shadow, .leaflet-interactive"
    ),
  );
};

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

function MapZoomTracker({ onZoomChange }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange?.(map.getZoom());
    },
  });

  useEffect(() => {
    onZoomChange?.(map.getZoom());
  }, [map, onZoomChange]);

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
  const startLatLngRef = useRef(null);
  const trackedPointerIdRef = useRef(null);
  const lastLongPressAtRef = useRef(0);

  const mapContainerToLatLng = useCallback(
    (point) => {
      const bounds = map.getContainer().getBoundingClientRect();
      return map.containerPointToLatLng([point.x - bounds.left, point.y - bounds.top]);
    },
    [map],
  );

  const clearTracking = useCallback(() => {
    startPointRef.current = null;
    startLatLngRef.current = null;
    trackedPointerIdRef.current = null;
  }, []);

  const cancelTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    clearTracking();
  }, [clearTracking]);

  const emitLongPress = useCallback(
    (latlng) => {
      const now = Date.now();
      if (now - lastLongPressAtRef.current < 400) return;
      lastLongPressAtRef.current = now;
      onLongPress(latlng);
    },
    [onLongPress],
  );

  const startTimer = useCallback(
    (point, latlng) => {
      cancelTimer();
      startPointRef.current = L.point(point.x, point.y);
      startLatLngRef.current = latlng;

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const nextLatLng = startLatLngRef.current;
        clearTracking();
        if (!nextLatLng) return;
        emitLongPress(nextLatLng);
      }, delayMs);
    },
    [cancelTimer, clearTracking, delayMs, emitLongPress],
  );

  const handleMove = useCallback(
    (point) => {
      if (!timerRef.current || !startPointRef.current) return;
      const currentPoint = L.point(point.x, point.y);
      if (
        startPointRef.current.distanceTo(currentPoint) >
        LONG_PRESS_MOVE_TOLERANCE_PX
      ) {
        cancelTimer();
      }
    },
    [cancelTimer],
  );

  useEffect(() => {
    const container = map.getContainer();
    const hasPointerEvents =
      typeof window !== "undefined" && "PointerEvent" in window;

    const handlePointerDown = (event) => {
      if (event.pointerType === "mouse") return;
      if (event.button !== undefined && event.button !== 0) return;
      if (event.isPrimary === false) return;
      if (isInteractiveTarget(event.target)) return;

      const point = getClientPoint(event);
      if (!point) return;

      startTimer(point, mapContainerToLatLng(point));
      trackedPointerIdRef.current = event.pointerId;
    };

    const handlePointerMove = (event) => {
      if (
        trackedPointerIdRef.current !== null &&
        event.pointerId !== trackedPointerIdRef.current
      ) {
        return;
      }

      const point = getClientPoint(event);
      if (!point) return;
      handleMove(point);
    };

    const handlePointerEnd = (event) => {
      if (
        trackedPointerIdRef.current !== null &&
        event.pointerId !== trackedPointerIdRef.current
      ) {
        return;
      }
      cancelTimer();
    };

    const handleTouchStart = (event) => {
      if (event.touches?.length !== 1) {
        cancelTimer();
        return;
      }
      if (isInteractiveTarget(event.target)) return;

      const point = getClientPoint(event.touches[0]);
      if (!point) return;
      startTimer(point, mapContainerToLatLng(point));
    };

    const handleTouchMove = (event) => {
      if (event.touches?.length !== 1) {
        cancelTimer();
        return;
      }

      const point = getClientPoint(event.touches[0]);
      if (!point) return;
      handleMove(point);
    };

    const handleContextMenu = (event) => {
      if (event.button === 2 || event.pointerType === "mouse") return;
      if (isInteractiveTarget(event.target)) return;

      const point = getClientPoint(event) ?? getClientPoint(event.changedTouches?.[0]);
      if (!point) return;

      cancelTimer();
      L.DomEvent.stop(event);
      emitLongPress(mapContainerToLatLng(point));
    };

    if (hasPointerEvents) {
      container.addEventListener("pointerdown", handlePointerDown, true);
      container.addEventListener("pointermove", handlePointerMove, true);
      container.addEventListener("pointerup", handlePointerEnd, true);
      container.addEventListener("pointercancel", handlePointerEnd, true);
    } else {
      container.addEventListener("touchstart", handleTouchStart, {
        capture: true,
        passive: true,
      });
      container.addEventListener("touchmove", handleTouchMove, {
        capture: true,
        passive: true,
      });
      container.addEventListener("touchend", cancelTimer, true);
      container.addEventListener("touchcancel", cancelTimer, true);
    }

    container.addEventListener("contextmenu", handleContextMenu, true);
    map.on("movestart", cancelTimer);
    map.on("zoomstart", cancelTimer);
    map.on("dragstart", cancelTimer);

    return () => {
      if (hasPointerEvents) {
        container.removeEventListener("pointerdown", handlePointerDown, true);
        container.removeEventListener("pointermove", handlePointerMove, true);
        container.removeEventListener("pointerup", handlePointerEnd, true);
        container.removeEventListener("pointercancel", handlePointerEnd, true);
      } else {
        container.removeEventListener("touchstart", handleTouchStart, true);
        container.removeEventListener("touchmove", handleTouchMove, true);
        container.removeEventListener("touchend", cancelTimer, true);
        container.removeEventListener("touchcancel", cancelTimer, true);
      }

      container.removeEventListener("contextmenu", handleContextMenu, true);
      map.off("movestart", cancelTimer);
      map.off("zoomstart", cancelTimer);
      map.off("dragstart", cancelTimer);
      cancelTimer();
    };
  }, [cancelTimer, emitLongPress, handleMove, map, mapContainerToLatLng, startTimer]);

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

export {
  MapAnimator,
  MapController,
  MapZoomTracker,
  DoubleClickHandler,
  LongPressHandler,
  PopupStateHandler,
};
