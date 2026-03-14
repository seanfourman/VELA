import { useEffect, useRef } from "react";
import { LOCATION_ZOOM } from "../core/mapConfig";

export default function useMapSelectionEffects({
  hasPinnedPopupTarget,
  mapRef,
  placedMarkerRef,
  placedMarker,
  contextMenuLat,
  contextMenuLng,
  placedMarkerId,
  mapSelection,
  onConsumeMapSelection,
  stargazeLocations,
  visibleStarPartyEvents,
  handleCoordinateSearch,
  handleStargazeSearch,
  handleGetVisiblePlanets,
  handleStarPartySearch,
  eventMarkerRefs,
}) {
  const handledMapSelectionRef = useRef(null);

  useEffect(() => {
    if (!hasPinnedPopupTarget) return undefined;

    const map = mapRef.current;
    const openPopup = () => {
      placedMarkerRef.current?.openPopup?.();
    };

    if (!map) {
      const popupTimer = window.setTimeout(openPopup, 0);
      return () => {
        window.clearTimeout(popupTimer);
      };
    }

    const alreadyFocused =
      map.distance(map.getCenter(), [placedMarker.lat, placedMarker.lng]) < 10 &&
      map.getZoom() >= LOCATION_ZOOM - 0.1;

    if (alreadyFocused) {
      const popupTimer = window.setTimeout(openPopup, 0);
      return () => {
        window.clearTimeout(popupTimer);
      };
    }

    map.once("moveend", openPopup);

    return () => {
      map.off("moveend", openPopup);
    };
  }, [
    hasPinnedPopupTarget,
    mapRef,
    placedMarkerRef,
    contextMenuLat,
    contextMenuLng,
    placedMarkerId,
    placedMarker?.lat,
    placedMarker?.lng,
  ]);

  useEffect(() => {
    if (!mapSelection?.requestId) return undefined;
    if (handledMapSelectionRef.current === mapSelection.requestId) return undefined;

    handledMapSelectionRef.current = mapSelection.requestId;
    onConsumeMapSelection?.();

    let cleanupSelectionFocus = null;

    const selectionTimer = window.setTimeout(() => {
      if (mapSelection.type === "stargaze") {
        const matchedSpot =
          stargazeLocations.find(
            (spot) => String(spot?.id) === String(mapSelection.id),
          ) || null;

        if (matchedSpot) {
          handleStargazeSearch(matchedSpot);
          handleGetVisiblePlanets({
            target: matchedSpot,
            label: `Visible from ${matchedSpot.name || "selected spot"}`,
            source: "stargaze",
            openPanel: false,
            force: true,
          });
        } else if (
          Number.isFinite(mapSelection.lat) &&
          Number.isFinite(mapSelection.lng)
        ) {
          handleCoordinateSearch({
            lat: mapSelection.lat,
            lng: mapSelection.lng,
          });
          handleGetVisiblePlanets({
            target: {
              lat: mapSelection.lat,
              lng: mapSelection.lng,
            },
            label: "Visible from pinned spot",
            source: "pin",
            openPanel: false,
            force: true,
          });
        } else {
          return;
        }
      } else if (mapSelection.type === "event") {
        const matchedEvent =
          visibleStarPartyEvents.find(
            (event) => String(event?.id) === String(mapSelection.id),
          ) || null;

        if (matchedEvent) {
          handleStarPartySearch(matchedEvent);

          const marker = eventMarkerRefs.current.get(String(matchedEvent.id));
          if (marker?.openPopup) {
            const map = mapRef.current;
            const openPopup = () => {
              marker.openPopup();
            };

            if (!map) {
              const popupTimer = window.setTimeout(openPopup, 0);
              cleanupSelectionFocus = () => {
                window.clearTimeout(popupTimer);
              };
              return;
            }

            const alreadyFocused =
              map.distance(map.getCenter(), [matchedEvent.lat, matchedEvent.lng]) < 10 &&
              map.getZoom() >= LOCATION_ZOOM - 0.1;

            if (alreadyFocused) {
              const popupTimer = window.setTimeout(openPopup, 0);
              cleanupSelectionFocus = () => {
                window.clearTimeout(popupTimer);
              };
              return;
            }

            map.once("moveend", openPopup);
            cleanupSelectionFocus = () => {
              map.off("moveend", openPopup);
            };
          }
          return;
        }

        if (
          Number.isFinite(mapSelection.lat) &&
          Number.isFinite(mapSelection.lng)
        ) {
          handleCoordinateSearch({
            lat: mapSelection.lat,
            lng: mapSelection.lng,
          });
        }
        return;
      } else if (
        Number.isFinite(mapSelection.lat) &&
        Number.isFinite(mapSelection.lng)
      ) {
        handleCoordinateSearch({
          lat: mapSelection.lat,
          lng: mapSelection.lng,
        });
        handleGetVisiblePlanets({
          target: {
            lat: mapSelection.lat,
            lng: mapSelection.lng,
          },
          label: "Visible from pinned spot",
          source: "pin",
          openPanel: false,
          force: true,
        });
      } else {
        return;
      }
    }, 0);

    return () => {
      window.clearTimeout(selectionTimer);
      cleanupSelectionFocus?.();
    };
  }, [
    handleCoordinateSearch,
    handleGetVisiblePlanets,
    handleStarPartySearch,
    handleStargazeSearch,
    mapSelection,
    mapRef,
    onConsumeMapSelection,
    stargazeLocations,
    visibleStarPartyEvents,
    eventMarkerRefs,
  ]);
}
