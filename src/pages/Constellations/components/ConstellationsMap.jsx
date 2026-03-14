import {
  CONSTELLATIONS,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
} from "../constellationData";
import {
  DEFAULT_STAGE_ACCENT,
  FIXED_VIEW_SCALE,
  getLabelTextAnchor,
} from "../constellationViewUtils";

function ConstellationsMap({
  panel = null,
  stageRef,
  isDragging,
  isMobile,
  pan,
  pointer,
  selectedConstellation,
  selectedId,
  hoveredId,
  microStars,
  backgroundStars,
  deepFieldStars,
  onViewportPointerDown,
  onViewportPointerMove,
  onViewportPointerUp,
  onViewportPointerLeave,
  onHoverChange,
  onConstellationClick,
}) {
  const stageStyle = {
    "--pointer-x": pointer.x.toFixed(3),
    "--pointer-y": pointer.y.toFixed(3),
    "--constellation-accent": selectedConstellation?.accent ?? DEFAULT_STAGE_ACCENT,
    "--constellation-accent-soft": `${
      selectedConstellation?.accent ?? DEFAULT_STAGE_ACCENT
    }33`,
  };

  return (
    <section className="constellations-stage" style={stageStyle}>
      <div className="constellations-stage__backdrop" aria-hidden="true">
        <div className="constellations-nebula constellations-nebula--one" />
        <div className="constellations-nebula constellations-nebula--two" />
        <div className="constellations-nebula constellations-nebula--three" />
        <div className="constellations-grid-glow" />
      </div>

      {panel}

      <div
        ref={stageRef}
        className={`constellations-viewport${isDragging ? " is-dragging" : ""}`}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onViewportPointerMove}
        onPointerUp={onViewportPointerUp}
        onPointerCancel={onViewportPointerUp}
        onPointerLeave={onViewportPointerLeave}
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
              className="constellations-star-layer constellations-star-layer--micro"
              transform={`translate(${(pan.x * 0.08 + pointer.x * 0.7).toFixed(3)} ${(pan.y * 0.08 + pointer.y * 0.45).toFixed(3)})`}
            >
              {microStars.map((star) => (
                <circle
                  key={star.id}
                  className="constellations-ambient-star constellations-ambient-star--micro"
                  cx={star.x}
                  cy={star.y}
                  r={0.035 + star.size * 0.09}
                  style={{
                    "--twinkle-duration": `${star.duration + 3.2}s`,
                    "--twinkle-delay": `${star.delay}s`,
                    "--twinkle-opacity": star.opacity * 0.22,
                  }}
                />
              ))}
            </g>

            <g
              className="constellations-star-layer constellations-star-layer--deep"
              transform={`translate(${(pan.x * 0.18 + pointer.x * 1.6).toFixed(3)} ${(pan.y * 0.18 + pointer.y * 1.1).toFixed(3)})`}
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
              transform={`translate(${(pan.x * 0.42 + pointer.x * 1.1).toFixed(3)} ${(pan.y * 0.42 + pointer.y * 0.8).toFixed(3)})`}
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
              transform={`translate(${(pan.x + pointer.x * 0.8).toFixed(3)} ${(pan.y + pointer.y * 0.5).toFixed(3)})`}
            >
              <g transform={`scale(${FIXED_VIEW_SCALE.toFixed(3)})`}>
                {CONSTELLATIONS.map((constellation) => {
                  const starLookup = Object.fromEntries(
                    constellation.stars.map((star) => [star.id, star]),
                  );
                  const isSelected = constellation.id === selectedId;
                  const isHovered = constellation.id === hoveredId;
                  const isActive = isSelected || isHovered;

                  return (
                    <g
                      key={constellation.id}
                      data-constellation-id={constellation.id}
                      className={`constellation-group${isSelected ? " is-selected" : ""}${isHovered ? " is-hovered" : ""}`}
                      onPointerEnter={() => onHoverChange(constellation.id)}
                      onPointerLeave={() => {
                        if (hoveredId === constellation.id) {
                          onHoverChange("");
                        }
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        onConstellationClick(constellation.id);
                      }}
                      style={{
                        "--constellation-color": constellation.accent,
                        "--constellation-glow": isActive ? 1 : 0.55,
                      }}
                    >
                      <g
                        className="constellation-aura-trail constellations-aura-trail--outer"
                        aria-hidden="true"
                      >
                        {constellation.connections.map(([fromId, toId]) => {
                          const fromStar = starLookup[fromId];
                          const toStar = starLookup[toId];
                          if (!fromStar || !toStar) return null;

                          return (
                            <line
                              key={`${fromId}-${toId}-aura-outer`}
                              x1={fromStar.x}
                              y1={fromStar.y}
                              x2={toStar.x}
                              y2={toStar.y}
                              strokeWidth={isSelected ? 7.2 : 5.4}
                            />
                          );
                        })}
                      </g>

                      <g className="constellation-aura-trail" aria-hidden="true">
                        {constellation.connections.map(([fromId, toId]) => {
                          const fromStar = starLookup[fromId];
                          const toStar = starLookup[toId];
                          if (!fromStar || !toStar) return null;

                          return (
                            <line
                              key={`${fromId}-${toId}-aura`}
                              x1={fromStar.x}
                              y1={fromStar.y}
                              x2={toStar.x}
                              y2={toStar.y}
                              strokeWidth={isSelected ? 4.6 : 3.4}
                            />
                          );
                        })}
                      </g>

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
                              strokeWidth={isSelected ? 0.42 : 0.3}
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

export default ConstellationsMap;
