import { useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { isCoarsePointerEnv } from "./mapUtils";
import { LOCATION_ZOOM, LONG_PRESS_MS } from "./mapConstants";

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

export {
  MapAnimator,
  MapController,
  DoubleClickHandler,
  LongPressHandler,
  PopupStateHandler,
};
