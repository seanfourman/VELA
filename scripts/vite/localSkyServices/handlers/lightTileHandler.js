import { PNG } from "pngjs";
import {
  EMPTY_TILE,
  LIGHT_GRADIENT,
  LIGHT_TILE_SIZE,
  MAX_SQM,
  MIN_SQM,
  NATURAL_MCD_M2,
  NODATA_F32,
  SQM_DENOM,
  clamp,
  sendJson,
} from "../core.js";

const LIGHT_TILE_CACHE_LIMIT = 256;
const LIGHT_TILE_CACHE_TTL_MS = 1000 * 60 * 10;

export function createLightTileHandler({ getImage }) {
  const tileCache = new Map();

  const tileToBounds = (x, y, z) => {
    const n = 2 ** z;
    const lonLeft = (x / n) * 360 - 180;
    const lonRight = ((x + 1) / n) * 360 - 180;
    const mercToLat = (t) =>
      (180 / Math.PI) * Math.atan(0.5 * (Math.exp(t) - Math.exp(-t)));
    const latTop = mercToLat(Math.PI - (2 * Math.PI * y) / n);
    const latBottom = mercToLat(Math.PI - (2 * Math.PI * (y + 1)) / n);
    return {
      minLon: lonLeft,
      maxLon: lonRight,
      minLat: latBottom,
      maxLat: latTop,
    };
  };

  const boundsIntersect = (a, b) =>
    a.minLon < b.maxLon &&
    a.maxLon > b.minLon &&
    a.minLat < b.maxLat &&
    a.maxLat > b.minLat;

  const getCachedTile = (key) => {
    const entry = tileCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.created > LIGHT_TILE_CACHE_TTL_MS) {
      tileCache.delete(key);
      return null;
    }
    return entry.buffer;
  };

  const setCachedTile = (key, buffer) => {
    tileCache.set(key, { buffer, created: Date.now() });
    if (tileCache.size <= LIGHT_TILE_CACHE_LIMIT) return;

    let oldestKey = null;
    let oldestTimestamp = Infinity;
    for (const [candidateKey, entry] of tileCache) {
      if (entry.created < oldestTimestamp) {
        oldestTimestamp = entry.created;
        oldestKey = candidateKey;
      }
    }
    if (oldestKey) tileCache.delete(oldestKey);
  };

  const interpolateGradient = (stops, t) => {
    if (t <= stops[0].t) return stops[0].color;
    if (t >= stops[stops.length - 1].t) return stops[stops.length - 1].color;
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      if (t >= a.t && t <= b.t) {
        const span = b.t - a.t || 1;
        const localT = (t - a.t) / span;
        return a.color.map((channel, idx) =>
          Math.round(channel + (b.color[idx] - channel) * localT),
        );
      }
    }
    return stops[stops.length - 1].color;
  };

  const colorFromArtificial = (artificial) => {
    if (!Number.isFinite(artificial) || artificial < 0) {
      return [0, 0, 0, 0];
    }
    const total = artificial + NATURAL_MCD_M2;
    if (!Number.isFinite(total) || total <= 0) return [0, 0, 0, 0];

    const sqm = Math.log10(total / SQM_DENOM) / -0.4;
    const clampedSqm = clamp(sqm, MIN_SQM, MAX_SQM);
    const normalized = 1 - (clampedSqm - MIN_SQM) / (MAX_SQM - MIN_SQM);
    return interpolateGradient(LIGHT_GRADIENT, normalized);
  };

  return async function handleLightTileRequest(request, response, match) {
    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    const [, zStr, xStr, yStr] = match;
    const z = Number(zStr);
    const x = Number(xStr);
    const y = Number(yStr);

    if (
      !Number.isInteger(z) ||
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      z < 0 ||
      x < 0 ||
      y < 0 ||
      x >= 2 ** z ||
      y >= 2 ** z
    ) {
      sendJson(response, 400, { error: "Invalid tile coordinates" });
      return;
    }

    const cacheKey = `${z}/${x}/${y}`;
    const cached = getCachedTile(cacheKey);
    if (cached) {
      response.statusCode = 200;
      response.setHeader("Content-Type", "image/png");
      response.setHeader("Cache-Control", "public, max-age=3600");
      response.end(cached);
      return;
    }

    const image = await getImage();
    const [dataMinLon, dataMinLat, dataMaxLon, dataMaxLat] = image.getBoundingBox();
    const datasetBounds = {
      minLon: dataMinLon,
      maxLon: dataMaxLon,
      minLat: dataMinLat,
      maxLat: dataMaxLat,
    };
    const tileBounds = tileToBounds(x, y, z);

    if (!boundsIntersect(tileBounds, datasetBounds)) {
      response.statusCode = 200;
      response.setHeader("Content-Type", "image/png");
      response.setHeader("Cache-Control", "public, max-age=3600");
      response.end(EMPTY_TILE);
      setCachedTile(cacheKey, EMPTY_TILE);
      return;
    }

    const width = image.getWidth();
    const height = image.getHeight();
    const xRes = (dataMaxLon - dataMinLon) / width;
    const yRes = (dataMaxLat - dataMinLat) / height;

    const clippedMinLon = clamp(tileBounds.minLon, dataMinLon, dataMaxLon);
    const clippedMaxLon = clamp(tileBounds.maxLon, dataMinLon, dataMaxLon);
    const clippedMinLat = clamp(tileBounds.minLat, dataMinLat, dataMaxLat);
    const clippedMaxLat = clamp(tileBounds.maxLat, dataMinLat, dataMaxLat);

    let colStart = Math.floor((clippedMinLon - dataMinLon) / xRes);
    let colEnd = Math.ceil((clippedMaxLon - dataMinLon) / xRes);
    let rowStart = Math.floor((dataMaxLat - clippedMaxLat) / yRes);
    let rowEnd = Math.ceil((dataMaxLat - clippedMinLat) / yRes);

    colStart = clamp(colStart, 0, width - 1);
    colEnd = clamp(colEnd, colStart + 1, width);
    rowStart = clamp(rowStart, 0, height - 1);
    rowEnd = clamp(rowEnd, rowStart + 1, height);

    const readWidth = colEnd - colStart;
    const readHeight = rowEnd - rowStart;

    let raster;
    try {
      raster = await image.readRasters({
        window: [colStart, rowStart, colEnd, rowEnd],
        width: LIGHT_TILE_SIZE,
        height: LIGHT_TILE_SIZE,
        samples: [0],
        interleave: true,
        resampleMethod: "bilinear",
      });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Failed to render light tile",
      });
      return;
    }

    const data = Array.isArray(raster) ? raster[0] : raster;
    if (!data || data.length === 0 || readWidth <= 0 || readHeight <= 0) {
      response.statusCode = 200;
      response.setHeader("Content-Type", "image/png");
      response.setHeader("Cache-Control", "public, max-age=3600");
      response.end(EMPTY_TILE);
      setCachedTile(cacheKey, EMPTY_TILE);
      return;
    }

    const png = new PNG({ width: LIGHT_TILE_SIZE, height: LIGHT_TILE_SIZE });
    for (let i = 0; i < data.length; i++) {
      const value = data[i];
      const [r, g, b, a] =
        Number.isFinite(value) && value !== NODATA_F32
          ? colorFromArtificial(value)
          : [0, 0, 0, 0];
      const idx = i * 4;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }

    const buffer = PNG.sync.write(png);
    setCachedTile(cacheKey, buffer);

    response.statusCode = 200;
    response.setHeader("Content-Type", "image/png");
    response.setHeader("Cache-Control", "public, max-age=3600");
    response.end(buffer);
  };
}
