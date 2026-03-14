import {
  CONSTELLATIONS,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
  getConstellationCentroid,
} from "./constellationData";

export const FIXED_VIEW_SCALE = 1.16;
export const VIEW_EASING = 0.14;
export const PAN_EPSILON = 0.025;
export const DEFAULT_STAGE_ACCENT = "#8ecdf4";
export const VIEW_CENTER = {
  x: VIEWBOX_WIDTH / 2,
  y: VIEWBOX_HEIGHT / 2,
};
export const FULL_VISIBLE_WINDOW = {
  x: 0,
  y: 0,
  width: VIEWBOX_WIDTH,
  height: VIEWBOX_HEIGHT,
};
const MOBILE_CONTENT_PADDING_X = 2;

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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

export const getViewportSize = () => {
  if (typeof window === "undefined") {
    return { width: 1440, height: 900 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

export const getVisibleWindow = (isMobile, viewportSize) => {
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

export const clampPan = (
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

export const getCenteredPan = (
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

export const getLabelTextAnchor = (align) => {
  if (align === "end") return "end";
  if (align === "middle") return "middle";
  return "start";
};

export const getConstellationFocusPan = (
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

export const isPanSettled = (left, right) =>
  Math.abs(left.x - right.x) < PAN_EPSILON &&
  Math.abs(left.y - right.y) < PAN_EPSILON;
