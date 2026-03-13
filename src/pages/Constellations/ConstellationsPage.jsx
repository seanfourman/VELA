import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildAmbientStars,
  CONSTELLATIONS,
  CONSTELLATIONS_BY_ID,
  getConstellationCentroid,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
} from "./constellationData";
import "../SolarSystem/styles/SolarSystemPage.css";
import "./styles/ConstellationsPage.css";

const FIXED_VIEW_SCALE = 1.16;
const VIEW_EASING = 0.14;
const PAN_EPSILON = 0.025;
const DEFAULT_STAGE_ACCENT = "#8ecdf4";
const VIEW_CENTER = {
  x: VIEWBOX_WIDTH / 2,
  y: VIEWBOX_HEIGHT / 2,
};
const FULL_VISIBLE_WINDOW = {
  x: 0,
  y: 0,
  width: VIEWBOX_WIDTH,
  height: VIEWBOX_HEIGHT,
};
const MOBILE_CONTENT_PADDING_X = 2;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const CONSTELLATION_CONTENT_BOUNDS = CONSTELLATIONS.reduce(
  (bounds, constellation) => {
    constellation.stars.forEach((star) => {
      bounds.minX = Math.min(bounds.minX, star.x);
      bounds.maxX = Math.max(bounds.maxX, star.x);
    });

    bounds.minX = Math.min(bounds.minX, constellation.label.x);
    bounds.maxX = Math.max(bounds.maxX, constellation.label.x);

    return bounds;
  },
  { minX: VIEWBOX_WIDTH, maxX: 0 },
);

const getViewportSize = () => {
  if (typeof window === "undefined") {
    return { width: 1440, height: 900 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

const getVisibleWindow = (isMobile, viewportSize) => {
  if (!isMobile) {
    return FULL_VISIBLE_WINDOW;
  }

  const { width, height } = viewportSize;
  if (!width || !height) {
    return FULL_VISIBLE_WINDOW;
  }

  const viewportAspect = width / height;
  const viewBoxAspect = VIEWBOX_WIDTH / VIEWBOX_HEIGHT;

  if (viewportAspect < viewBoxAspect) {
    const visibleWidth = VIEWBOX_HEIGHT * viewportAspect;
    return {
      x: (VIEWBOX_WIDTH - visibleWidth) / 2,
      y: 0,
      width: visibleWidth,
      height: VIEWBOX_HEIGHT,
    };
  }

  const visibleHeight = VIEWBOX_WIDTH / viewportAspect;
  return {
    x: 0,
    y: (VIEWBOX_HEIGHT - visibleHeight) / 2,
    width: VIEWBOX_WIDTH,
    height: visibleHeight,
  };
};

const clampPan = (
  pan,
  zoom,
  visibleWindow = FULL_VISIBLE_WINDOW,
  constrainToConstellationContent = false,
) => {
  const minPanX = visibleWindow.x + visibleWindow.width - VIEWBOX_WIDTH * zoom;
  const maxPanX = visibleWindow.x;
  const minPanY = visibleWindow.y + visibleWindow.height - VIEWBOX_HEIGHT * zoom;
  const maxPanY = visibleWindow.y;

  if (!constrainToConstellationContent) {
    return {
      x: clamp(pan.x, minPanX, maxPanX),
      y: clamp(pan.y, minPanY, maxPanY),
    };
  }

  const contentMinX = Math.max(
    0,
    CONSTELLATION_CONTENT_BOUNDS.minX - MOBILE_CONTENT_PADDING_X,
  );
  const contentMaxX = Math.min(
    VIEWBOX_WIDTH,
    CONSTELLATION_CONTENT_BOUNDS.maxX + MOBILE_CONTENT_PADDING_X,
  );
  const constrainedMinPanX = Math.max(
    minPanX,
    visibleWindow.x + visibleWindow.width - contentMaxX * zoom,
  );
  const constrainedMaxPanX = Math.min(
    maxPanX,
    visibleWindow.x - contentMinX * zoom,
  );

  return {
    x: clamp(pan.x, constrainedMinPanX, constrainedMaxPanX),
    y: clamp(pan.y, minPanY, maxPanY),
  };
};

const getCenteredPan = (
  zoom,
  visibleWindow = FULL_VISIBLE_WINDOW,
  constrainToConstellationContent = false,
) =>
  clampPan(
    {
      x: VIEW_CENTER.x - VIEW_CENTER.x * zoom,
      y: VIEW_CENTER.y - VIEW_CENTER.y * zoom,
    },
    zoom,
    visibleWindow,
    constrainToConstellationContent,
  );

const getLabelTextAnchor = (align) => {
  if (align === "end") return "end";
  if (align === "middle") return "middle";
  return "start";
};

const getConstellationFocusPan = (
  constellation,
  zoom,
  visibleWindow = FULL_VISIBLE_WINDOW,
  constrainToConstellationContent = false,
) => {
  const centroid = getConstellationCentroid(constellation);
  return clampPan(
    {
      x: VIEW_CENTER.x - centroid.x * zoom,
      y: VIEW_CENTER.y - centroid.y * zoom,
    },
    zoom,
    visibleWindow,
    constrainToConstellationContent,
  );
};

const isPanSettled = (left, right) =>
  Math.abs(left.x - right.x) < PAN_EPSILON &&
  Math.abs(left.y - right.y) < PAN_EPSILON;

function ConstellationsPanelToggle({ open, mobile = false, onClick }) {
  const rotation = mobile ? (open ? 90 : -90) : open ? 0 : 180;

  return (
    <button
      type="button"
      className={`solar-system-panel-toggle ${open ? "active" : ""}`}
      onClick={onClick}
      aria-label={open ? "Hide constellation panel" : "Show constellation panel"}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}

function ConstellationsPanelContent({ constellation, leadingStars }) {
  if (!constellation) {
    return (
      <div className="constellations-detail">
        <div className="constellations-detail__eyebrow">Star archive</div>
        <h2 className="constellations-detail__title">Select a constellation</h2>
        <p className="constellations-detail__headline">Nothing is focused yet.</p>
        <p className="constellations-detail__description">
          Tap or click any constellation on the map to inspect it here.
        </p>
      </div>
    );
  }

  return (
    <div className="constellations-detail">
      <div className="constellations-detail__eyebrow">Selected constellation</div>
      <h2 className="constellations-detail__title">{constellation.name}</h2>
      <p className="constellations-detail__headline">{constellation.headline}</p>
      <div className="constellations-detail__stats">
        <div className="constellations-stat">
          <span>Region</span>
          <strong>{constellation.region}</strong>
        </div>
        <div className="constellations-stat">
          <span>Best seen</span>
          <strong>{constellation.bestSeen}</strong>
        </div>
        <div className="constellations-stat">
          <span>Stars</span>
          <strong>{constellation.stars.length}</strong>
        </div>
        <div className="constellations-stat">
          <span>Links</span>
          <strong>{constellation.connections.length}</strong>
        </div>
      </div>
      <p className="constellations-detail__description">{constellation.description}</p>
      <div className="constellations-detail__known-for">
        <span>Known for</span>
        <strong>{constellation.knownFor}</strong>
      </div>
      <div className="constellations-detail__stars">
        {leadingStars.map((starName) => (
          <span key={starName} className="constellations-star-chip">
            {starName}
          </span>
        ))}
      </div>
    </div>
  );
}

function ConstellationsPanel({
  isMobile,
  open,
  nudgeMobileToggle = false,
  constellation,
  leadingStars,
  onToggleOpen,
}) {
  const content = (
    <ConstellationsPanelContent
      constellation={constellation}
      leadingStars={leadingStars}
    />
  );

  if (isMobile) {
    return (
      <div
        className={`solar-system-panel-mobile ${open ? "open" : "collapsed"} ${
          nudgeMobileToggle ? "nudge" : ""
        }`.trim()}
      >
        <div
          className={`solar-system-panel-mobile__toggle-slot ${open ? "open" : "ready"}`}
        >
          <ConstellationsPanelToggle open={open} mobile onClick={onToggleOpen} />
        </div>
        <aside className="solar-system-panel-mobile__sheet">
          <div className="solar-system-panel-mobile__scroll">{content}</div>
        </aside>
      </div>
    );
  }

  return (
    <div className={`solar-system-panel-wrapper ${open ? "open" : "collapsed"}`}>
      <ConstellationsPanelToggle open={open} onClick={onToggleOpen} />
      <aside className="solar-system-panel">
        <div className="solar-system-panel__scroll">{content}</div>
      </aside>
    </div>
  );
}

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
  const [focusPanelOpen, setFocusPanelOpen] = useState(false);
  const [mobilePanelNudge, setMobilePanelNudge] = useState(false);

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
      if (mobilePanelNudgeTimeoutRef.current) {
        clearTimeout(mobilePanelNudgeTimeoutRef.current);
      }
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

  const stageStyle = {
    "--pointer-x": pointer.x.toFixed(3),
    "--pointer-y": pointer.y.toFixed(3),
    "--constellation-accent": selectedConstellation?.accent ?? DEFAULT_STAGE_ACCENT,
    "--constellation-accent-soft": `${
      selectedConstellation?.accent ?? DEFAULT_STAGE_ACCENT
    }33`,
  };

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

  const triggerMobilePanelNudge = () => {
    if (!isMobile || focusPanelOpen) return;

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

  const selectConstellation = (id, { focus = true } = {}) => {
    const nextConstellation = CONSTELLATIONS_BY_ID[id];
    if (!nextConstellation) {
      setSelectedId("");
      if (focus) {
        setTargetPan(getCenteredPan(FIXED_VIEW_SCALE, visibleWindow, isMobile));
      }
      return;
    }

    setSelectedId(nextConstellation.id);

    if (isMobile) {
      triggerMobilePanelNudge();
    } else {
      setFocusPanelOpen(true);
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
    updatePointerFromEvent(event);

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
    setPointer({ x: 0, y: 0 });
    setHoveredId("");
  };

  const handleConstellationClick = (id) => {
    if (suppressClickRef.current) return;
    selectConstellation(id);
  };

  return (
    <section className="constellations-stage" style={stageStyle}>
      <div className="constellations-stage__backdrop" aria-hidden="true">
        <div className="constellations-nebula constellations-nebula--one" />
        <div className="constellations-nebula constellations-nebula--two" />
        <div className="constellations-nebula constellations-nebula--three" />
        <div className="constellations-grid-glow" />
      </div>

      <ConstellationsPanel
        isMobile={isMobile}
        open={focusPanelOpen}
        nudgeMobileToggle={mobilePanelNudge}
        constellation={selectedConstellation}
        leadingStars={leadingStars}
        onToggleOpen={handleTogglePanel}
      />

      <div
        ref={stageRef}
        className={`constellations-viewport${isDragging ? " is-dragging" : ""}`}
        onPointerDown={handleViewportPointerDown}
        onPointerMove={handleViewportPointerMove}
        onPointerUp={handleViewportPointerUp}
        onPointerCancel={handleViewportPointerUp}
        onPointerLeave={handleViewportPointerLeave}
      >
        <div className="constellations-map-shell">
          <svg
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            className="constellations-map"
            role="img"
            aria-label="Interactive map of major constellations including Vela"
            preserveAspectRatio={isMobile ? "xMidYMid slice" : "xMidYMid meet"}
            shapeRendering="geometricPrecision"
            textRendering="geometricPrecision"
          >
            <g
              className="constellations-star-layer constellations-star-layer--deep"
              transform={`translate(${(pan.x * 0.18 + pointer.x * 1.6).toFixed(
                3,
              )} ${(pan.y * 0.18 + pointer.y * 1.1).toFixed(3)})`}
            >
              {deepFieldStars.map((star) => (
                <circle
                  key={star.id}
                  className="constellations-ambient-star constellations-ambient-star--deep"
                  cx={star.x}
                  cy={star.y}
                  r={star.size}
                  style={{
                    "--twinkle-duration": `${star.duration + 2.2}s`,
                    "--twinkle-delay": `${star.delay}s`,
                    "--twinkle-opacity": star.opacity * 0.44,
                  }}
                />
              ))}
            </g>

            <g
              className="constellations-star-layer"
              transform={`translate(${(pan.x * 0.42 + pointer.x * 1.1).toFixed(
                3,
              )} ${(pan.y * 0.42 + pointer.y * 0.8).toFixed(3)})`}
            >
              {backgroundStars.map((star) => (
                <circle
                  key={star.id}
                  className="constellations-ambient-star"
                  cx={star.x}
                  cy={star.y}
                  r={star.size}
                  style={{
                    "--twinkle-duration": `${star.duration}s`,
                    "--twinkle-delay": `${star.delay}s`,
                    "--twinkle-opacity": star.opacity * 0.68,
                  }}
                />
              ))}
            </g>

            <g
              className="constellations-network-layer"
              transform={`translate(${(pan.x + pointer.x * 0.8).toFixed(3)} ${(
                pan.y + pointer.y * 0.5
              ).toFixed(3)})`}
            >
              <g transform={`scale(${FIXED_VIEW_SCALE.toFixed(3)})`}>
                {CONSTELLATIONS.map((constellation) => {
                  const starLookup = Object.fromEntries(
                    constellation.stars.map((star) => [star.id, star]),
                  );
                  const isSelected = constellation.id === selectedId;
                  const isHovered = constellation.id === hoveredId;
                  const isActive = isSelected || isHovered;
                  const centroid = getConstellationCentroid(constellation);

                  return (
                    <g
                      key={constellation.id}
                      data-constellation-id={constellation.id}
                      className={`constellation-group${isSelected ? " is-selected" : ""}${
                        isHovered ? " is-hovered" : ""
                      }`}
                      onPointerEnter={() => setHoveredId(constellation.id)}
                      onPointerLeave={() => setHoveredId((current) =>
                        current === constellation.id ? "" : current,
                      )}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleConstellationClick(constellation.id);
                      }}
                      style={{
                        "--constellation-color": constellation.accent,
                        "--constellation-glow": isActive ? 1 : 0.55,
                      }}
                    >
                      <circle
                        className="constellation-aura"
                        cx={centroid.x}
                        cy={centroid.y}
                        r={isSelected ? 6.5 : 4.5}
                      />

                      <g className="constellation-hit-lines" aria-hidden="true">
                        {constellation.connections.map(([fromId, toId]) => {
                          const fromStar = starLookup[fromId];
                          const toStar = starLookup[toId];
                          if (!fromStar || !toStar) return null;

                          return (
                            <line
                              key={`${fromId}-${toId}-hit`}
                              x1={fromStar.x}
                              y1={fromStar.y}
                              x2={toStar.x}
                              y2={toStar.y}
                              stroke="transparent"
                              strokeWidth="2.2"
                            />
                          );
                        })}
                      </g>

                      <g className="constellation-lines">
                        {constellation.connections.map(([fromId, toId]) => {
                          const fromStar = starLookup[fromId];
                          const toStar = starLookup[toId];
                          if (!fromStar || !toStar) return null;

                          return (
                            <line
                              key={`${fromId}-${toId}`}
                              x1={fromStar.x}
                              y1={fromStar.y}
                              x2={toStar.x}
                              y2={toStar.y}
                              strokeWidth={isSelected ? 0.32 : 0.22}
                            />
                          );
                        })}
                      </g>

                      <g className="constellation-stars">
                        {constellation.stars.map((star, index) => (
                          <circle
                            key={star.id}
                            cx={star.x}
                            cy={star.y}
                            r={0.22 + star.size * 0.2}
                            className="constellation-star"
                            style={{
                              "--star-delay": `${(index * 0.22).toFixed(2)}s`,
                            }}
                          />
                        ))}
                      </g>

                      <text
                        x={constellation.label.x}
                        y={constellation.label.y}
                        className="constellation-label"
                        textAnchor={getLabelTextAnchor(constellation.label.align)}
                      >
                        {constellation.name}
                      </text>
                    </g>
                  );
                })}
              </g>
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}

export default ConstellationsPage;
