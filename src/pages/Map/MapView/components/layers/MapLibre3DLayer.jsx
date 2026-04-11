import { useEffect, useRef } from "react";
import L from "leaflet";
import maplibregl from "maplibre-gl";
import { useMap } from "react-leaflet";
import { buildMapTilerStyleUrl } from "@/utils/apiEndpoints";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";

const MIN_PITCH = 0;
const MAX_PITCH = 60;
const DEFAULT_3D_PITCH = 58;
const LEAFLET_TO_MAPLIBRE_ZOOM_OFFSET = 1;
const PITCH_SENSITIVITY = 0.22;
const TOUCH_PITCH_THRESHOLD = 8;
const RTL_TEXT_PLUGIN_URL =
  "https://cdn.jsdelivr.net/npm/@mapbox/mapbox-gl-rtl-text@0.3.0/mapbox-gl-rtl-text.js";
const STYLE_URL_CACHE_BUSTER = "proxy-v2";
const RTL_PLUGIN_STATE_KEY = "__velaMapLibreRtlPluginState__";
const MAPLIBRE_DRAG_PAN_OPTIONS = { maxSpeed: 0 };
const LEAFLET_CAMERA_HANDLER_NAMES = [
  "dragging",
  "scrollWheelZoom",
  "touchZoom",
  "doubleClickZoom",
  "boxZoom",
  "keyboard",
];

const getRtlPluginState = () => {
  if (typeof globalThis === "undefined") {
    return { requested: false };
  }

  if (!globalThis[RTL_PLUGIN_STATE_KEY]) {
    globalThis[RTL_PLUGIN_STATE_KEY] = { requested: false };
  }

  return globalThis[RTL_PLUGIN_STATE_KEY];
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const areNumbersClose = (first, second, tolerance = 0.000001) =>
  Math.abs(first - second) <= tolerance;

const setHandlerEnabled = (handler, shouldEnable) => {
  if (!handler) return;

  if (shouldEnable) {
    handler.enable?.();
  } else {
    handler.disable?.();
  }
};

const suspendLeafletCameraHandlers = (map) => {
  const handlerStates = LEAFLET_CAMERA_HANDLER_NAMES.map((name) => {
    const handler = map[name];
    return {
      handler,
      wasEnabled: handler?.enabled?.() ?? false,
    };
  });
  const previousOptions = {
    inertia: map.options.inertia,
    zoomSnap: map.options.zoomSnap,
  };

  map.stop?.();
  map.options.inertia = false;
  map.options.zoomSnap = 0;
  handlerStates.forEach(({ handler }) => setHandlerEnabled(handler, false));

  return () => {
    map.options.inertia = previousOptions.inertia;
    map.options.zoomSnap = previousOptions.zoomSnap;

    handlerStates.forEach(({ handler, wasEnabled }) => {
      setHandlerEnabled(handler, wasEnabled);
    });
  };
};

const syncLeafletCameraFromMapLibre = (map, glMap) => {
  const glCenter = glMap.getCenter();
  const nextZoom = glMap.getZoom() + LEAFLET_TO_MAPLIBRE_ZOOM_OFFSET;
  const currentCenter = map.getCenter();
  const currentZoom = map.getZoom();

  if (
    areNumbersClose(currentCenter.lat, glCenter.lat) &&
    areNumbersClose(currentCenter.lng, glCenter.lng) &&
    areNumbersClose(currentZoom, nextZoom)
  ) {
    return;
  }

  map.setView([glCenter.lat, glCenter.lng], nextZoom, {
    animate: false,
    noMoveStart: true,
  });
};

const configureMapLibreCameraHandlers = (glMap) => {
  glMap.setMaxPitch?.(MAX_PITCH);
  glMap.dragPan?.enable?.(MAPLIBRE_DRAG_PAN_OPTIONS);
  glMap.scrollZoom?.enable?.();
  glMap.touchZoomRotate?.enable?.();
  glMap.touchZoomRotate?.disableRotation?.();
  glMap.boxZoom?.disable?.();
  glMap.doubleClickZoom?.disable?.();
  glMap.dragRotate?.disable?.();
  glMap.keyboard?.disable?.();
};

const setMapLibreDragPanEnabled = (glMap, shouldEnable) => {
  if (shouldEnable) {
    glMap.dragPan?.enable?.(MAPLIBRE_DRAG_PAN_OPTIONS);
  } else {
    glMap.dragPan?.disable?.();
  }
};

const setMapLibreTouchZoomEnabled = (glMap, shouldEnable) => {
  if (shouldEnable) {
    glMap.touchZoomRotate?.enable?.();
    glMap.touchZoomRotate?.disableRotation?.();
  } else {
    glMap.touchZoomRotate?.disable?.();
  }
};

const getTouchDistance = (touches) => {
  if (!touches || touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
};
const getTouchMidY = (touches) => {
  if (!touches || touches.length < 2) return 0;
  return (touches[0].clientY + touches[1].clientY) / 2;
};

const isDuplicateRtlPluginError = (error) =>
  String(error?.message || error || "").includes(
    "setRTLTextPlugin cannot be called multiple times",
  );

const ensureRtlTextPlugin = () => {
  const pluginState = getRtlPluginState();
  const status = maplibregl.getRTLTextPluginStatus?.();
  if (status === "loaded" || status === "loading") {
    pluginState.requested = true;
    return;
  }

  if (pluginState.requested) return;

  if (typeof maplibregl.setRTLTextPlugin !== "function") return;

  pluginState.requested = true;

  try {
    const maybePromise = maplibregl.setRTLTextPlugin(
      RTL_TEXT_PLUGIN_URL,
      (error) => {
        if (error && !isDuplicateRtlPluginError(error)) {
          pluginState.requested = false;
          console.warn("Failed to load RTL text plugin for 3D map labels", error);
        }
      },
      true,
    );

    if (typeof maybePromise?.catch === "function") {
      maybePromise.catch((error) => {
        if (isDuplicateRtlPluginError(error)) return;
        pluginState.requested = false;
        console.warn("Failed to load RTL text plugin for 3D map labels", error);
      });
    }
  } catch (error) {
    if (isDuplicateRtlPluginError(error)) return;
    pluginState.requested = false;
    console.warn("Failed to load RTL text plugin for 3D map labels", error);
  }
};

const attachAngleControls = (map, glMap) => {
  const container = map.getContainer();
  let isAdjustingAngle = false;
  let mouseDragPanWasEnabled = false;
  let touchZoomWasEnabled = false;
  let touchGestureCandidate = false;
  let isTouchAdjustingAngle = false;
  let touchStartY = 0;
  let touchStartDistance = 0;
  let touchStartPitch = 0;
  let startY = 0;
  let startPitch = 0;
  let frameId = null;
  let pendingPitch = null;

  const rememberDraggingState = (type) => {
    if (type === "mouse") {
      mouseDragPanWasEnabled = glMap.dragPan?.isEnabled?.() ?? false;
      setMapLibreDragPanEnabled(glMap, false);
    } else {
      touchZoomWasEnabled = glMap.touchZoomRotate?.isEnabled?.() ?? false;
      setMapLibreTouchZoomEnabled(glMap, false);
    }
  };

  const restoreDraggingState = (type) => {
    if (type === "mouse") {
      if (mouseDragPanWasEnabled) {
        setMapLibreDragPanEnabled(glMap, true);
      }
      mouseDragPanWasEnabled = false;
    } else {
      if (touchZoomWasEnabled) {
        setMapLibreTouchZoomEnabled(glMap, true);
      }
      touchZoomWasEnabled = false;
    }
  };

  const schedulePitch = (basePitch, deltaY) => {
    pendingPitch = clamp(
      basePitch - deltaY * PITCH_SENSITIVITY,
      MIN_PITCH,
      MAX_PITCH,
    );

    if (frameId == null) {
      frameId = window.requestAnimationFrame(flushPitch);
    }
  };

  const consume = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const finishAdjust = () => {
    if (!isAdjustingAngle) return;
    isAdjustingAngle = false;
    restoreDraggingState("mouse");
  };

  const finishTouchAdjust = () => {
    const hadTouchState = touchGestureCandidate || isTouchAdjustingAngle;
    if (!hadTouchState) return;

    touchGestureCandidate = false;
    isTouchAdjustingAngle = false;

    restoreDraggingState("touch");
  };

  const flushPitch = () => {
    frameId = null;
    if ((!isAdjustingAngle && !isTouchAdjustingAngle) || pendingPitch == null) {
      return;
    }
    glMap.setPitch(pendingPitch);
  };

  const handleMouseDown = (event) => {
    if (event.buttons !== 3) return;
    isAdjustingAngle = true;
    startY = event.clientY;
    startPitch = glMap.getPitch?.() ?? 0;
    rememberDraggingState("mouse");

    consume(event);
  };

  const handleMouseMove = (event) => {
    if (!isAdjustingAngle) return;
    if ((event.buttons & 3) !== 3) {
      finishAdjust();
      return;
    }

    const deltaY = event.clientY - startY;
    schedulePitch(startPitch, deltaY);

    consume(event);
  };

  const handleMouseUp = (event) => {
    if (!isAdjustingAngle) return;
    consume(event);
    finishAdjust();
  };

  const handleContextMenu = (event) => {
    // In 3D mode, suppress native context menu so two-button angle drag
    // does not trigger a browser menu on mouse release.
    consume(event);
  };

  const handleTouchStart = (event) => {
    if (event.touches?.length !== 2) return;
    touchGestureCandidate = true;
    isTouchAdjustingAngle = false;
    touchStartY = getTouchMidY(event.touches);
    touchStartDistance = getTouchDistance(event.touches);
    touchStartPitch = glMap.getPitch?.() ?? 0;
  };

  const handleTouchMove = (event) => {
    if (!touchGestureCandidate && !isTouchAdjustingAngle) return;
    if (event.touches?.length !== 2) {
      finishTouchAdjust();
      return;
    }

    const currentMidY = getTouchMidY(event.touches);
    const currentDistance = getTouchDistance(event.touches);
    const deltaY = currentMidY - touchStartY;
    const verticalDelta = Math.abs(deltaY);
    const distanceDelta = Math.abs(currentDistance - touchStartDistance);

    // Let normal pinch zoom continue when distance change dominates.
    if (!isTouchAdjustingAngle) {
      if (
        verticalDelta < TOUCH_PITCH_THRESHOLD &&
        distanceDelta < TOUCH_PITCH_THRESHOLD
      ) {
        return;
      }
      if (verticalDelta <= distanceDelta) {
        touchGestureCandidate = false;
        return;
      }

      isTouchAdjustingAngle = true;
      rememberDraggingState("touch");
      touchStartPitch = glMap.getPitch?.() ?? touchStartPitch;
    }

    schedulePitch(touchStartPitch, deltaY);

    consume(event);
  };

  const handleTouchEnd = (event) => {
    if (!touchGestureCandidate && !isTouchAdjustingAngle) return;
    if (event.touches?.length === 2) return;
    if (isTouchAdjustingAngle) {
      consume(event);
    }
    finishTouchAdjust();
  };

  const handleWindowBlur = () => {
    finishAdjust();
    finishTouchAdjust();
  };

  container.addEventListener("mousedown", handleMouseDown, true);
  container.addEventListener("touchstart", handleTouchStart, true);
  container.addEventListener("touchmove", handleTouchMove, true);
  container.addEventListener("touchend", handleTouchEnd, true);
  container.addEventListener("touchcancel", handleTouchEnd, true);
  window.addEventListener("mousemove", handleMouseMove, true);
  window.addEventListener("mouseup", handleMouseUp, true);
  container.addEventListener("contextmenu", handleContextMenu, true);
  window.addEventListener("blur", handleWindowBlur);

  return () => {
    finishAdjust();
    finishTouchAdjust();

    if (frameId != null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }

    container.removeEventListener("mousedown", handleMouseDown, true);
    container.removeEventListener("touchstart", handleTouchStart, true);
    container.removeEventListener("touchmove", handleTouchMove, true);
    container.removeEventListener("touchend", handleTouchEnd, true);
    container.removeEventListener("touchcancel", handleTouchEnd, true);
    window.removeEventListener("mousemove", handleMouseMove, true);
    window.removeEventListener("mouseup", handleMouseUp, true);
    container.removeEventListener("contextmenu", handleContextMenu, true);
    window.removeEventListener("blur", handleWindowBlur);
  };
};

const getStyleUrl = () => {
  const styleUrl = new URL(buildMapTilerStyleUrl("streets-v2"));
  styleUrl.searchParams.set("_vela", STYLE_URL_CACHE_BUSTER);
  return styleUrl.toString();
};

export default function MapLibre3DLayer() {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.maplibregl) {
      window.maplibregl = maplibregl;
    }
    ensureRtlTextPlugin();

    let detachAngleControls = null;
    let restoreLeafletCameraHandlers = null;
    let handleLoad = null;
    let handleMoveEnd = null;
    let glMap = null;

    try {
      const layer = L.maplibreGL({
        style: getStyleUrl(),
        pane: "tilePane",
        interactive: true,
        attributionControl: false,
        pitch: DEFAULT_3D_PITCH,
        minPitch: MIN_PITCH,
        maxPitch: MAX_PITCH,
        minZoom: Math.max(
          0,
          map.getMinZoom() - LEAFLET_TO_MAPLIBRE_ZOOM_OFFSET,
        ),
        maxZoom: map.getMaxZoom() - LEAFLET_TO_MAPLIBRE_ZOOM_OFFSET,
        dragPan: true,
        scrollZoom: true,
        touchZoomRotate: true,
        dragRotate: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        // Keep programmatic Leaflet camera moves tightly synced into MapLibre.
        updateInterval: 0,
      });

      restoreLeafletCameraHandlers = suspendLeafletCameraHandlers(map);

      layer.addTo(map);
      layerRef.current = layer;

      glMap = layer.getMaplibreMap?.();
      if (!glMap) {
        throw new Error("MapLibre map instance was not created");
      }

      const ensureDefaultPitch = () => {
        const currentPitch = glMap.getPitch?.() ?? 0;
        if (currentPitch >= DEFAULT_3D_PITCH - 0.5) return;

        try {
          if (typeof glMap.jumpTo === "function") {
            glMap.jumpTo({ pitch: DEFAULT_3D_PITCH });
          } else {
            glMap.setPitch?.(DEFAULT_3D_PITCH);
          }
        } catch {
          glMap.setPitch?.(DEFAULT_3D_PITCH);
        }
      };

      // Apply pitch as early as possible so 3D mode enters with angle immediately.
      ensureDefaultPitch();

      const enableStableCamera = () => {
        configureMapLibreCameraHandlers(glMap);
        ensureDefaultPitch();
      };

      if (glMap.isStyleLoaded?.()) {
        enableStableCamera();
      } else {
        handleLoad = () => enableStableCamera();
        glMap.once("load", handleLoad);
      }

      handleMoveEnd = () => syncLeafletCameraFromMapLibre(map, glMap);
      glMap.on("moveend", handleMoveEnd);
      detachAngleControls = attachAngleControls(map, glMap);
    } catch (error) {
      console.warn("Failed to load 3D style layer", error);
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      restoreLeafletCameraHandlers?.();
      restoreLeafletCameraHandlers = null;
    }

    return () => {
      if (detachAngleControls) {
        detachAngleControls();
      }

      if (glMap && handleLoad) {
        glMap.off("load", handleLoad);
      }

      if (glMap && handleMoveEnd) {
        glMap.off("moveend", handleMoveEnd);
      }

      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }

      restoreLeafletCameraHandlers?.();
    };
  }, [map]);

  return null;
}
