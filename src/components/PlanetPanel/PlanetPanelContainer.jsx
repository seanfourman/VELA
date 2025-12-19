import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import PlanetPanel from "../PlanetPanel";
import PlanetPanelMobile from "./PlanetPanelMobile";
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
      location,
    },
    ref
  ) => {
    const [planetPanelVisible, setPlanetPanelVisible] = useState(false);
    const [hasShownPanelToggle, setHasShownPanelToggle] = useState(false);
    const [panelSource, setPanelSource] = useState(null);
    const [isHoveringPanel, setIsHoveringPanel] = useState(false);
    const [forceHideToggle, setForceHideToggle] = useState(false);
    const [toggleNudgeKey, setToggleNudgeKey] = useState(0);
    const [isMobile, setIsMobile] = useState(() => {
      if (typeof window === "undefined" || !window.matchMedia) return false;
      return window.matchMedia("(max-width: 768px)").matches;
    });

    const panelRootRef = useRef(null);
    const hoverHideTimeoutRef = useRef(null);
    const initialAutoHideScheduled = useRef(false);
    const initialRevealDelayRef = useRef(null);
    const closeTimeoutRef = useRef(null);
    const CLOSE_ANIMATION_MS = 600;

    useEffect(() => {
      if (typeof window === "undefined" || !window.matchMedia) return undefined;
      const mql = window.matchMedia("(max-width: 768px)");
      const handleChange = (event) => setIsMobile(event.matches);
      mql.addEventListener("change", handleChange);
      return () => mql.removeEventListener("change", handleChange);
    }, []);

    const showPlanetPanelToggle =
      hasShownPanelToggle &&
      (location || (Array.isArray(planets) && planets.length > 0));

    const mobilePanelVisible = planetPanelVisible && !loading;

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

    useEffect(() => {
      if (!planetPanelVisible) return undefined;
      if (typeof window === "undefined") return undefined;

      const handlePointerDown = (event) => {
        const panelRoot = panelRootRef.current;
        if (!panelRoot) return;

        const target = event?.target;
        if (!(target instanceof Node)) return;

        if (panelRoot.contains(target)) return;
        if (
          target instanceof Element &&
          target.closest(".map-quick-actions")
        ) {
          return; // allow map quick actions without hiding the panel
        }
        hidePlanetPanel();
      };

      window.addEventListener("pointerdown", handlePointerDown, true);
      return () => {
        window.removeEventListener("pointerdown", handlePointerDown, true);
      };
    }, [planetPanelVisible, hidePlanetPanel]);

    const togglePlanetPanel = useCallback(() => {
      if (planetPanelVisible) {
        hidePlanetPanel();
      } else {
        revealPlanetPanel("manual");
      }
    }, [planetPanelVisible, hidePlanetPanel, revealPlanetPanel]);

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

      setPlanetPanelVisible(false);
      setPanelSource(null);
      setIsHoveringPanel(false);
      initialAutoHideScheduled.current = true;
      setForceHideToggle(Boolean(hideToggle));

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
            if (isMobile) {
              setHasShownPanelToggle(true);
              setPlanetPanelVisible(false);
              setPanelSource(null);
              initialAutoHideScheduled.current = true;
              return;
            }
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
      isMobile,
      revealPlanetPanel,
    ]);

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
      nudgeToggle: () => {
        setHasShownPanelToggle(true);
        setForceHideToggle(false);
        setToggleNudgeKey((key) => key + 1);
      },
    }));

    useEffect(() => {
      return () => {
        if (hoverHideTimeoutRef.current) clearTimeout(hoverHideTimeoutRef.current);
        if (initialRevealDelayRef.current) clearTimeout(initialRevealDelayRef.current);
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      };
    }, []);

    return (
      <>
        {!isMobile && (
          <div
            className={`planet-panel-wrapper ${
              planetPanelVisible ? "open" : "collapsed"
            }`}
            data-force-hide-toggle={forceHideToggle ? "true" : "false"}
            ref={panelRootRef}
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
        )}

        {isMobile && (
          <PlanetPanelMobile
            planets={planets}
            loading={loading}
            error={error}
            panelVisible={mobilePanelVisible}
            reducedMotion={reducedMotion}
            forceHideToggle={forceHideToggle}
            containerRef={panelRootRef}
            toggleControl={
              showPlanetPanelToggle ? (
                <PlanetPanelToggle
                  key={`mobile-toggle-${toggleNudgeKey}`}
                  active={mobilePanelVisible}
                  onClick={togglePlanetPanel}
                  direction="vertical"
                />
              ) : null
            }
            toggleReady={showPlanetPanelToggle}
          />
        )}
      </>
    );
  }
);

PlanetPanelContainer.displayName = "PlanetPanelContainer";

export default PlanetPanelContainer;
