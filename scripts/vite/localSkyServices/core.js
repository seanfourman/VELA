import { PNG } from "pngjs";

export const NATURAL_MCD_M2 = 0.171168465;
export const SQM_DENOM = 108000000;
export const NODATA_F32 = -3.4028234663852886e38;
export const LIGHT_TILE_SIZE = 256;
export const MIN_SQM = 16;
export const MAX_SQM = 22;
const MAX_REQUEST_BODY_BYTES = 1024 * 1024;

export const LIGHT_GRADIENT = [
  // Low brightness -> green, high brightness -> red.
  { t: 0, color: [30, 170, 95, 70] }, // deep green, subtle
  { t: 0.35, color: [92, 200, 118, 120] }, // softer green
  { t: 0.55, color: [210, 190, 70, 150] }, // yellow transition
  { t: 0.78, color: [245, 155, 65, 190] }, // orange
  { t: 1, color: [230, 70, 70, 220] }, // red at brightest
];

export const EMPTY_TILE = (() => {
  const png = new PNG({ width: LIGHT_TILE_SIZE, height: LIGHT_TILE_SIZE });
  return PNG.sync.write(png);
})();

export function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

export function haversineKm(lat1, lon1, lat2, lon2) {
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

export function bortleFromSqm(sqm) {
  if (sqm >= 21.99) return "class 1";
  if (sqm >= 21.89) return "class 2";
  if (sqm >= 21.69) return "class 3";
  if (sqm >= 20.49) return "class 4";
  if (sqm >= 19.5) return "class 5";
  if (sqm >= 18.94) return "class 6";
  if (sqm >= 18.38) return "class 7";
  return "class 8-9";
}

export function parseBortleLevel(label) {
  const match = String(label).match(/class\s*(\d+)/i);
  if (match) return Number(match[1]);
  return 9;
}

export function sendJson(response, statusCode, payload, cacheControl = null) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  if (cacheControl) {
    response.setHeader("Cache-Control", cacheControl);
  }
  response.end(JSON.stringify(payload));
}

const ensureStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
};

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

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

export function buildLandMask(landSource) {
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

export async function readJsonBody(request) {
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

export function normalizeRecommendationRecord(payload) {
  const lat = Number(
    payload?.coordinates?.lat ??
      payload?.coordinates?.latitude ??
      payload?.lat ??
      payload?.latitude,
  );
  const lon = Number(
    payload?.coordinates?.lon ??
      payload?.coordinates?.lng ??
      payload?.coordinates?.longitude ??
      payload?.lon ??
      payload?.lng ??
      payload?.longitude,
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
