import {
  NATURAL_MCD_M2,
  NODATA_F32,
  SQM_DENOM,
  bortleFromSqm,
  clamp,
  haversineKm,
  parseBortleLevel,
  roundTo,
  sendJson,
  toRadians,
} from "../core.js";

export function createDarkSpotsHandler({ getImage, getLandMask }) {
  return async function handleDarkSpotsRequest(request, response) {
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
  };
}
