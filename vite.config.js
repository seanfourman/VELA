import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { PNG } from "pngjs";

const NATURAL_MCD_M2 = 0.171168465;
const SQM_DENOM = 108000000;
const NODATA_F32 = -3.4028234663852886e38;
const LIGHT_TILE_SIZE = 256;
const MIN_SQM = 16;
const MAX_SQM = 22;
const LIGHT_TILE_CACHE_LIMIT = 256;
const LIGHT_TILE_CACHE_TTL_MS = 1000 * 60 * 10;
const MAX_REQUEST_BODY_BYTES = 1024 * 1024;

const LIGHT_GRADIENT = [
  // Low brightness -> green, high brightness -> red.
  { t: 0, color: [30, 170, 95, 70] }, // deep green, subtle
  { t: 0.35, color: [92, 200, 118, 120] }, // softer green
  { t: 0.55, color: [210, 190, 70, 150] }, // yellow transition
  { t: 0.78, color: [245, 155, 65, 190] }, // orange
  { t: 1, color: [230, 70, 70, 220] }, // red at brightest
];
const EMPTY_TILE = (() => {
  const png = new PNG({ width: LIGHT_TILE_SIZE, height: LIGHT_TILE_SIZE });
  return PNG.sync.write(png);
})();
const require = createRequire(import.meta.url);

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
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

function parseBortleLevel(label) {
  const match = String(label).match(/class\s*(\d+)/i);
  if (match) return Number(match[1]);
  return 9;
}

function sendJson(response, statusCode, payload, cacheControl = null) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  if (cacheControl) {
    response.setHeader("Cache-Control", cacheControl);
  }
  response.end(JSON.stringify(payload));
}

function ensureStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function ringContainsPoint(ring, lon, lat) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersects =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function polygonContainsPoint(rings, lon, lat) {
  if (!Array.isArray(rings) || rings.length === 0) return false;
  if (!ringContainsPoint(rings[0], lon, lat)) return false;
  for (let i = 1; i < rings.length; i++) {
    if (ringContainsPoint(rings[i], lon, lat)) return false;
  }
  return true;
}

function toGeometryList(landSource) {
  if (!landSource || typeof landSource !== "object") return [];
  if (landSource.type === "FeatureCollection") {
    return (landSource.features || [])
      .map((feature) => feature?.geometry)
      .filter(Boolean);
  }
  if (landSource.type === "Feature") {
    return landSource.geometry ? [landSource.geometry] : [];
  }
  return [landSource];
}

function buildLandMask(landSource) {
  const polygons = [];
  const geometries = toGeometryList(landSource);
  for (const geometry of geometries) {
    if (geometry?.type === "Polygon") {
      polygons.push(geometry.coordinates);
      continue;
    }
    if (geometry?.type === "MultiPolygon") {
      polygons.push(...geometry.coordinates);
    }
  }

  const entries = polygons
    .map((rings) => {
      if (!Array.isArray(rings) || rings.length === 0) return null;
      const outer = rings[0];
      if (!Array.isArray(outer) || outer.length === 0) return null;

      let minLon = Infinity;
      let maxLon = -Infinity;
      let minLat = Infinity;
      let maxLat = -Infinity;
      for (const point of outer) {
        const lon = Number(point?.[0]);
        const lat = Number(point?.[1]);
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
      if (
        !Number.isFinite(minLon) ||
        !Number.isFinite(maxLon) ||
        !Number.isFinite(minLat) ||
        !Number.isFinite(maxLat)
      ) {
        return null;
      }

      return { rings, minLon, maxLon, minLat, maxLat };
    })
    .filter(Boolean);

  return {
    isLand(lon, lat) {
      for (const entry of entries) {
        if (
          lon < entry.minLon ||
          lon > entry.maxLon ||
          lat < entry.minLat ||
          lat > entry.maxLat
        ) {
          continue;
        }
        if (polygonContainsPoint(entry.rings, lon, lat)) {
          return true;
        }
      }
      return false;
    },
  };
}

async function readJsonBody(request) {
  return await new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > MAX_REQUEST_BODY_BYTES) {
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    request.on("error", reject);
  });
}

function normalizeRecommendationRecord(payload) {
  const lat = Number(
    payload?.coordinates?.lat ??
      payload?.coordinates?.latitude ??
      payload?.lat ??
      payload?.latitude
  );
  const lon = Number(
    payload?.coordinates?.lon ??
      payload?.coordinates?.lng ??
      payload?.coordinates?.longitude ??
      payload?.lon ??
      payload?.lng ??
      payload?.longitude
  );
  const name = String(payload?.name || "").trim();
  if (!name) {
    throw new Error("Recommendation name is required");
  }
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error("Latitude must be between -90 and 90");
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new Error("Longitude must be between -180 and 180");
  }

  const idSeed = `${name}_${lat.toFixed(4)}_${lon.toFixed(4)}`;
  const id = String(payload?.id || payload?.spotId || "").trim() || slugify(idSeed);

  return {
    id,
    name,
    country: String(payload?.country || "").trim(),
    region: String(payload?.region || "").trim(),
    type: String(payload?.type || "").trim(),
    description: String(payload?.description || "").trim(),
    best_time: String(payload?.best_time ?? payload?.bestTime ?? "").trim(),
    coordinates: {
      lat: roundTo(lat, 6),
      lon: roundTo(lon, 6),
    },
    photo_urls: ensureStringArray(payload?.photo_urls ?? payload?.photoUrls),
    source_urls: ensureStringArray(payload?.source_urls ?? payload?.sourceUrls),
  };
}

function skyQualityApiPlugin() {
  const rootDir = path.dirname(fileURLToPath(import.meta.url));
  const candidatePaths = [
    path.resolve(rootDir, "data", "World_Atlas_2015.tif"),
    path.resolve(rootDir, "public", "World_Atlas_2015.tif"),
    path.resolve(rootDir, "scripts", "aws", "World_Atlas_2015.tif"),
  ];
  const tifPath = candidatePaths.find((candidate) => fs.existsSync(candidate));

  const recommendationsCandidatePaths = [
    path.resolve(rootDir, "data", "stargazing_locations.json"),
    path.resolve(rootDir, "public", "stargazing_locations.json"),
  ];
  const recommendationsPath =
    recommendationsCandidatePaths.find((candidate) => fs.existsSync(candidate)) ||
    recommendationsCandidatePaths[0];

  let imagePromise = null;
  let landMaskPromise = null;
  const tileCache = new Map();

  async function getImage() {
    if (!tifPath) {
      throw new Error(
        "World_Atlas_2015.tif not found (expected in data/, public/, or scripts/aws/)"
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

  async function getLandMask() {
    if (!landMaskPromise) {
      landMaskPromise = (async () => {
        const [topojsonClient, landTopologyRaw] = await Promise.all([
          import("topojson-client"),
          Promise.resolve(
            JSON.parse(
              fs.readFileSync(require.resolve("world-atlas/land-10m.json"), "utf8")
            )
          ),
        ]);
        const landFeature = topojsonClient.feature(
          landTopologyRaw,
          landTopologyRaw.objects.land
        );
        return buildLandMask(landFeature);
      })().catch((error) => {
        landMaskPromise = null;
        throw error;
      });
    }
    return landMaskPromise;
  }

  function readRecommendations() {
    if (!fs.existsSync(recommendationsPath)) {
      return [];
    }
    try {
      const raw = fs.readFileSync(recommendationsPath, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.locations)) return parsed.locations;
      return [];
    } catch {
      return [];
    }
  }

  function writeRecommendations(locations) {
    let existing = null;
    if (fs.existsSync(recommendationsPath)) {
      try {
        existing = JSON.parse(fs.readFileSync(recommendationsPath, "utf8"));
      } catch {
        existing = null;
      }
    }

    const payload = Array.isArray(existing)
      ? locations
      : {
          ...(existing && typeof existing === "object" ? existing : {}),
          generated_at_utc: new Date().toISOString(),
          locations,
        };

    fs.mkdirSync(path.dirname(recommendationsPath), { recursive: true });
    fs.writeFileSync(recommendationsPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }

  async function handleSkyQualityRequest(request, response) {
    const url = new URL(request.url || "", "http://localhost");
    const lat = Number(url.searchParams.get("lat"));
    const lon = Number(url.searchParams.get("lon"));

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      sendJson(response, 400, { error: "Invalid lat/lon query params" });
      return;
    }

    const image = await getImage();
    const [minLon, minLat, maxLon, maxLat] = image.getBoundingBox();

    if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) {
      sendJson(response, 400, { error: "Coordinates out of dataset bounds" });
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
      sendJson(response, 404, { error: "No data at this coordinate" });
      return;
    }

    const total = artificial + NATURAL_MCD_M2;
    const sqm = Math.log10(total / SQM_DENOM) / -0.4;
    const ratio = artificial / NATURAL_MCD_M2;

    sendJson(
      response,
      200,
      {
        Coordinates: [roundTo(lat, 5), roundTo(lon, 5)],
        SQM: roundTo(sqm, 2),
        Brightness_mcd_m2: roundTo(total, 1),
        Artif_bright_uccd_m2: Math.round(artificial * 1000),
        Ratio: roundTo(ratio, 1),
        Bortle: bortleFromSqm(sqm),
      },
      "public, max-age=86400"
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
  }

  async function handleDarkSpotsRequest(request, response) {
    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    const url = new URL(request.url || "", "http://localhost");
    const lat = Number(url.searchParams.get("lat"));
    const lon = Number(url.searchParams.get("lon"));
    const searchDistance = clamp(
      Number(url.searchParams.get("searchDistance")) || 25,
      1,
      250
    );

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      sendJson(response, 400, { error: "Invalid lat/lon query params" });
      return;
    }

    const image = await getImage();
    const [minLon, minLat, maxLon, maxLat] = image.getBoundingBox();
    if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) {
      sendJson(response, 400, { error: "Coordinates out of dataset bounds" });
      return;
    }

    const width = image.getWidth();
    const height = image.getHeight();
    const xRes = (maxLon - minLon) / width;
    const yRes = (maxLat - minLat) / height;

    const latDelta = searchDistance / 110.574;
    const lonDelta =
      searchDistance / (111.32 * Math.max(Math.abs(Math.cos(toRadians(lat))), 0.2));

    const clippedMinLon = clamp(lon - lonDelta, minLon, maxLon);
    const clippedMaxLon = clamp(lon + lonDelta, minLon, maxLon);
    const clippedMinLat = clamp(lat - latDelta, minLat, maxLat);
    const clippedMaxLat = clamp(lat + latDelta, minLat, maxLat);

    let colStart = Math.floor((clippedMinLon - minLon) / xRes);
    let colEnd = Math.ceil((clippedMaxLon - minLon) / xRes);
    let rowStart = Math.floor((maxLat - clippedMaxLat) / yRes);
    let rowEnd = Math.ceil((maxLat - clippedMinLat) / yRes);

    colStart = clamp(colStart, 0, width - 1);
    colEnd = clamp(colEnd, colStart + 1, width);
    rowStart = clamp(rowStart, 0, height - 1);
    rowEnd = clamp(rowEnd, rowStart + 1, height);

    const windowWidth = colEnd - colStart;
    const windowHeight = rowEnd - rowStart;
    if (windowWidth <= 0 || windowHeight <= 0) {
      sendJson(response, 200, {
        origin: { lat: roundTo(lat, 5), lon: roundTo(lon, 5) },
        radius_km: searchDistance,
        spots: [],
      });
      return;
    }

    let raster;
    try {
      raster = await image.readRasters({
        window: [colStart, rowStart, colEnd, rowEnd],
        samples: [0],
        interleave: true,
      });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Failed to scan dark spots",
      });
      return;
    }

    const data = Array.isArray(raster) ? raster[0] : raster;
    if (!data || data.length === 0) {
      sendJson(response, 200, {
        origin: { lat: roundTo(lat, 5), lon: roundTo(lon, 5) },
        radius_km: searchDistance,
        spots: [],
      });
      return;
    }

    const maxSamples = 9000;
    const stride = Math.max(
      1,
      Math.floor(Math.sqrt((windowWidth * windowHeight) / maxSamples))
    );
    const landMask = await getLandMask();
    const candidates = [];
    for (let row = 0; row < windowHeight; row += stride) {
      const worldRow = rowStart + row;
      const sampleLat = maxLat - (worldRow + 0.5) * yRes;
      for (let col = 0; col < windowWidth; col += stride) {
        const worldCol = colStart + col;
        const sampleLon = minLon + (worldCol + 0.5) * xRes;
        const distanceKm = haversineKm(lat, lon, sampleLat, sampleLon);
        if (distanceKm > searchDistance) continue;
        if (!landMask.isLand(sampleLon, sampleLat)) continue;

        const idx = row * windowWidth + col;
        const artificial = Number(data[idx]);
        if (!Number.isFinite(artificial) || artificial === NODATA_F32 || artificial < 0) {
          continue;
        }

        const total = artificial + NATURAL_MCD_M2;
        const sqm = Math.log10(total / SQM_DENOM) / -0.4;
        const bortle = bortleFromSqm(sqm);
        candidates.push({
          lat: roundTo(sampleLat, 5),
          lon: roundTo(sampleLon, 5),
          level: parseBortleLevel(bortle),
          light_value: roundTo(artificial, 3),
          sqm: roundTo(sqm, 2),
          distance_km: roundTo(distanceKm, 1),
        });
      }
    }

    candidates.sort(
      (a, b) => a.light_value - b.light_value || a.distance_km - b.distance_km
    );

    const minSeparationKm = Math.max(3, searchDistance / 8);
    const selectedSpots = [];
    for (const candidate of candidates) {
      const isFarEnough = selectedSpots.every(
        (existing) =>
          haversineKm(existing.lat, existing.lon, candidate.lat, candidate.lon) >=
          minSeparationKm
      );
      if (!isFarEnough) continue;
      selectedSpots.push(candidate);
      if (selectedSpots.length >= 12) break;
    }

    sendJson(
      response,
      200,
      {
        origin: { lat: roundTo(lat, 5), lon: roundTo(lon, 5) },
        radius_km: searchDistance,
        spots: selectedSpots,
      },
      "public, max-age=600"
    );
  }

  async function handleVisiblePlanetsRequest(request, response) {
    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    const url = new URL(request.url || "", "http://localhost");
    const lat = Number(url.searchParams.get("lat"));
    const lon = Number(url.searchParams.get("lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      sendJson(response, 400, { error: "Invalid lat/lon query params" });
      return;
    }

    const upstreamUrl = new URL("https://api.visibleplanets.dev/v3");
    upstreamUrl.searchParams.set("latitude", String(lat));
    upstreamUrl.searchParams.set("longitude", String(lon));

    let upstreamResponse;
    try {
      upstreamResponse = await fetch(upstreamUrl.toString(), {
        headers: { Accept: "application/json" },
      });
    } catch (error) {
      sendJson(response, 502, {
        error:
          error instanceof Error
            ? error.message
            : "Visible planets service is unavailable",
      });
      return;
    }

    const text = await upstreamResponse.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text };
    }

    if (!upstreamResponse.ok) {
      sendJson(response, upstreamResponse.status, {
        error: "Visible planets lookup failed",
        details: payload,
      });
      return;
    }

    sendJson(response, 200, payload, "public, max-age=600");
  }

  async function handleRecommendationsRequest(request, response, url) {
    const entryMatch = url.pathname.match(/^\/api\/recommendations\/([^/]+)$/);
    if (entryMatch) {
      if (request.method !== "DELETE") {
        sendJson(response, 405, { error: "Method not allowed" });
        return;
      }
      const spotId = decodeURIComponent(entryMatch[1] || "").trim();
      if (!spotId) {
        sendJson(response, 400, { error: "Missing recommendation id" });
        return;
      }
      const current = readRecommendations();
      const next = current.filter(
        (item) => String(item?.id || "").trim() !== spotId
      );
      if (next.length === current.length) {
        sendJson(response, 404, { error: "Recommendation not found" });
        return;
      }
      writeRecommendations(next);
      sendJson(response, 200, { deleted: true, id: spotId });
      return;
    }

    if (url.pathname !== "/api/recommendations") {
      return;
    }

    if (request.method === "GET") {
      sendJson(response, 200, { items: readRecommendations() }, "public, max-age=60");
      return;
    }

    if (request.method === "POST") {
      let payload = {};
      try {
        payload = await readJsonBody(request);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid recommendation payload";
        const statusCode =
          message === "Request body too large" ? 413 : 400;
        sendJson(response, statusCode, { error: message });
        return;
      }

      let record;
      try {
        record = normalizeRecommendationRecord(payload);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Invalid recommendation payload";
        sendJson(response, 400, { error: message });
        return;
      }

      const items = readRecommendations();
      const index = items.findIndex(
        (item) => String(item?.id || "").trim() === record.id
      );
      if (index >= 0) {
        items[index] = record;
      } else {
        items.push(record);
      }
      writeRecommendations(items);
      sendJson(response, index >= 0 ? 200 : 201, record);
      return;
    }

    sendJson(response, 405, { error: "Method not allowed" });
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

        if (url.pathname === "/api/darkspots") {
          await handleDarkSpotsRequest(request, response);
          return;
        }

        if (url.pathname === "/api/visible-planets") {
          await handleVisiblePlanetsRequest(request, response);
          return;
        }

        if (
          url.pathname === "/api/recommendations" ||
          /^\/api\/recommendations\/[^/]+$/.test(url.pathname)
        ) {
          await handleRecommendationsRequest(request, response, url);
          return;
        }

        return next();
      } catch (error) {
        sendJson(response, 500, {
          error: error instanceof Error ? error.message : "Local API request failed",
        });
      }
    });
  }

  return {
    name: "local-sky-services",
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
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@react-three/drei")) {
            return "drei-vendor";
          }
          if (id.includes("@react-three/fiber")) {
            return "fiber-vendor";
          }
          if (id.includes("/three/examples/")) {
            return "three-examples-vendor";
          }
          if (id.includes("/three/")) {
            return "three-core-vendor";
          }
          if (id.includes("leaflet") || id.includes("react-leaflet")) {
            return "leaflet-vendor";
          }
          if (id.includes("react")) {
            return "react-vendor";
          }
          return "vendor";
        },
      },
    },
  },
});
