import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STARGAZE_PANEL_EXIT_MS } from "./mapConstants";

const useMapStargaze = ({
  stargazeLocations = [],
  showRecommendedSpots = true,
  mapRef,
  isMobileView,
}) => {
  const [activeStargazeId, setActiveStargazeId] = useState(null);
  const [stargazePanelSpot, setStargazePanelSpot] = useState(null);
  const [isStargazePanelOpen, setIsStargazePanelOpen] = useState(false);
  const stargazePanelCloseTimeoutRef = useRef(null);
  const stargazeMarkerRefs = useRef(new Map());

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
  }, [closeStargazePanel, mapRef]);

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

  useEffect(() => {
    return () => {
      if (stargazePanelCloseTimeoutRef.current) {
        clearTimeout(stargazePanelCloseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeStargazeId) return;
    if (activeStargazeSpot) return;
    const resetTimer = setTimeout(() => {
      setActiveStargazeId((current) =>
        current === activeStargazeId ? null : current
      );
    }, 0);
    return () => {
      clearTimeout(resetTimer);
    };
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
    const panelTimer = setTimeout(() => {
      if (!activeStargazeSpot) {
        closeStargazePanel();
        return;
      }
      openStargazePanel(activeStargazeSpot);
    }, 0);
    return () => {
      clearTimeout(panelTimer);
    };
  }, [activeStargazeSpot, closeStargazePanel, isMobileView, openStargazePanel]);

  useEffect(() => {
    if (!isMobileView) return;
    if (!activeStargazeSpot) return;
    if (isStargazePanelOpen) {
      const panelSpotTimer = setTimeout(() => {
        setStargazePanelSpot(activeStargazeSpot);
      }, 0);
      return () => {
        clearTimeout(panelSpotTimer);
      };
    }
  }, [activeStargazeSpot, isMobileView, isStargazePanelOpen]);

  return {
    visibleStargazeLocations,
    activeStargazeSpot,
    activeStargazeId,
    setActiveStargazeId,
    stargazePanelSpot,
    setStargazePanelSpot,
    isStargazePanelOpen,
    setIsStargazePanelOpen,
    stargazeMarkerRefs,
    openStargazePanel,
    closeStargazePanel,
    handleCloseStargazePanel,
    handlePopupClose,
  };
};

export default useMapStargaze;
