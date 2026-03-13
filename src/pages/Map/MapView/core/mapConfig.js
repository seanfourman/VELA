import {
  buildMapTilerRasterTemplateUrl,
  getLightmapTileUrlTemplate,
} from "@/utils/apiEndpoints";

const LOCATION_ZOOM = 16;
const DEFAULT_CENTER = [20, 0];
const DEFAULT_ZOOM = 2;
const MIN_ZOOM = 4;
const MAX_ZOOM = 16;
const MARKER_VISIBILITY_ZOOM = 8;
const LONG_PRESS_MS = 750;
const MARKER_EXIT_MS = 280;
const FAVORITE_EXIT_MS = 260;
const STARGAZE_PANEL_EXIT_MS = 320;
const LIGHT_TILE_URL = getLightmapTileUrlTemplate();

const MAP_TILES = {
  dark: {
    url: buildMapTilerRasterTemplateUrl("streets-v2-dark", "png"),
    attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>',
  },
  light: {
    url: buildMapTilerRasterTemplateUrl("streets-v2", "png"),
    attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>',
  },
  satellite: {
    url: buildMapTilerRasterTemplateUrl("hybrid", "jpg"),
    attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>',
  },
};

export {
  LOCATION_ZOOM,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  MARKER_VISIBILITY_ZOOM,
  LONG_PRESS_MS,
  MARKER_EXIT_MS,
  FAVORITE_EXIT_MS,
  STARGAZE_PANEL_EXIT_MS,
  LIGHT_TILE_URL,
  MAP_TILES,
};
