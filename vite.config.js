import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const NATURAL_MCD_M2 = 0.171168465;
const SQM_DENOM = 108000000;
const NODATA_F32 = -3.4028234663852886e38;

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
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

  function mount(server) {
    server.middlewares.use(async (request, response, next) => {
      try {
        const url = new URL(request.url || "", "http://localhost");
        if (url.pathname !== "/api/skyquality") return next();

        if (request.method !== "GET") {
          response.statusCode = 405;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        await handleSkyQualityRequest(request, response);
      } catch (error) {
        response.statusCode = 500;
        response.setHeader("Content-Type", "application/json");
        const message =
          error instanceof Error ? error.message : "Sky quality request failed";
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
