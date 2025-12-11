import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import PlanetPanel from "../PlanetPanel";
import PlanetPanelToggle from "./PlanetPanelToggle";
import "./planetPanel.css";

const PlanetPanelContainer = forwardRef(
  (
    {
      planets,
      loading,
      error,
      mapType,
      reducedMotion = false,
      planetQuery,
      location,
    },
    ref
  ) => {
    const [planetPanelVisible, setPlanetPanelVisible] = useState(false);
    const [hasShownPanelToggle, setHasShownPanelToggle] = useState(false);
    const [panelSource, setPanelSource] = useState(null); // 'manual' | 'auto'
    const [isHoveringPanel, setIsHoveringPanel] = useState(false);
    const [forceHideToggle, setForceHideToggle] = useState(false);

    const hoverHideTimeoutRef = useRef(null);
    const initialAutoHideScheduled = useRef(false);
    const initialRevealDelayRef = useRef(null);
    const closeTimeoutRef = useRef(null);
    const CLOSE_ANIMATION_MS = 600;

    const showPlanetPanelToggle =
      hasShownPanelToggle &&
      (location || (Array.isArray(planets) && planets.length > 0));

    const revealPlanetPanel = useCallback((source = "manual") => {
      if (hoverHideTimeoutRef.current) {
        clearTimeout(hoverHideTimeoutRef.current);
        hoverHideTimeoutRef.current = null;
      }

      setPanelSource(source);
      setPlanetPanelVisible(true);

      if (source === "manual") {
        setHasShownPanelToggle(true);
      }
    }, []);

    const hidePlanetPanel = useCallback(() => {
      if (hoverHideTimeoutRef.current) {
        clearTimeout(hoverHideTimeoutRef.current);
        hoverHideTimeoutRef.current = null;
      }
      setPlanetPanelVisible(false);
      setHasShownPanelToggle(true);
      setPanelSource(null);
    }, []);

    const togglePlanetPanel = useCallback(() => {
      if (planetPanelVisible) {
        hidePlanetPanel();
      } else {
        revealPlanetPanel("manual");
      }
    }, [planetPanelVisible, hidePlanetPanel, revealPlanetPanel]);

    // Schedule auto-hide for auto-revealed panels (3s after reveal/hover-out)
    const scheduleAutoHide = useCallback(() => {
      if (panelSource !== "auto" || hasShownPanelToggle || !planetPanelVisible) {
        return;
      }

      if (hoverHideTimeoutRef.current) {
        clearTimeout(hoverHideTimeoutRef.current);
      }

      hoverHideTimeoutRef.current = setTimeout(() => {
        hidePlanetPanel();
        hoverHideTimeoutRef.current = null;
      }, 3000);
    }, [panelSource, hasShownPanelToggle, planetPanelVisible, hidePlanetPanel]);

    const handlePanelMouseEnter = () => {
      setIsHoveringPanel(true);
      if (hoverHideTimeoutRef.current) {
        clearTimeout(hoverHideTimeoutRef.current);
        hoverHideTimeoutRef.current = null;
      }
    };

    const resetPanel = useCallback((afterClose, { hideToggle = false } = {}) => {
      if (hoverHideTimeoutRef.current) {
        clearTimeout(hoverHideTimeoutRef.current);
        hoverHideTimeoutRef.current = null;
      }
      if (initialRevealDelayRef.current) {
        clearTimeout(initialRevealDelayRef.current);
        initialRevealDelayRef.current = null;
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      // Trigger close animation
      setPlanetPanelVisible(false);
      setPanelSource(null);
      setIsHoveringPanel(false);
      // Prevent auto-reveal until explicitly triggered again
      initialAutoHideScheduled.current = true;
      setForceHideToggle(Boolean(hideToggle));

      // After animation completes, remove toggle and run callback
      closeTimeoutRef.current = setTimeout(() => {
        setHasShownPanelToggle(false);
        setForceHideToggle(false);
        if (typeof afterClose === "function") afterClose();
        closeTimeoutRef.current = null;
      }, CLOSE_ANIMATION_MS);
    }, []);

    const handlePanelMouseLeave = () => {
      setIsHoveringPanel(false);
      scheduleAutoHide();
    };

    // Initial auto-reveal logic: once per location session
    useEffect(() => {
      if (
        location &&
        !initialAutoHideScheduled.current &&
        !planetPanelVisible &&
        !hasShownPanelToggle
      ) {
        if (Array.isArray(planets) && planets.length > 0) {
          if (initialRevealDelayRef.current) clearTimeout(initialRevealDelayRef.current);

          initialRevealDelayRef.current = setTimeout(() => {
            revealPlanetPanel("auto");
            initialAutoHideScheduled.current = true;
          }, 3000);
        }
      }
    }, [
      location,
      planetPanelVisible,
      hasShownPanelToggle,
      planets,
    ]);

    // Auto-hide guard when panel was opened automatically (even if user never hovered)
    useEffect(() => {
      if (panelSource === "auto" && planetPanelVisible && !isHoveringPanel) {
        scheduleAutoHide();
      }
    }, [panelSource, planetPanelVisible, isHoveringPanel, scheduleAutoHide]);

    useImperativeHandle(ref, () => ({
      openPanel: (source = "manual") => revealPlanetPanel(source),
      hidePanel: () => hidePlanetPanel(),
      togglePanel: () => togglePlanetPanel(),
      markToggleSeen: () => setHasShownPanelToggle(true),
      resetToggle: () => setHasShownPanelToggle(false),
      resetPanel,
    }));

    useEffect(() => {
      return () => {
        if (hoverHideTimeoutRef.current) clearTimeout(hoverHideTimeoutRef.current);
        if (initialRevealDelayRef.current) clearTimeout(initialRevealDelayRef.current);
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      };
    }, []);

    return (
      <div
        className={`planet-panel-wrapper ${planetPanelVisible ? "open" : "collapsed"}`}
        data-force-hide-toggle={forceHideToggle ? "true" : "false"}
        onMouseEnter={handlePanelMouseEnter}
        onMouseLeave={handlePanelMouseLeave}
      >
        <PlanetPanel
          planets={planets}
          loading={loading}
          error={error}
          mapType={mapType}
          panelVisible={planetPanelVisible}
          hasArrow={showPlanetPanelToggle}
          reducedMotion={reducedMotion}
        />

        {showPlanetPanelToggle && (
          <PlanetPanelToggle
            active={planetPanelVisible}
            onClick={togglePlanetPanel}
          />
        )}
      </div>
    );
  }
);

PlanetPanelContainer.displayName = "PlanetPanelContainer";

export default PlanetPanelContainer;
