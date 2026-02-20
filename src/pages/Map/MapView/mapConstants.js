import { getLightmapTileUrlTemplate } from "../../../utils/apiEndpoints";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || "";
const LOCATION_ZOOM = 16;
const DEFAULT_CENTER = [20, 0];
const DEFAULT_ZOOM = 2;
const MIN_ZOOM = 4;
const MAX_ZOOM = 16;
const LONG_PRESS_MS = 750;
const MARKER_EXIT_MS = 280;
const FAVORITE_EXIT_MS = 260;
const STARGAZE_PANEL_EXIT_MS = 320;
const LIGHT_TILE_URL = getLightmapTileUrlTemplate();

const MAP_TILES = {
  dark: {
    url: `https://api.maptiler.com/maps/streets-v2-dark/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
    attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>',
  },
  light: {
    url: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
    attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>',
  },
  satellite: {
    url: `https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`,
    attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>',
  },
};

export {
  MAPTILER_KEY,
  LOCATION_ZOOM,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  LONG_PRESS_MS,
  MARKER_EXIT_MS,
  FAVORITE_EXIT_MS,
  STARGAZE_PANEL_EXIT_MS,
  LIGHT_TILE_URL,
  MAP_TILES,
};
