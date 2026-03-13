import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildAmbientStars,
  CONSTELLATIONS,
  CONSTELLATIONS_BY_ID,
  getConstellationCentroid,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
} from "./constellationData";
import "./styles/ConstellationsPage.css";

const DEFAULT_SELECTED_ID = "vela";
const FIXED_VIEW_SCALE = 1.16;
const VIEW_EASING = 0.14;
const PAN_EPSILON = 0.025;
const VIEW_CENTER = {
  x: VIEWBOX_WIDTH / 2,
  y: VIEWBOX_HEIGHT / 2,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const clampPan = (pan, zoom) => ({
  x: clamp(pan.x, VIEWBOX_WIDTH - VIEWBOX_WIDTH * zoom, 0),
  y: clamp(pan.y, VIEWBOX_HEIGHT - VIEWBOX_HEIGHT * zoom, 0),
});

const getCenteredPan = (zoom) =>
  clampPan(
    {
      x: VIEW_CENTER.x - VIEW_CENTER.x * zoom,
      y: VIEW_CENTER.y - VIEW_CENTER.y * zoom,
    },
    zoom,
  );

const getLabelTextAnchor = (align) => {
  if (align === "end") return "end";
  if (align === "middle") return "middle";
  return "start";
};

const getConstellationFocusPan = (constellation, zoom) => {
  const centroid = getConstellationCentroid(constellation);
  return clampPan(
    {
      x: VIEW_CENTER.x - centroid.x * zoom,
      y: VIEW_CENTER.y - centroid.y * zoom,
    },
    zoom,
  );
};

const isPanSettled = (left, right) =>
  Math.abs(left.x - right.x) < PAN_EPSILON &&
  Math.abs(left.y - right.y) < PAN_EPSILON;

function ConstellationsPage() {
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const [selectedId, setSelectedId] = useState(DEFAULT_SELECTED_ID);
  const [hoveredId, setHoveredId] = useState("");
  const [pan, setPan] = useState(() => getCenteredPan(FIXED_VIEW_SCALE));
  const [targetPan, setTargetPan] = useState(() => getCenteredPan(FIXED_VIEW_SCALE));
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const backgroundStars = useMemo(() => buildAmbientStars(220, 23), []);
  const deepFieldStars = useMemo(() => buildAmbientStars(140, 71), []);
  const selectedConstellation =
    CONSTELLATIONS_BY_ID[selectedId] ?? CONSTELLATIONS_BY_ID[DEFAULT_SELECTED_ID];
  const leadingStars = useMemo(
    () =>
      [...selectedConstellation.stars]
        .sort((left, right) => right.size - left.size)
        .slice(0, 4)
        .map((star) => star.name),
    [selectedConstellation],
  );

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
    "--constellation-accent": selectedConstellation.accent,
    "--constellation-accent-soft": `${selectedConstellation.accent}33`,
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

  const selectConstellation = (id, { focus = true } = {}) => {
    const nextConstellation =
      CONSTELLATIONS_BY_ID[id] ?? CONSTELLATIONS_BY_ID[DEFAULT_SELECTED_ID];

    setSelectedId(nextConstellation.id);
    if (!focus) return;

    setTargetPan(getConstellationFocusPan(nextConstellation, FIXED_VIEW_SCALE));
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

    const worldDeltaX = (deltaX / bounds.width) * VIEWBOX_WIDTH;
    const worldDeltaY = (deltaY / bounds.height) * VIEWBOX_HEIGHT;

    const nextPan = clampPan(
      {
        x: dragState.pan.x + worldDeltaX,
        y: dragState.pan.y + worldDeltaY,
      },
      FIXED_VIEW_SCALE,
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

      <div className="constellations-detail glass-panel glass-panel-elevated">
        <div className="constellations-detail__eyebrow">Selected constellation</div>
        <h2 className="constellations-detail__title">{selectedConstellation.name}</h2>
        <p className="constellations-detail__headline">
          {selectedConstellation.headline}
        </p>
        <div className="constellations-detail__stats">
          <div className="constellations-stat">
            <span>Region</span>
            <strong>{selectedConstellation.region}</strong>
          </div>
          <div className="constellations-stat">
            <span>Best seen</span>
            <strong>{selectedConstellation.bestSeen}</strong>
          </div>
          <div className="constellations-stat">
            <span>Stars</span>
            <strong>{selectedConstellation.stars.length}</strong>
          </div>
          <div className="constellations-stat">
            <span>Links</span>
            <strong>{selectedConstellation.connections.length}</strong>
          </div>
        </div>
        <p className="constellations-detail__description">
          {selectedConstellation.description}
        </p>
        <div className="constellations-detail__known-for">
          <span>Known for</span>
          <strong>{selectedConstellation.knownFor}</strong>
        </div>
        <div className="constellations-detail__stars">
          {leadingStars.map((starName) => (
            <span key={starName} className="constellations-star-chip">
              {starName}
            </span>
          ))}
        </div>
      </div>

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
                    "--twinkle-opacity": star.opacity * 0.72,
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
                    "--twinkle-opacity": star.opacity,
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
                  const isSelected = constellation.id === selectedConstellation.id;
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
                            r={0.16 + star.size * 0.16}
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

      <div className="constellations-rail">
        {CONSTELLATIONS.map((constellation) => {
          const isActive = constellation.id === selectedConstellation.id;
          return (
            <button
              key={constellation.id}
              type="button"
              className={`constellations-rail__item${isActive ? " is-active" : ""}`}
              style={{ "--constellation-color": constellation.accent }}
              onClick={() => selectConstellation(constellation.id)}
            >
              {constellation.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default ConstellationsPage;
