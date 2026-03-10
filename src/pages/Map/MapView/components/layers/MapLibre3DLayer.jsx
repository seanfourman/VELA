import { useEffect, useRef } from "react";
import L from "leaflet";
import maplibregl from "maplibre-gl";
import { useMap } from "react-leaflet";
import { buildMapTilerStyleUrl } from "@/utils/apiEndpoints";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";

const MIN_PITCH = 0;
const MAX_PITCH = 70;
const DEFAULT_3D_PITCH = 75;
const PITCH_SENSITIVITY = 0.22;
const TOUCH_PITCH_THRESHOLD = 8;
const RTL_TEXT_PLUGIN_URL =
  "https://cdn.jsdelivr.net/npm/@mapbox/mapbox-gl-rtl-text@0.3.0/mapbox-gl-rtl-text.js";
const STYLE_URL_CACHE_BUSTER = "proxy-v2";
const RTL_PLUGIN_STATE_KEY = "__velaMapLibreRtlPluginState__";

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
  let mouseDraggingWasEnabled = false;
  let touchDraggingWasEnabled = false;
  let touchGestureCandidate = false;
  let isTouchAdjustingAngle = false;
  let touchStartY = 0;
  let touchStartDistance = 0;
  let touchStartPitch = 0;
  let startY = 0;
  let startPitch = 0;
  let frameId = null;
  let pendingPitch = null;

  const consume = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const finishAdjust = () => {
    if (!isAdjustingAngle) return;
    isAdjustingAngle = false;
    if (mouseDraggingWasEnabled) {
      map.dragging?.enable?.();
      mouseDraggingWasEnabled = false;
    }
  };

  const finishTouchAdjust = () => {
    const hadTouchState = touchGestureCandidate || isTouchAdjustingAngle;
    if (!hadTouchState) return;

    touchGestureCandidate = false;
    isTouchAdjustingAngle = false;

    if (touchDraggingWasEnabled) {
      map.dragging?.enable?.();
      touchDraggingWasEnabled = false;
    }
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
    mouseDraggingWasEnabled = map.dragging?.enabled?.() ?? false;

    if (mouseDraggingWasEnabled) {
      map.dragging.disable();
    }

    consume(event);
  };

  const handleMouseMove = (event) => {
    if (!isAdjustingAngle) return;
    if ((event.buttons & 3) !== 3) {
      finishAdjust();
      return;
    }

    const deltaY = event.clientY - startY;
    pendingPitch = clamp(
      startPitch - deltaY * PITCH_SENSITIVITY,
      MIN_PITCH,
      MAX_PITCH,
    );

    if (frameId == null) {
      frameId = window.requestAnimationFrame(flushPitch);
    }

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
      touchDraggingWasEnabled = map.dragging?.enabled?.() ?? false;
      if (touchDraggingWasEnabled) {
        map.dragging.disable();
      }
      touchStartPitch = glMap.getPitch?.() ?? touchStartPitch;
    }

    pendingPitch = clamp(
      touchStartPitch - deltaY * PITCH_SENSITIVITY,
      MIN_PITCH,
      MAX_PITCH,
    );

    if (frameId == null) {
      frameId = window.requestAnimationFrame(flushPitch);
    }

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

const getStyleUrl = () =>
  `${buildMapTilerStyleUrl("streets-v2")}?_vela=${STYLE_URL_CACHE_BUSTER}`;

export default function MapLibre3DLayer() {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.maplibregl) {
      window.maplibregl = maplibregl;
    }
    ensureRtlTextPlugin();

    let detachAngleControls = null;
    let handleLoad = null;
    let glMap = null;
    const previousInertia = map.options.inertia;
    map.options.inertia = false;

    try {
      const layer = L.maplibreGL({
        style: getStyleUrl(),
        pane: "tilePane",
        interactive: false,
        attributionControl: false,
        // Reduce camera jitter while dragging at high pitch by syncing every frame.
        updateInterval: 0,
      });

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

      const lockInteractions = () => {
        glMap.dragPan?.disable?.();
        glMap.scrollZoom?.disable?.();
        glMap.boxZoom?.disable?.();
        glMap.doubleClickZoom?.disable?.();
        glMap.dragRotate?.disable?.();
        glMap.keyboard?.disable?.();
        glMap.touchZoomRotate?.disable?.();
        glMap.touchZoomRotate?.disableRotation?.();
        ensureDefaultPitch();
      };

      if (glMap.isStyleLoaded?.()) {
        lockInteractions();
      } else {
        handleLoad = () => lockInteractions();
        glMap.once("load", handleLoad);
      }

      detachAngleControls = attachAngleControls(map, glMap);
    } catch (error) {
      console.warn("Failed to load 3D style layer", error);
    }

    return () => {
      if (detachAngleControls) {
        detachAngleControls();
      }

      if (glMap && handleLoad) {
        glMap.off("load", handleLoad);
      }

      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }

      map.options.inertia = previousInertia;
    };
  }, [map]);

  return null;
}
