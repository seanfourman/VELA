import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_ZOOM,
  MARKER_EXIT_MS,
  MARKER_VISIBILITY_ZOOM,
} from "../core/mapConfig";

export default function useZoomMarkerVisibility(mapRef) {
  const [areZoomMarkersVisible, setAreZoomMarkersVisible] = useState(
    DEFAULT_ZOOM >= MARKER_VISIBILITY_ZOOM,
  );
  const [areZoomMarkersExiting, setAreZoomMarkersExiting] = useState(false);
  const zoomMarkerExitTimerRef = useRef(0);
  const zoomMarkersVisibleRef = useRef(DEFAULT_ZOOM >= MARKER_VISIBILITY_ZOOM);
  const zoomMarkersExitingRef = useRef(false);

  const handleMapZoomChange = useCallback(
    (nextZoom) => {
      if (nextZoom >= MARKER_VISIBILITY_ZOOM) {
        if (zoomMarkerExitTimerRef.current) {
          window.clearTimeout(zoomMarkerExitTimerRef.current);
          zoomMarkerExitTimerRef.current = 0;
        }
        if (zoomMarkersExitingRef.current) {
          zoomMarkersExitingRef.current = false;
          setAreZoomMarkersExiting(false);
        }
        if (!zoomMarkersVisibleRef.current) {
          zoomMarkersVisibleRef.current = true;
          setAreZoomMarkersVisible(true);
        }
        return;
      }

      if (!zoomMarkersVisibleRef.current || zoomMarkersExitingRef.current) {
        return;
      }

      mapRef.current?.closePopup?.();
      zoomMarkersExitingRef.current = true;
      setAreZoomMarkersExiting(true);

      if (zoomMarkerExitTimerRef.current) {
        window.clearTimeout(zoomMarkerExitTimerRef.current);
      }

      zoomMarkerExitTimerRef.current = window.setTimeout(() => {
        zoomMarkerExitTimerRef.current = 0;
        zoomMarkersVisibleRef.current = false;
        zoomMarkersExitingRef.current = false;
        setAreZoomMarkersVisible(false);
        setAreZoomMarkersExiting(false);
      }, MARKER_EXIT_MS);
    },
    [mapRef],
  );

  useEffect(
    () => () => {
      if (zoomMarkerExitTimerRef.current) {
        window.clearTimeout(zoomMarkerExitTimerRef.current);
      }
    },
    [],
  );

  return {
    areZoomMarkersVisible,
    areZoomMarkersExiting,
    handleMapZoomChange,
  };
}
