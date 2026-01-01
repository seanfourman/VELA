import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const NATURAL_MCD_M2 = 0.171168465;
const SQM_DENOM = 108000000;
const NODATA_F32 = -3.4028234663852886e38;
const LIGHT_TILE_SIZE = 256;
const MIN_SQM = 16;
const MAX_SQM = 22;

const LIGHT_GRADIENT = [
  { t: 0, color: [30, 170, 95, 70] },
  { t: 0.35, color: [92, 200, 118, 120] },
  { t: 0.55, color: [210, 190, 70, 150] },
  { t: 0.78, color: [245, 155, 65, 190] },
  { t: 1, color: [230, 70, 70, 220] },
];

const EMPTY_TILE = (() => {
  const png = new PNG({ width: LIGHT_TILE_SIZE, height: LIGHT_TILE_SIZE });
  return PNG.sync.write(png);
})();

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
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

function interpolateGradient(stops, t) {
  if (t <= stops[0].t) return stops[0].color;
  if (t >= stops[stops.length - 1].t) return stops[stops.length - 1].color;
  for (let i = 0; i < stops.length - 1; i += 1) {
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

async function renderTile(image, datasetBounds, x, y, z) {
  const tileBounds = tileToBounds(x, y, z);
  if (!boundsIntersect(tileBounds, datasetBounds)) {
    return EMPTY_TILE;
  }

  const width = image.getWidth();
  const height = image.getHeight();
  const xRes = (datasetBounds.maxLon - datasetBounds.minLon) / width;
  const yRes = (datasetBounds.maxLat - datasetBounds.minLat) / height;

  const clippedMinLon = clamp(
    tileBounds.minLon,
    datasetBounds.minLon,
    datasetBounds.maxLon
  );
  const clippedMaxLon = clamp(
    tileBounds.maxLon,
    datasetBounds.minLon,
    datasetBounds.maxLon
  );
  const clippedMinLat = clamp(
    tileBounds.minLat,
    datasetBounds.minLat,
    datasetBounds.maxLat
  );
  const clippedMaxLat = clamp(
    tileBounds.maxLat,
    datasetBounds.minLat,
    datasetBounds.maxLat
  );

  let colStart = Math.floor((clippedMinLon - datasetBounds.minLon) / xRes);
  let colEnd = Math.ceil((clippedMaxLon - datasetBounds.minLon) / xRes);
  let rowStart = Math.floor((datasetBounds.maxLat - clippedMaxLat) / yRes);
  let rowEnd = Math.ceil((datasetBounds.maxLat - clippedMinLat) / yRes);

  colStart = clamp(colStart, 0, width - 1);
  colEnd = clamp(colEnd, colStart + 1, width);
  rowStart = clamp(rowStart, 0, height - 1);
  rowEnd = clamp(rowEnd, rowStart + 1, height);

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
  } catch {
    return EMPTY_TILE;
  }

  const data = Array.isArray(raster) ? raster[0] : raster;
  if (!data || data.length === 0) return EMPTY_TILE;

  const png = new PNG({ width: LIGHT_TILE_SIZE, height: LIGHT_TILE_SIZE });
  for (let i = 0; i < data.length; i += 1) {
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

  return PNG.sync.write(png);
}

const args = parseArgs(process.argv.slice(2));
if (args.help || args.h) {
  console.log(
    [
      "Usage:",
      "  node scripts/generate-lightmap-tiles.js --tif data/World_Atlas_2015.tif --out lightmap-tiles --minZoom 0 --maxZoom 8",
      "",
      "Options:",
      "  --tif      Path to World_Atlas_2015.tif",
      "  --out      Output directory for tiles",
      "  --minZoom  Minimum zoom level (default 0)",
      "  --maxZoom  Maximum zoom level (default 8)",
    ].join("\n")
  );
  process.exit(0);
}

const tifPath = args.tif || path.resolve("data", "World_Atlas_2015.tif");
const outDir = args.out || path.resolve("lightmap-tiles");
const minZoom = Number.isFinite(Number(args.minZoom))
  ? Number(args.minZoom)
  : 0;
const maxZoom = Number.isFinite(Number(args.maxZoom))
  ? Number(args.maxZoom)
  : 8;

if (!fs.existsSync(tifPath)) {
  console.error(`Missing TIFF file at ${tifPath}`);
  process.exit(1);
}
if (minZoom < 0 || maxZoom < minZoom) {
  console.error("Invalid zoom range.");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const { fromFile } = await import("geotiff");
const tiff = await fromFile(tifPath);
const image = await tiff.getImage();
const [minLon, minLat, maxLon, maxLat] = image.getBoundingBox();
const datasetBounds = { minLon, minLat, maxLon, maxLat };

console.log(
  `Generating tiles ${minZoom}-${maxZoom} into ${outDir} from ${tifPath}`
);

for (let z = minZoom; z <= maxZoom; z += 1) {
  const tilesPerAxis = 2 ** z;
  for (let x = 0; x < tilesPerAxis; x += 1) {
    const xDir = path.join(outDir, String(z), String(x));
    fs.mkdirSync(xDir, { recursive: true });
    for (let y = 0; y < tilesPerAxis; y += 1) {
      const buffer = await renderTile(image, datasetBounds, x, y, z);
      const outputPath = path.join(xDir, `${y}.png`);
      fs.writeFileSync(outputPath, buffer);
    }
  }
  console.log(`Finished zoom ${z}`);
}

console.log("Done.");
