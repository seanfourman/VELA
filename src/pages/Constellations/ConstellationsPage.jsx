import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildAmbientStars,
  CONSTELLATIONS_BY_ID,
} from "./constellationData";
import ConstellationsMap from "./components/ConstellationsMap";
import ConstellationsPanel from "./components/ConstellationsPanel";
import {
  FIXED_VIEW_SCALE,
  VIEW_EASING,
  clamp,
  clampPan,
  getCenteredPan,
  getConstellationFocusPan,
  getViewportSize,
  getVisibleWindow,
  isPanSettled,
} from "./constellationViewUtils";
import "../SolarSystem/styles/SolarSystemPage.css";
import "./styles/ConstellationsPage.css";

function ConstellationsPage() {
  const initialViewportSize = getViewportSize();
  const initialIsMobile =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 768px)").matches;
  const initialVisibleWindow = getVisibleWindow(initialIsMobile, initialViewportSize);
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const panelOpenFrameRef = useRef(0);
  const mobilePanelNudgeTimeoutRef = useRef(null);
  const [selectedId, setSelectedId] = useState("");
  const [hoveredId, setHoveredId] = useState("");
  const [pan, setPan] = useState(() =>
    getCenteredPan(FIXED_VIEW_SCALE, initialVisibleWindow, initialIsMobile),
  );
  const [targetPan, setTargetPan] = useState(() =>
    getCenteredPan(FIXED_VIEW_SCALE, initialVisibleWindow, initialIsMobile),
  );
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(initialIsMobile);
  const [viewportSize, setViewportSize] = useState(initialViewportSize);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [focusPanelOpen, setFocusPanelOpen] = useState(false);
  const [mobilePanelNudge, setMobilePanelNudge] = useState(false);

  const microStars = useMemo(() => buildAmbientStars(360, 11), []);
  const backgroundStars = useMemo(() => buildAmbientStars(220, 23), []);
  const deepFieldStars = useMemo(() => buildAmbientStars(140, 71), []);
  const selectedConstellation = selectedId ? CONSTELLATIONS_BY_ID[selectedId] ?? null : null;
  const visibleWindow = getVisibleWindow(isMobile, viewportSize);
  const leadingStars = useMemo(
    () =>
      selectedConstellation
        ? [...selectedConstellation.stars]
            .sort((left, right) => right.size - left.size)
            .slice(0, 4)
            .map((star) => star.name)
        : [],
    [selectedConstellation],
  );

  const updatePointerFromEvent = (event) => {
    const stage = stageRef.current;
    if (!stage) return;
    const bounds = stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const normalizedX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const normalizedY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    setPointer({
      x: clamp(normalizedX, -1, 1),
      y: clamp(normalizedY, -1, 1),
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(max-width: 768px)")
        : null;

    const syncViewport = () => {
      const nextViewportSize = getViewportSize();
      const nextIsMobile = mediaQuery ? mediaQuery.matches : window.innerWidth <= 768;
      const nextVisibleWindow = getVisibleWindow(nextIsMobile, nextViewportSize);

      setViewportSize(nextViewportSize);
      setIsMobile(nextIsMobile);
      setPan((current) =>
        clampPan(current, FIXED_VIEW_SCALE, nextVisibleWindow, nextIsMobile),
      );
      setTargetPan((current) =>
        clampPan(current, FIXED_VIEW_SCALE, nextVisibleWindow, nextIsMobile),
      );
    };

    window.addEventListener("resize", syncViewport);
    mediaQuery?.addEventListener("change", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
      mediaQuery?.removeEventListener("change", syncViewport);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (panelOpenFrameRef.current) {
        window.cancelAnimationFrame(panelOpenFrameRef.current);
      }
      if (mobilePanelNudgeTimeoutRef.current) {
        clearTimeout(mobilePanelNudgeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const resetPointerState = () => {
      setPointer({ x: 0, y: 0 });
      setHoveredId("");
    };

    const handleWindowPointerMove = (event) => {
      if (event.pointerType === "touch") return;
      updatePointerFromEvent(event);
    };

    const handleWindowPointerOut = (event) => {
      if (event.relatedTarget !== null) return;
      resetPointerState();
    };

    window.addEventListener("pointermove", handleWindowPointerMove, {
      passive: true,
    });
    window.addEventListener("pointerout", handleWindowPointerOut);
    window.addEventListener("blur", resetPointerState);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerout", handleWindowPointerOut);
      window.removeEventListener("blur", resetPointerState);
    };
  }, []);

  useEffect(() => {
    if (isDragging || isPanSettled(pan, targetPan)) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
      setPan((current) => {
        if (isPanSettled(current, targetPan)) {
          return targetPan;
        }

        return {
          x: current.x + (targetPan.x - current.x) * VIEW_EASING,
          y: current.y + (targetPan.y - current.y) * VIEW_EASING,
        };
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isDragging, pan, targetPan]);

  const triggerMobilePanelNudge = () => {
    if (!isMobile || focusPanelOpen) return;

    if (panelOpenFrameRef.current) {
      window.cancelAnimationFrame(panelOpenFrameRef.current);
      panelOpenFrameRef.current = 0;
    }

    if (mobilePanelNudgeTimeoutRef.current) {
      clearTimeout(mobilePanelNudgeTimeoutRef.current);
    }

    setMobilePanelNudge(false);

    window.requestAnimationFrame(() => {
      setMobilePanelNudge(true);
      mobilePanelNudgeTimeoutRef.current = window.setTimeout(() => {
        setMobilePanelNudge(false);
      }, 5000);
    });
  };

  const openDesktopPanelWithAnimation = () => {
    if (panelOpenFrameRef.current) {
      window.cancelAnimationFrame(panelOpenFrameRef.current);
    }

    if (!isPanelVisible) {
      setIsPanelVisible(true);
      setFocusPanelOpen(false);
      panelOpenFrameRef.current = window.requestAnimationFrame(() => {
        setFocusPanelOpen(true);
        panelOpenFrameRef.current = 0;
      });
      return;
    }

    setFocusPanelOpen(true);
  };

  const selectConstellation = (id, { focus = true } = {}) => {
    const nextConstellation = CONSTELLATIONS_BY_ID[id];
    if (!nextConstellation) {
      setSelectedId("");
      setMobilePanelNudge(false);
      setFocusPanelOpen(false);
      setIsPanelVisible(false);
      if (focus) {
        setTargetPan(getCenteredPan(FIXED_VIEW_SCALE, visibleWindow, isMobile));
      }
      return;
    }

    setSelectedId(nextConstellation.id);
    if (isMobile) {
      setIsPanelVisible(true);
      if (!isPanelVisible) {
        setFocusPanelOpen(false);
      }
      triggerMobilePanelNudge();
    } else {
      openDesktopPanelWithAnimation();
    }

    if (!focus) return;

    setTargetPan(
      getConstellationFocusPan(
        nextConstellation,
        FIXED_VIEW_SCALE,
        visibleWindow,
        isMobile,
      ),
    );
  };

  const handleTogglePanel = () => {
    setMobilePanelNudge(false);
    setFocusPanelOpen((value) => !value);
  };

  const handleViewportPointerDown = (event) => {
    if (event.button !== 0) return;
    const clickedConstellation = event.target.closest?.("[data-constellation-id]");
    if (clickedConstellation) {
      dragRef.current = null;
      setIsDragging(false);
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;

    setTargetPan(pan);

    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      pan,
      moved: false,
    };
    suppressClickRef.current = false;
    setIsDragging(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleViewportPointerMove = (event) => {
    const dragState = dragRef.current;
    const stage = stageRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId || !stage) return;

    const bounds = stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const deltaX = event.clientX - dragState.clientX;
    const deltaY = event.clientY - dragState.clientY;
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      dragState.moved = true;
      suppressClickRef.current = true;
      setIsDragging(true);
    }

    const worldDeltaX = (deltaX / bounds.width) * visibleWindow.width;
    const worldDeltaY = (deltaY / bounds.height) * visibleWindow.height;

    const nextPan = clampPan(
      {
        x: dragState.pan.x + worldDeltaX,
        y: dragState.pan.y + worldDeltaY,
      },
      FIXED_VIEW_SCALE,
      visibleWindow,
      isMobile,
    );

    setPan(nextPan);
    setTargetPan(nextPan);
  };

  const handleViewportPointerUp = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;

    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
    setIsDragging(false);
  };

  const handleViewportPointerLeave = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  const handleConstellationClick = (id) => {
    if (suppressClickRef.current) return;
    selectConstellation(id);
  };

  const panel =
    isPanelVisible && selectedConstellation ? (
      <ConstellationsPanel
        isMobile={isMobile}
        open={focusPanelOpen}
        nudgeMobileToggle={mobilePanelNudge}
        constellation={selectedConstellation}
        leadingStars={leadingStars}
        onToggleOpen={handleTogglePanel}
      />
    ) : null;

  return (
    <ConstellationsMap
      panel={panel}
      stageRef={stageRef}
      isDragging={isDragging}
      isMobile={isMobile}
      pan={pan}
      pointer={pointer}
      selectedConstellation={selectedConstellation}
      selectedId={selectedId}
      hoveredId={hoveredId}
      microStars={microStars}
      backgroundStars={backgroundStars}
      deepFieldStars={deepFieldStars}
      onViewportPointerDown={handleViewportPointerDown}
      onViewportPointerMove={handleViewportPointerMove}
      onViewportPointerUp={handleViewportPointerUp}
      onViewportPointerLeave={handleViewportPointerLeave}
      onHoverChange={setHoveredId}
      onConstellationClick={handleConstellationClick}
    />
  );
}

export default ConstellationsPage;
