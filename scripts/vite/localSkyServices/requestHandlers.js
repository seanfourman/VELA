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
  bortleFromSqm,
  clamp,
  haversineKm,
  normalizeRecommendationRecord,
  parseBortleLevel,
  readJsonBody,
  roundTo,
  sendJson,
  toRadians,
} from "./core.js";

const LIGHT_TILE_CACHE_LIMIT = 256;
const LIGHT_TILE_CACHE_TTL_MS = 1000 * 60 * 10;

export function createRequestHandlers({
  getImage,
  getLandMask,
  recommendationsStore,
}) {
  const tileCache = new Map();
  const { readRecommendations, writeRecommendations } = recommendationsStore;

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

  const boundsIntersect = (a, b) =>
    a.minLon < b.maxLon &&
    a.maxLon > b.minLon &&
    a.minLat < b.maxLat &&
    a.maxLat > b.minLat;

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
          Math.round(channel + (b.color[idx] - channel) * localT),
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
      "public, max-age=86400",
    );
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
      250,
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
      Math.floor(Math.sqrt((windowWidth * windowHeight) / maxSamples)),
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
        if (
          !Number.isFinite(artificial) ||
          artificial === NODATA_F32 ||
          artificial < 0
        ) {
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
      (a, b) => a.light_value - b.light_value || a.distance_km - b.distance_km,
    );

    const minSeparationKm = Math.max(3, searchDistance / 8);
    const selectedSpots = [];
    for (const candidate of candidates) {
      const isFarEnough = selectedSpots.every(
        (existing) =>
          haversineKm(existing.lat, existing.lon, candidate.lat, candidate.lon) >=
          minSeparationKm,
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
      "public, max-age=600",
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
        (item) => String(item?.id || "").trim() !== spotId,
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
        const statusCode = message === "Request body too large" ? 413 : 400;
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
        (item) => String(item?.id || "").trim() === record.id,
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

  return {
    handleSkyQualityRequest,
    handleLightTileRequest,
    handleDarkSpotsRequest,
    handleVisiblePlanetsRequest,
    handleRecommendationsRequest,
  };
}
