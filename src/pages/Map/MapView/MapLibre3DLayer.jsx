import { useEffect, useRef } from "react";
import L from "leaflet";
import maplibregl from "maplibre-gl";
import { useMap } from "react-leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";

const MIN_PITCH = 0;
const MAX_PITCH = 70;
const PITCH_SENSITIVITY = 0.22;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const attachAngleControls = (map, glMap) => {
  const container = map.getContainer();
  let isAdjustingAngle = false;
  let draggingWasEnabled = false;
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
    if (draggingWasEnabled) {
      map.dragging?.enable?.();
    }
  };

  const flushPitch = () => {
    frameId = null;
    if (!isAdjustingAngle || pendingPitch == null) return;
    glMap.setPitch(pendingPitch);
  };

  const handleMouseDown = (event) => {
    if (event.buttons !== 3) return;
    isAdjustingAngle = true;
    startY = event.clientY;
    startPitch = glMap.getPitch?.() ?? 0;
    draggingWasEnabled = map.dragging?.enabled?.() ?? false;

    if (draggingWasEnabled) {
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
      MAX_PITCH
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
    if (!isAdjustingAngle && event.buttons !== 3) return;
    consume(event);
  };

  const handleWindowBlur = () => finishAdjust();

  container.addEventListener("mousedown", handleMouseDown, true);
  window.addEventListener("mousemove", handleMouseMove, true);
  window.addEventListener("mouseup", handleMouseUp, true);
  container.addEventListener("contextmenu", handleContextMenu, true);
  window.addEventListener("blur", handleWindowBlur);

  return () => {
    finishAdjust();

    if (frameId != null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }

    container.removeEventListener("mousedown", handleMouseDown, true);
    window.removeEventListener("mousemove", handleMouseMove, true);
    window.removeEventListener("mouseup", handleMouseUp, true);
    container.removeEventListener("contextmenu", handleContextMenu, true);
    window.removeEventListener("blur", handleWindowBlur);
  };
};

const getStyleUrl = (apiKey) =>
  `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey || ""}`;

export default function MapLibre3DLayer({ apiKey }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.maplibregl) {
      window.maplibregl = maplibregl;
    }

    let detachAngleControls = null;
    let handleLoad = null;
    let glMap = null;
    const previousInertia = map.options.inertia;
    map.options.inertia = false;

    try {
      const layer = L.maplibreGL({
        style: getStyleUrl(apiKey),
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

      const lockInteractions = () => {
        glMap.dragPan?.disable?.();
        glMap.scrollZoom?.disable?.();
        glMap.boxZoom?.disable?.();
        glMap.doubleClickZoom?.disable?.();
        glMap.dragRotate?.disable?.();
        glMap.keyboard?.disable?.();
        glMap.touchZoomRotate?.disable?.();
        glMap.touchZoomRotate?.disableRotation?.();
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
  }, [apiKey, map]);

  return null;
}
