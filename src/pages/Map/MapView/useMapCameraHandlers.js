import { useCallback, useEffect, useRef } from "react";
import { LOCATION_ZOOM, MIN_ZOOM } from "./mapConstants";

const GRIDSHOT_THROTTLE_MS = 3000;

const useMapCameraHandlers = ({
  mapRef,
  mapType,
  favoriteSpotKeys,
  getSpotKey,
  setContextMenu,
  setSelectedDarkSpot,
  setActiveStargazeId,
  setPlacedMarker,
  setLatestGridShot,
}) => {
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
      if (now - lastGridShotAtRef.current < GRIDSHOT_THROTTLE_MS) return;
      lastGridShotAtRef.current = now;
      setLatestGridShot(src);
    },
    [setLatestGridShot]
  );

  useEffect(() => {
    setLatestGridShot(null);
  }, [mapType, setLatestGridShot]);

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
    zoomOutToMin,
  };
};

export default useMapCameraHandlers;
