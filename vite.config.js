import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const NATURAL_MCD_M2 = 0.171168465;
const SQM_DENOM = 108000000;
const NODATA_F32 = -3.4028234663852886e38;
const LIGHT_TILE_SIZE = 256;
const MIN_SQM = 16;
const MAX_SQM = 22;
const LIGHT_TILE_CACHE_LIMIT = 256;
const LIGHT_TILE_CACHE_TTL_MS = 1000 * 60 * 10;

const LIGHT_GRADIENT = [
  { t: 0, color: [6, 22, 58, 32] },
  { t: 0.15, color: [21, 71, 121, 72] },
  { t: 0.35, color: [0, 135, 189, 108] },
  { t: 0.55, color: [74, 182, 138, 138] },
  { t: 0.72, color: [198, 206, 92, 164] },
  { t: 0.88, color: [248, 170, 70, 194] },
  { t: 1, color: [255, 104, 92, 218] },
];
const EMPTY_TILE = (() => {
  const png = new PNG({ width: LIGHT_TILE_SIZE, height: LIGHT_TILE_SIZE });
  return PNG.sync.write(png);
})();

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function bortleFromSqm(sqm) {
  if (sqm >= 21.99) return "class 1";
  if (sqm >= 21.89) return "class 2";
  if (sqm >= 21.69) return "class 3";
  if (sqm >= 20.49) return "class 4";
  if (sqm >= 19.5) return "class 5";
  if (sqm >= 18.94) return "class 6";
  if (sqm >= 18.38) return "class 7";
  return "class 8-9";
}

function skyQualityApiPlugin() {
  const rootDir = path.dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    path.resolve(rootDir, "data", "World_Atlas_2015.tif"),
    path.resolve(rootDir, "public", "World_Atlas_2015.tif"),
  ];
  const tifPath = candidatePaths.find((candidate) => fs.existsSync(candidate));

  let imagePromise = null;
  const tileCache = new Map();

  async function getImage() {
    if (!tifPath) {
      throw new Error(
        "World_Atlas_2015.tif not found (expected in data/ or public/)"
      );
    }
    if (!imagePromise) {
      imagePromise = (async () => {
        const { fromFile } = await import("geotiff");
        const tiff = await fromFile(tifPath);
        return await tiff.getImage();
      })().catch((error) => {
        imagePromise = null;
        throw error;
      });
    }
    return imagePromise;
  }

  async function handleSkyQualityRequest(request, response) {
    const url = new URL(request.url || "", "http://localhost");
    const lat = Number(url.searchParams.get("lat"));
    const lon = Number(url.searchParams.get("lon"));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      response.statusCode = 400;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ error: "Invalid lat/lon query params" }));
      return;
    }

    const image = await getImage();
    const [minLon, minLat, maxLon, maxLat] = image.getBoundingBox();

    if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) {
      response.statusCode = 400;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ error: "Coordinates out of dataset bounds" }));
      return;
    }

    const width = image.getWidth();
    const height = image.getHeight();
    const xRes = (maxLon - minLon) / width;
    const yRes = (maxLat - minLat) / height;

    let col = Math.floor((lon - minLon) / xRes);
    let row = Math.floor((maxLat - lat) / yRes);

    if (col < 0) col = 0;
    if (row < 0) row = 0;
    if (col >= width) col = width - 1;
    if (row >= height) row = height - 1;

    const rasters = await image.readRasters({
      window: [col, row, col + 1, row + 1],
    });

    const sample = Array.isArray(rasters) ? rasters[0]?.[0] : null;
    const artificial = Number(sample);

    if (!Number.isFinite(artificial) || artificial === NODATA_F32) {
      response.statusCode = 404;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ error: "No data at this coordinate" }));
      return;
    }

    const total = artificial + NATURAL_MCD_M2;
    const sqm = Math.log10(total / SQM_DENOM) / -0.4;
    const ratio = artificial / NATURAL_MCD_M2;

    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.setHeader("Cache-Control", "public, max-age=86400");
    response.end(
      JSON.stringify({
        Coordinates: [roundTo(lat, 5), roundTo(lon, 5)],
        SQM: roundTo(sqm, 2),
        Brightness_mcd_m2: roundTo(total, 1),
        Artif_bright_uccd_m2: Math.round(artificial * 1000),
        Ratio: roundTo(ratio, 1),
        Bortle: bortleFromSqm(sqm),
      })
    );
  }

  function tileToBounds(x, y, z) {
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
  }

  function boundsIntersect(a, b) {
    return (
      a.minLon < b.maxLon &&
      a.maxLon > b.minLon &&
      a.minLat < b.maxLat &&
      a.maxLat > b.minLat
    );
  }

  function getCachedTile(key) {
    const entry = tileCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.created > LIGHT_TILE_CACHE_TTL_MS) {
      tileCache.delete(key);
      return null;
    }
    return entry.buffer;
  }

  function setCachedTile(key, buffer) {
    tileCache.set(key, { buffer, created: Date.now() });
    if (tileCache.size <= LIGHT_TILE_CACHE_LIMIT) return;
    // Drop the oldest entry to keep memory bounded.
    let oldestKey = null;
    let oldestTimestamp = Infinity;
    for (const [candidateKey, entry] of tileCache) {
      if (entry.created < oldestTimestamp) {
        oldestTimestamp = entry.created;
        oldestKey = candidateKey;
      }
    }
    if (oldestKey) tileCache.delete(oldestKey);
  }

  function interpolateGradient(stops, t) {
    if (t <= stops[0].t) return stops[0].color;
    if (t >= stops[stops.length - 1].t) return stops[stops.length - 1].color;
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      if (t >= a.t && t <= b.t) {
        const span = b.t - a.t || 1;
        const localT = (t - a.t) / span;
        return a.color.map((channel, idx) =>
          Math.round(channel + (b.color[idx] - channel) * localT)
        );
      }
    }
    return stops[stops.length - 1].color;
  }

  function colorFromArtificial(artificial) {
    if (!Number.isFinite(artificial) || artificial < 0) {
      return [0, 0, 0, 0];
    }
    const total = artificial + NATURAL_MCD_M2;
    if (!Number.isFinite(total) || total <= 0) return [0, 0, 0, 0];

    const sqm = Math.log10(total / SQM_DENOM) / -0.4;
    const clampedSqm = clamp(sqm, MIN_SQM, MAX_SQM);
    const normalized = 1 - (clampedSqm - MIN_SQM) / (MAX_SQM - MIN_SQM);

    return interpolateGradient(LIGHT_GRADIENT, normalized);
  }

  async function handleLightTileRequest(request, response, match) {
    if (request.method !== "GET") {
      response.statusCode = 405;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ error: "Method not allowed" }));
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
      response.statusCode = 400;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ error: "Invalid tile coordinates" }));
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
    const [dataMinLon, dataMinLat, dataMaxLon, dataMaxLat] =
      image.getBoundingBox();
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
      response.statusCode = 500;
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : "Failed to render light tile",
        })
      );
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
  }

  function mount(server) {
    server.middlewares.use(async (request, response, next) => {
      try {
        const url = new URL(request.url || "", "http://localhost");
        const lightTileMatch = url.pathname.match(
          /^\/api\/lightmap\/(\d+)\/(\d+)\/(\d+)\.png$/
        );
        if (lightTileMatch) {
          await handleLightTileRequest(request, response, lightTileMatch);
          return;
        }

        if (url.pathname === "/api/skyquality") {
          await handleSkyQualityRequest(request, response);
          return;
        }

        return next();
      } catch (error) {
        response.statusCode = 500;
        response.setHeader("Content-Type", "application/json");
        const message =
          error instanceof Error
            ? error.message
            : "Light data request failed";
        response.end(JSON.stringify({ error: message }));
      }
    });
  }

  return {
    name: "skyquality-api",
    configureServer(server) {
      mount(server);
    },
    configurePreviewServer(server) {
      mount(server);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), skyQualityApiPlugin()],
  server: {
    proxy: {
      "/api/darkspots": {
        target:
          "https://u33sdsncu9.execute-api.us-east-1.amazonaws.com/darkspots",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/darkspots/, ""),
      },
    },
  },
});
